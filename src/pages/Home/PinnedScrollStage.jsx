import { useEffect, useRef } from "react";
import { onScroll, utils } from "animejs";

// A panel counts as "active" (interactive, exposed to AT) once the scene
// progress is within this distance of its index.
const ACTIVE_THRESHOLD = 0.5;

// implements a scroll-driven "pinned panels" effect — it takes an array of sections (from sections/index.js) and turns scrolling through them into a crossfade animation, rather than normal page-flow scrolling.

export default function PinnedScrollStage({ sections }) {
  const trackRef = useRef(null);
  const panelsRef = useRef([]);

  useEffect(() => {
    const panelCount = sections.length;

    const observer = onScroll({
      target: trackRef.current,
      enter: "top top",
      leave: "bottom bottom",
      onUpdate: (self) => {
        const sceneProgress = self.progress * (panelCount - 1);
        panelsRef.current.forEach((panel, i) => {
          if (!panel) return;
          const distance = Math.abs(sceneProgress - i);
          const isActive = distance < ACTIVE_THRESHOLD;
          utils.set(panel, { opacity: Math.max(0, 1 - distance) });
          panel.style.pointerEvents = isActive ? "auto" : "none";
          panel.inert = !isActive;
        });
      },
    });

    return () => observer.revert();
  }, [sections]);

  return (
    <div className="pinned-track" ref={trackRef} style={{ height: `${sections.length * 100}vh` }}>
      <div className="pinned-stage">
        {sections.map((Section, i) => (
          <div className="pinned-panel" key={i} ref={(el) => (panelsRef.current[i] = el)}>
            <Section />
          </div>
        ))}
      </div>
    </div>
  );
}
