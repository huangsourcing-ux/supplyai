export interface MapContainerSize {
  readonly clientHeight: number;
  readonly clientWidth: number;
}

export function hasRenderableMapSize(container: MapContainerSize) {
  return container.clientWidth > 0 && container.clientHeight > 0;
}

export function observeRenderableMapContainer(
  container: HTMLElement,
  onRenderableResize: () => void,
) {
  const notifyIfRenderable = () => {
    if (hasRenderableMapSize(container)) onRenderableResize();
  };
  const observer = new ResizeObserver(notifyIfRenderable);

  observer.observe(container);
  notifyIfRenderable();

  return () => {
    observer.disconnect();
  };
}
