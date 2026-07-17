import { useEffect } from "react";
import { animate, createScope, onScroll, stagger } from "animejs";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Fades/slides in every [data-reveal] descendant of rootRef the first time
// the section scrolls into view, then leaves it revealed. Verified against
// the animejs v4.5.0 source in node_modules/animejs/dist/modules/{scope,events}/*.js:
// - onScroll's `target` does not unwrap React refs the way Scope's `root`
//   does, so it needs rootRef.current explicitly.
// - String selectors passed to animate() *do* auto-scope to the enclosing
//   createScope's root, since parseTargets reads the scope's resolved root
//   while the scope's .add() callback is running.
export default function useScrollReveal(
  rootRef,
  { y = 24, duration = 700, ease = "outExpo", staggerDelay = 90 } = {}
) {
  useEffect(() => {
    const scope = createScope({
      root: rootRef,
      mediaQueries: { reduceMotion: REDUCE_MOTION_QUERY },
    }).add((self) => {
      if (self.matches.reduceMotion) {
        animate("[data-reveal]", { opacity: 1, y: 0, duration: 0 });
        return;
      }

      animate("[data-reveal]", {
        opacity: [0, 1],
        y: [y, 0],
        duration,
        ease,
        delay: stagger(staggerDelay),
        autoplay: onScroll({
          target: rootRef.current,
          enter: "bottom-=10% top",
          repeat: false,
        }),
      });
    });

    return () => scope.revert();
  }, [rootRef, y, duration, ease, staggerDelay]);
}
