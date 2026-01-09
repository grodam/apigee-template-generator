import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'globalThis',
    'process.env': '{}',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'path': 'path-browserify',
      'buffer': 'buffer/',
      'util': 'util/',
      'process': 'process/browser',
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      }
    },
    include: ['process', 'util', 'buffer', 'path-browserify']
  }
})
