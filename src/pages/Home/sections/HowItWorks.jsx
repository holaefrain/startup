import { useRef } from "react";
import useScrollReveal from "../../../hooks/useScrollReveal.js";

export default function HowItWorks() {
  const root = useRef(null);
  useScrollReveal(root);

  return (
    <section id="how-it-works" ref={root}>
      <div className="how-it-works-content">
        <h2 data-reveal>How It Works</h2>
        <p data-reveal>
          Debrief makes it easy to connect with others who share similar dating experiences. Our platform
          allows you to share your stories, ask questions, and get advice from a community of like-minded individuals.
        </p>
      </div>
    </section>
  );
}
