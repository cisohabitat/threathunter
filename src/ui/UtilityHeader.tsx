import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reserve toolbar space, but release sticky positioning when text makes it tall.
 * Publishes the measured height so scroll clearance and the atmospheric layer
 * follow the real header instead of hard-coded offsets.
 */
export function UtilityHeader({ children }: { children: ReactNode }) {
  const header = useRef<HTMLDivElement>(null);
  const [oversized, setOversized] = useState(false);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const root = document.documentElement.style;
    const measure = () => {
      const height = element.getBoundingClientRect().height;
      const tall = height > Math.min(160, window.innerHeight / 4);
      // Apply immediately so the computed position below reflects this frame.
      element.dataset.oversized = String(tall);
      setOversized(tall);
      const sticky = getComputedStyle(element).position === "sticky";
      root.setProperty("--utility-header-height", `${Math.ceil(height)}px`);
      root.setProperty(
        "--utility-header-sticky",
        sticky ? `${Math.ceil(height)}px` : "0px",
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.removeProperty("--utility-header-height");
      root.removeProperty("--utility-header-sticky");
    };
  }, []);
  return (
    <div ref={header} className="utility-header" data-oversized={oversized}>
      {children}
    </div>
  );
}
