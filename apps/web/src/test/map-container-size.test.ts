import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hasRenderableMapSize,
  observeRenderableMapContainer,
} from "../app/(frontend)/map/map-container-size";

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];

  readonly disconnect = vi.fn();
  readonly observe = vi.fn();

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

afterEach(() => {
  FakeResizeObserver.instances = [];
  vi.unstubAllGlobals();
});

describe("Map container sizing", () => {
  it("accepts only positive container dimensions", () => {
    expect(hasRenderableMapSize({ clientHeight: 720, clientWidth: 1280 })).toBe(
      true,
    );
    expect(hasRenderableMapSize({ clientHeight: 720, clientWidth: 0 })).toBe(
      false,
    );
    expect(hasRenderableMapSize({ clientHeight: 0, clientWidth: 1280 })).toBe(
      false,
    );
  });

  it("waits for a non-zero size and observes later resize changes", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const container = {
      clientHeight: 0,
      clientWidth: 0,
    } as HTMLElement;
    const onRenderableResize = vi.fn();

    const disconnect = observeRenderableMapContainer(
      container,
      onRenderableResize,
    );
    const observer = FakeResizeObserver.instances[0];

    expect(observer?.observe).toHaveBeenCalledWith(container);
    expect(onRenderableResize).not.toHaveBeenCalled();

    Object.assign(container, { clientHeight: 720, clientWidth: 1280 });
    observer?.trigger();
    expect(onRenderableResize).toHaveBeenCalledOnce();

    Object.assign(container, { clientHeight: 0, clientWidth: 1280 });
    observer?.trigger();
    expect(onRenderableResize).toHaveBeenCalledOnce();

    Object.assign(container, { clientHeight: 600, clientWidth: 1024 });
    observer?.trigger();
    expect(onRenderableResize).toHaveBeenCalledTimes(2);

    disconnect();
    expect(observer?.disconnect).toHaveBeenCalledOnce();
  });

  it("notifies immediately when the initial layout is already usable", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const container = {
      clientHeight: 720,
      clientWidth: 1280,
    } as HTMLElement;
    const onRenderableResize = vi.fn();

    observeRenderableMapContainer(container, onRenderableResize);

    expect(onRenderableResize).toHaveBeenCalledOnce();
  });
});
