/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEBIUS_API_KEY: string
  readonly VITE_COUCHBASE_CONNECTION_STRING: string
  readonly VITE_COUCHBASE_USERNAME: string
  readonly VITE_COUCHBASE_PASSWORD: string
  readonly VITE_COUCHBASE_BUCKET_NAME: string
  readonly VITE_COUCHBASE_SEARCH_INDEX_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 