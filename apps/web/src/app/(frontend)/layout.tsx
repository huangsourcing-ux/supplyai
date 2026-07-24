import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { OPS_HOME_PATH, OPS_SIGN_IN_PATH } from "@/auth/ops-routes";
import { DEFAULT_LOCALE } from "@/i18n/config";

import { ApiQueryProvider } from "./api-query-provider";
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
  const messages = await getMessages();

  return (
    <html className={GeistSans.variable} lang={DEFAULT_LOCALE}>
      <body>
        <ClerkProvider
          signInFallbackRedirectUrl={OPS_HOME_PATH}
          signInUrl={OPS_SIGN_IN_PATH}
        >
          <NextIntlClientProvider messages={messages}>
            <ApiQueryProvider>{children}</ApiQueryProvider>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
