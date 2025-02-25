import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/nash-api': {
          target: 'https://api.usenash.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/nash-api/, ''),
          headers: {
            'X-Nash-API-Key': env.VITE_NASH_API_KEY || '',
            'X-Nash-Org-ID': env.VITE_NASH_ORG_ID || ''
          }
        }
      }
    }
  }
})
