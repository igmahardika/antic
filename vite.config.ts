import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Set NODE_ENV based on mode
  process.env.NODE_ENV = mode === 'production' ? 'production' : 'development'
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: mode === 'production' ? '/' : '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser',
      rollupOptions: {
        external: ['puppeteer'],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@mui/icons-material'],
            utils: ['dexie', 'dexie-react-hooks', 'zustand'],
            charts: ['recharts'],
            excel: ['exceljs', 'papaparse']
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      }
    },
    server: {
      port: 3000,
      host: true
    },
    preview: {
      port: 3000,
      host: true
    },
    define: {
      global: 'globalThis',
    }
  }
})
