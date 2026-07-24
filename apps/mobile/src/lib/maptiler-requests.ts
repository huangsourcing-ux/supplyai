import { TransformRequestManager } from "@maplibre/maplibre-react-native";
import { Platform } from "react-native";

import { getMapTilerRequestIdentity } from "../config/maptiler-identity";
import { mobileEnvironment } from "../env";

const MAPTILER_USER_AGENT_TRANSFORM_ID = "chinasupply-maptiler-user-agent";
const MAPTILER_API_MATCH = "^https://api\\.maptiler\\.com/";

export function configureMapTilerRequests(): void {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return;
  }

  const identity = getMapTilerRequestIdentity(
    mobileEnvironment.EXPO_PUBLIC_APP_ENV,
    Platform.OS,
    {
      android: mobileEnvironment.EXPO_PUBLIC_MAPTILER_ANDROID_KEY ?? "",
      ios: mobileEnvironment.EXPO_PUBLIC_MAPTILER_IOS_KEY ?? "",
    },
  );

  TransformRequestManager.addHeader({
    id: MAPTILER_USER_AGENT_TRANSFORM_ID,
    match: MAPTILER_API_MATCH,
    name: "User-Agent",
    value: identity.userAgent,
  });
}
