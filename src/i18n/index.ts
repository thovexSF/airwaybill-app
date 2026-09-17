import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import es from './es'

const SUPPORTED_LANGS = new Set(['en', 'es'])

function normalizeLang(lang: string | null | undefined): string | null {
  if (!lang) return null
  const normalized = lang.toLowerCase().split('-')[0]
  return SUPPORTED_LANGS.has(normalized) ? normalized : null
}

function initialLang(): string {
  try {
    const params = new URLSearchParams(window.location.search)
    const urlLang = normalizeLang(params.get('lang'))
    if (urlLang) return urlLang

    if (
      sessionStorage.getItem('awb_partner_embed') === '1' ||
      sessionStorage.getItem('awb_partner_theme') === 'b2b' ||
      params.get('embed') === '1' ||
      params.get('theme') === 'b2b'
    ) {
      return 'es'
    }

    const savedLang = normalizeLang(localStorage.getItem('lang'))
    if (savedLang) return savedLang

    const browserLangs =
      typeof navigator !== 'undefined' && navigator.languages?.length
        ? navigator.languages
        : [typeof navigator !== 'undefined' ? navigator.language : undefined]
    if (browserLangs.some(lang => normalizeLang(lang) === 'es')) return 'es'
  } catch {
    /* ignore */
  }
  return 'en'
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
