import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import {
  PUBLIC_AUTH_FALLBACK_PATH,
  PUBLIC_SIGN_IN_PATH,
} from "@/auth/public-auth-routes";
import { DEFAULT_LOCALE } from "@/i18n/config";

import { ApiQueryProvider } from "./api-query-provider";
import { PublicNavigation } from "./public-navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Metadata");

  return {
    description: translate("description"),
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
    title: translate("title"),
  };
}

export default async function FrontendLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [messages, navigation] = await Promise.all([
    getMessages(),
    getTranslations("Navigation"),
  ]);

  return (
    <html className={GeistSans.variable} lang={DEFAULT_LOCALE}>
      <body>
        <ClerkProvider
          signInFallbackRedirectUrl={PUBLIC_AUTH_FALLBACK_PATH}
          signInUrl={PUBLIC_SIGN_IN_PATH}
          signUpFallbackRedirectUrl={PUBLIC_AUTH_FALLBACK_PATH}
        >
          <NextIntlClientProvider messages={messages}>
            <ApiQueryProvider>
              <PublicNavigation
                labels={{
                  account: navigation("account"),
                  brand: navigation("brand"),
                  map: navigation("map"),
                  saved: navigation("saved"),
                }}
              />
              {children}
            </ApiQueryProvider>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
