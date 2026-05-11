import React from 'react'
import { useTranslation } from 'react-i18next'

interface LangSwitcherProps {
  style?: React.CSSProperties
  variant?: 'dark' | 'light'
}

export function LangSwitcher({ style, variant = 'dark' }: LangSwitcherProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  function toggle() {
    const next = lang === 'en' ? 'es' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  const darkStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
  }
  const lightStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid #ccc',
    color: '#444',
  }

  return (
    <button
      onClick={toggle}
      title={lang === 'en' ? 'Switch to Spanish' : 'Cambiar a inglés'}
      style={{
        ...(variant === 'light' ? lightStyle : darkStyle),
        fontWeight: 700,
        fontSize: 11,
        padding: '4px 10px',
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
