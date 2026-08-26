import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { initAnalytics, posthogClient } from './lib/analytics'
import { bootPartnerTheme } from './lib/partnerTheme'
import './App.css'
import './i18n'
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react'

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
