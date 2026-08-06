import { useEffect, useRef } from "react";
import { animate, createTimer, scrambleText } from "animejs";

const LOCAL_WORDS = ["LOCAL", "REAL", "ADVENTUROUS", "EXCITING", "HEARTFELT", "DEEP", "PEACEFUL"];
const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Widths relative to font-size, so one measurement stays valid at every viewport width.
function measureEmWidths(sample, strings) {
  const styles = getComputedStyle(sample);
  const fontSize = parseFloat(styles.fontSize);
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;top:-9999px;left:-9999px;visibility:hidden;white-space:nowrap";
  probe.style.font = `${styles.fontStyle} ${styles.fontWeight} 100px ${styles.fontFamily}`;
  probe.style.letterSpacing = `${(parseFloat(styles.letterSpacing) || 0) / fontSize}em`;
  document.body.appendChild(probe);

  const widths = {};
  for (const string of strings) {
    probe.textContent = string;
    widths[string] = probe.getBoundingClientRect().width / 100;
  }
  probe.remove();
  return widths;
}

export default function HowItWorks() {
  const wordRef = useRef(null);
  const lineRef = useRef(null);
  const wordIndexRef = useRef(0);

  useEffect(() => {
    const word = wordRef.current;
    if (!word) return undefined;

    const heading = lineRef.current.parentElement;
    const emWidths = measureEmWidths(word, [...LOCAL_WORDS, "."]);

    // The period sits outside the span and keeps the heading's full size, so the
    // word only ever gets the room left over once the period is accounted for.
    const sizeFor = (text) => {
      const base = parseFloat(getComputedStyle(heading).fontSize);
      const room = heading.clientWidth - emWidths["."] * base;
      return Math.min(base, room / emWidths[text]);
    };

    const applySize = (text) => {
      word.style.fontSize = `${sizeFor(text)}px`;
    };

    // Scramble characters run wider than the real letters, and without this the
    // overshoot breaks the period onto a line of its own.
    lineRef.current.style.whiteSpace = "nowrap";
    applySize(LOCAL_WORDS[wordIndexRef.current]);

    const onResize = () => applySize(LOCAL_WORDS[wordIndexRef.current]);
    window.addEventListener("resize", onResize);

    if (window.matchMedia(REDUCE_MOTION_QUERY).matches) {
      return () => window.removeEventListener("resize", onResize);
    }

    const timer = createTimer({
      duration: 2600,
      loop: true,
      onLoop: () => {
        // The scene stays visually quiet while another pinned section owns the viewport.
        if (word.closest(".pinned-panel")?.inert) return;

        const current = LOCAL_WORDS[wordIndexRef.current];
        wordIndexRef.current = (wordIndexRef.current + 1) % LOCAL_WORDS.length;
        const next = LOCAL_WORDS[wordIndexRef.current];
        const target = sizeFor(next);
        // Mid-scramble the text runs as long as the wider of the two words, so shrink
        // before the churn starts and grow only once it has settled on the shorter one.
        const shrinking = target < sizeFor(current);

        animate(word, {
          textContent: scrambleText({ text: next, chars: "uppercase" }),
          fontSize: {
            to: `${target}px`,
            duration: 320,
            delay: shrinking ? 0 : 380,
            ease: shrinking ? "outQuad" : "inQuad",
          },
          duration: 700,
        });
      },
    });

    return () => {
      window.removeEventListener("resize", onResize);
      timer.revert();
    };
  }, []);

  return (
    <section className="home-scene home-statement home-connection" id="how-it-works">
      <div className="home-copy">
        <p className="scene-kicker">03 — HOW IT WORKS</p>
        <h2 aria-label="Start with something local.">
          START WITH<br />SOMETHING<br />
          <span ref={lineRef}><span ref={wordRef}>{LOCAL_WORDS[0]}</span>.</span>
        </h2>
        <p className="scene-lede">Designed for transformative dates, all in your area.</p>
      </div>
      <div className="home-info-card home-process-card">
        <p className="statement-label">LOCAL ADVENTURES CAN UNLOCK DEEPER CONNECTIONS</p>
        <p className="statement-answer">Debrief makes it easy to connect with those around you. With intentional release for select pilot universities, the platform is designed to facilitate meaningful interactions in your local community. Meet people that are experiencing life right next to you, not across the country.</p>
        <ol className="connection-list" aria-label="How Debrief works">
          <li><b>01</b><span>Unique Experiences, Locally</span></li>
          <li><b>02</b><span>Experience Meaningfully</span></li>
          <li><b>03</b><span>Reflect. Grow. Love.</span></li>
        </ol>
      </div>
    </section>
  );
}
