"use client";

import {
  createAdminCluster,
  createAdminFactory,
  getAdminCluster,
  getAdminClusters,
  getAdminFactories,
  getAdminFactory,
  publishAdminCluster,
  publishAdminFactory,
  unpublishAdminCluster,
  unpublishAdminFactory,
  updateAdminCluster,
  updateAdminFactory,
  verifyAdminFactory,
  type CreateAdminClusterBody,
  type CreateAdminFactoryBody,
  type GetAdminCluster200Data,
  type GetAdminClusters200DataItem,
  type GetAdminFactories200DataItem,
  type GetAdminFactory200Data,
  type UpdateAdminClusterBody,
  type UpdateAdminFactoryBody,
} from "@chinasupply/api-client";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import React from "react";
import { useCallback, useState } from "react";

import {
  buildClusterCreate,
  buildClusterUpdate,
  buildFactoryCreate,
  buildFactoryUpdate,
  serializeProducts,
} from "./ops-form-data";
import {
  ClusterMediaEditor,
  FactoryMediaEditor,
  type OpsMediaLabels,
} from "./ops-media-editor";
import { OpsPointPicker, type OpsPointPickerLabels } from "./ops-point-picker";
import styles from "./ops-dashboard.module.css";

export interface OpsLabels {
  actionError: string;
  authError: string;
  clusterList: string;
  emptyList: string;
  factoryList: string;
  fields: {
    addressEn: string;
    addressZh: string;
    boundary: string;
    categories: string;
    certifications: string;
    clusterId: string;
    contactEmail: string;
    contactPhone: string;
    contactWechat: string;
    contactWebsite: string;
    descriptionEn: string;
    descriptionZh: string;
    employeeRange: string;
    establishedYear: string;
    latitude: string;
    longitude: string;
    mainProducts: string;
    moq: string;
    nameEn: string;
    nameZh: string;
    primaryCategory: string;
    region: string;
    slug: string;
    sourceName: string;
    sourceUrl: string;
    summaryEn: string;
    summaryZh: string;
  };
  formError: string;
  instructions: string;
  loading: string;
  map: Omit<OpsPointPickerLabels, "latitude" | "longitude">;
  media: OpsMediaLabels;
  newCluster: string;
  newFactory: string;
  newRecord: string;
  noSelection: string;
  publish: string;
  publishingBlocked: string;
  reviewConfirmation: string;
  reviewRecord: string;
  retry: string;
  save: string;
  saving: string;
  statusDraft: string;
  statusPublished: string;
  unpublish: string;
  unverified: string;
  verificationReset: string;
  verified: string;
  verify: string;
  uploadAfterCreate: string;
}

type EntitySelection =
  | { id: string | null; kind: "cluster" }
  | {
      id: string | null;
      kind: "factory";
    };

type OpsMutation =
  | { body: CreateAdminClusterBody; type: "createCluster" }
  | { body: CreateAdminFactoryBody; type: "createFactory" }
  | { body: UpdateAdminClusterBody; id: string; type: "updateCluster" }
  | { body: UpdateAdminFactoryBody; id: string; type: "updateFactory" }
  | {
      id: string;
      type:
        | "publishCluster"
        | "publishFactory"
        | "unpublishCluster"
        | "unpublishFactory"
        | "verifyFactory";
    };

async function requestWithToken(
  getToken: () => Promise<string | null>,
  signal?: AbortSignal,
): Promise<RequestInit> {
  const token = await getToken();
  if (token === null) {
    throw new Error("Clerk session token is unavailable");
  }
  return {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  };
}

function StatusBadge({
  labels,
  status,
  verified,
}: Readonly<{
  labels: OpsLabels;
  status: "draft" | "published";
  verified?: boolean;
}>) {
  return (
    <span className={styles.badges}>
      <span className={styles.badge} data-status={status}>
        {status === "published" ? labels.statusPublished : labels.statusDraft}
      </span>
      {verified === undefined ? null : (
        <span className={styles.badge} data-verified={String(verified)}>
          {verified ? labels.verified : labels.unverified}
        </span>
      )}
    </span>
  );
}

