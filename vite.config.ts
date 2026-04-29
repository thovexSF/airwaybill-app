import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
