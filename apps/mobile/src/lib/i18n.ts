import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const resources = {
  en: {
    translation: {
      shell: {
        eyebrow: "Mobile compatibility spike",
        status: "Expo application shell is ready",
        title: "ChinaSupply.AI",
      },
    },
  },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    compatibilityJSON: "v4",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    lng: "en",
    resources,
    showSupportNotice: false,
  });
}

export default i18n;
