import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
const EditorPage = lazy(() => import('./pages/EditorPage').then(m => ({ default: m.EditorPage })))
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const MyAWBsPage = lazy(() => import('./pages/MyAWBsPage').then(m => ({ default: m.MyAWBsPage })))
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })))
const BillingSuccessPage = lazy(() => import('./pages/BillingSuccessPage').then(m => ({ default: m.BillingSuccessPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const RefundsPage = lazy(() => import('./pages/RefundsPage').then(m => ({ default: m.RefundsPage })))
const DGDPage = lazy(() => import('./pages/DGDPage').then(m => ({ default: m.DGDPage })))
const ManifestPage = lazy(() => import('./pages/ManifestPage').then(m => ({ default: m.ManifestPage })))
const NeppexPage = lazy(() => import('./pages/NeppexPage').then(m => ({ default: m.NeppexPage })))
const LabelPage = lazy(() => import('./pages/LabelPage').then(m => ({ default: m.LabelPage })))
const ProformaPage = lazy(() => import('./pages/ProformaPage').then(m => ({ default: m.ProformaPage })))
const BLPage = lazy(() => import('./pages/BLPage').then(m => ({ default: m.BLPage })))
const BLManifestPage = lazy(() => import('./pages/BLManifestPage').then(m => ({ default: m.BLManifestPage })))
const IMODGDPage = lazy(() => import('./pages/IMODGDPage').then(m => ({ default: m.IMODGDPage })))
const FWBPage = lazy(() => import('./pages/EDIPages').then(m => ({ default: m.FWBPage })))
const FHLPage = lazy(() => import('./pages/EDIPages').then(m => ({ default: m.FHLPage })))
const FFRPage = lazy(() => import('./pages/EDIPages').then(m => ({ default: m.FFRPage })))
import { ProtectedRoute } from './auth/ProtectedRoute'
const DevPreviewPage = lazy(() => import('./pages/DevPreviewPage').then(m => ({ default: m.DevPreviewPage })))
const DemoEditorPage = lazy(() => import('./pages/DemoEditorPage').then(m => ({ default: m.DemoEditorPage })))
const DemoPickerPage = lazy(() => import('./pages/DemoPickerPage').then(m => ({ default: m.DemoPickerPage })))
const DemoDocPage = lazy(() => import('./pages/DemoDocPage').then(m => ({ default: m.DemoDocPage })))
import { PartnerEntryPage } from './pages/PartnerEntryPage'
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
import { FeedbackWidget } from './components/FeedbackWidget'
import { isPartnerEmbed } from './lib/partnerTheme'

function AppFeedbackWidget() {
  const embed = typeof window !== 'undefined' && isPartnerEmbed()
  const location = useLocation()
  if (embed || location.pathname.startsWith('/admin')) return null
  return <FeedbackWidget />
}

export default function App() {
  return (
    <BrowserRouter>
      <AppFeedbackWidget />
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <Routes>
        <Route path="/partner-entry" element={<PartnerEntryPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPickerPage />} />
        <Route path="/demo/:docType" element={<DemoDocPage />} />
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
        <Route
          path="/dgd"
          element={(
            <ProtectedRoute>
              <DGDPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/neppex" element={<ProtectedRoute><NeppexPage /></ProtectedRoute>} />
        <Route path="/label" element={<ProtectedRoute><LabelPage /></ProtectedRoute>} />
        <Route path="/proforma" element={<ProtectedRoute><ProformaPage /></ProtectedRoute>} />
        <Route path="/bl" element={<ProtectedRoute><BLPage /></ProtectedRoute>} />
        <Route path="/bl-manifest" element={<ProtectedRoute><BLManifestPage /></ProtectedRoute>} />
        <Route path="/imo-dgd" element={<ProtectedRoute><IMODGDPage /></ProtectedRoute>} />
        <Route path="/edi/fwb" element={<ProtectedRoute><FWBPage /></ProtectedRoute>} />
        <Route path="/edi/fhl" element={<ProtectedRoute><FHLPage /></ProtectedRoute>} />
        <Route path="/edi/ffr" element={<ProtectedRoute><FFRPage /></ProtectedRoute>} />
        <Route
          path="/manifest"
          element={(
            <ProtectedRoute>
              <ManifestPage />
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
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/contact" element={<ComingSoon title="Contact Sales" />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refunds" element={<RefundsPage />} />
        {import.meta.env.DEV && <Route path="/dev-preview" element={<DevPreviewPage />} />}
      </Routes>
      </Suspense>
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
