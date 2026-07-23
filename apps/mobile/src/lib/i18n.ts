import { sharedEnglishResources } from "@chinasupply/i18n";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const resources = {
  en: {
    translation: {
      ...sharedEnglishResources,
      auth: {
        code: {
          description: "Enter the verification code for this device.",
          label: "Verification code",
          submit: "Verify and continue",
          title: "Verify this device",
        },
        error: {
          generic:
            "Sign in could not be completed. Check your details and try again.",
          unsupported:
            "This sign-in requires a method that is not available in this compatibility build.",
        },
        eyebrow: "Secure buyer access",
        email: {
          label: "Email address",
          placeholder: "buyer@example.com",
        },
        loading: "Loading secure sign in…",
        password: {
          label: "Password",
          placeholder: "Enter your password",
        },
        submit: "Sign in",
        submitting: "Signing in…",
        title: "Sign in to ChinaSupply.AI",
      },
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
