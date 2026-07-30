import type {
  CreateAdminClusterBody,
  CreateAdminFactoryBody,
  UpdateAdminClusterBody,
  UpdateAdminFactoryBody,
} from "@chinasupply/api-client";

function requireText(data: FormData, name: string): string {
  const value = data.get(name);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function optionalText(data: FormData, name: string): string | null {
  const value = data.get(name);
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  return value.trim();
}

function requireNumber(
  data: FormData,
  name: string,
  minimum: number,
  maximum: number,
): number {
  const value = Number(requireText(data, name));
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be from ${minimum} to ${maximum}`);
  }
  return value;
}

function parseEstablishedYear(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1800 || year > 2100) {
    throw new Error("establishedYear must be an integer from 1800 to 2100");
  }
  return year;
}

function parseLocalized(
  data: FormData,
  prefix: string,
): { en: string; zh: string } {
  return {
    en: requireText(data, `${prefix}En`),
    zh: requireText(data, `${prefix}Zh`),
  };
}

function parseNullableLocalized(
  data: FormData,
  prefix: string,
): { en: string; zh: string } | null {
  const en = optionalText(data, `${prefix}En`);
  const zh = optionalText(data, `${prefix}Zh`);
  if (en === null && zh === null) {
    return null;
  }
  if (en === null || zh === null) {
    throw new Error(`${prefix} requires both English and Chinese`);
  }
  return { en, zh };
}

export function parseIdList(value: string): string[] {
  const ids = value
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean);
  if (ids.length === 0 || new Set(ids).size !== ids.length) {
    throw new Error("IDs must be a non-empty unique list");
  }
  return ids;
}

export function parseProducts(value: string): { en: string; zh: string }[] {
  const products = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("|");
      const en = line.slice(0, separator).trim();
      const zh = line.slice(separator + 1).trim();
      if (separator < 1 || en === "" || zh === "") {
        throw new Error("Each product must use one English | Chinese line");
      }
      return { en, zh };
    });
  if (products.length === 0) {
    throw new Error("At least one main product is required");
  }
  return products;
}

export function serializeProducts(
  products: readonly { en: string; zh: string }[],
): string {
  return products.map((product) => `${product.en} | ${product.zh}`).join("\n");
}

function parseBoundary(
  value: string | null,
): UpdateAdminClusterBody["boundary"] {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Boundary must be GeoJSON");
  }
  return parsed as NonNullable<UpdateAdminClusterBody["boundary"]>;
}

function parsePoint(data: FormData, prefix: "centroid" | "location") {
  return {
    coordinates: [
      requireNumber(data, `${prefix}Lng`, -180, 180),
      requireNumber(data, `${prefix}Lat`, -90, 90),
    ] as [number, number],
    type: "Point" as const,
  };
}

function parseContact(data: FormData) {
  const website = optionalText(data, "website");
  const email = optionalText(data, "email");
  const phone = optionalText(data, "phone");
  const wechat = optionalText(data, "wechat");
  return website === null && email === null && phone === null && wechat === null
    ? null
    : {
        ...(email === null ? {} : { email }),
        ...(phone === null ? {} : { phone }),
        ...(wechat === null ? {} : { wechat }),
        ...(website === null ? {} : { website }),
      };
}

function parseCertifications(data: FormData) {
  return (optionalText(data, "certifications") ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildClusterCreate(data: FormData): CreateAdminClusterBody {
  const boundary = parseBoundary(optionalText(data, "boundary"));
  const description = parseNullableLocalized(data, "description");

  return {
    ...(boundary === null ? {} : { boundary }),
    categoryIds: parseIdList(requireText(data, "categoryIds")),
    centroid: parsePoint(data, "centroid"),
    ...(description === null ? {} : { description }),
    mainProducts: parseProducts(requireText(data, "mainProducts")),
    name: parseLocalized(data, "name"),
    primaryCategoryId: requireText(data, "primaryCategoryId"),
    regionId: requireText(data, "regionId"),
    slug: requireText(data, "slug"),
    summary: parseLocalized(data, "summary"),
  };
}

export function buildClusterUpdate(data: FormData): UpdateAdminClusterBody {
  return {
    boundary: parseBoundary(optionalText(data, "boundary")),
    categoryIds: parseIdList(requireText(data, "categoryIds")),
    centroid: parsePoint(data, "centroid"),
    description: parseNullableLocalized(data, "description"),
    mainProducts: parseProducts(requireText(data, "mainProducts")),
    name: parseLocalized(data, "name"),
    primaryCategoryId: requireText(data, "primaryCategoryId"),
    regionId: requireText(data, "regionId"),
    slug: requireText(data, "slug"),
    summary: parseLocalized(data, "summary"),
  };
}

export function buildFactoryCreate(data: FormData): CreateAdminFactoryBody {
  const contact = parseContact(data);
  const establishedYear = optionalText(data, "establishedYear");

  return {
    address: parseLocalized(data, "address"),
    categoryIds: parseIdList(requireText(data, "categoryIds")),
    certifications: parseCertifications(data),
    clusterId: optionalText(data, "clusterId"),
    ...(contact === null ? {} : { contact }),
    employeeRange: optionalText(data, "employeeRange"),
    establishedYear: parseEstablishedYear(establishedYear),
    location: parsePoint(data, "location"),
    mainProducts: parseProducts(requireText(data, "mainProducts")),
    moq: optionalText(data, "moq"),
    name: parseLocalized(data, "name"),
    regionId: requireText(data, "regionId"),
    slug: requireText(data, "slug"),
    sourceName: optionalText(data, "sourceName"),
    sourceUrl: optionalText(data, "sourceUrl"),
  };
}

export function buildFactoryUpdate(data: FormData): UpdateAdminFactoryBody {
  const contact = parseContact(data);
  const establishedYear = optionalText(data, "establishedYear");

  return {
    address: parseLocalized(data, "address"),
    categoryIds: parseIdList(requireText(data, "categoryIds")),
    certifications: parseCertifications(data),
    clusterId: optionalText(data, "clusterId"),
    contact,
    employeeRange: optionalText(data, "employeeRange"),
    establishedYear: parseEstablishedYear(establishedYear),
    location: parsePoint(data, "location"),
    mainProducts: parseProducts(requireText(data, "mainProducts")),
    moq: optionalText(data, "moq"),
    name: parseLocalized(data, "name"),
    regionId: requireText(data, "regionId"),
    slug: requireText(data, "slug"),
    sourceName: optionalText(data, "sourceName"),
    sourceUrl: optionalText(data, "sourceUrl"),
  };
}
