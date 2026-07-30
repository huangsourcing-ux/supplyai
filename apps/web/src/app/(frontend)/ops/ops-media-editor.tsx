"use client";

import type {
  GetAdminCluster200Data,
  GetAdminFactory200Data,
  UpdateAdminClusterBody,
  UpdateAdminFactoryBody,
} from "@chinasupply/api-client";
import Image from "next/image";
import React, { useState } from "react";

import {
  appendFactoryImage,
  moveFactoryImage,
  removeFactoryImage,
  toFactoryImageReferences,
  uploadAdminMediaObject,
  validateAdminMediaFile,
} from "./ops-media";
import styles from "./ops-dashboard.module.css";

export interface OpsMediaLabels {
  altEn: string;
  altZh: string;
  attachRetry: string;
  chooseImage: string;
  clear: string;
  clusterCover: string;
  detach: string;
  factoryImages: string;
  fileRequirements: string;
  moveDown: string;
  moveUp: string;
  noMedia: string;
  referenceError: string;
  saveAlt: string;
  success: string;
  upload: string;
  uploadError: string;
  uploading: string;
  verificationReset: string;
}

type GetRequest = () => Promise<RequestInit>;

function MediaStatus({
  error,
  labels,
  onRetry,
  pending,
  success,
}: Readonly<{
  error: string | null;
  labels: OpsMediaLabels;
  onRetry?: () => void;
  pending: boolean;
  success: boolean;
}>) {
  if (error !== null) {
    return (
      <div className={styles.error} role="alert">
        <span>{error}</span>
        {onRetry === undefined ? null : (
          <button disabled={pending} onClick={onRetry} type="button">
            {labels.attachRetry}
          </button>
        )}
      </div>
    );
  }
  return success ? (
    <p className={styles.success} role="status">
      {labels.success}
    </p>
  ) : null;
}

export function ClusterMediaEditor({
  data,
  getRequest,
  labels,
  onUpdate,
}: Readonly<{
  data: GetAdminCluster200Data;
  getRequest: GetRequest;
  labels: OpsMediaLabels;
  onUpdate: (body: UpdateAdminClusterBody) => Promise<unknown>;
}>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingCoverReference, setPendingCoverReference] = useState<
    string | null | undefined
  >(undefined);
  const [success, setSuccess] = useState(false);

  const attach = async (objectKey: string | null) => {
    setPending(true);
    setError(null);
    setSuccess(false);
    setPendingCoverReference(objectKey);
    try {
      await onUpdate({ coverImageObjectKey: objectKey });
      setPendingCoverReference(undefined);
      setSuccess(true);
    } catch {
      setError(labels.referenceError);
    } finally {
      setPending(false);
    }
  };

  const uploadCover = async (file: File) => {
    let objectKey: string | null = null;
    setPending(true);
    setSuccess(false);
    setError(null);
    setPendingCoverReference(undefined);
    try {
      objectKey = await uploadAdminMediaObject({
        entityId: data.id,
        file,
        kind: "cluster-cover",
        request: await getRequest(),
      });
      setPendingCoverReference(objectKey);
      await onUpdate({ coverImageObjectKey: objectKey });
      setPendingCoverReference(undefined);
      setSuccess(true);
    } catch {
      setError(objectKey === null ? labels.uploadError : labels.referenceError);
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className={styles.mediaSection}
      aria-labelledby="cluster-cover-heading"
    >
      <div className={styles.sectionHeading}>
        <h3 id="cluster-cover-heading">{labels.clusterCover}</h3>
        <small>{labels.fileRequirements}</small>
      </div>
      {data.coverImage === null ? (
        <p className={styles.empty}>{labels.noMedia}</p>
      ) : (
        <figure className={styles.coverPreview}>
          <Image
            alt={data.name.en}
            height={360}
            src={data.coverImage.url}
            width={640}
          />
          <figcaption>{data.coverImage.objectKey}</figcaption>
        </figure>
      )}
      <form
        className={styles.mediaForm}
        onSubmit={(event) => {
          event.preventDefault();
          const fileInput = event.currentTarget.elements.namedItem("coverFile");
          const file =
            fileInput instanceof HTMLInputElement
              ? fileInput.files?.[0]
              : undefined;
          if (file === undefined) {
            setError(labels.uploadError);
            return;
          }
          try {
            validateAdminMediaFile(file);
          } catch {
            setError(labels.uploadError);
            return;
          }

          void uploadCover(file);
        }}
      >
        <label className={styles.fileField}>
          <span>{labels.chooseImage}</span>
          <input
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            name="coverFile"
            required
            type="file"
          />
        </label>
        <button disabled={pending} type="submit">
          {pending ? labels.uploading : labels.upload}
        </button>
        {data.coverImage === null ? null : (
          <button
            className={styles.secondaryButton}
            disabled={pending}
            onClick={() => {
              void attach(null);
            }}
            type="button"
          >
            {labels.clear}
          </button>
        )}
      </form>
      <MediaStatus
        error={error}
        labels={labels}
        onRetry={
          pendingCoverReference === undefined
            ? undefined
            : () => void attach(pendingCoverReference)
        }
        pending={pending}
        success={success}
      />
    </section>
  );
}

