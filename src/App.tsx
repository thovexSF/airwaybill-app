import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { EditorPage } from './pages/EditorPage'
import { SignupPage } from './pages/SignupPage'
import { LoginPage } from './pages/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'

export default function App() {
  const isDevelopment = import.meta.env.VITE_APP_ENV === 'development'

  if (isDevelopment) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<EditorPage />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/editor"
          element={(
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/contact" element={<ComingSoon title="Contact Sales" />} />
      </Routes>
    </BrowserRouter>
  )
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', gap: 16 }}>
      <div style={{ fontSize: 48 }}>✈</div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>{title}</h1>
      <p style={{ color: '#666' }}>Coming soon — authentication & accounts are next on the roadmap.</p>
      <a href="/" style={{ marginTop: 8, background: '#8B0000', color: '#fff', padding: '10px 24px', borderRadius: 6, fontWeight: 600, fontSize: 14 }}>← Back to Home</a>
    </div>
  )
}
