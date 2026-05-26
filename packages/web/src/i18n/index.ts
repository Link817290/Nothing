import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';

// Get persisted locale
function getInitialLocale(): string {
  try {
    const stored = localStorage.getItem('nothing-locale');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.locale) return parsed.state.locale;
    }
  } catch {}
  // Detect browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: getInitialLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