export function OpsEntityLists({
  clusters,
  factories,
  labels,
  onSelect,
  selection,
}: Readonly<{
  clusters: readonly GetAdminClusters200DataItem[];
  factories: readonly GetAdminFactories200DataItem[];
  labels: OpsLabels;
  onSelect: (selection: EntitySelection) => void;
  selection: EntitySelection | null;
}>) {
  const translate = useTranslations("Operations.dashboard");

  return (
    <div className={styles.lists}>
      <section aria-labelledby="ops-clusters-heading">
        <div className={styles.listHeading}>
          <div>
            <h2 id="ops-clusters-heading">{labels.clusterList}</h2>
            <span>{translate("clusterCount", { count: clusters.length })}</span>
          </div>
          <button
            aria-pressed={
              selection?.kind === "cluster" && selection.id === null
            }
            onClick={() => onSelect({ id: null, kind: "cluster" })}
            type="button"
          >
            {labels.newCluster}
          </button>
        </div>
        {clusters.length === 0 ? (
          <p className={styles.empty}>{labels.emptyList}</p>
        ) : (
          <ul className={styles.entityList}>
            {clusters.map((cluster) => (
              <li key={cluster.id}>
                <button
                  aria-pressed={
                    selection?.kind === "cluster" && selection.id === cluster.id
                  }
                  onClick={() => onSelect({ id: cluster.id, kind: "cluster" })}
                  type="button"
                >
                  <span>
                    <strong>{cluster.name.en}</strong>
                    <small>{cluster.name.zh}</small>
                  </span>
                  <StatusBadge labels={labels} status={cluster.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ops-factories-heading">
        <div className={styles.listHeading}>
          <div>
            <h2 id="ops-factories-heading">{labels.factoryList}</h2>
            <span>
              {translate("factoryCount", { count: factories.length })}
            </span>
          </div>
          <button
            aria-pressed={
              selection?.kind === "factory" && selection.id === null
            }
            onClick={() => onSelect({ id: null, kind: "factory" })}
            type="button"
          >
            {labels.newFactory}
          </button>
        </div>
        {factories.length === 0 ? (
          <p className={styles.empty}>{labels.emptyList}</p>
        ) : (
          <ul className={styles.entityList}>
            {factories.map((factory) => (
              <li key={factory.id}>
                <button
                  aria-pressed={
                    selection?.kind === "factory" && selection.id === factory.id
                  }
                  onClick={() => onSelect({ id: factory.id, kind: "factory" })}
                  type="button"
                >
                  <span>
                    <strong>{factory.name.en}</strong>
                    <small>{factory.name.zh}</small>
                  </span>
                  <StatusBadge
                    labels={labels}
                    status={factory.status}
                    verified={factory.verified}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({
  defaultValue,
  label,
  name,
  required = false,
  type = "text",
}: Readonly<{
  defaultValue: number | string;
  label: string;
  name: string;
  required?: boolean;
  type?: "number" | "text" | "url";
}>) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        defaultValue={defaultValue}
        name={name}
        required={required}
        step={type === "number" ? "any" : undefined}
        type={type}
      />
    </label>
  );
}

function TextAreaField({
  defaultValue,
  label,
  name,
  required = false,
  rows = 3,
}: Readonly<{
  defaultValue: string;
  label: string;
  name: string;
  required?: boolean;
  rows?: number;
}>) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <textarea
        defaultValue={defaultValue}
        name={name}
        required={required}
        rows={rows}
      />
    </label>
  );
}

function ReviewConfirmation({
  checked,
  labels,
  onChange,
}: Readonly<{
  checked: boolean;
  labels: OpsLabels;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <label className={styles.confirmation}>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{labels.reviewConfirmation}</span>
    </label>
  );
}

function FormError({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className={styles.error} role="alert">
      {children}
    </p>
  );
}

function pointPickerLabels(labels: OpsLabels): OpsPointPickerLabels {
  return {
    ...labels.map,
    latitude: labels.fields.latitude,
    longitude: labels.fields.longitude,
  };
}

function ActionError({
  labels,
  onRetry,
  pending,
}: Readonly<{
  labels: OpsLabels;
  onRetry: () => void;
  pending: boolean;
}>) {
  return (
    <div className={styles.error} role="alert">
      <span>{labels.actionError}</span>
      <button disabled={pending} onClick={onRetry} type="button">
        {labels.retry}
      </button>
    </div>
  );
}

export function ClusterEditor({
  actionError,
  data,
  getRequest,
  labels,
  onAction,
  onMediaUpdate,
  onRetry,
  onSave,
  pending,
}: Readonly<{
  actionError: boolean;
  data: GetAdminCluster200Data;
  getRequest: () => Promise<RequestInit>;
  labels: OpsLabels;
  onAction: (type: "publishCluster" | "unpublishCluster") => void;
  onMediaUpdate: (body: UpdateAdminClusterBody) => Promise<unknown>;
  onRetry: () => void;
  onSave: (body: UpdateAdminClusterBody) => void;
  pending: boolean;
}>) {
  const [confirmed, setConfirmed] = useState(false);
  const [formInvalid, setFormInvalid] = useState(false);

  return (
    <section className={styles.editor} aria-labelledby="ops-editor-heading">
      <header className={styles.editorHeader}>
        <div>
          <p>{labels.clusterList}</p>
          <h2 id="ops-editor-heading">{data.name.en}</h2>
          <small>{data.id}</small>
        </div>
        <StatusBadge labels={labels} status={data.status} />
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave(buildClusterUpdate(new FormData(event.currentTarget)));
            setFormInvalid(false);
          } catch {
            setFormInvalid(true);
          }
        }}
      >
        <div className={styles.formGrid}>
          <Field
            defaultValue={data.slug}
            label={labels.fields.slug}
            name="slug"
            required
          />
          <Field
            defaultValue={data.regionId}
            label={labels.fields.region}
            name="regionId"
            required
          />
          <Field
            defaultValue={data.name.en}
            label={labels.fields.nameEn}
            name="nameEn"
            required
          />
          <Field
            defaultValue={data.name.zh}
            label={labels.fields.nameZh}
            name="nameZh"
            required
          />
          <Field
            defaultValue={data.primaryCategoryId}
            label={labels.fields.primaryCategory}
            name="primaryCategoryId"
            required
          />
          <TextAreaField
            defaultValue={data.categoryIds.join("\n")}
            label={labels.fields.categories}
            name="categoryIds"
            required
          />
          <OpsPointPicker
            initialCoordinates={data.centroid.coordinates}
            labels={pointPickerLabels(labels)}
            latitudeName="centroidLat"
            longitudeName="centroidLng"
          />
          <TextAreaField
            defaultValue={data.summary.en}
            label={labels.fields.summaryEn}
            name="summaryEn"
            required
          />
          <TextAreaField
            defaultValue={data.summary.zh}
            label={labels.fields.summaryZh}
            name="summaryZh"
            required
          />
          <TextAreaField
            defaultValue={data.description?.en ?? ""}
            label={labels.fields.descriptionEn}
            name="descriptionEn"
          />
          <TextAreaField
            defaultValue={data.description?.zh ?? ""}
            label={labels.fields.descriptionZh}
            name="descriptionZh"
          />
          <TextAreaField
            defaultValue={serializeProducts(data.mainProducts)}
            label={labels.fields.mainProducts}
            name="mainProducts"
            required
          />
          <TextAreaField
            defaultValue={
              data.boundary === null
                ? ""
                : JSON.stringify(data.boundary, null, 2)
            }
            label={labels.fields.boundary}
            name="boundary"
            rows={8}
          />
        </div>
        {formInvalid ? <FormError>{labels.formError}</FormError> : null}
        {actionError ? (
          <ActionError labels={labels} onRetry={onRetry} pending={pending} />
        ) : null}
        <div className={styles.formActions}>
          <button disabled={pending} type="submit">
            {pending ? labels.saving : labels.save}
          </button>
        </div>
      </form>

      <ClusterMediaEditor
        data={data}
        getRequest={getRequest}
        labels={labels.media}
        onUpdate={onMediaUpdate}
      />

      <div className={styles.reviewActions}>
        {data.status === "draft" ? (
          <>
            <ReviewConfirmation
              checked={confirmed}
              labels={labels}
              onChange={setConfirmed}
            />
            <button
              disabled={pending || !confirmed}
              onClick={() => onAction("publishCluster")}
              type="button"
            >
              {labels.publish}
            </button>
          </>
        ) : (
          <button
            className={styles.dangerButton}
            disabled={pending}
            onClick={() => onAction("unpublishCluster")}
            type="button"
          >
            {labels.unpublish}
          </button>
        )}
      </div>
    </section>
  );
}

export function FactoryEditor({
  actionError,
  data,
  getRequest,
  labels,
  onAction,
  onMediaUpdate,
  onRetry,
  onSave,
  pending,
}: Readonly<{
  actionError: boolean;
  data: GetAdminFactory200Data;
  getRequest: () => Promise<RequestInit>;
  labels: OpsLabels;
  onAction: (
    type: "publishFactory" | "unpublishFactory" | "verifyFactory",
  ) => void;
  onMediaUpdate: (body: UpdateAdminFactoryBody) => Promise<unknown>;
  onRetry: () => void;
  onSave: (body: UpdateAdminFactoryBody) => void;
  pending: boolean;
}>) {
  const [confirmed, setConfirmed] = useState(false);
  const [formInvalid, setFormInvalid] = useState(false);

  return (
    <section className={styles.editor} aria-labelledby="ops-editor-heading">
      <header className={styles.editorHeader}>
        <div>
          <p>{labels.factoryList}</p>
          <h2 id="ops-editor-heading">{data.name.en}</h2>
          <small>{data.id}</small>
        </div>
        <StatusBadge
          labels={labels}
          status={data.status}
          verified={data.verified}
        />
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave(buildFactoryUpdate(new FormData(event.currentTarget)));
            setFormInvalid(false);
          } catch {
            setFormInvalid(true);
          }
        }}
      >
        {data.verified ? (
          <p className={styles.warning}>{labels.verificationReset}</p>
        ) : null}
        <div className={styles.formGrid}>
          <Field
            defaultValue={data.slug}
            label={labels.fields.slug}
            name="slug"
            required
          />
          <Field
            defaultValue={data.regionId}
            label={labels.fields.region}
            name="regionId"
            required
          />
          <Field
            defaultValue={data.name.en}
            label={labels.fields.nameEn}
            name="nameEn"
            required
          />
          <Field
            defaultValue={data.name.zh}
            label={labels.fields.nameZh}
            name="nameZh"
            required
          />
          <Field
            defaultValue={data.clusterId ?? ""}
            label={labels.fields.clusterId}
            name="clusterId"
          />
          <TextAreaField
            defaultValue={data.categoryIds.join("\n")}
            label={labels.fields.categories}
            name="categoryIds"
            required
          />
          <OpsPointPicker
            initialCoordinates={data.location.coordinates}
            labels={pointPickerLabels(labels)}
            latitudeName="locationLat"
            longitudeName="locationLng"
          />
          <TextAreaField
            defaultValue={data.address.en}
            label={labels.fields.addressEn}
            name="addressEn"
            required
          />
          <TextAreaField
            defaultValue={data.address.zh}
            label={labels.fields.addressZh}
            name="addressZh"
            required
          />
          <TextAreaField
            defaultValue={serializeProducts(data.mainProducts)}
            label={labels.fields.mainProducts}
            name="mainProducts"
            required
          />
          <TextAreaField
            defaultValue={data.certifications.join("\n")}
            label={labels.fields.certifications}
            name="certifications"
          />
          <Field
            defaultValue={data.moq ?? ""}
            label={labels.fields.moq}
            name="moq"
          />
          <Field
            defaultValue={data.establishedYear ?? ""}
            label={labels.fields.establishedYear}
            name="establishedYear"
            type="number"
          />
          <Field
            defaultValue={data.employeeRange ?? ""}
            label={labels.fields.employeeRange}
            name="employeeRange"
          />
          <Field
            defaultValue={data.sourceName ?? ""}
            label={labels.fields.sourceName}
            name="sourceName"
          />
          <Field
            defaultValue={data.sourceUrl ?? ""}
            label={labels.fields.sourceUrl}
            name="sourceUrl"
            type="url"
          />
          <Field
            defaultValue={data.contact?.website ?? ""}
            label={labels.fields.contactWebsite}
            name="website"
            type="url"
          />
          <Field
            defaultValue={data.contact?.email ?? ""}
            label={labels.fields.contactEmail}
            name="email"
          />
          <Field
            defaultValue={data.contact?.phone ?? ""}
            label={labels.fields.contactPhone}
            name="phone"
          />
          <Field
            defaultValue={data.contact?.wechat ?? ""}
            label={labels.fields.contactWechat}
            name="wechat"
          />
        </div>
        {formInvalid ? <FormError>{labels.formError}</FormError> : null}
        {actionError ? (
          <ActionError labels={labels} onRetry={onRetry} pending={pending} />
        ) : null}
        <div className={styles.formActions}>
          <button disabled={pending} type="submit">
            {pending ? labels.saving : labels.save}
          </button>
        </div>
      </form>

      <FactoryMediaEditor
        data={data}
        getRequest={getRequest}
        labels={labels.media}
        onUpdate={onMediaUpdate}
      />

      <div className={styles.reviewActions}>
        {!data.verified ? (
          <>
            <ReviewConfirmation
              checked={confirmed}
              labels={labels}
              onChange={setConfirmed}
            />
            <button
              disabled={pending || !confirmed}
              onClick={() => onAction("verifyFactory")}
              type="button"
            >
              {labels.verify}
            </button>
          </>
        ) : null}
        {data.status === "draft" ? (
          <>
            <button
              disabled={pending || !data.verified}
              onClick={() => onAction("publishFactory")}
              type="button"
            >
              {labels.publish}
            </button>
            {!data.verified ? <small>{labels.publishingBlocked}</small> : null}
          </>
        ) : (
          <button
            className={styles.dangerButton}
            disabled={pending}
            onClick={() => onAction("unpublishFactory")}
            type="button"
          >
            {labels.unpublish}
          </button>
        )}
      </div>
    </section>
  );
}

export function ClusterCreateEditor({
  actionError,
  labels,
  onRetry,
  onSave,
  pending,
}: Readonly<{
  actionError: boolean;
  labels: OpsLabels;
  onRetry: () => void;
  onSave: (body: CreateAdminClusterBody) => void;
  pending: boolean;
}>) {
  const [formInvalid, setFormInvalid] = useState(false);

  return (
    <section className={styles.editor} aria-labelledby="ops-editor-heading">
      <header className={styles.editorHeader}>
        <div>
          <p>{labels.clusterList}</p>
          <h2 id="ops-editor-heading">{labels.newRecord}</h2>
          <small>{labels.uploadAfterCreate}</small>
        </div>
        <StatusBadge labels={labels} status="draft" />
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave(buildClusterCreate(new FormData(event.currentTarget)));
            setFormInvalid(false);
          } catch {
            setFormInvalid(true);
          }
        }}
      >
        <div className={styles.formGrid}>
          <Field
            defaultValue=""
            label={labels.fields.slug}
            name="slug"
            required
          />
          <Field
            defaultValue=""
            label={labels.fields.region}
            name="regionId"
            required
          />
          <Field
            defaultValue=""
            label={labels.fields.nameEn}
            name="nameEn"
            required
          />
          <Field
            defaultValue=""
            label={labels.fields.nameZh}
            name="nameZh"
            required
          />
          <Field
            defaultValue=""
            label={labels.fields.primaryCategory}
            name="primaryCategoryId"
            required
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.categories}
            name="categoryIds"
            required
          />
          <OpsPointPicker
            initialCoordinates={null}
            labels={pointPickerLabels(labels)}
            latitudeName="centroidLat"
            longitudeName="centroidLng"
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.summaryEn}
            name="summaryEn"
            required
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.summaryZh}
            name="summaryZh"
            required
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.descriptionEn}
            name="descriptionEn"
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.descriptionZh}
            name="descriptionZh"
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.mainProducts}
            name="mainProducts"
            required
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.boundary}
            name="boundary"
            rows={8}
          />
        </div>
        {formInvalid ? <FormError>{labels.formError}</FormError> : null}
        {actionError ? (
          <ActionError labels={labels} onRetry={onRetry} pending={pending} />
        ) : null}
        <div className={styles.formActions}>
          <button disabled={pending} type="submit">
            {pending ? labels.saving : labels.newCluster}
          </button>
        </div>
      </form>
    </section>
  );
}

