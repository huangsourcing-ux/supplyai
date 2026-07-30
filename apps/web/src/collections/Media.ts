import type { CollectionConfig, PayloadRequest } from "payload";

import { mediaHooks } from "@/cms/media-hooks";

const authenticated = ({ req }: { req: PayloadRequest }): boolean =>
  Boolean(req.user);

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ["filename", "alt", "aiGenerated", "updatedAt"],
    useAsTitle: "alt",
  },
  fields: [
    {
      name: "url",
      type: "text",
      admin: {
        hidden: true,
        readOnly: true,
      },
      virtual: true,
    },
    {
      name: "thumbnailURL",
      type: "text",
      admin: {
        hidden: true,
        readOnly: true,
      },
      virtual: true,
    },
    {
      name: "alt",
      type: "text",
      admin: {
        description: "Required English alternative text for the image.",
      },
      maxLength: 300,
      required: true,
    },
    {
      name: "aiGenerated",
      type: "checkbox",
      admin: {
        description: "Mark generated editorial artwork for visible disclosure.",
      },
      defaultValue: false,
      required: true,
    },
    {
      name: "objectKey",
      type: "text",
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
      },
      index: true,
      required: true,
      unique: true,
    },
  ],
  hooks: mediaHooks,
  timestamps: true,
  upload: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    pasteURL: false,
  },
};
