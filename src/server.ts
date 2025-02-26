import { connect, Cluster, Bucket, Collection, Scope } from 'couchbase'

export type CouchbaseConnection = {
  cluster: Cluster;
  bucket: Bucket;
  scope: Scope;
  collection: Collection;
}

let connection: CouchbaseConnection | null = null;

export async function initCouchbase(
  connectionString: string | undefined,
  username: string | undefined,
  password: string | undefined,
  bucketName: string | undefined
): Promise<CouchbaseConnection> {
  // Validate required parameters
  if (!connectionString || !username || !password || !bucketName) {
    console.error('Missing required Couchbase configuration:', {
      hasConnectionString: !!connectionString,
      hasUsername: !!username,
      hasPassword: !!password,
      hasBucketName: !!bucketName
    });
    throw new Error('Missing required Couchbase configuration parameters');
  }

  console.log('Initializing Couchbase connection with:', {
    connectionString: connectionString.replace(/:[^:\/]*@/, ':****@'), // Hide password in logs
    username,
    bucketName
  });

  if (connection) {
    console.log('Reusing existing Couchbase connection');
    return connection;
  }

  try {
    console.log('Attempting to connect to Couchbase cluster...');
    const cluster = await connect(connectionString, {
      username,
      password,
      configProfile: 'wanDevelopment',
      // Add connection timeout settings
      connectTimeout: 30000, // 30 seconds
      kvTimeout: 30000,
    });
    console.log('Successfully connected to Couchbase cluster');

    console.log('Opening bucket:', bucketName);
    const bucket = cluster.bucket(bucketName);
    console.log('Successfully opened bucket');

    console.log('Getting scope and collection...');
    const scope = bucket.scope('_default');
    const collection = scope.collection('_default');
    console.log('Successfully got scope and collection');

    connection = {
      cluster,
      bucket,
      scope,
      collection
    };

    console.log('Couchbase connection fully initialized');
    return connection;
  } catch (error) {
    console.error('Detailed Couchbase connection error:', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorCause: error.cause
    });
    throw error;
  }
}

export function getConnection(): CouchbaseConnection {
  if (!connection) {
    console.error('Attempted to get connection before initialization');
    throw new Error('Couchbase connection not initialized');
  }
  return connection;
}