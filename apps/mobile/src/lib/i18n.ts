import { sharedEnglishResources } from "@chinasupply/i18n";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const resources = {
  en: {
    translation: {
      ...sharedEnglishResources,
      account: {
        delete: {
          action: "Delete account",
          cancel: "Cancel",
          confirm:
            "Delete your account and all saved factories? This cannot be undone.",
          description:
            "Permanently remove your buyer account and saved factories.",
          error: "Your account could not be deleted. Please try again.",
          pending: "Deleting account…",
          title: "Delete account",
        },
        description: "Manage your buyer identity and account preferences.",
        emailFallback: "Email unavailable",
        emailLabel: "Email address",
        eyebrow: "Buyer account",
        language: {
          description: "ChinaSupply.AI currently supports English.",
          english: "English",
          error: "Your language preference could not be saved. Try again.",
          label: "Language",
          save: "Save language",
          saved: "Language preference saved.",
          saving: "Saving…",
          title: "Language preference",
        },
        loading: "Loading your account…",
        signOut: "Sign out",
        signingOut: "Signing out…",
        title: "Account",
      },
      auth: {
        back: "Back",
        code: {
          changeEmail: "Use a different email",
          description: "Enter the verification code sent to your email.",
          label: "Verification code",
          placeholder: "6-digit code",
          submit: "Verify code",
          title: "Check your email",
        },
        error: {
          generic:
            "Authentication could not be completed. Check your details and try again.",
          google: "Google sign-in could not be completed. Please try again.",
          unsupported:
            "This account requires an authentication method that is not available in the app.",
        },
        eyebrow: "Secure buyer access",
        email: {
          label: "Email address",
          placeholder: "buyer@example.com",
        },
        google: {
          continue: "Continue with Google",
        },
        loading: "Loading secure sign in…",
        mfa: {
          description:
            "Enter the additional email code required by this account.",
          title: "Additional verification",
        },
        signIn: {
          description: "We will email you a one-time verification code.",
          submit: "Email me a code",
          switch: "New to ChinaSupply.AI? Create an account",
          title: "Sign in to ChinaSupply.AI",
        },
        signUp: {
          description: "Create an account with a verified email address.",
          submit: "Create account",
          switch: "Already have an account? Sign in",
          title: "Create your buyer account",
        },
        submitting: "Please wait…",
      },
      explore: {
        category: {
          allLoaded: "All available industrial clusters are shown.",
          back: "All categories",
          description:
            "Browse published industrial clusters in this supply category.",
          empty: {
            description:
              "There are no published industrial clusters in {{name}} yet.",
            title: "No published clusters yet",
          },
          eyebrow: "Supply category",
          factoryCount_one: "{{count}} factory",
          factoryCount_other: "{{count}} factories",
          imageAlt: "{{name}} industrial cluster",
          loadError: "More industrial clusters could not be loaded.",
          loadMore: "Load more clusters",
          loading: "Loading industrial clusters…",
          loadingMore: "Loading more clusters…",
          mainProducts: "Main products",
          retry: "Try again",
          serviceError: {
            description:
              "Industrial clusters may be temporarily unavailable. Try the request again.",
            title: "We could not load this category",
          },
          title: "{{name}} industrial clusters",
          unavailable: {
            description:
              "This category link is invalid or is not available in Explore.",
            title: "This supply category was not found",
          },
          viewDetails: "View cluster details",
          viewDetailsLabel: "View details for {{name}}",
        },
        description:
          "Browse China's manufacturing strengths by product category.",
        empty: {
          description:
            "Supply categories will appear here when they are available.",
          title: "No supply categories are available yet",
        },
        error: {
          description:
            "Supply categories may be temporarily unavailable. Try the request again.",
          retry: "Try again",
          title: "We could not load supply categories",
        },
        loading: "Loading supply categories…",
        openCategory: "Browse {{name}} industrial clusters",
        title: "Explore supply categories",
      },
      apiHealth: {
        error: "API liveness check failed",
        loading: "Checking API liveness…",
        ready: "API liveness check passed",
      },
      clusterDetail: {
        aboutHeading: "About this industrial cluster",
        backToMap: "Back to the map",
        descriptionImageAlt: "{{name}} industrial cluster",
        error: {
          backToMap: "Back to the map",
          description:
            "The supplier catalog may be temporarily unavailable. Try the request again.",
          eyebrow: "Temporary problem",
          retry: "Try again",
          title: "We could not load this cluster",
        },
        factories: {
          allLoaded: "All available factories are shown.",
          empty: "No published factories are available in this cluster yet.",
          heading: "Factories in this cluster",
          imageAlt: "{{name}} factory",
          loadError: "More factories could not be loaded.",
          loadInitialError: "Factories could not be loaded.",
          loadMore: "Load more factories",
          loading: "Loading factories…",
          loadingMore: "Loading more factories…",
          mainProducts: "Main products from {{name}}",
          retry: "Try again",
          unverified: "Unverified",
          verified: "Verified",
          viewDetails: "View factory details",
        },
        loading: "Loading industrial cluster…",
        location: "{{city}}, China",
        map: {
          ariaLabel: "Map preview of {{name}}",
          attribution: "© MapTiler · © OpenStreetMap contributors",
          boundaryUnavailable:
            "Boundary data is not available yet. Showing the cluster center.",
          error: "The map preview could not be loaded.",
          loading: "Loading map preview…",
          retry: "Retry",
        },
        notFound: {
          backToMap: "Browse the map",
          description:
            "The link may be outdated, or the cluster is not currently published.",
          eyebrow: "Cluster unavailable",
          title: "This industrial cluster was not found",
        },
        productsHeading: "Main products",
        stats: {
          annualOutput: "Annual output",
          exportShare: "Export share",
          factoryCount: "Factories",
          heading: "Cluster at a glance",
        },
      },
      factoryDetail: {
        address: {
          chinese: "Chinese address",
          english: "English address",
          heading: "Factory address",
        },
        backToMap: "Back to the map",
        contact: {
          actionError: "This action could not be completed. Try again.",
          copied: "WeChat ID copied",
          copyWechat: "Copy",
          email: "Email",
          heading: "Contact factory",
          phone: "Phone",
          visitWebsite: "Visit website",
          website: "Website",
          wechat: "WeChat",
        },
        copy: {
          action: "Copy",
          actionLabel: "Copy {{label}}",
          error: "Could not copy",
          success: "Copied",
        },
        details: {
          certifications: "Certifications",
          employeeRange: "Factory size",
          establishedYear: "Established",
          heading: "Factory information",
          mainProducts: "Main products",
          moq: "Minimum order",
        },
        error: {
          backToMap: "Back to the map",
          description:
            "The supplier catalog may be temporarily unavailable. Try the request again.",
          eyebrow: "Temporary problem",
          retry: "Try again",
          title: "We could not load this factory",
        },
        gallery: {
          ariaLabel: "Photos of {{name}}",
          position: "{{current}} of {{count}}",
        },
        loading: "Loading factory…",
        location: "{{city}}, China",
        map: {
          ariaLabel: "Map preview of {{name}}",
          attribution: "© MapTiler · © OpenStreetMap contributors",
          error: "The map preview could not be loaded.",
          heading: "Factory location",
          loading: "Loading map preview…",
          retry: "Retry",
        },
        navigation: {
          actionError: "Navigation could not be opened. Try again.",
          amap: "Amap",
          apple: "Apple Maps",
          baidu: "Baidu Maps",
          google: "Google Maps",
          heading: "Navigate to factory",
          openHint:
            "Opens route planning with {{provider}}. If the app is unavailable, a web page opens instead.",
        },
        notFound: {
          backToMap: "Browse the map",
          description:
            "The link may be outdated, or the factory is not currently published.",
          eyebrow: "Factory unavailable",
          title: "This factory was not found",
        },
        related: {
          heading: "Related factories",
          viewDetails: "View details",
          viewDetailsLabel: "View details for {{name}}",
        },
        trust: {
          source: "Source",
          unverified: "Unverified",
          verified: "Verified",
          verifiedMonth: "Verified {{month}}",
        },
      },
      favorites: {
        allLoaded: "All saved suppliers are shown.",
        description:
          "Keep industrial clusters and factories together for your sourcing research.",
        empty: "You have no saved suppliers in this section yet.",
        error: {
          description:
            "Your saved suppliers may be temporarily unavailable. Try the request again.",
          retry: "Try again",
          title: "We could not load your saved suppliers",
        },
        eyebrow: "Buyer shortlist",
        imageAlt: "{{name}} supplier",
        loadMore: "Load more saved suppliers",
        loading: "Loading saved suppliers…",
        loadingMore: "Loading more…",
        moreMayMatch:
          "More saved suppliers may match this section. Load the next page to continue.",
        remove: "Remove",
        removeError: "This saved supplier could not be removed. Try again.",
        removeLabel: "Remove {{name}} from saved suppliers",
        removed: "Removed from saved suppliers.",
        removing: "Removing…",
        save: {
          action: "Save",
          checking: "Checking your account…",
          error: "This supplier could not be saved. Try again.",
          retry: "Try again",
          saved: "Saved",
          saving: "Saving…",
          signInHint: "Sign in to save this supplier and return here.",
        },
        signedOut: {
          action: "Sign in to view saved suppliers",
          description:
            "Sign in to keep factories and industrial clusters available across devices.",
          title: "Your saved suppliers will appear here",
        },
        tabs: {
          clusters: "Industrial clusters",
          factories: "Factories",
        },
        title: "Saved suppliers",
        unavailable: {
          description:
            "This supplier is no longer publicly available. You can still remove it from your saved list.",
          title: "Saved supplier unavailable",
        },
        verification: {
          unverified: "Unverified",
          verified: "Verified",
        },
        viewDetails: "View details",
        viewDetailsLabel: "View details for {{name}}",
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
      tabs: {
        account: "Account",
        explore: "Explore",
        map: "Map",
        saved: "Saved",
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
