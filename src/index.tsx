import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { env } from 'hono/adapter'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import OpenAI from 'openai'
import { renderer } from './renderer'
import type { CouchbaseConnection } from './server'

const app = new Hono()

let couchbaseConnection: CouchbaseConnection | null = null;

// Connect to Couchbase
async function connectToCouchbase(c: any): Promise<CouchbaseConnection> {
  try {
    if (typeof window === 'undefined') {
      console.log('Starting Couchbase connection process...');
      
      const { initCouchbase } = await import('./server');
      
      // Use Vite env variables
      const connectionString = import.meta.env.VITE_COUCHBASE_CONNECTION_STRING;
      const username = import.meta.env.VITE_COUCHBASE_USERNAME;
      const password = import.meta.env.VITE_COUCHBASE_PASSWORD;
      const bucketName = import.meta.env.VITE_COUCHBASE_BUCKET_NAME;

      console.log('Environment variables loaded:', {
        hasConnectionString: !!connectionString,
        hasUsername: !!username,
        hasPassword: !!password,
        bucketName
      });

      if (!connectionString || !username || !password || !bucketName) {
        throw new Error('Missing required Couchbase environment variables');
      }

      return await initCouchbase(
        connectionString,
        username,
        password,
        bucketName
      );
    }
    throw new Error('Cannot connect to Couchbase in browser environment');
  } catch (error) {
    console.error('Detailed connection error:', {
      error,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCause: error instanceof Error ? error.cause : undefined
    });
    throw error;
  }
}

// Function to get relevant documents
async function getRelevantDocuments(embedding: number[], c: any) {
  try {
    if (!couchbaseConnection) {
      throw new Error("No Couchbase connection available")
    }

    if (typeof window === 'undefined') {
      const { SearchRequest, VectorSearch, VectorQuery } = await import('couchbase')
      const COUCHBASE_SEARCH_INDEX_NAME = import.meta.env.VITE_COUCHBASE_SEARCH_INDEX_NAME || 'vector-search-index'
      
      console.log('Starting vector search with parameters:', {
        indexName: COUCHBASE_SEARCH_INDEX_NAME,
        embeddingLength: embedding.length,
        sampleEmbedding: embedding.slice(0, 5) // Log first 5 values for debugging
      });

      // Add debug logging for connection details
      console.log('Couchbase connection details:', {
        bucketName: couchbaseConnection.bucket.name,
        scopeName: couchbaseConnection.scope.name,
        collectionName: couchbaseConnection.collection.name
      });

      const numResults = 10; // Increased from 5 to get more potential matches
      
      // Check if index exists
      try {
        const indexes = await couchbaseConnection.cluster.searchIndexes().getAllIndexes();
        console.log('Available search indexes:', indexes.map(idx => idx.name));
        const targetIndex = indexes.find(idx => idx.name === COUCHBASE_SEARCH_INDEX_NAME);
        if (!targetIndex) {
          console.error(`Index ${COUCHBASE_SEARCH_INDEX_NAME} not found in available indexes`);
        }
      } catch (indexErr) {
        console.error('Error checking indexes:', indexErr);
      }

      const request = SearchRequest.create(
        VectorSearch.fromVectorQuery(
          VectorQuery.create('embedding', embedding)
            .numCandidates(numResults)
        )
      );

      // Add more debug info to request
      console.log('Vector search request details:', {
        indexName: COUCHBASE_SEARCH_INDEX_NAME,
        vectorField: 'embedding',
        numCandidates: numResults
      });

      // Add timeout to search request
      const result = await Promise.race([
        couchbaseConnection.scope.search(COUCHBASE_SEARCH_INDEX_NAME, request, { timeout: 5000 }), // Increased timeout
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout')), 5000)
        )
      ]);
      const typedResult = result as { rows: Array<{ id: string; score: number }> };

      console.log('Search results:', {
        totalHits: typedResult.rows.length,
        firstResult: typedResult.rows[0] || 'No results'
      });

      if (!typedResult.rows.length) {
        console.log('No vector search results found');
        return [];
      }

      // Process only essential fields with timeout
      const documents = await Promise.all(
        typedResult.rows.slice(0, 5).map(async row => {
          try {
            const docResult = await Promise.race([
              couchbaseConnection!.collection.get(row.id, {
                timeout: 2000
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Document fetch timeout')), 2000)
              )
            ]);

            const content = (docResult as { content: any }).content;
            // Remove embedding from returned content 
            if (content && typeof content === 'object' && 'embedding' in content) {
              delete content.embedding;
            }

            return {
              content,
              score: row.score,
              id: row.id
            };
          } catch (err) {
            console.error(`Error fetching document ${row.id}:`, err);
            return null;
          }
        })
      );

      // Filter out any null results from failed fetches
      return documents.filter(doc => doc !== null);
    }
    throw new Error('Cannot query Couchbase in browser environment');
  } catch (error) {
    console.error("Error in getRelevantDocuments:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      ...(error instanceof Error && 'code' in error ? { code: error.code } : {}),
      ...(error instanceof Error && 'context' in error ? { context: error.context } : {})
    });
    throw error;
  }
}

