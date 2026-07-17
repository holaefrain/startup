import { useRef } from "react";
import useScrollReveal from "../../../hooks/useScrollReveal.js";

export default function DifferentApproach() {
  const root = useRef(null);
  useScrollReveal(root);

  return (
    <section id="different-approach" ref={root}>
      <div className="different-approach-content">
        <h2 data-reveal>The Need for a Different Approach</h2>
        <p data-reveal>
          Traditional dating apps often focus on superficial aspects, making it difficult to form meaningful
          connections. Debrief addresses this by fostering honest conversations and personal growth, helping
          users build deeper relationships.
        </p>
      </div>
    </section>
  );
}
