import type { CollectionConfig } from "payload";

import { Articles } from "./Articles";
import { CmsUsers } from "./CmsUsers";
import { Media } from "./Media";

export const cmsCollections = [
  CmsUsers,
  Media,
  Articles,
] satisfies CollectionConfig[];
