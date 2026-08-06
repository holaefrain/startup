import { useEffect, useRef } from "react";
import { animate, createTimer, scrambleText } from "animejs";

const LOCAL_WORDS = ["LOCAL", "REAL", "ADVENTUROUS", "EXCITING", "HEARTFELT", "DEEP", "PEACEFUL"];
const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export default function HowItWorks() {
  const wordRef = useRef(null);
  const wordIndexRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia(REDUCE_MOTION_QUERY).matches) return undefined;

    const timer = createTimer({
      duration: 2600,
      loop: true,
      onLoop: () => {
        const word = wordRef.current;
        // The scene stays visually quiet while another pinned section owns the viewport.
        if (!word || word.closest(".pinned-panel")?.inert) return;

        wordIndexRef.current = (wordIndexRef.current + 1) % LOCAL_WORDS.length;
        animate(word, {
          textContent: scrambleText({ text: LOCAL_WORDS[wordIndexRef.current], chars: "uppercase" }),
          duration: 700,
        });
      },
    });

    return () => timer.revert();
  }, []);

  return (
    <section className="home-scene home-statement home-connection" id="how-it-works">
      <div className="home-copy">
        <p className="scene-kicker">03 — HOW IT WORKS</p>
        <h2 aria-label="START WITH SOMETHING LOCAL.">
          START WITH<br />SOMETHING<br /><span ref={wordRef}>{LOCAL_WORDS[0]}</span>.
        </h2>
        <p className="scene-lede">Designed for transformative dates, all in your area.</p>
      </div>
      <div className="home-info-card home-process-card">
        <p className="statement-label">LOCAL ADVENTURES CAN UNLOCK DEEPER CONNECTIONS</p>
        <p className="statement-answer">Debrief makes it easy to connect with those around you. With intentional release for select pilot universities, the platform is designed to facilitate meaningful interactions in your local community. Meet people that are experiencing life right next to you, not across the country.</p>
        <ol className="connection-list" aria-label="How Debrief works">
          <li><b>01</b><span>Unique Experiences, locally</span></li>
          <li><b>02</b><span>Experience Meaningfully</span></li>
          <li><b>03</b><span>Reflect. Grow. Love.</span></li>
        </ol>
      </div>
    </section>
  );
}
