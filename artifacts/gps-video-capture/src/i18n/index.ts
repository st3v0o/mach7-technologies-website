import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

export const LANGUAGE_STORAGE_KEY = '@gps_language';

export const SUPPORTED_LANGUAGES = [
  { code: 'system', label: 'System Default' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

function getDeviceLocale(): string {
  const locales = Localization.getLocales();
  if (locales.length > 0) {
    const tag = locales[0].languageTag ?? locales[0].languageCode ?? 'en';
    if (tag.startsWith('pt')) return 'pt-BR';
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('fr')) return 'fr';
    if (tag.startsWith('de')) return 'de';
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('ko')) return 'ko';
  }
  return 'en';
}

export async function initI18n() {
  let lng = 'en';
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && saved !== 'system') {
      lng = saved;
    } else {
      lng = getDeviceLocale();
    }
  } catch {
    lng = getDeviceLocale();
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
        'pt-BR': { translation: ptBR },
        fr: { translation: fr },
        de: { translation: de },
        ja: { translation: ja },
        ko: { translation: ko },
      },
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });

  return i18n;
}

export async function changeLanguage(code: LanguageCode) {
  const lng = code === 'system' ? getDeviceLocale() : code;
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  await i18n.changeLanguage(lng);
}

export function getCurrentLocale(): string {
  return i18n.language || 'en';
}

export default i18n;
