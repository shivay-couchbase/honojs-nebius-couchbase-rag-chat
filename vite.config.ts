import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import { defineConfig, loadEnv } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  if (mode === 'client') {
    return {
      build: {
        rollupOptions: {
          input: './src/client.tsx',
          output: {
            entryFileNames: 'static/client.js'
          }
        }
      },
      plugins: [
        react(),
        viteStaticCopy({
          targets: [
            { src: 'src/styles.css', dest: 'static' }
          ]
        }),
        nodePolyfills({
          exclude: [
            'fs',
          ],
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        })
      ],
      resolve: {
        alias: {
          // Add any necessary aliases here
        },
      },
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: 'globalThis',
          },
        },
      },
      server: {
        port: 5173,
        strictPort: true,
        host: true,
      },
    }
  } else {
    return {
      define: {
        // Define environment variables
        'process.env': env
      },
      ssr: {
        external: ['openai', 'react', 'react-dom', 'couchbase'],
        noExternal: []
      },
      plugins: [
        pages(),
        devServer({
          entry: 'src/index.tsx'
        })
      ],
      build: {
        rollupOptions: {
          external: ['couchbase']
        }
      },
      optimizeDeps: {
        exclude: ['couchbase']
      }
    }
  }
})



// export default defineConfig({
//   plugins: [react()],
//   build: {
//     commonjsOptions: {
//       transformMixedEsModules: true,
//     },
//   },
//   optimizeDeps: {
//     exclude: ['couchbase']
//   }
// }) 