// Middleware to ensure Couchbase connection
app.use('*', async (c, next) => {
  console.log('Middleware executing, checking Couchbase connection...');
  if (typeof window === 'undefined' && !couchbaseConnection) {
    console.log('No existing connection, attempting to connect...');
    try {
      couchbaseConnection = await connectToCouchbase(c);
      console.log('Connection successful');
    } catch (error) {
      console.error('Middleware connection error:', error);
      throw error;
    }
  }
  return next();
})

// Error handling
app.onError((err, c) => {
  console.error('Global error:', err)
  return c.text("Internal Server Error", 500)
})

app.use(logger())

// Validation schema
const schema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string()
    })
  )
})

// Chat endpoint
app.post('/api/chat', zValidator('json', schema), async (c) => {
  try {
    const { messages } = c.req.valid('json')
    const lastMessage = messages[messages.length - 1].content

    const NEBIUS_API_KEY = import.meta.env.VITE_NEBIUS_API_KEY
    if (!NEBIUS_API_KEY) {
      throw new Error("NEBIUS_API_KEY is not defined!")
    }

    const client = new OpenAI({
      baseURL: "https://api.studio.nebius.ai/v1/",
      apiKey: import.meta.env.VITE_NEBIUS_API_KEY,
    })

    const client1 = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_KEY });

    const embeddingResponse = await client1.embeddings.create({
      model: "text-embedding-ada-002",
      input: lastMessage,
    })
    const embedding = embeddingResponse.data[0].embedding
    console.log('Generated embedding:', {
      length: embedding.length,
      sample: embedding.slice(0, 5)
    });

    const documents = await getRelevantDocuments(embedding, c)
    console.log('Retrieved documents:', {
      count: documents.length,
      samples: documents.slice(0, 2).map(d => ({
        id: d.id,
        score: d.score,
        contentSample: JSON.stringify(d.content).slice(0, 100) + '...'
      }))
    });

    const prompt = `
    You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
      If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
      If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.
      .
      <context>
     ${documents.map((doc) => JSON.stringify(doc.content)).join('\n')}
      </context>
     Please return your answer with clear headings and lists.
      User Query: ${lastMessage}
    `

    // Generate text response
    const result = await client.chat.completions.create({
      temperature: 0.6,
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
      messages: [...messages.slice(0, -1), { role: 'user', content: prompt }],
      stream: true,
    })

    // Generate an image based on the query
    let imageUrl = null;
    try {
      // Create a simplified prompt for image generation
      const imagePrompt = `A beautiful, detailed illustration of ${lastMessage} from Star Wars universe, space-themed, cinematic lighting, high quality`;
      
      const imageResponse = await client.images.generate({
        model: "black-forest-labs/flux-schnell",
        prompt: imagePrompt,
        response_format: "url",
        size: "256x256",
        quality: "standard",
        n: 1,
      });
      
      imageUrl = imageResponse.data[0].url;
      console.log('Generated image URL:', imageUrl);
    } catch (imageError) {
      console.error("Error generating image:", imageError);
      // Continue even if image generation fails
    }

    c.header('Content-Type', 'text/plain; charset=utf-8')
    c.header('Transfer-Encoding', 'chunked')
    
    const stream = new ReadableStream({
      async start(controller) {
        // First, send the image URL if available
        if (imageUrl) {
          controller.enqueue(new TextEncoder().encode(`!IMAGE_URL!${imageUrl}!IMAGE_URL!\n\n`));
        }
        
        // Then stream the text response
        for await (const chunk of result) {
          const token = chunk.choices[0]?.delta?.content
          if (token) {
            controller.enqueue(new TextEncoder().encode(token))
          }
        }
        controller.close()
      }
    })

    return new Response(stream)
  } catch (error) {
    console.error("Error in /api/chat:", error)
    return c.text("Error processing request", 500)
  }
})

app.get('*', renderer, async (c) => {
  return c.render(<div id="root"></div>)
})

export default app
