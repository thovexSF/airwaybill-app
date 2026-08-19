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
    // Desde Vite 5.4.12 el servidor de preview rechaza toda petición cuyo Host
    // no esté en esta lista, con "Blocked request. This host is not allowed."
    // En Railway eso no rompe el build: rompe el healthcheck, así que el deploy
    // se marca como fallido aunque el bundle esté perfecto. Autorizamos los
    // dominios de Railway y, para un dominio propio, la variable de entorno
    // PREVIEW_ALLOWED_HOSTS (lista separada por comas) leída en build time.
    allowedHosts: [
      '.up.railway.app',
      '.railway.app',
      ...(process.env.PREVIEW_ALLOWED_HOSTS ?? '')
        .split(',')
        .map(h => h.trim())
        .filter(Boolean),
    ],
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
