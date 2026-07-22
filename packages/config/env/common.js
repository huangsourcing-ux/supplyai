import { z } from "zod";

export const deploymentEnvironmentSchema = z.enum([
  "local",
  "staging",
  "production",
]);

export const portSchema = z.coerce.number().int().min(1).max(65535);

export const networkUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "must be a valid URL" },
  );

/** @typedef {z.infer<typeof deploymentEnvironmentSchema>} DeploymentEnvironment */

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isLocalUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.startsWith("127.")
    );
  } catch {
    return false;
  }
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isPlaceholder(value) {
  return /replace[_-]?me|example/i.test(value);
}

/**
 * @param {string} value
 * @param {string} path
 * @param {import("zod").RefinementCtx} context
 * @param {{ httpsOnly?: boolean }} [options]
 */
export function requireRemoteUrl(value, path, context, options = {}) {
  if (isLocalUrl(value)) {
    context.addIssue({
      code: "custom",
      path: [path],
      message: "must not use a local host outside local development",
    });
  }

  if (options.httpsOnly && new URL(value).protocol !== "https:") {
    context.addIssue({
      code: "custom",
      path: [path],
      message: "must use HTTPS outside local development",
    });
  }
}

/**
 * @param {string} value
 * @param {string} path
 * @param {import("zod").RefinementCtx} context
 */
export function rejectPlaceholder(value, path, context) {
  if (isPlaceholder(value)) {
    context.addIssue({
      code: "custom",
      path: [path],
      message: "must be replaced outside local development",
    });
  }
}

/**
 * @param {string} value
 * @param {"publishable" | "secret"} type
 * @param {DeploymentEnvironment} environment
 * @param {string} path
 * @param {import("zod").RefinementCtx} context
 */
export function requireClerkKey(value, type, environment, path, context) {
  const expectedPrefix = `${type === "secret" ? "sk" : "pk"}_${
    environment === "production" ? "live" : "test"
  }_`;

  if (!value.startsWith(expectedPrefix)) {
    context.addIssue({
      code: "custom",
      path: [path],
      message: `must use the ${expectedPrefix} key family`,
    });
  }
}

/**
 * @param {string} prefix
 * @param {DeploymentEnvironment} environment
 * @param {import("zod").RefinementCtx} context
 */
export function requireR2Prefix(prefix, environment, context) {
  const expected =
    environment === "local"
      ? "dev"
      : environment === "staging"
        ? "staging"
        : "";

  if (prefix !== expected) {
    context.addIssue({
      code: "custom",
      path: ["R2_PREFIX"],
      message:
        environment === "production"
          ? "must be empty for the dedicated production bucket"
          : `must be ${expected} for this environment`,
    });
  }
}

/**
 * @template {import("zod").ZodType} Schema
 * @param {Schema} schema
 * @param {unknown} source
 * @param {string} label
 * @returns {import("zod").output<Schema>}
 */
export function parseEnvironment(schema, source, label) {
  const result = schema.safeParse(source);
  if (result.success) {
    return result.data;
  }

  const fields = [
    ...new Set(
      result.error.issues.map((issue) => issue.path.join(".") || "environment"),
    ),
  ].sort();

  throw new Error(
    `${label} environment validation failed: ${fields.join(", ")}`,
  );
}
