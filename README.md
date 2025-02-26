# Nebius AI + Hono + Couchbase + Cloudflare Example

# Star Wars Planet Guide: RAG with Nebius AI, Hono, Couchbase and Cloudflare Pages

This project demonstrates a **Retrieval-Augmented Generation (RAG)** application using [Nebius AI](https://dub.sh/nebius) with **Hono, Couchbase, and Cloudflare**. The application serves as an **interactive guide to Star Wars planets**, leveraging vector search to retrieve relevant information and enhance AI responses.

## 🚀 Features

- **RAG Implementation** – Uses Couchbase vector search to retrieve relevant Star Wars planet information.
- **AI Image Generation** – Generates Star Wars-themed images based on user queries.
- **Real-Time Streaming** – Displays AI-generated responses in real time.
- **Multi-Model Support** – Easily switch between different Nebius AI models.

## 📜 Requirements

- **Node.js** v18+
- **Nebius Account** (for AI inference and image generation)
- **OpenAI Account** (for text embeddings)
- **Couchbase Server** (for vector database)
- **Cloudflare Account** (for deployment)

## 📥 Installation

1. **Clone the Repository:**

   ```sh
   git clone 
   cd 
   ```

2. **Install Dependencies:**

   ```sh
   npm install
   ```

3. **Set Up Environment Variables:**

   Create a `.env` file in the root directory (or copy from `.env.example`) with the following content:

   ```env
   # Nebius AI API Key
   VITE_NEBIUS_API_KEY="Your NEBIUS API KEY"
   
   # OpenAI API Key (for embeddings)
   VITE_OPENAI_KEY="Your OPENAI API KEY"
   
   # Couchbase Configuration
   VITE_COUCHBASE_CONNECTION_STRING="couchbases://your-cluster-url"
   VITE_COUCHBASE_USERNAME="your-username"
   VITE_COUCHBASE_PASSWORD="your-password"
   VITE_COUCHBASE_BUCKET_NAME="starwars"
   VITE_COUCHBASE_SEARCH_INDEX_NAME="vector-search-index"
   ```

   For Cloudflare Workers development, you can use a `.dev.vars` file instead.

## 🛠 Couchbase Setup

1. **Create a Bucket:**
   - Create a bucket named `starwars` in your Couchbase cluster.

2. **Create a Vector Search Index:**
   - Define a vector search index named `vector-search-index` with the following JSON configuration:

   ```json
   {
     "type": "fulltext-index",
     "name": "starwars._default.vector-search-index",
     "sourceType": "gocbcore",
     "sourceName": "starwars",
     "params": {
       "mapping": {
         "types": {
           "_default._default": {
             "properties": {
               "embedding": {
                 "fields": [
                   {
                     "dims": 1536,
                     "index": true,
                     "name": "embedding",
                     "similarity": "dot_product",
                     "type": "vector",
                     "vector_index_optimized_for": "recall"
                   }
                 ]
               }
             }
           }
         }
       }
     }
   }
   ```

3. **Import Star Wars Data:**
   - Populate your Couchbase bucket with planet data including:
     - Name, climate, terrain, and other attributes.
     - An embedding vector generated using OpenAI’s `text-embedding-ada-002` model.

## 🏗 Development

Run the development server:

```sh
npm run dev
```

Then open [http://localhost:5173/](http://localhost:5173/) in your browser.

<img width="1713" alt="image" src="https://github.com/user-attachments/assets/a4649355-4bfa-4398-afb0-3a0c5a46593a" />


## ⚙️ How It Works

1. **User Query Processing:**
   - Converts the user's question into an embedding vector via OpenAI.

2. **Vector Search:**
   - Searches Couchbase for semantically similar documents using **dot product similarity**.

3. **Context-Enhanced Response:**
   - Uses retrieved documents as context for Nebius AI to generate an informative response.
   - Generates a Star Wars-themed image related to the query.

4. **Streaming Response:**
   - Both text and images are streamed back to the user interface in real time.

## ☁️ Deployment

1. **Build the Application:**

   ```sh
   npm run build
   ```

2. **Deploy to Cloudflare Pages:**

   ```sh
   npm run deploy
   ```

> **💡 Note:** Set all required environment variables in Cloudflare Pages settings for production use.

## 📂 Project Structure

```
├── .env                 # Local environment variables
├── .env.example         # Example environment variables
├── .dev.vars            # Dev environment for Cloudflare Workers
├── index.json           # Couchbase vector search index definition
├── package.json         # Project dependencies and scripts
├── README.md            # Project documentation
├── wrangler.toml        # Cloudflare Pages/Workers configuration
├── vite.config.ts       # Vite configuration
└── src/
    ├── client.tsx       # React-based client entry point
    ├── index.tsx        # Hono server/API entry point with RAG implementation
    ├── renderer.tsx     # React renderer for Hono pages
    ├── server.ts        # Couchbase connection and initialization
    ├── env.d.ts         # TypeScript environment variable definitions
    ├── styles.css       # Application styles
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_NEBIUS_API_KEY` | Nebius AI API key for text & image generation |
| `VITE_OPENAI_KEY` | OpenAI API key for generating text embeddings |
| `VITE_COUCHBASE_CONNECTION_STRING` | Couchbase cluster connection string |
| `VITE_COUCHBASE_USERNAME` | Couchbase username |
| `VITE_COUCHBASE_PASSWORD` | Couchbase password |
| `VITE_COUCHBASE_BUCKET_NAME` | Couchbase bucket (default: "starwars") |
| `VITE_COUCHBASE_SEARCH_INDEX_NAME` | Vector search index (default: "vector-search-index") |

### Switching AI Models

Update the AI model used for text and image generation:

```typescript
// Text generation
const result = await client.chat.completions.create({
  temperature: 0.6,
  model: "meta-llama/Meta-Llama-3.1-70B-Instruct", // Change model as needed
  messages: [...],
});

// Image generation
const imageResponse = await client.images.generate({
  model: "black-forest-labs/flux-schnell", // Change model as needed
  prompt: imagePrompt,
});
```

## 🤝 Contributing

Contributions are welcome! Open an issue or submit a pull request to improve the project.

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## 🔗 Support

For issues or questions, open an issue on GitHub or contact the maintainers directly.

