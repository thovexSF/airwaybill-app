import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { initAnalytics, posthogClient } from './lib/analytics'
import { bootPartnerTheme } from './lib/partnerTheme'
import './App.css'
import './i18n'
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react'

// A lazily loaded editor whose chunk was replaced by a deploy: reload once onto the new build.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('stale-build-reload')) return
    sessionStorage.setItem('stale-build-reload', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})
// The app booted on the current build: a later stale chunk may reload again.
window.addEventListener('load', () => setTimeout(() => { try { sessionStorage.removeItem('stale-build-reload') } catch { /* blocked */ } }, 10000))

bootPartnerTheme()
initAnalytics()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider client={posthogClient}>
      <PostHogErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PostHogErrorBoundary>
    </PostHogProvider>
  </React.StrictMode>,
)
