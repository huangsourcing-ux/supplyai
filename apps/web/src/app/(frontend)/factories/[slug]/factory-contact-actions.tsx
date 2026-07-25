"use client";

import { useTranslations } from "next-intl";
import React, { useState } from "react";

import { analytics, type FactoryContactMethod } from "@chinasupply/analytics";

import { copyTextToClipboard } from "./factory-clipboard";
import type { FactoryContact } from "./factory-contact";
import { safeWebsiteHref } from "./factory-contact";
import styles from "./factory-detail.module.css";

export function FactoryContactActions({
  contact,
  factoryId,
  slug,
}: Readonly<{
  contact: FactoryContact;
  factoryId: string;
  slug: string;
}>) {
  const translate = useTranslations("FactoryDetail.contact");
  const [wechatStatus, setWechatStatus] = useState<"copied" | "error" | "idle">(
    "idle",
  );

  const track = (method: FactoryContactMethod) => {
    analytics.trackFactoryContactClicked({ factoryId, method, slug });
  };

  const websiteHref =
    contact.website === undefined ? null : safeWebsiteHref(contact.website);

  const copyWechat = async () => {
    if (contact.wechat === undefined) return;
    track("wechat");

    try {
      await copyTextToClipboard(contact.wechat);
      setWechatStatus("copied");
    } catch {
      setWechatStatus("error");
    }
  };

  return (
    <ul className={styles.contactList}>
      {contact.website === undefined ? null : (
        <li>
          <span>{translate("website")}</span>
          {websiteHref === null ? (
            <strong>{contact.website}</strong>
          ) : (
            <a
              href={websiteHref}
              onClick={() => track("website")}
              rel="noreferrer"
              target="_blank"
            >
              {translate("visitWebsite")}
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </li>
      )}
      {contact.email === undefined ? null : (
        <li>
          <span>{translate("email")}</span>
          <a
            href={`mailto:${encodeURIComponent(contact.email)}`}
            onClick={() => track("email")}
          >
            {contact.email}
          </a>
        </li>
      )}
      {contact.phone === undefined ? null : (
        <li>
          <span>{translate("phone")}</span>
          <a
            href={`tel:${encodeURIComponent(contact.phone)}`}
            onClick={() => track("phone")}
          >
            {contact.phone}
          </a>
        </li>
      )}
      {contact.wechat === undefined ? null : (
        <li>
          <span>{translate("wechat")}</span>
          <strong>{contact.wechat}</strong>
          <button onClick={() => void copyWechat()} type="button">
            {translate("copyWechat")}
          </button>
          <span aria-live="polite" className={styles.contactStatus}>
            {wechatStatus === "copied"
              ? translate("copied")
              : wechatStatus === "error"
                ? translate("copyError")
                : ""}
          </span>
        </li>
      )}
    </ul>
  );
}
