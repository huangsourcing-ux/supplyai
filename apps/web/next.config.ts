import { parseWebEnv } from "@chinasupply/config/env/web";
import { createSentryRelease } from "@chinasupply/config/env/sentry";
import { withPayload } from "@payloadcms/next/withPayload";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const environment = parseWebEnv(process.env);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const sentryRelease = createSentryRelease({
  component: "web",
  explicitRelease: process.env.SENTRY_RELEASE,
  revision:
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.GIT_COMMIT_SHA,
  version: "0.0.0",
});
const canUploadSentrySourceMaps =
  environment.SENTRY_AUTH_TOKEN.startsWith("sntrys_") &&
  environment.SENTRY_ORG !== undefined &&
  environment.SENTRY_ORG !== "replace_me" &&
  environment.SENTRY_PROJECT !== undefined &&
  environment.SENTRY_PROJECT !== "replace_me";

process.env.SENTRY_RELEASE = sentryRelease;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: sentryRelease,
  },
  reactStrictMode: true,
  transpilePackages: ["@chinasupply/api-client", "@chinasupply/config"],
  turbopack: {
    root: path.resolve(currentDirectory, "../.."),
  },
};

const payloadConfig = withPayload(withNextIntl(nextConfig), {
  devBundleServerPackages: false,
});

export default withSentryConfig(payloadConfig, {
  org: environment.SENTRY_ORG ?? "replace_me",
  project: environment.SENTRY_PROJECT ?? "replace_me",
  release: {
    create: canUploadSentrySourceMaps,
    name: sentryRelease,
  },
  silent: !canUploadSentrySourceMaps,
  sourcemaps: {
    disable: !canUploadSentrySourceMaps,
  },
  telemetry: false,
});
