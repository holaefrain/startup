import { useEffect, useRef } from "react";
import { onScroll, utils } from "animejs";

// A panel counts as "active" (interactive, exposed to AT) once the scene
// progress is within this distance of its index.
const ACTIVE_THRESHOLD = 0.5;

// Keeps the page anchored while each scene drifts into the next. The tiny
// vertical offset makes the handoff feel like a continuous camera move rather
// than a stack of slides fading through one another.

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
          const opacity = Math.max(0, 1 - distance * 1.35);
          const offset = (i - sceneProgress) * 28;
          utils.set(panel, { opacity, translateY: offset });
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
