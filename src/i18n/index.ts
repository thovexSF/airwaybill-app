import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import es from './es'

const SUPPORTED_LANGS = ['en', 'es'] as const

function normalizeLang(lang: string | null | undefined) {
  const base = lang?.toLowerCase().split('-')[0]
  return SUPPORTED_LANGS.find(supported => supported === base) ?? null
}

function getInitialLanguage() {
  const savedLang = normalizeLang(localStorage.getItem('lang'))
  if (savedLang) return savedLang

  const browserLang = navigator.languages?.map(normalizeLang).find(Boolean) ?? normalizeLang(navigator.language)
  return browserLang ?? 'en'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export default i18n
