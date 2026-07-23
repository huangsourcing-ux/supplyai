export type MapLoadEvent = "failed" | "finished";
export type MapLoadState = "error" | "loading" | "ready";

export function reduceMapLoadState(
  _state: MapLoadState,
  event: MapLoadEvent,
): MapLoadState {
  return event === "finished" ? "ready" : "error";
}