export function FactoryCreateEditor({
  actionError,
  labels,
  onRetry,
  onSave,
  pending,
}: Readonly<{
  actionError: boolean;
  labels: OpsLabels;
  onRetry: () => void;
  onSave: (body: CreateAdminFactoryBody) => void;
  pending: boolean;
}>) {
  const [formInvalid, setFormInvalid] = useState(false);

  return (
    <section className={styles.editor} aria-labelledby="ops-editor-heading">
      <header className={styles.editorHeader}>
        <div>
          <p>{labels.factoryList}</p>
          <h2 id="ops-editor-heading">{labels.newRecord}</h2>
          <small>{labels.uploadAfterCreate}</small>
        </div>
        <StatusBadge labels={labels} status="draft" verified={false} />
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave(buildFactoryCreate(new FormData(event.currentTarget)));
            setFormInvalid(false);
          } catch {
            setFormInvalid(true);
          }
        }}
      >
        <div className={styles.formGrid}>
          <Field
            defaultValue=""
            label={labels.fields.slug}
            name="slug"
            required
          />
          <Field
            defaultValue=""
            label={labels.fields.region}
            name="regionId"
            required
          />
          <Field
            defaultValue=""
            label={labels.fields.nameEn}
            name="nameEn"
            required
          />
          <Field
            defaultValue=""
            label={labels.fields.nameZh}
            name="nameZh"
            required
          />
          <Field
            defaultValue=""
            label={labels.fields.clusterId}
            name="clusterId"
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.categories}
            name="categoryIds"
            required
          />
          <OpsPointPicker
            initialCoordinates={null}
            labels={pointPickerLabels(labels)}
            latitudeName="locationLat"
            longitudeName="locationLng"
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.addressEn}
            name="addressEn"
            required
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.addressZh}
            name="addressZh"
            required
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.mainProducts}
            name="mainProducts"
            required
          />
          <TextAreaField
            defaultValue=""
            label={labels.fields.certifications}
            name="certifications"
          />
          <Field defaultValue="" label={labels.fields.moq} name="moq" />
          <Field
            defaultValue=""
            label={labels.fields.establishedYear}
            name="establishedYear"
            type="number"
          />
          <Field
            defaultValue=""
            label={labels.fields.employeeRange}
            name="employeeRange"
          />
          <Field
            defaultValue=""
            label={labels.fields.sourceName}
            name="sourceName"
          />
          <Field
            defaultValue=""
            label={labels.fields.sourceUrl}
            name="sourceUrl"
            type="url"
          />
          <Field
            defaultValue=""
            label={labels.fields.contactWebsite}
            name="website"
            type="url"
          />
          <Field
            defaultValue=""
            label={labels.fields.contactEmail}
            name="email"
          />
          <Field
            defaultValue=""
            label={labels.fields.contactPhone}
            name="phone"
          />
          <Field
            defaultValue=""
            label={labels.fields.contactWechat}
            name="wechat"
          />
        </div>
        {formInvalid ? <FormError>{labels.formError}</FormError> : null}
        {actionError ? (
          <ActionError labels={labels} onRetry={onRetry} pending={pending} />
        ) : null}
        <div className={styles.formActions}>
          <button disabled={pending} type="submit">
            {pending ? labels.saving : labels.newFactory}
          </button>
        </div>
      </form>
    </section>
  );
}

