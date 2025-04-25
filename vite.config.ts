import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('Configuring Vite with Nash API proxy...');
  console.log('Nash API Key available:', !!env.VITE_NASH_API_KEY);
  console.log('Nash Org ID available:', !!env.VITE_NASH_ORG_ID);
  
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
          target: 'https://api.sandbox.usenash.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/nash-api/, ''),
          headers: {
            'Authorization': `Bearer ${env.VITE_NASH_API_KEY || ''}`,
            'X-Nash-Org-ID': env.VITE_NASH_ORG_ID || ''
          },
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url);
              console.log('To target:', proxyReq.method, proxyReq.path);
              
              // Only log headers without sensitive information
              const safeHeaders = { ...proxyReq.getHeaders() };
              delete safeHeaders['authorization'];
              delete safeHeaders['x-nash-org-id'];
              console.log('With headers:', safeHeaders);
              
              // Log if credentials are being sent
              console.log('API credentials included:', 
                !!proxyReq.getHeader('authorization') && 
                !!proxyReq.getHeader('x-nash-org-id')
              );
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received response for:', req.url);
              console.log('Status:', proxyRes.statusCode);
              
              // Log response headers for debugging
              console.log('Response headers:', {
                'content-type': proxyRes.headers['content-type'],
                'content-length': proxyRes.headers['content-length'],
                'x-request-id': proxyRes.headers['x-request-id']
              });
            });
          }
        }
      }
    }
  }
})
