/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from "@payload-config";
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";
import type { Metadata } from "next";

import { importMap } from "../importMap";

type Arguments = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[]>>;
};

export const generateMetadata = ({
  params,
  searchParams,
}: Arguments): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

export default function Page({ params, searchParams }: Arguments) {
  return RootPage({ config, importMap, params, searchParams });
}
