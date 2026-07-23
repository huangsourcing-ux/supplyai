import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const resources = {
  en: {
    translation: {
      mapSpike: {
        attribution: "© MapTiler · © OpenStreetMap contributors",
        eyebrow: "MapLibre compatibility spike",
        legend: {
          cluster: "Cluster",
          point: "Point",
          polygon: "Polygon",
          title: "Fixture layers",
        },
        status: {
          error: "Map failed to load",
          loading: "Loading offline map…",
          ready: "Offline map ready",
        },
        title: "Yiwu offline map fixture",
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
