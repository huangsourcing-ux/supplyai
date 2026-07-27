import {
  createDebouncedViewportUpdater,
  MAP_VIEWPORT_DEBOUNCE_MS,
  readMapViewport,
} from "./map-viewport";

describe("mobile map viewport", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("converts native WGS-84 bounds to the MAP bbox and integer zoom contract", () => {
    expect(
      readMapViewport({
        bounds: [119.1234567, 29.1234567, 120.9876543, 30.9876543],
        zoom: 10.9,
      }),
    ).toEqual({
      bbox: "119.123457,29.123457,120.987654,30.987654",
      zoom: 10,
    });
  });

  it("rejects non-finite and inverted native viewports", () => {
    expect(
      readMapViewport({
        bounds: [Number.NaN, 29, 120, 30],
        zoom: 10,
      }),
    ).toBeNull();
    expect(
      readMapViewport({ bounds: [120, 29, 119, 30], zoom: 10 }),
    ).toBeNull();
  });

  it("debounces changes for 500ms and keeps only the latest viewport", () => {
    jest.useFakeTimers();
    const update = jest.fn();
    const updater = createDebouncedViewportUpdater(update);

    updater.schedule({ bbox: "100,20,110,30", zoom: 8 });
    updater.schedule({ bbox: "110,25,120,35", zoom: 10 });
    jest.advanceTimersByTime(MAP_VIEWPORT_DEBOUNCE_MS - 1);
    expect(update).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      bbox: "110,25,120,35",
      zoom: 10,
    });
  });

  it("cancels a pending viewport update", () => {
    jest.useFakeTimers();
    const update = jest.fn();
    const updater = createDebouncedViewportUpdater(update);

    updater.schedule({ bbox: "100,20,110,30", zoom: 8 });
    updater.cancel();
    jest.runAllTimers();

    expect(update).not.toHaveBeenCalled();
  });
});
