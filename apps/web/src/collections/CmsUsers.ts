import type { CollectionConfig, PayloadRequest } from "payload";

const authenticated = ({ req }: { req: PayloadRequest }): boolean =>
  Boolean(req.user);

export const CmsUsers: CollectionConfig = {
  slug: "cms-users",
  access: {
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ["name", "email", "updatedAt"],
    useAsTitle: "email",
  },
  auth: true,
  fields: [
    {
      name: "name",
      type: "text",
    },
  ],
  timestamps: true,
};
