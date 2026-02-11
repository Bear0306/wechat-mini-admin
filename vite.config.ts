import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use 127.0.0.1 to avoid IPv6 (::1) resolution; backend may only listen on IPv4
const apiTarget = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080'
if (process.env.NODE_ENV !== 'production') {
  console.log('[vite] API proxy target:', apiTarget)
}

export default defineConfig({
  plugins: [react()],

  // In dev, still run on its own port and proxy /api to backend
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward client IP so backend trust proxy sees correct remote address
            const forwarded = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress
            if (forwarded) proxyReq.setHeader('x-forwarded-for', String(forwarded))
            const host = req.headers.host
            if (host) proxyReq.setHeader('x-forwarded-host', host)
          })
        },
      },
    },
  },

  // When building for production, output into the backend's public/admin folder
  // and assume the app is served from /admin on the same origin.
  build: {
    outDir: '../wechat-mini-backend/public/admin',
    emptyOutDir: true,
  },
  base: '/',
})
