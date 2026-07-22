import { parseWebEnv } from "@chinasupply/config/env/web";
import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

parseWebEnv(process.env);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@chinasupply/config"],
  turbopack: {
    root: path.resolve(currentDirectory, "../.."),
  },
};

export default withPayload(withNextIntl(nextConfig), {
  devBundleServerPackages: false,
});
