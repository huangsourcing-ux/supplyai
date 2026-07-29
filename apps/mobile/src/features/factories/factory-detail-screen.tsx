import * as Clipboard from "expo-clipboard";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { analytics, type FactoryContactMethod } from "@chinasupply/analytics";
import {
  type GetFactory200Data,
  type GetFactory200DataImagesItem,
  type GetFactory200DataRelatedFactoriesItem,
  useGetFactory,
} from "@chinasupply/api-client";

import {
  FACTORY_DETAIL_STALE_TIME_MS,
  type FactoryContact,
  formatVerificationMonth,
  hasFactoryContact,
  normalizeFactorySlug,
} from "./factory-detail-model";
import {
  buildEmailUrl,
  buildPhoneUrl,
  safeHttpUrl,
} from "../../lib/external-url";
import { FactoryLocationMap } from "./factory-location-map";
import { FavoriteSaveAction } from "../favorites/favorite-save-action";

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

export function FactoryDetailBackButton({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.backButton}
      testID="factory-detail-back"
    >
      <Text aria-hidden style={styles.backArrow}>
        ←
      </Text>
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

export function FactoryDetailState({
  kind,
  onBack,
  onRetry,
}: Readonly<{
  kind: "error" | "loading" | "not-found";
  onBack: () => void;
  onRetry?: () => void;
}>) {
  const { t } = useTranslation();

  if (kind === "loading") {
    return (
      <View style={styles.stateShell} testID="factory-detail-loading">
        <FactoryDetailBackButton
          label={t("factoryDetail.backToMap")}
          onPress={onBack}
        />
        <View
          accessibilityLabel={t("factoryDetail.loading")}
          accessibilityRole="progressbar"
          style={styles.loadingState}
        >
          <ActivityIndicator color="#2563EB" size="large" />
          <View style={[styles.skeleton, styles.skeletonTitle]} />
          <View style={[styles.skeleton, styles.skeletonLine]} />
          <View style={[styles.skeleton, styles.skeletonImage]} />
        </View>
      </View>
    );
  }

  const prefix =
    kind === "not-found" ? "factoryDetail.notFound" : "factoryDetail.error";

  return (
    <View accessibilityRole="alert" style={styles.stateShell}>
      <FactoryDetailBackButton
        label={t(`${prefix}.backToMap`)}
        onPress={onBack}
      />
      <View style={styles.messageState} testID={`factory-detail-${kind}`}>
        <Text style={styles.messageEyebrow}>{t(`${prefix}.eyebrow`)}</Text>
        <Text accessibilityRole="header" style={styles.messageTitle}>
          {t(`${prefix}.title`)}
        </Text>
        <Text style={styles.messageDescription}>
          {t(`${prefix}.description`)}
        </Text>
        {kind === "error" && onRetry !== undefined ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {t("factoryDetail.error.retry")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function FactoryImageCarousel({
  images,
  name,
}: Readonly<{
  images: readonly GetFactory200DataImagesItem[];
  name: string;
}>) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const imageWidth = Math.max(240, windowWidth - 40);

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  if (images.length === 0) return null;

  const updateActiveIndex = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / imageWidth);
    setActiveIndex(Math.max(0, Math.min(index, images.length - 1)));
  };

  return (
    <View
      accessibilityLabel={t("factoryDetail.gallery.ariaLabel", { name })}
      style={styles.gallery}
      testID="factory-detail-gallery"
    >
      <ScrollView
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={updateActiveIndex}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        testID="factory-gallery-scroll"
      >
        {images.map((image, index) => (
          <Image
            accessibilityLabel={image.alt}
            accessible
            key={`${image.url}-${index}`}
            resizeMode="cover"
            source={{ uri: image.url }}
            style={[styles.galleryImage, { width: imageWidth }]}
            testID={`factory-gallery-image-${index}`}
          />
        ))}
      </ScrollView>
      <Text
        accessibilityLiveRegion="polite"
        style={styles.galleryPosition}
        testID="factory-gallery-position"
      >
        {t("factoryDetail.gallery.position", {
          count: images.length,
          current: activeIndex + 1,
        })}
      </Text>
    </View>
  );
}

export function FactoryCopyField({
  label,
  testID,
  value,
}: Readonly<{ label: string; testID: string; value: string }>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"copied" | "error" | "idle">("idle");

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  };

  return (
    <View style={styles.addressRow}>
      <View style={styles.addressText}>
        <Text style={styles.addressLabel}>{label}</Text>
        <Text style={styles.addressValue}>{value}</Text>
      </View>
      <View style={styles.copyAction}>
        <Pressable
          accessibilityLabel={t("factoryDetail.copy.actionLabel", { label })}
          accessibilityRole="button"
          onPress={() => {
            void copy();
          }}
          style={styles.secondaryButton}
          testID={testID}
        >
          <Text style={styles.secondaryButtonText}>
            {t("factoryDetail.copy.action")}
          </Text>
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={styles.actionStatus}>
          {status === "copied"
            ? t("factoryDetail.copy.success")
            : status === "error"
              ? t("factoryDetail.copy.error")
              : ""}
        </Text>
      </View>
    </View>
  );
}

export function FactoryContactActions({
  contact,
  factoryId,
  slug,
}: Readonly<{
  contact: FactoryContact;
  factoryId: string;
  slug: string;
}>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"copied" | "error" | "idle">("idle");
  const websiteUrl = safeHttpUrl(contact.website);
  const phoneUrl =
    contact.phone === undefined ? null : buildPhoneUrl(contact.phone);

  const openContact = async (method: FactoryContactMethod, url: string) => {
    analytics.trackFactoryContactClicked({ factoryId, method, slug });
    setStatus("idle");
    try {
      await Linking.openURL(url);
    } catch {
      setStatus("error");
    }
  };

  const copyWechat = async () => {
    if (contact.wechat === undefined) return;
    analytics.trackFactoryContactClicked({
      factoryId,
      method: "wechat",
      slug,
    });
    setStatus("idle");
    try {
      await Clipboard.setStringAsync(contact.wechat);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  };

  return (
    <View style={styles.contactList}>
      {contact.website === undefined ? null : (
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>
            {t("factoryDetail.contact.website")}
          </Text>
          {websiteUrl === null ? (
            <Text style={styles.contactValue}>{contact.website}</Text>
          ) : (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void openContact("website", websiteUrl);
              }}
              style={styles.contactAction}
              testID="factory-contact-website"
            >
              <Text style={styles.contactActionText}>
                {t("factoryDetail.contact.visitWebsite")}
              </Text>
              <Text aria-hidden style={styles.contactActionText}>
                ↗
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {contact.email === undefined ? null : (
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>
            {t("factoryDetail.contact.email")}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              void openContact("email", buildEmailUrl(contact.email!));
            }}
            testID="factory-contact-email"
          >
            <Text style={styles.contactActionText}>{contact.email}</Text>
          </Pressable>
        </View>
      )}
      {contact.phone === undefined ? null : (
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>
            {t("factoryDetail.contact.phone")}
          </Text>
          {phoneUrl === null ? (
            <Text style={styles.contactValue}>{contact.phone}</Text>
          ) : (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void openContact("phone", phoneUrl);
              }}
              testID="factory-contact-phone"
            >
              <Text style={styles.contactActionText}>{contact.phone}</Text>
            </Pressable>
          )}
        </View>
      )}
      {contact.wechat === undefined ? null : (
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>
            {t("factoryDetail.contact.wechat")}
          </Text>
          <Text style={styles.contactValue}>{contact.wechat}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void copyWechat();
            }}
            style={styles.compactButton}
            testID="factory-contact-wechat"
          >
            <Text style={styles.compactButtonText}>
              {t("factoryDetail.contact.copyWechat")}
            </Text>
          </Pressable>
        </View>
      )}
      <Text accessibilityLiveRegion="polite" style={styles.contactStatus}>
        {status === "copied"
          ? t("factoryDetail.contact.copied")
          : status === "error"
            ? t("factoryDetail.contact.actionError")
            : ""}
      </Text>
    </View>
  );
}

