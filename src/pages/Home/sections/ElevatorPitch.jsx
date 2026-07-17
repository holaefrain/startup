import { useRef } from "react";
import useScrollReveal from "../../../hooks/useScrollReveal.js";

export default function ElevatorPitch() {
  const root = useRef(null);
  useScrollReveal(root);

  return (
    <section id="elevator-pitch" ref={root}>
      <div className="elevator-pitch-content">
        <h2 data-reveal>Why Debrief?</h2>
        <p data-reveal>
          Debrief is different from other dating apps because we focus on creating a space for honest
          conversation and personal growth. Instead of just matching people based on superficial criteria,
          we encourage users to share their real experiences and learn from each other.
        </p>
      </div>
    </section>
  );
}
