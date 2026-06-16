import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { submitFeedback } from '../lib/feedbackService'

const ENABLED = import.meta.env.VITE_FEEDBACK_ENABLED !== 'false'

type Step = 'form' | 'sending' | 'done' | 'error'

export function FeedbackWidget() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [errorKey, setErrorKey] = useState<string | null>(null)

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email)
  }, [user?.email, email])

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => textareaRef.current?.focus(), 80)
      return () => window.clearTimeout(id)
    }
    return undefined
  }, [open])

  if (!ENABLED) return null

  function resetAndClose() {
    setOpen(false)
    setStep('form')
    setText('')
    setErrorKey(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed.length < 3) {
      setErrorKey('too_short')
      return
    }

    setStep('sending')
    setErrorKey(null)

    const result = await submitFeedback({
      text: trimmed,
      page: location.pathname + location.search,
      user_email: email.trim() || user?.email || undefined,
      context: user?.id ? { user_id: user.id } : undefined,
    })

    if (result.ok) {
      setStep('done')
      setText('')
      window.setTimeout(resetAndClose, 1400)
      return
    }

    setStep('error')
    setErrorKey(result.error === 'too_short' ? 'too_short' : 'send_failed')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('feedback.open')}
        title={t('feedback.open')}
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 900,
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: 'none',
          background: '#8b0000',
          color: '#fff',
          fontSize: 22,
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(139,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        💬
      </button>

      {open && (
        <div
          role="presentation"
          onClick={resetAndClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 10,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{
              background: '#8b0000',
              borderRadius: '10px 10px 0 0',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span id="feedback-title" style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                {t('feedback.title')}
              </span>
              <button
                type="button"
                onClick={resetAndClose}
                aria-label={t('common.cancel')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 20,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 20 }}>
              {step === 'done' ? (
                <p style={{ margin: 0, textAlign: 'center', fontSize: 14, color: '#333', padding: '24px 0' }}>
                  {t('feedback.thanks')}
                </p>
              ) : (
                <form onSubmit={handleSubmit}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                    {t('feedback.subtitle')}
                  </p>

                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('feedback.placeholder')}
                    required
                    minLength={3}
                    maxLength={2000}
                    disabled={step === 'sending'}
                    rows={5}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      padding: '10px 12px',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      marginBottom: 10,
                    }}
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('feedback.emailPlaceholder')}
                    disabled={step === 'sending'}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      padding: '9px 12px',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      marginBottom: 12,
                    }}
                  />

                  {errorKey === 'too_short' && (
                    <p style={{ color: '#c00', fontSize: 12, margin: '0 0 10px' }}>
                      {t('feedback.errors.too_short')}
                    </p>
                  )}
                  {errorKey && errorKey !== 'too_short' && (
                    <p style={{ color: '#c00', fontSize: 12, margin: '0 0 10px' }}>
                      {t('feedback.errors.send_failed')}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      type="button"
                      onClick={resetAndClose}
                      disabled={step === 'sending'}
                      style={{
                        background: '#fff',
                        color: '#555',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        padding: '9px 20px',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={step === 'sending'}
                      style={{
                        background: '#8b0000',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '9px 24px',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: step === 'sending' ? 'wait' : 'pointer',
                        opacity: step === 'sending' ? 0.75 : 1,
                      }}
                    >
                      {step === 'sending' ? t('feedback.sending') : t('feedback.submit')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
