import { useEffect } from "react";

function measureViewport() {
  const viewport = window.visualViewport;
  const innerHeight = window.innerHeight || 0;
  const viewportHeight = viewport?.height || innerHeight;
  const offsetTop = Math.max(0, viewport?.offsetTop || 0);
  const keyboardInset = Math.max(0, innerHeight - (viewportHeight + offsetTop));
  const isStableViewport = Math.abs(innerHeight - (viewportHeight + offsetTop)) < 1;

  return {
    height: Math.round(isStableViewport ? innerHeight : viewportHeight),
    offsetTop: Math.round(offsetTop),
    keyboardInset: Math.round(keyboardInset)
  };
}

function setViewportVars(propertyPrefix) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return undefined;
  }

  const metrics = measureViewport();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty(`--${propertyPrefix}-height`, `${metrics.height}px`);
  rootStyle.setProperty(`--${propertyPrefix}-offset-top`, `${metrics.offsetTop}px`);
  rootStyle.setProperty(`--${propertyPrefix}-keyboard-inset`, `${metrics.keyboardInset}px`);
  return metrics;
}

export default function useMobileViewportHeight(active = true, options = {}) {
  const { propertyPrefix = "app-viewport" } = options;

  useEffect(() => {
    if (!active || typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const update = () => {
      setViewportVars(propertyPrefix);
    };

    update();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.documentElement.style.removeProperty(`--${propertyPrefix}-height`);
      document.documentElement.style.removeProperty(`--${propertyPrefix}-offset-top`);
      document.documentElement.style.removeProperty(`--${propertyPrefix}-keyboard-inset`);
    };
  }, [active, propertyPrefix]);
}
