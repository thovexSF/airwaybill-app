import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import es from './es'

function initialLang(): string {
  try {
    if (
      sessionStorage.getItem('awb_partner_embed') === '1' ||
      sessionStorage.getItem('awb_partner_theme') === 'b2b' ||
      new URLSearchParams(window.location.search).get('embed') === '1' ||
      new URLSearchParams(window.location.search).get('theme') === 'b2b'
    ) {
      return 'es'
    }
  } catch {
    /* ignore */
  }
  return localStorage.getItem('lang') ?? 'en'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: initialLang(),
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  })

export default i18n
