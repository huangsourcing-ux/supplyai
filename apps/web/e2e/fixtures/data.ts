import type {
  GetCategories200,
  GetCluster200,
  GetClusterFactories200,
  GetFactory200,
  GetMapClusterBoundaries200,
  GetMapClusterPoints200,
  GetMapFactories200,
  Search200,
} from "@chinasupply/api-client";

export const CLUSTER_ID = "clusterDongguan000001";
export const FACTORY_ID = "factoryDongguan000001";
export const ELECTRONICS_CATEGORY_ID = "categoryElectron00001";
export const FURNITURE_CATEGORY_ID = "categoryFurnitur00001";
export const REGION_ID = "regionDongguan0000001";

export const CLUSTER_SLUG = "dongguan-electronics-cluster";
export const FACTORY_SLUG = "dongguan-precision-electronics";
export const CLUSTER_NAME = "Dongguan Electronics Cluster";
export const FACTORY_NAME = "Dongguan Precision Electronics";

const FIXTURE_CENTER: [number, number] = [104, 36];
const PUBLISHED_AT = "2026-06-01T12:00:00Z";

const region = {
  id: REGION_ID,
  level: "city" as const,
  name: "Dongguan",
};

const electronicsCategory = {
  color: "#2563EB",
  icon: null,
  id: ELECTRONICS_CATEGORY_ID,
  name: "Electronics",
  parentId: null,
  slug: "electronics",
  sortOrder: 1,
};

const factorySummary = {
  cluster: {
    id: CLUSTER_ID,
    name: CLUSTER_NAME,
    slug: CLUSTER_SLUG,
  },
  id: FACTORY_ID,
  imageUrl: null,
  location: {
    coordinates: FIXTURE_CENTER,
    type: "Point" as const,
  },
  mainProducts: ["Precision connectors", "Control boards"],
  name: FACTORY_NAME,
  publishedAt: PUBLISHED_AT,
  region,
  slug: FACTORY_SLUG,
  verified: true,
};

export const categoriesResponse = {
  data: [
    {
      ...electronicsCategory,
      children: [],
    },
    {
      children: [],
      color: "#F97316",
      icon: null,
      id: FURNITURE_CATEGORY_ID,
      name: "Furniture",
      parentId: null,
      slug: "furniture",
      sortOrder: 2,
    },
  ],
  error: null,
  meta: {},
} satisfies GetCategories200;

export const clusterPointsResponse = {
  data: {
    features: [
      {
        geometry: {
          coordinates: FIXTURE_CENTER,
          type: "Point",
        },
        properties: {
          color: electronicsCategory.color,
          factoryCount: 5,
          id: CLUSTER_ID,
          name_en: CLUSTER_NAME,
          primaryCategoryId: ELECTRONICS_CATEGORY_ID,
          slug: CLUSTER_SLUG,
        },
        type: "Feature",
      },
    ],
    type: "FeatureCollection",
  },
  error: null,
  meta: {},
} satisfies GetMapClusterPoints200;

export const clusterBoundariesResponse = {
  data: {
    features: [
      {
        geometry: {
          coordinates: [
            [
              [
                [103.85, 35.85],
                [104.15, 35.85],
                [104.15, 36.15],
                [103.85, 36.15],
                [103.85, 35.85],
              ],
            ],
          ],
          type: "MultiPolygon",
        },
        properties: {
          color: electronicsCategory.color,
          factoryCount: 5,
          id: CLUSTER_ID,
          name_en: CLUSTER_NAME,
          primaryCategoryId: ELECTRONICS_CATEGORY_ID,
          slug: CLUSTER_SLUG,
        },
        type: "Feature",
      },
    ],
    type: "FeatureCollection",
  },
  error: null,
  meta: {},
} satisfies GetMapClusterBoundaries200;

export const factoryPointsResponse = {
  data: {
    features: [
      {
        geometry: {
          coordinates: FIXTURE_CENTER,
          type: "Point",
        },
        properties: {
          clusterId: CLUSTER_ID,
          id: FACTORY_ID,
          name_en: FACTORY_NAME,
          slug: FACTORY_SLUG,
          verified: true,
        },
        type: "Feature",
      },
    ],
    type: "FeatureCollection",
  },
  error: null,
  meta: {
    truncated: false,
  },
} satisfies GetMapFactories200;

export const truncatedFactoryPointsResponse = {
  ...factoryPointsResponse,
  meta: {
    truncated: true,
  },
} satisfies GetMapFactories200;

export const searchResponse = {
  data: {
    categories: [],
    clusters: [
      {
        centroid: {
          coordinates: FIXTURE_CENTER,
          type: "Point",
        },
        factoryCount: 5,
        id: CLUSTER_ID,
        name: CLUSTER_NAME,
        slug: CLUSTER_SLUG,
        type: "cluster",
      },
    ],
    factories: [
      {
        id: FACTORY_ID,
        location: {
          coordinates: FIXTURE_CENTER,
          type: "Point",
        },
        name: FACTORY_NAME,
        slug: FACTORY_SLUG,
        type: "factory",
        verified: true,
      },
    ],
  },
  error: null,
  meta: {},
} satisfies Search200;

export const clusterResponse = {
  data: {
    boundary: clusterBoundariesResponse.data.features[0]!.geometry,
    categories: [electronicsCategory],
    centroid: {
      coordinates: FIXTURE_CENTER,
      type: "Point",
    },
    coverImageUrl: null,
    description:
      "A deterministic industrial cluster fixture used by the Web end-to-end suite.",
    factoryCount: 5,
    id: CLUSTER_ID,
    mainProducts: ["Precision connectors", "Control boards"],
    name: CLUSTER_NAME,
    primaryCategory: electronicsCategory,
    publishedAt: PUBLISHED_AT,
    region,
    slug: CLUSTER_SLUG,
    stats: {
      annualOutputUsd: 250000000,
      exportShare: 0.72,
      note: "Fixture statistics",
    },
    summary: "A fixed electronics manufacturing cluster in Dongguan.",
  },
  error: null,
  meta: {},
} satisfies GetCluster200;

export const clusterFactoriesResponse = {
  data: [factorySummary],
  error: null,
  meta: {
    nextCursor: null,
  },
} satisfies GetClusterFactories200;

export const factoryResponse = {
  data: {
    ...factorySummary,
    address: {
      en: "1 Fixture Road, Dongguan, Guangdong, China",
      zh: "中国广东省东莞市夹具路1号",
    },
    categories: [electronicsCategory],
    certifications: ["ISO 9001"],
    contact: {
      email: "fixture@example.invalid",
      phone: "+86 000 0000 0000",
      website: "https://factory.example.invalid",
      wechat: "fixture_factory",
    },
    employeeRange: "500–999",
    establishedYear: 2012,
    images: [],
    lastVerifiedAt: "2026-06-15T12:00:00Z",
    moq: "1,000 units",
    relatedFactories: [],
    sourceName: "Fixture source",
    sourceUrl: "https://source.example.invalid/factory",
    verifiedAt: "2026-06-10T12:00:00Z",
  },
  error: null,
  meta: {},
} satisfies GetFactory200;