export function OpsDashboard({
  diagnostics,
  labels,
  userId,
}: Readonly<{
  diagnostics?: React.ReactNode;
  labels: OpsLabels;
  userId: string;
}>) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<EntitySelection | null>(null);
  const getRequest = useCallback(
    (signal?: AbortSignal) => requestWithToken(getToken, signal),
    [getToken],
  );
  const queriesEnabled = isLoaded && isSignedIn;

  const clusters = useQuery({
    enabled: queriesEnabled,
    queryFn: async ({ signal }) =>
      getAdminClusters({ limit: 100 }, await getRequest(signal)),
    queryKey: ["ops", "clusters"],
  });
  const factories = useQuery({
    enabled: queriesEnabled,
    queryFn: async ({ signal }) =>
      getAdminFactories({ limit: 100 }, await getRequest(signal)),
    queryKey: ["ops", "factories"],
  });
  const detail = useQuery({
    enabled: queriesEnabled && selection !== null && selection.id !== null,
    queryFn: async ({ signal }) => {
      if (selection === null || selection.id === null) {
        throw new Error("No entity selected");
      }
      const request = await getRequest(signal);
      return selection.kind === "cluster"
        ? getAdminCluster(selection.id, request)
        : getAdminFactory(selection.id, request);
    },
    queryKey: ["ops", "detail", selection?.kind, selection?.id],
  });

  const mutation = useMutation({
    mutationFn: async (input: OpsMutation) => {
      const request = await getRequest();
      switch (input.type) {
        case "createCluster":
          return createAdminCluster(input.body, request);
        case "createFactory":
          return createAdminFactory(input.body, request);
        case "updateCluster":
          return updateAdminCluster(input.id, input.body, request);
        case "updateFactory":
          return updateAdminFactory(input.id, input.body, request);
        case "publishCluster":
          return publishAdminCluster(input.id, request);
        case "unpublishCluster":
          return unpublishAdminCluster(input.id, request);
        case "verifyFactory":
          return verifyAdminFactory(input.id, request);
        case "publishFactory":
          return publishAdminFactory(input.id, request);
        case "unpublishFactory":
          return unpublishAdminFactory(input.id, request);
      }
    },
    onSuccess: async (result, input) => {
      if (input.type === "createCluster") {
        setSelection({ id: result.data.id, kind: "cluster" });
      } else if (input.type === "createFactory") {
        setSelection({ id: result.data.id, kind: "factory" });
      }
      await queryClient.invalidateQueries({ queryKey: ["ops"] });
    },
  });

  const authError = isLoaded && !isSignedIn;
  const listError = authError || clusters.isError || factories.isError;
  const loading =
    !isLoaded ||
    (queriesEnabled && (clusters.isPending || factories.isPending));

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.identity}>
          <span>{userId}</span>
          <p>{labels.instructions}</p>
          <small>{labels.reviewRecord}</small>
        </div>
        {listError ? (
          <div className={styles.loadState} role="alert">
            <p>{authError ? labels.authError : labels.actionError}</p>
            <button
              disabled={!queriesEnabled}
              onClick={() => {
                void clusters.refetch();
                void factories.refetch();
              }}
              type="button"
            >
              {labels.retry}
            </button>
          </div>
        ) : loading ? (
          <p className={styles.loadState} role="status">
            {labels.loading}
          </p>
        ) : (
          <OpsEntityLists
            clusters={clusters.data?.data ?? []}
            factories={factories.data?.data ?? []}
            labels={labels}
            onSelect={(nextSelection) => {
              mutation.reset();
              setSelection(nextSelection);
            }}
            selection={selection}
          />
        )}
        {diagnostics === undefined ? null : (
          <div className={styles.diagnostics}>{diagnostics}</div>
        )}
      </aside>

      <main className={styles.content}>
        {selection === null ? (
          <p className={styles.noSelection}>{labels.noSelection}</p>
        ) : selection.id === null && selection.kind === "cluster" ? (
          <ClusterCreateEditor
            actionError={mutation.isError}
            labels={labels}
            onRetry={() => {
              if (mutation.variables !== undefined) {
                mutation.mutate(mutation.variables);
              }
            }}
            onSave={(body) => mutation.mutate({ body, type: "createCluster" })}
            pending={mutation.isPending}
          />
        ) : selection.id === null ? (
          <FactoryCreateEditor
            actionError={mutation.isError}
            labels={labels}
            onRetry={() => {
              if (mutation.variables !== undefined) {
                mutation.mutate(mutation.variables);
              }
            }}
            onSave={(body) => mutation.mutate({ body, type: "createFactory" })}
            pending={mutation.isPending}
          />
        ) : detail.isPending ? (
          <p className={styles.loadState} role="status">
            {labels.loading}
          </p>
        ) : detail.isError || detail.data === undefined ? (
          <div className={styles.loadState} role="alert">
            <p>{labels.actionError}</p>
            <button onClick={() => void detail.refetch()} type="button">
              {labels.retry}
            </button>
          </div>
        ) : selection.kind === "cluster" ? (
          <ClusterEditor
            actionError={mutation.isError}
            data={detail.data.data as GetAdminCluster200Data}
            getRequest={getRequest}
            key={detail.data.data.updatedAt}
            labels={labels}
            onAction={(type) => mutation.mutate({ id: selection.id!, type })}
            onMediaUpdate={(body) =>
              mutation.mutateAsync({
                body,
                id: selection.id!,
                type: "updateCluster",
              })
            }
            onRetry={() => {
              if (mutation.variables !== undefined) {
                mutation.mutate(mutation.variables);
              }
            }}
            onSave={(body) =>
              mutation.mutate({
                body,
                id: selection.id!,
                type: "updateCluster",
              })
            }
            pending={mutation.isPending}
          />
        ) : (
          <FactoryEditor
            actionError={mutation.isError}
            data={detail.data.data as GetAdminFactory200Data}
            getRequest={getRequest}
            key={detail.data.data.updatedAt}
            labels={labels}
            onAction={(type) => mutation.mutate({ id: selection.id!, type })}
            onMediaUpdate={(body) =>
              mutation.mutateAsync({
                body,
                id: selection.id!,
                type: "updateFactory",
              })
            }
            onRetry={() => {
              if (mutation.variables !== undefined) {
                mutation.mutate(mutation.variables);
              }
            }}
            onSave={(body) =>
              mutation.mutate({
                body,
                id: selection.id!,
                type: "updateFactory",
              })
            }
            pending={mutation.isPending}
          />
        )}
      </main>
    </div>
  );
}
