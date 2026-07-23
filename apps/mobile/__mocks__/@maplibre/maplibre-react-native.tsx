import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

type MapMockProps = {
  children?: ReactNode;
  onDidFailLoadingMap?: () => void;
  onDidFinishRenderingMapFully?: () => void;
  testID?: string;
};

type SourceMockProps = {
  children?: ReactNode;
  id?: string;
};

export function Map({
  children,
  onDidFailLoadingMap,
  onDidFinishRenderingMapFully,
  testID,
}: MapMockProps) {
  return (
    <View testID={testID ?? "maplibre-map"}>
      {children}
      <Pressable
        onPress={onDidFinishRenderingMapFully}
        testID="maplibre-finish-rendering"
      />
      <Pressable onPress={onDidFailLoadingMap} testID="maplibre-fail-loading" />
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
