import { forwardRef, type ReactNode, useImperativeHandle } from "react";
import { Pressable, View } from "react-native";

type MapMockProps = {
  children?: ReactNode;
  onDidFailLoadingMap?: () => void;
  onDidFinishLoadingMap?: () => void;
  onDidFinishRenderingMapFully?: () => void;
  onPress?: () => void;
  onRegionDidChange?: (event: {
    nativeEvent: {
      animated: boolean;
      bearing: number;
      bounds: [number, number, number, number];
      center: [number, number];
      pitch: number;
      userInteraction: boolean;
      zoom: number;
    };
  }) => void;
  onRegionWillChange?: () => void;
  testID?: string;
};

type SourceMockProps = {
  children?: ReactNode;
  data?: GeoJSON.FeatureCollection;
  id?: string;
  onPress?: (event: {
    nativeEvent: { features: GeoJSON.Feature[] };
    stopPropagation: () => void;
  }) => void;
};

const clusterFeature = {
  geometry: {
    coordinates: [120.075, 29.306],
    type: "Point",
  },
  properties: {
    color: "#0F766E",
    factoryCount: 12,
    id: "clu_12345678901234567",
    name_en: "Yiwu Small Commodities",
    primaryCategoryId: "cat_12345678901234567",
    slug: "yiwu-small-commodities",
  },
  type: "Feature",
} as const;

const factoryFeature = {
  geometry: {
    coordinates: [120.08, 29.31],
    type: "Point",
  },
  properties: {
    clusterId: "clu_12345678901234567",
    id: "fac_12345678901234567",
    name_en: "Yiwu Bright Goods Factory",
    slug: "yiwu-bright-goods",
    verified: true,
  },
  type: "Feature",
} as const;

const factoryClusterFeature = {
  geometry: {
    coordinates: [120.08, 29.31],
    type: "Point",
  },
  properties: {
    cluster_id: 73,
    point_count: 8,
    point_count_abbreviated: 8,
  },
  type: "Feature",
} as const;

export const cameraEaseToMock = jest.fn();
export const cameraFitBoundsMock = jest.fn();
export const cameraFlyToMock = jest.fn();
export const clusterExpansionZoomMock = jest.fn(async () => 13);

function pressEvent(features: GeoJSON.Feature[]) {
  return {
    nativeEvent: { features },
    stopPropagation: jest.fn(),
  };
}

export function Map({
  children,
  onDidFailLoadingMap,
  onDidFinishLoadingMap,
  onDidFinishRenderingMapFully,
  onPress,
  onRegionDidChange,
  onRegionWillChange,
  testID,
}: MapMockProps) {
  return (
    <View testID={testID ?? "maplibre-map"}>
      {children}
      <Pressable
        onPress={onDidFinishLoadingMap ?? onDidFinishRenderingMapFully}
        testID="maplibre-finish-rendering"
      />
      <Pressable onPress={onDidFailLoadingMap} testID="maplibre-fail-loading" />
      <Pressable onPress={onPress} testID="maplibre-map-press" />
      <Pressable
        onPress={onRegionWillChange}
        testID="maplibre-region-will-change"
      />
      <Pressable
        onPress={() =>
          onRegionDidChange?.({
            nativeEvent: {
              animated: false,
              bearing: 0,
              bounds: [119.9, 29.9, 120.3, 30.2],
              center: [120.1, 30.05],
              pitch: 0,
              userInteraction: true,
              zoom: 10.75,
            },
          })
        }
        testID="maplibre-region-did-change"
      />
    </View>
  );
}

export const Camera = forwardRef(function CameraMock(_, ref) {
  useImperativeHandle(ref, () => ({
    easeTo: cameraEaseToMock,
    fitBounds: cameraFitBoundsMock,
    flyTo: cameraFlyToMock,
  }));
  return <View testID="maplibre-camera" />;
});

export const GeoJSONSource = forwardRef(function GeoJSONSourceMock(
  { children, data, id, onPress }: SourceMockProps,
  ref,
) {
  useImperativeHandle(ref, () => ({
    getClusterExpansionZoom: clusterExpansionZoomMock,
  }));

  const standardFeatures =
    id === "industrial-factories" ? [factoryFeature] : [clusterFeature];

  return (
    <View testID={`maplibre-source-${id}`}>
      {children}
      <View
        accessibilityValue={{ text: String(data?.features.length ?? 0) }}
        testID={`maplibre-source-data-${id}`}
      />
      <Pressable
        onPress={() =>
          onPress?.(
            pressEvent(standardFeatures as unknown as GeoJSON.Feature[]),
          )
        }
        testID={`maplibre-source-press-${id}`}
      />
      {id === "industrial-factories" ? (
        <Pressable
          onPress={() =>
            onPress?.(
              pressEvent([factoryClusterFeature as unknown as GeoJSON.Feature]),
            )
          }
          testID={`maplibre-source-press-${id}-cluster`}
        />
      ) : null}
    </View>
  );
});

export function Layer({ id }: { id?: string }) {
  return <View testID={`maplibre-layer-${id}`} />;
}
