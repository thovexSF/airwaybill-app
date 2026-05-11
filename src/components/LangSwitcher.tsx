import React from 'react'
import { useTranslation } from 'react-i18next'

export function LangSwitcher({ style }: { style?: React.CSSProperties }) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  function toggle() {
    const next = lang === 'en' ? 'es' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <button
      onClick={toggle}
      title={lang === 'en' ? 'Switch to Spanish' : 'Cambiar a inglés'}
      style={{
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.25)',
        color: '#fff',
        fontWeight: 700,
        fontSize: 11,
        padding: '3px 8px',
        borderRadius: 4,
        cursor: 'pointer',
        letterSpacing: 0.5,
        ...style,
      }}
    >
      {lang === 'en' ? 'ES' : 'EN'}
    </button>
  )
}