export function FactoryMediaEditor({
  data,
  getRequest,
  labels,
  onUpdate,
}: Readonly<{
  data: GetAdminFactory200Data;
  getRequest: GetRequest;
  labels: OpsMediaLabels;
  onUpdate: (body: UpdateAdminFactoryBody) => Promise<unknown>;
}>) {
  const [draftImages, setDraftImages] = useState(data.images);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retryImages, setRetryImages] = useState<NonNullable<
    UpdateAdminFactoryBody["images"]
  > | null>(null);
  const [success, setSuccess] = useState(false);

  const persist = async (
    images: NonNullable<UpdateAdminFactoryBody["images"]>,
  ) => {
    if (
      images.some(
        (image) => image.alt.en.trim() === "" || image.alt.zh.trim() === "",
      )
    ) {
      setError(labels.uploadError);
      return;
    }
    setPending(true);
    setError(null);
    setSuccess(false);
    setRetryImages(images);
    try {
      await onUpdate({ images });
      setRetryImages(null);
      setSuccess(true);
    } catch {
      setError(labels.referenceError);
    } finally {
      setPending(false);
    }
  };

  const uploadFactoryImage = async (
    file: File,
    alt: { en: string; zh: string },
  ) => {
    let objectKey: string | null = null;
    setPending(true);
    setSuccess(false);
    setError(null);
    try {
      objectKey = await uploadAdminMediaObject({
        entityId: data.id,
        file,
        kind: "factory-image",
        request: await getRequest(),
      });
      const next = appendFactoryImage(toFactoryImageReferences(draftImages), {
        alt,
        objectKey,
      });
      setRetryImages(next);
      await onUpdate({ images: next });
      setRetryImages(null);
      setSuccess(true);
    } catch {
      setError(objectKey === null ? labels.uploadError : labels.referenceError);
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className={styles.mediaSection}
      aria-labelledby="factory-images-heading"
    >
      <div className={styles.sectionHeading}>
        <h3 id="factory-images-heading">{labels.factoryImages}</h3>
        <small>{labels.fileRequirements}</small>
      </div>
      <p className={styles.warning}>{labels.verificationReset}</p>
      {draftImages.length === 0 ? (
        <p className={styles.empty}>{labels.noMedia}</p>
      ) : (
        <ol className={styles.imageList}>
          {draftImages.map((image, index) => (
            <li key={image.objectKey}>
              <Image
                alt={image.alt.en}
                height={135}
                src={image.url}
                width={240}
              />
              <div className={styles.imageFields}>
                <label className={styles.field}>
                  <span>{labels.altEn}</span>
                  <input
                    disabled={pending}
                    onChange={(event) => {
                      setDraftImages((current) =>
                        current.map((item, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...item,
                                alt: { ...item.alt, en: event.target.value },
                              }
                            : item,
                        ),
                      );
                    }}
                    required
                    value={image.alt.en}
                  />
                </label>
                <label className={styles.field}>
                  <span>{labels.altZh}</span>
                  <input
                    disabled={pending}
                    onChange={(event) => {
                      setDraftImages((current) =>
                        current.map((item, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...item,
                                alt: { ...item.alt, zh: event.target.value },
                              }
                            : item,
                        ),
                      );
                    }}
                    required
                    value={image.alt.zh}
                  />
                </label>
                <small>{image.objectKey}</small>
                <div className={styles.inlineActions}>
                  <button
                    disabled={pending}
                    onClick={() =>
                      void persist(toFactoryImageReferences(draftImages))
                    }
                    type="button"
                  >
                    {labels.saveAlt}
                  </button>
                  <button
                    disabled={pending || index === 0}
                    onClick={() => {
                      const next = moveFactoryImage(
                        toFactoryImageReferences(draftImages),
                        index,
                        -1,
                      );
                      void persist(next);
                    }}
                    type="button"
                  >
                    {labels.moveUp}
                  </button>
                  <button
                    disabled={pending || index === draftImages.length - 1}
                    onClick={() => {
                      const next = moveFactoryImage(
                        toFactoryImageReferences(draftImages),
                        index,
                        1,
                      );
                      void persist(next);
                    }}
                    type="button"
                  >
                    {labels.moveDown}
                  </button>
                  <button
                    className={styles.dangerButton}
                    disabled={pending}
                    onClick={() => {
                      const next = removeFactoryImage(
                        toFactoryImageReferences(draftImages),
                        index,
                      );
                      void persist(next);
                    }}
                    type="button"
                  >
                    {labels.detach}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form
        className={styles.mediaForm}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const file = form.get("factoryFile");
          const altEn = String(form.get("imageAltEn") ?? "").trim();
          const altZh = String(form.get("imageAltZh") ?? "").trim();
          if (!(file instanceof File) || altEn === "" || altZh === "") {
            setError(labels.uploadError);
            return;
          }
          try {
            validateAdminMediaFile(file);
          } catch {
            setError(labels.uploadError);
            return;
          }

          void uploadFactoryImage(file, { en: altEn, zh: altZh });
        }}
      >
        <label className={styles.fileField}>
          <span>{labels.chooseImage}</span>
          <input
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            name="factoryFile"
            required
            type="file"
          />
        </label>
        <label className={styles.field}>
          <span>{labels.altEn}</span>
          <input disabled={pending} name="imageAltEn" required />
        </label>
        <label className={styles.field}>
          <span>{labels.altZh}</span>
          <input disabled={pending} name="imageAltZh" required />
        </label>
        <button disabled={pending} type="submit">
          {pending ? labels.uploading : labels.upload}
        </button>
      </form>
      <MediaStatus
        error={error}
        labels={labels}
        onRetry={
          retryImages === null ? undefined : () => void persist(retryImages)
        }
        pending={pending}
        success={success}
      />
    </section>
  );
}
