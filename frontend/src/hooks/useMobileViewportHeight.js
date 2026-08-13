import { useEffect } from "react";

function setViewportHeightVar() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return undefined;
  }

  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-viewport-height", `${Math.round(height)}px`);
  return height;
}

export default function useMobileViewportHeight(active = true) {
  useEffect(() => {
    if (!active || typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const update = () => {
      setViewportHeightVar();
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
      document.documentElement.style.removeProperty("--app-viewport-height");
    };
  }, [active]);
}
