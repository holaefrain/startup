import { useEffect, useRef } from "react";
import { onScroll, utils } from "animejs";

// Fixed bar whose scaleX tracks whole-page scroll progress. enter/leave are
// set to the full body span ('top top' -> 'bottom bottom') rather than the
// library's viewport-relative defaults ('end start'/'start end'), which are
// meant for tracking a single section entering/leaving view, not the whole
// page's scroll fraction. Verified against node_modules/animejs's
// events/scroll.js: onScroll's target defaults to document.body already,
// and progress is only 0->1 across the whole document with these thresholds.

export default function ScrollProgress() {
  const barRef = useRef(null);

  useEffect(() => {
    const observer = onScroll({
      enter: "top top",
      leave: "bottom bottom",
      onUpdate: (self) => utils.set(barRef.current, { scaleX: self.progress }),
    });

    return () => observer.revert();
  }, []);

  return <div className="scroll-progress" ref={barRef} aria-hidden="true" />;
}
