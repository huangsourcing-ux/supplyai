import {
  BlocksFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
import { coreIdSchema, slugSchema } from "@chinasupply/schemas";
import type { Block, CollectionConfig, PayloadRequest } from "payload";

import { articleHooks } from "@/cms/article-hooks";

const authenticated = ({ req }: { req: PayloadRequest }): boolean =>
  Boolean(req.user);

export const ClusterCardBlock: Block = {
  slug: "clusterCard",
  admin: {
    group: "ChinaSupply.AI",
  },
  fields: [
    {
      name: "clusterId",
      type: "text",
      admin: {
        components: {
          Field: "@/cms/components/ClusterCardPicker#ClusterCardPicker",
        },
        description:
          "Select a currently published industrial cluster. Only its 21-character ID is saved.",
      },
      required: true,
      validate: (value: unknown) =>
        coreIdSchema.safeParse(value).success ||
        "Choose a valid published industrial cluster.",
    },
  ],
};

export const Articles: CollectionConfig = {
  slug: "articles",
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ["title", "slug", "_status", "publishedAt", "updatedAt"],
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      type: "text",
      maxLength: 200,
      required: true,
    },
    {
      name: "slug",
      type: "text",
      index: true,
      maxLength: 160,
      required: true,
      unique: true,
      validate: (value: unknown) =>
        slugSchema.safeParse(value).success ||
        "Use a lowercase English slug with hyphens only.",
    },
    {
      name: "locale",
      type: "select",
      admin: { readOnly: true },
      defaultValue: "en",
      options: [{ label: "English", value: "en" }],
      required: true,
    },
    {
      name: "cover",
      type: "relationship",
      relationTo: "media",
      required: true,
    },
    {
      name: "body",
      type: "richText",
      editor: lexicalEditor({
        features: () => [
          ParagraphFeature(),
          HeadingFeature({ enabledHeadingSizes: ["h2", "h3"] }),
          BoldFeature(),
          ItalicFeature(),
          UnderlineFeature(),
          OrderedListFeature(),
          UnorderedListFeature(),
          LinkFeature({ enabledCollections: [] }),
          BlocksFeature({ blocks: [ClusterCardBlock] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
      required: true,
    },
    {
      name: "publishedAt",
      type: "date",
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        readOnly: true,
      },
      index: true,
    },
  ],
  hooks: articleHooks,
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 25,
  },
};
