import { useEffect, useRef, useState, type ReactNode } from "react";

/** Reserve toolbar space, but release sticky positioning when text makes it tall. */
export function UtilityHeader({ children }: { children: ReactNode }) {
  const header = useRef<HTMLDivElement>(null);
  const [oversized, setOversized] = useState(false);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const measure = () => {
      const height = element.getBoundingClientRect().height;
      setOversized(height > Math.min(160, window.innerHeight / 4));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return (
    <div ref={header} className="utility-header" data-oversized={oversized}>
      {children}
    </div>
  );
}
