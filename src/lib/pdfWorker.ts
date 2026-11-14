import { pdfjs } from 'react-pdf'

// One place for this: the B2B host build swaps this module for pdfWorker.host.ts,
// because Vite's lib mode inlines the worker as base64 at every `new URL(...)`.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()
