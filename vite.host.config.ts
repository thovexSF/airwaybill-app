import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)

/**
 * One script B2B loads into its own page. CSS is inlined into the shadow root
 * by the entry (`App.css?inline`), so it does not restyle the host app.
 */
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [
    react(),
    {
      name: 'copy-pdf-worker',
      writeBundle(options) {
        const dir = options.dir || path.resolve('dist/host')
        mkdirSync(dir, { recursive: true })
        copyFileSync(
          require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'),
          path.join(dir, 'pdf.worker.min.mjs'),
        )
      },
    },
  ],
  esbuild: {
    // codepage/sheetjs emits U+0085 raw; Chrome treats that as a line break and the bundle fails to parse.
    charset: 'ascii',
  },
  build: {
    outDir: 'dist/host',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/b2bHost.tsx',
      name: 'AirwaybillHost',
      formats: ['iife'],
      fileName: () => 'b2b-host.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        banner: 'var process=globalThis.process||{env:{NODE_ENV:"production"},browser:true};',
      },
    },
  },
})
