"use client";

import { useField } from "@payloadcms/ui";
import { getMapClusterPointsResponseSchema } from "@chinasupply/schemas";
import type { TextFieldClientProps } from "payload";
import React, { useEffect, useState } from "react";

import enMessages from "../../../messages/en.json";

interface ClusterOption {
  id: string;
  name: string;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const clusterApiUrl = apiBaseUrl
  ? `${apiBaseUrl.replace(/\/+$/u, "")}/map/clusters`
  : null;
const messages = enMessages.Cms.clusterPicker;

export function ClusterCardPicker({ path, readOnly }: TextFieldClientProps) {
  const { setValue, showError, value } = useField<string>({ path });
  const [clusters, setClusters] = useState<ClusterOption[]>([]);
  const [loadState, setLoadState] = useState<"error" | "loading" | "ready">(
    clusterApiUrl === null ? "error" : "loading",
  );

  useEffect(() => {
    const controller = new AbortController();
    if (clusterApiUrl === null) return () => controller.abort();

    void fetch(clusterApiUrl, {
      credentials: "omit",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("MAP-1 request failed");
        return getMapClusterPointsResponseSchema.parse(await response.json());
      })
      .then((envelope) => {
        setClusters(
          envelope.data.features
            .map(({ properties }) => ({
              id: properties.id,
              name: properties.name_en,
            }))
            .sort((left, right) => left.name.localeCompare(right.name, "en")),
        );
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setLoadState("error");
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="field-type select">
      <label className="field-label" htmlFor={path}>
        {messages.label} <span className="required">*</span>
      </label>
      <select
        aria-invalid={showError}
        disabled={readOnly || loadState !== "ready"}
        id={path}
        onChange={(event) => setValue(event.target.value)}
        value={value ?? ""}
      >
        <option value="">
          {loadState === "loading"
            ? messages.loading
            : loadState === "error"
              ? messages.unavailable
              : messages.select}
        </option>
        {clusters.map((cluster) => (
          <option key={cluster.id} value={cluster.id}>
            {cluster.name}
          </option>
        ))}
      </select>
      {showError ? (
        <div className="field-error">{messages.validation}</div>
      ) : null}
    </div>
  );
}
