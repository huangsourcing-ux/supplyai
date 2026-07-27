import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

type MapMockProps = {
  children?: ReactNode;
  onDidFailLoadingMap?: () => void;
  onDidFinishLoadingMap?: () => void;
  onDidFinishRenderingMapFully?: () => void;
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
  id?: string;
};

export function Map({
  children,
  onDidFailLoadingMap,
  onDidFinishLoadingMap,
  onDidFinishRenderingMapFully,
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

export function Camera() {
  return <View testID="maplibre-camera" />;
}

export function GeoJSONSource({ children, id }: SourceMockProps) {
  return <View testID={`maplibre-source-${id}`}>{children}</View>;
}

export function Layer({ id }: { id?: string }) {
  return <View testID={`maplibre-layer-${id}`} />;
}
