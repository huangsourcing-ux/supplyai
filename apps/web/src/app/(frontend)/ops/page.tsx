import { getTranslations } from "next-intl/server";

import { requireOpsAdmin } from "@/auth/require-ops-admin";

import { ApiHealthStatus } from "./api-health-status";
import { OpsDashboard, type OpsLabels } from "./ops-dashboard";
import { SentrySmoke } from "./sentry-smoke";

export default async function OperationsPage() {
  const [{ userId }, translate] = await Promise.all([
    requireOpsAdmin(),
    getTranslations("Operations"),
  ]);

  const labels: OpsLabels = {
    actionError: translate("dashboard.actionError"),
    authError: translate("dashboard.authError"),
    clusterList: translate("dashboard.clusterList"),
    emptyList: translate("dashboard.emptyList"),
    factoryList: translate("dashboard.factoryList"),
    fields: {
      addressEn: translate("dashboard.fields.addressEn"),
      addressZh: translate("dashboard.fields.addressZh"),
      boundary: translate("dashboard.fields.boundary"),
      categories: translate("dashboard.fields.categories"),
      certifications: translate("dashboard.fields.certifications"),
      clusterId: translate("dashboard.fields.clusterId"),
      contactEmail: translate("dashboard.fields.contactEmail"),
      contactPhone: translate("dashboard.fields.contactPhone"),
      contactWechat: translate("dashboard.fields.contactWechat"),
      contactWebsite: translate("dashboard.fields.contactWebsite"),
      descriptionEn: translate("dashboard.fields.descriptionEn"),
      descriptionZh: translate("dashboard.fields.descriptionZh"),
      employeeRange: translate("dashboard.fields.employeeRange"),
      establishedYear: translate("dashboard.fields.establishedYear"),
      latitude: translate("dashboard.fields.latitude"),
      longitude: translate("dashboard.fields.longitude"),
      mainProducts: translate("dashboard.fields.mainProducts"),
      moq: translate("dashboard.fields.moq"),
      nameEn: translate("dashboard.fields.nameEn"),
      nameZh: translate("dashboard.fields.nameZh"),
      primaryCategory: translate("dashboard.fields.primaryCategory"),
      region: translate("dashboard.fields.region"),
      slug: translate("dashboard.fields.slug"),
      sourceName: translate("dashboard.fields.sourceName"),
      sourceUrl: translate("dashboard.fields.sourceUrl"),
      summaryEn: translate("dashboard.fields.summaryEn"),
      summaryZh: translate("dashboard.fields.summaryZh"),
    },
    formError: translate("dashboard.formError"),
    instructions: translate("dashboard.instructions"),
    loading: translate("dashboard.loading"),
    map: {
      ariaLabel: translate("dashboard.map.ariaLabel"),
      attributionLabel: translate("dashboard.map.attributionLabel"),
      instructions: translate("dashboard.map.instructions"),
      loading: translate("dashboard.map.loading"),
      mapError: translate("dashboard.map.error"),
      mapTilerLogoAlt: translate("dashboard.map.mapTilerLogoAlt"),
      retry: translate("dashboard.retry"),
    },
    media: {
      altEn: translate("dashboard.media.altEn"),
      altZh: translate("dashboard.media.altZh"),
      attachRetry: translate("dashboard.media.attachRetry"),
      chooseImage: translate("dashboard.media.chooseImage"),
      clear: translate("dashboard.media.clear"),
      clusterCover: translate("dashboard.media.clusterCover"),
      detach: translate("dashboard.media.detach"),
      factoryImages: translate("dashboard.media.factoryImages"),
      fileRequirements: translate("dashboard.media.fileRequirements"),
      moveDown: translate("dashboard.media.moveDown"),
      moveUp: translate("dashboard.media.moveUp"),
      noMedia: translate("dashboard.media.noMedia"),
      referenceError: translate("dashboard.media.referenceError"),
      saveAlt: translate("dashboard.media.saveAlt"),
      success: translate("dashboard.media.success"),
      upload: translate("dashboard.media.upload"),
      uploadError: translate("dashboard.media.uploadError"),
      uploading: translate("dashboard.media.uploading"),
      verificationReset: translate("dashboard.verificationReset"),
    },
    newCluster: translate("dashboard.newCluster"),
    newFactory: translate("dashboard.newFactory"),
    newRecord: translate("dashboard.newRecord"),
    noSelection: translate("dashboard.noSelection"),
    publish: translate("dashboard.publish"),
    publishingBlocked: translate("dashboard.publishingBlocked"),
    reviewConfirmation: translate("dashboard.reviewConfirmation"),
    reviewRecord: translate("dashboard.reviewRecord"),
    retry: translate("dashboard.retry"),
    save: translate("dashboard.save"),
    saving: translate("dashboard.saving"),
    statusDraft: translate("dashboard.statusDraft"),
    statusPublished: translate("dashboard.statusPublished"),
    unpublish: translate("dashboard.unpublish"),
    unverified: translate("dashboard.unverified"),
    verificationReset: translate("dashboard.verificationReset"),
    verified: translate("dashboard.verified"),
    verify: translate("dashboard.verify"),
    uploadAfterCreate: translate("dashboard.uploadAfterCreate"),
  };

  return (
    <OpsDashboard
      diagnostics={
        <>
          <p className="identifier">
            {translate("signedInAs")}: {userId}
          </p>
          <ApiHealthStatus
            labels={{
              error: translate("apiHealth.error"),
              loading: translate("apiHealth.loading"),
              ready: translate("apiHealth.ready"),
            }}
          />
          <SentrySmoke
            buttonLabel={translate("sentry.button")}
            environmentLabel={translate("sentry.environment")}
            eventLabel={translate("sentry.event")}
            flushFailedLabel={translate("sentry.flushFailed")}
            releaseLabel={translate("sentry.release")}
            sentLabel={translate("sentry.sent")}
          />
        </>
      }
      labels={labels}
      userId={userId}
    />
  );
}
