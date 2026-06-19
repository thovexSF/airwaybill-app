import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** HTTP headers that block clickjacking (iframe embedding). */
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
}

export default defineConfig({
  plugins: [react()],
  server: {
    headers: SECURITY_HEADERS,
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
  optimizeDeps: {
    include: [
      'base64-js',
      'pako',
      'brotli',
      'restructure',
      'fontkit',
    ],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
