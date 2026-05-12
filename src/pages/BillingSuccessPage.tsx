import React, { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'

export function BillingSuccessPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const { user } = useAuth()

  useEffect(() => {
    ;(window as any).clarity?.('event', 'subscription_completed')
    supabase.functions.invoke('notify-owner', { body: { event: 'subscription_completed', data: { email: user?.email } } })
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', gap: 16, background: '#f4f4f4' }}>
      <div style={{ fontSize: 52 }}>✅</div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#222' }}>{t('billing.title')}</h1>
      <p style={{ color: '#666', maxWidth: 360, textAlign: 'center' }}>
        {t('billing.sub')}
      </p>
      <Link to="/editor" style={{ marginTop: 8, background: '#8b0000', color: '#fff', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
        {t('billing.goToEditor')}
      </Link>
    </div>
  )
}