function NavigationPlaceholder() {
  const { t } = useTranslation();
  const providers = [
    { key: "google", label: t("factoryDetail.navigation.google") },
    ...(Platform.OS === "ios"
      ? [{ key: "apple", label: t("factoryDetail.navigation.apple") }]
      : []),
    { key: "amap", label: t("factoryDetail.navigation.amap") },
    { key: "baidu", label: t("factoryDetail.navigation.baidu") },
  ];

  return (
    <View>
      <View style={styles.navigationGrid}>
        {providers.map((provider) => (
          <Pressable
            accessibilityHint={t("factoryDetail.navigation.unavailable")}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            key={provider.key}
            style={styles.navigationDisabled}
            testID={`factory-navigation-${provider.key}`}
          >
            <Text style={styles.navigationDisabledText}>{provider.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.navigationHint}>
        {t("factoryDetail.navigation.unavailable")}
      </Text>
    </View>
  );
}

export function RelatedFactoryCard({
  factory,
  onPress,
}: Readonly<{
  factory: GetFactory200DataRelatedFactoriesItem;
  onPress: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityLabel={t("factoryDetail.related.viewDetailsLabel", {
        name: factory.name,
      })}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.relatedCard}
      testID={`related-factory-${factory.slug}`}
    >
      <View style={styles.relatedImageFrame}>
        {factory.imageUrl === null ? (
          <Text style={styles.relatedImageLetter}>
            {factory.name.charAt(0)}
          </Text>
        ) : (
          <Image
            accessible={false}
            resizeMode="cover"
            source={{ uri: factory.imageUrl }}
            style={styles.relatedImage}
          />
        )}
      </View>
      <View style={styles.relatedContent}>
        <Text numberOfLines={2} style={styles.relatedName}>
          {factory.name}
        </Text>
        <Text style={styles.relatedRegion}>{factory.region.name}</Text>
        <View
          style={
            factory.verified
              ? styles.relatedVerifiedBadge
              : styles.relatedUnverifiedBadge
          }
        >
          <Text
            style={
              factory.verified
                ? styles.relatedVerifiedText
                : styles.relatedUnverifiedText
            }
          >
            {t(
              factory.verified
                ? "factoryDetail.trust.verified"
                : "factoryDetail.trust.unverified",
            )}
          </Text>
        </View>
        <Text numberOfLines={2} style={styles.relatedProducts}>
          {factory.mainProducts.join(" · ")}
        </Text>
        <Text style={styles.relatedAction}>
          {t("factoryDetail.related.viewDetails")} →
        </Text>
      </View>
    </Pressable>
  );
}

export function FactoryDetailLoaded({
  factory,
  favoriteAction,
  onBack,
  onRelatedFactory,
}: Readonly<{
  factory: GetFactory200Data;
  favoriteAction?: ReactNode;
  onBack: () => void;
  onRelatedFactory: (slug: string) => void;
}>) {
  const { t } = useTranslation();
  const contact = hasFactoryContact(factory.contact) ? factory.contact : null;
  const verifiedMonth = formatVerificationMonth(factory.lastVerifiedAt);
  const verificationLabel = factory.verified
    ? verifiedMonth === null
      ? t("factoryDetail.trust.verified")
      : t("factoryDetail.trust.verifiedMonth", { month: verifiedMonth })
    : t("factoryDetail.trust.unverified");
  const sourceUrl = safeHttpUrl(factory.sourceUrl);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="factory-detail-scroll"
    >
      <View style={styles.hero}>
        <FactoryDetailBackButton
          label={t("factoryDetail.backToMap")}
          onPress={onBack}
        />
        <Text style={styles.eyebrow}>
          {t("factoryDetail.location", { city: factory.region.name })}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {factory.name}
        </Text>
        <View style={styles.trustRow}>
          <View
            style={
              factory.verified ? styles.verifiedBadge : styles.unverifiedBadge
            }
          >
            <Text
              style={
                factory.verified
                  ? styles.verifiedBadgeText
                  : styles.unverifiedBadgeText
              }
            >
              {verificationLabel}
            </Text>
          </View>
          {factory.sourceName === null ? null : (
            <View style={styles.sourceRow}>
              <Text style={styles.sourceLabel}>
                {t("factoryDetail.trust.source")}
              </Text>
              {sourceUrl === null ? (
                <Text style={styles.sourceName}>{factory.sourceName}</Text>
              ) : (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void Linking.openURL(sourceUrl).catch(() => undefined);
                  }}
                  testID="factory-source-link"
                >
                  <Text style={styles.sourceLink}>{factory.sourceName} ↗</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        {favoriteAction}
      </View>

      <FactoryImageCarousel images={factory.images} name={factory.name} />

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t("factoryDetail.details.heading")}
        </Text>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>
            {t("factoryDetail.details.mainProducts")}
          </Text>
          <View style={styles.productList}>
            {factory.mainProducts.map((product, index) => (
              <View
                key={`${factory.id}-${product}-${index}`}
                style={styles.productChip}
              >
                <Text style={styles.productChipText}>{product}</Text>
              </View>
            ))}
          </View>
        </View>
        {factory.certifications.length === 0 ? null : (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>
              {t("factoryDetail.details.certifications")}
            </Text>
            <Text style={styles.detailValue}>
              {factory.certifications.join(", ")}
            </Text>
          </View>
        )}
        {factory.moq === null ? null : (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>
              {t("factoryDetail.details.moq")}
            </Text>
            <Text style={styles.detailValue}>{factory.moq}</Text>
          </View>
        )}
        {factory.establishedYear === null ? null : (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>
              {t("factoryDetail.details.establishedYear")}
            </Text>
            <Text style={styles.detailValue}>{factory.establishedYear}</Text>
          </View>
        )}
        {factory.employeeRange === null ? null : (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>
              {t("factoryDetail.details.employeeRange")}
            </Text>
            <Text style={styles.detailValue}>{factory.employeeRange}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>
          {t("factoryDetail.location", { city: factory.region.name })}
        </Text>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t("factoryDetail.map.heading")}
        </Text>
        <FactoryLocationMap
          location={factory.location}
          name={factory.name}
          verified={factory.verified}
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t("factoryDetail.address.heading")}
        </Text>
        <FactoryCopyField
          label={t("factoryDetail.address.english")}
          testID="factory-address-copy-en"
          value={factory.address.en}
        />
        <FactoryCopyField
          label={t("factoryDetail.address.chinese")}
          testID="factory-address-copy-zh"
          value={factory.address.zh}
        />
      </View>

      {contact === null ? null : (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t("factoryDetail.contact.heading")}
          </Text>
          <FactoryContactActions
            contact={contact}
            factoryId={factory.id}
            slug={factory.slug}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t("factoryDetail.navigation.heading")}
        </Text>
        <NavigationPlaceholder />
      </View>

      {factory.relatedFactories.length === 0 ? null : (
        <View style={styles.relatedSection}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t("factoryDetail.related.heading")}
          </Text>
          <ScrollView
            contentContainerStyle={styles.relatedRail}
            horizontal
            showsHorizontalScrollIndicator={false}
            testID="factory-related-rail"
          >
            {factory.relatedFactories.map((relatedFactory) => (
              <RelatedFactoryCard
                factory={relatedFactory}
                key={relatedFactory.id}
                onPress={() => onRelatedFactory(relatedFactory.slug)}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

export default function FactoryDetailScreen() {
  const { slug: routeSlug } = useLocalSearchParams<{
    slug?: string | string[];
  }>();
  const router = useRouter();
  const slug = normalizeFactorySlug(routeSlug);
  const factoryQuery = useGetFactory(slug ?? "", {
    query: {
      enabled: slug !== null,
      staleTime: FACTORY_DETAIL_STALE_TIME_MS,
    },
  });
  const trackedIdentity = useRef<string | null>(null);
  const factory = factoryQuery.data?.data;

  useEffect(() => {
    if (factory === undefined) return;
    const identity = `${factory.id}:${factory.slug}`;
    if (trackedIdentity.current === identity) return;
    trackedIdentity.current = identity;
    analytics.trackFactoryViewed({ factoryId: factory.id, slug: factory.slug });
  }, [factory]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  const openRelatedFactory = (relatedSlug: string) => {
    router.push({
      pathname: "/factories/[slug]",
      params: { slug: relatedSlug },
    } as unknown as Href);
  };

  let content;
  if (slug === null || isNotFoundError(factoryQuery.error)) {
    content = <FactoryDetailState kind="not-found" onBack={goBack} />;
  } else if (factoryQuery.isError) {
    content = (
      <FactoryDetailState
        kind="error"
        onBack={goBack}
        onRetry={() => {
          void factoryQuery.refetch();
        }}
      />
    );
  } else if (factory === undefined) {
    content = <FactoryDetailState kind="loading" onBack={goBack} />;
  } else {
    content = (
      <FactoryDetailLoaded
        factory={factory}
        favoriteAction={
          <FavoriteSaveAction
            returnTo={`/factories/${factory.slug}`}
            targetId={factory.id}
            targetType="factory"
          />
        }
        onBack={goBack}
        onRelatedFactory={openRelatedFactory}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionStatus: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    minHeight: 16,
    textAlign: "right",
  },
  addressLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  addressRow: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 14,
  },
  addressText: {
    flex: 1,
    paddingRight: 12,
  },
  addressValue: {
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  backArrow: {
    color: "#1D4ED8",
    fontSize: 19,
    marginRight: 8,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    minHeight: 44,
    paddingRight: 12,
  },
  backText: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "800",
  },
  compactButton: {
    borderColor: "rgba(37, 99, 235, 0.28)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  compactButtonText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  contactAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  contactActionText: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "700",
  },
  contactLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    minWidth: 70,
    textTransform: "uppercase",
  },
  contactList: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  contactRow: {
    alignItems: "center",
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    minHeight: 56,
    paddingVertical: 10,
  },
  contactStatus: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    minHeight: 18,
    textAlign: "right",
  },
  contactValue: {
    color: "#0F172A",
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  copyAction: {
    alignItems: "flex-end",
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },
  eyebrow: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 14,
    textTransform: "uppercase",
  },
  gallery: {
    marginHorizontal: 20,
    overflow: "hidden",
  },
  galleryImage: {
    backgroundColor: "#E2E8F0",
    borderRadius: 16,
    height: 240,
  },
  galleryPosition: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 9,
    textAlign: "center",
  },
  hero: {
    paddingBottom: 22,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  loadingState: {
    alignItems: "center",
    paddingTop: 70,
  },
  messageDescription: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    textAlign: "center",
  },
  messageEyebrow: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  messageState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 80,
    paddingHorizontal: 26,
  },
  messageTitle: {
    color: "#0F172A",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 33,
    marginTop: 10,
    textAlign: "center",
  },
  navigationDisabled: {
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 11,
    width: "48%",
  },
  navigationDisabledText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  navigationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  navigationHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    marginTop: 22,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  productChip: {
    backgroundColor: "#DBEAFE",
    borderColor: "rgba(37, 99, 235, 0.16)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  productChipText: {
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: "700",
  },
  productList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 9,
  },
  relatedAction: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 12,
  },
  relatedCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    width: 250,
  },
  relatedContent: {
    padding: 14,
  },
  relatedImage: {
    height: "100%",
    width: "100%",
  },
  relatedImageFrame: {
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    height: 130,
    justifyContent: "center",
  },
  relatedImageLetter: {
    color: "#2563EB",
    fontSize: 30,
    fontWeight: "800",
  },
  relatedName: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  relatedProducts: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  relatedRail: {
    gap: 12,
    paddingRight: 20,
  },
  relatedRegion: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 5,
  },
  relatedSection: {
    paddingBottom: 30,
    paddingLeft: 20,
    paddingTop: 22,
  },
  relatedUnverifiedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    marginTop: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  relatedUnverifiedText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
  },
  relatedVerifiedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    marginTop: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  relatedVerifiedText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "800",
  },
  safeArea: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  secondaryButton: {
    borderColor: "rgba(37, 99, 235, 0.28)",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  section: {
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  sectionEyebrow: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 14,
  },
  skeleton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
  },
  skeletonImage: {
    height: 220,
    marginTop: 30,
    width: "100%",
  },
  skeletonLine: {
    height: 18,
    marginTop: 14,
    width: "72%",
  },
  skeletonTitle: {
    height: 34,
    marginTop: 34,
    width: "82%",
  },
  sourceLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  sourceLink: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
  },
  sourceName: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  sourceRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  stateShell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  title: {
    color: "#0F172A",
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -0.7,
    lineHeight: 38,
    marginTop: 8,
  },
  trustRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 15,
  },
  unverifiedBadge: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unverifiedBadgeText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
  },
  verifiedBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verifiedBadgeText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "800",
  },
});
