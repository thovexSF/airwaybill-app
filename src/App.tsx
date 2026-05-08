import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { EditorPage } from './pages/EditorPage'
import { SignupPage } from './pages/SignupPage'
import { LoginPage } from './pages/LoginPage'
import { MyAWBsPage } from './pages/MyAWBsPage'
import { PricingPage } from './pages/PricingPage'
import { BillingSuccessPage } from './pages/BillingSuccessPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { TermsPage } from './pages/TermsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { RefundsPage } from './pages/RefundsPage'
import { ProtectedRoute } from './auth/ProtectedRoute'

export default function App() {
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
        <Route
          path="/my-awbs"
          element={(
            <ProtectedRoute>
              <MyAWBsPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/pricing" element={<PricingPage />} />
        <Route
          path="/billing/success"
          element={(
            <ProtectedRoute>
              <BillingSuccessPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/contact" element={<ComingSoon title="Contact Sales" />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refunds" element={<RefundsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', gap: 16 }}>
      <div style={{ fontSize: 48 }}>✈</div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>{title}</h1>
      <p style={{ color: '#666' }}>Coming soon.</p>
      <a href="/" style={{ marginTop: 8, background: '#8B0000', color: '#fff', padding: '10px 24px', borderRadius: 6, fontWeight: 600, fontSize: 14 }}>← Back to Home</a>
    </div>
  )
}
