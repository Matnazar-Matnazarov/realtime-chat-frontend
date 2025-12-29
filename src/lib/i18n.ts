import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enTranslations from '@/locales/en.json'
import uzTranslations from '@/locales/uz.json'
import ruTranslations from '@/locales/ru.json'

const resources = {
  en: {
    translation: enTranslations,
  },
  uz: {
    translation: uzTranslations,
  },
  ru: {
    translation: ruTranslations,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
