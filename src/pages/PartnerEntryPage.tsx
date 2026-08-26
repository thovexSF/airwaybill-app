import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { applyPartnerTheme } from '../lib/partnerTheme'
import i18n from '../i18n'

/**
 * Consumes a one-time magic-link hash from the Partner API and lands in the app
 * already signed in (B2B embed — no login screen).
 */
export function PartnerEntryPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const token_hash = params.get('token_hash')
      const theme = params.get('theme') || 'b2b'
      const next = params.get('next') || '/my-awbs'
      const embed = params.get('embed') === '1'

      applyPartnerTheme(theme, embed)
      await i18n.changeLanguage('es')

      if (!token_hash) {
        setError('Falta token de entrada')
        return
      }

      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'email',
      })

      if (cancelled) return
      if (otpError) {
        const retry = await supabase.auth.verifyOtp({
          token_hash,
          type: 'magiclink',
        } as any)
        if (retry.error) {
          setError(otpError.message || 'No se pudo iniciar sesión automática')
          return
        }
      }

      navigate(next.startsWith('/') ? next : '/my-awbs', { replace: true })
    }
    run()
    return () => {
      cancelled = true
    }
  }, [params, navigate])

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'system-ui', textAlign: 'center' }}>
        <p style={{ color: '#c00', marginBottom: 12 }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 40, fontFamily: 'system-ui', textAlign: 'center', color: '#666' }}>
      Cargando documentos…
    </div>
  )
}
