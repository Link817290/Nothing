import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';

export type Locale = 'en' | 'zh';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: (i18n.language as Locale) || 'en',
      setLocale: (locale) => {
        i18n.changeLanguage(locale);
        set({ locale });
      },
    }),
    { name: 'nothing-locale' },
  ),
);

// Re-export useTranslation for convenience
export { useTranslation } from 'react-i18next';
