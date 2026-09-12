import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function RouteScrollManager() {
  const { hash, pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const didPathChange = previousPathname.current !== pathname;
    previousPathname.current = pathname;

    const animationFrame = window.requestAnimationFrame(() => {
      if (hash) {
        let targetId = hash.slice(1);

        try {
          targetId = decodeURIComponent(targetId);
        } catch {
          // A malformed external hash should not break page navigation.
        }

        const target = document.getElementById(targetId);
        target?.scrollIntoView({ block: "start" });

        if (didPathChange && target instanceof HTMLElement) {
          if (!target.hasAttribute("tabindex")) {
            target.setAttribute("tabindex", "-1");
          }

          target.focus({ preventScroll: true });
        }

        return;
      }

      window.scrollTo({ left: 0, top: 0, behavior: "auto" });

      if (didPathChange) {
        const focusTarget = document.querySelector("main h1") ?? document.querySelector("main");

        if (focusTarget instanceof HTMLElement) {
          if (!focusTarget.hasAttribute("tabindex")) {
            focusTarget.setAttribute("tabindex", "-1");
          }

          focusTarget.focus({ preventScroll: true });
        }
      }
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [hash, pathname]);

  return null;
}
