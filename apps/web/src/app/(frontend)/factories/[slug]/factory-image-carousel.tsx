"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import React, { useState } from "react";

import type { GetFactory200DataImagesItem } from "@chinasupply/api-client";

import styles from "./factory-detail.module.css";

export function FactoryImageCarousel({
  images,
  name,
}: Readonly<{
  images: readonly GetFactory200DataImagesItem[];
  name: string;
}>) {
  const translate = useTranslations("FactoryDetail.gallery");
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  if (activeImage === undefined) return null;

  const showPrevious = () => {
    setActiveIndex((index) => (index === 0 ? images.length - 1 : index - 1));
  };
  const showNext = () => {
    setActiveIndex((index) => (index + 1) % images.length);
  };

  return (
    <section
      aria-label={translate("ariaLabel", { name })}
      className={styles.gallery}
    >
      <div className={styles.galleryStage}>
        <Image
          alt={activeImage.alt}
          className={styles.galleryImage}
          height={1000}
          preload={activeIndex === 0}
          sizes="(max-width: 76rem) calc(100vw - 3rem), 72rem"
          src={activeImage.url}
          width={1600}
        />
        {images.length > 1 ? (
          <>
            <button
              aria-label={translate("previous")}
              className={`${styles.galleryArrow} ${styles.galleryArrowPrevious}`}
              onClick={showPrevious}
              type="button"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              aria-label={translate("next")}
              className={`${styles.galleryArrow} ${styles.galleryArrowNext}`}
              onClick={showNext}
              type="button"
            >
              <span aria-hidden="true">→</span>
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className={styles.galleryFooter}>
          <p aria-live="polite" className={styles.galleryStatus}>
            {translate("position", {
              count: images.length,
              current: activeIndex + 1,
            })}
          </p>
          <div
            aria-label={translate("chooseImage")}
            className={styles.galleryThumbnails}
            role="group"
          >
            {images.map((image, index) => (
              <button
                aria-label={translate("showImage", { index: index + 1 })}
                aria-pressed={index === activeIndex}
                className={styles.galleryThumbnail}
                key={`${image.url}-${index}`}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <Image
                  alt=""
                  height={80}
                  sizes="5rem"
                  src={image.url}
                  width={128}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
