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
      apiHealth: {
        error: "API liveness check failed",
        loading: "Checking API liveness…",
        ready: "API liveness check passed",
      },
      map: {
        ariaLabel: "China industrial cluster and factory map",
        attribution: "© MapTiler · © OpenStreetMap contributors",
        card: {
          close: "Close details",
          cluster: "Industrial cluster",
          detailError: "Details could not be loaded.",
          factory: "Factory",
          factoryCount_one: "{{count}} factory",
          factoryCount_other: "{{count}} factories",
          loadingDetails: "Loading details",
          mainProducts: "Main products",
          unverified: "Unverified",
          verified: "Verified",
          viewClusterDetails: "View cluster details",
          viewFactoryDetails: "View factory details",
        },
        retry: "Retry",
        search: {
          categories: {
            all: "All categories",
            error: "Categories could not be loaded.",
            group: "Filter map by category",
            loading: "Loading categories…",
          },
          categoryResult: "Category",
          clear: "Clear search",
          error: "Search could not be completed.",
          factoryCount_one: "{{count}} factory",
          factoryCount_other: "{{count}} factories",
          groups: {
            categories: "Categories",
            clusters: "Industrial clusters",
            factories: "Factories",
          },
          label: "Search products, industrial clusters, and factories",
          loading: "Searching…",
          loadingPopular: "Loading popular categories…",
          noResults:
            "No matching suppliers found. Try another product or browse a popular category.",
          placeholder: "Search products or factories",
          popularCategories: "Popular categories",
          removeCategory: "Remove {{category}} filter",
          results: "Search results",
          unverified: "Unverified factory",
          verified: "Verified factory",
        },
        status: {
          "data-error": "Map data could not be loaded.",
          loading: "Loading map data…",
          "map-error": "Map could not be loaded.",
        },
        truncated: "Zoom in to see all factories",
      },
      sentrySmoke: {
        button: "Send Mobile Sentry test exception",
        flushFailed:
          "Sentry {{environment}} event {{eventId}} did not flush before the timeout.",
        ready: "Sentry {{environment}} smoke test is ready.",
        sending: "Sending Sentry test exception…",
        sent: "Sentry {{environment}} event sent: {{eventId}}",
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
