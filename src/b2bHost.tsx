import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { pdfjs } from 'react-pdf'
import { AuthProvider } from './auth/AuthContext'
import { MyAWBsPage } from './pages/MyAWBsPage'
import { setPartnerHost, type PartnerHostConfig } from './lib/partnerHost'
import { applyPartnerTheme } from './lib/partnerTheme'
import i18n from './i18n'
import css from './App.css?inline'

const roots = new WeakMap<HTMLElement, Root>()

/**
 * Renders the same document hub B2B used to iframe, inside the caller's DOM.
 * Documents go through `apiBase` (B2B's partner proxy). Assets stay on airwaybill.app.
 */
export function mount(el: HTMLElement, cfg: PartnerHostConfig): () => void {
  setPartnerHost(cfg)
  applyPartnerTheme('b2b', true)
  void i18n.changeLanguage('es')

  const assetBase = cfg.assetBase.replace(/\/$/, '')
  // The PDF worker cannot be started from another origin. Pull it and run the blob here.
  void fetch(`${assetBase}/host/pdf.worker.min.mjs`)
    .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('worker'))))
    .then((blob) => {
      pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob)
    })
    .catch(() => {})

  const shadow = el.shadowRoot ?? el.attachShadow({ mode: 'open' })
  let inner = shadow.querySelector('.awb-host') as HTMLElement | null
  if (!inner) {
    const style = document.createElement('style')
    style.textContent = css
    inner = document.createElement('div')
    inner.className = 'awb-host'
    shadow.append(style, inner)
    // CSS that Vite extracts (PDF text layer, etc.) is not in the inline sheet.
    void fetch(`${assetBase}/host/style.css`)
      .then((res) => (res.ok ? res.text() : ''))
      .then((text) => {
        if (!text) return
        const extra = document.createElement('style')
        extra.textContent = text
        shadow.insertBefore(extra, inner)
      })
      .catch(() => {})
  }

  let root = roots.get(el)
  if (!root) {
    root = createRoot(inner)
    roots.set(el, root)
  }
  root.render(
    <MemoryRouter initialEntries={['/my-awbs']}>
      <AuthProvider>
        <MyAWBsPage />
      </AuthProvider>
    </MemoryRouter>,
  )

  return () => {
    root?.unmount()
    roots.delete(el)
  }
}

const api = { mount }
;(window as unknown as { AirwaybillHost: typeof api }).AirwaybillHost = api
export default api
