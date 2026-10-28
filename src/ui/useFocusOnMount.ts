import { useEffect, useRef } from "react";

/** Moves focus to a heading when its screen appears (e.g. a debrief after closing). */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: "start" });
  }, []);
  return ref;
}
