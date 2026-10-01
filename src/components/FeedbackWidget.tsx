import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { submitFeedback } from '../lib/feedbackService'
import { usePostHog } from '@posthog/react'

const ENABLED = import.meta.env.VITE_FEEDBACK_ENABLED !== 'false'
const MIN_DETAILED_MESSAGE_LENGTH = 12

const TOPICS = ['bug', 'feature', 'question', 'spanish_help'] as const
type FeedbackTopic = typeof TOPICS[number]

type Step = 'form' | 'sending' | 'done' | 'error'

export function FeedbackWidget() {
  const { t, i18n } = useTranslation()
  const posthog = usePostHog()
  const { user } = useAuth()
  const location = useLocation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState<FeedbackTopic | null>(null)
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
    setTopic(null)
    setErrorKey(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!topic && trimmed.length < MIN_DETAILED_MESSAGE_LENGTH) {
      setErrorKey('too_short')
      return
    }

    setStep('sending')
    setErrorKey(null)

    const result = await submitFeedback({
      text: trimmed,
      page: location.pathname + location.search,
      user_email: email.trim() || user?.email || undefined,
      context: {
        ...(user?.id ? { user_id: user.id } : {}),
        topic,
        locale: i18n.language,
        message_length: trimmed.length,
      },
    })

    if (result.ok) {
      posthog?.capture('feedback_submitted', {
        page: location.pathname,
        topic,
        locale: i18n.language,
        message_length: trimmed.length,
      })
      setStep('done')
      setText('')
      setTopic(null)
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
          borderRadius: 24,
          border: 'none',
          background: '#8b0000',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(139,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '10px 16px',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>💬</span>
        <span>{t('feedback.label')}</span>
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
                  <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                    {t('feedback.subtitle')}
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: 11, color: '#8b0000', fontWeight: 600 }}>
                    {t('feedback.directNote')}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {TOPICS.map((topicKey) => {
                      const selected = topic === topicKey
                      return (
                        <button
                          key={topicKey}
                          type="button"
                          onClick={() => setTopic(selected ? null : topicKey)}
                          disabled={step === 'sending'}
                          aria-pressed={selected}
                          style={{
                            border: selected ? '1px solid #8b0000' : '1px solid #ddd',
                            borderRadius: 999,
                            background: selected ? '#fff4f4' : '#fff',
                            color: selected ? '#8b0000' : '#444',
                            cursor: step === 'sending' ? 'wait' : 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '6px 10px',
                          }}
                        >
                          {t(`feedback.topics.${topicKey}`)}
                        </button>
                      )
                    })}
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('feedback.placeholder')}
                    required
                    minLength={topic ? 3 : MIN_DETAILED_MESSAGE_LENGTH}
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
