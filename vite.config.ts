import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '')
  
  // Use the same environment variable names as the Nash service
  const nashApiKey = mode === 'development' ? env.VITE_NASH_API_KEY_DEV : env.VITE_NASH_API_KEY_PROD;
  const nashOrgId = mode === 'development' ? env.VITE_NASH_ORG_ID_DEV : env.VITE_NASH_ORG_ID_PROD;
  
  console.log('Configuring Vite with Nash API proxy...');
  console.log('Mode:', mode);
  console.log('Nash API Key available:', !!nashApiKey);
  console.log('Nash Org ID available:', !!nashOrgId);
  
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
          // Don't set headers here - let the client handle authentication
          // This prevents duplicate headers that can cause 401 errors
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url);
              console.log('To target:', proxyReq.method, proxyReq.path);
              
              // Log headers for debugging (without sensitive info)
              const headers = proxyReq.getHeaders();
              const safeHeaders = { ...headers };
              if (safeHeaders['authorization']) safeHeaders['authorization'] = '[REDACTED]';
              if (safeHeaders['x-nash-org-id']) safeHeaders['x-nash-org-id'] = '[REDACTED]';
              console.log('Proxy headers:', safeHeaders);
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
