import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

const resources = {
    en: {
        translation: en,
    },
    zh: {
        translation: zh,
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en', // Default language
        supportedLngs: ['en', 'zh'], // Supported languages

        // Detector options
        detection: {
            order: ['querystring', 'localStorage', 'cookie', 'navigator', 'htmlTag', 'path', 'subdomain'],
            caches: ['localStorage', 'cookie'],
        },

        interpolation: {
            escapeValue: false, // React already safe from XSS
        },
    });

export default i18n;
