import { deploymentEnvironmentSchema, isPlaceholder } from "./common.js";

const sentryEnvironmentNames = /** @type {const} */ ({
  local: "dev",
  production: "prod",
  staging: "staging",
});

/**
 * Sentry uses the product-facing dev/staging/prod names while the application
 * keeps the frozen local/staging/production environment contract.
 *
 * @param {unknown} environment
 * @returns {"dev" | "staging" | "prod"}
 */
export function toSentryEnvironment(environment) {
  return sentryEnvironmentNames[deploymentEnvironmentSchema.parse(environment)];
}

/**
 * @param {string | undefined} dsn
 * @returns {boolean}
 */
export function isSentryDsnConfigured(dsn) {
  if (!dsn || isPlaceholder(dsn)) {
    return false;
  }

  try {
    const url = new URL(dsn);
    return (
      url.protocol === "https:" &&
      url.username.length > 0 &&
      !url.hostname.endsWith(".invalid")
    );
  } catch {
    return false;
  }
}

/**
 * @param {{
 *   component: "api" | "web";
 *   explicitRelease?: string;
 *   revision?: string;
 *   version: string;
 * }} options
 * @returns {string}
 */
export function createSentryRelease({
  component,
  explicitRelease,
  revision,
  version,
}) {
  if (explicitRelease) {
    return explicitRelease;
  }

  const normalizedRevision =
    revision?.trim().replace(/[^a-zA-Z0-9._-]/g, "-") || "dev";

  return `chinasupply-${component}@${version}+${normalizedRevision}`;
}
