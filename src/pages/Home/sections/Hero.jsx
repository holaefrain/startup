import { useEffect, useRef } from "react";
import { animate, createScope, createTimeline, stagger } from "animejs";
import homepage1 from "../../../assets/img/homepage1.jpg";
import homepage2 from "../../../assets/img/homepage2.jpg";
import homepage3 from "../../../assets/img/homepage3.jpeg";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const REVEAL_TARGETS = ".hero-photo, .hero-title h1, .hero-subtitle h2";

export default function Hero() {
  const root = useRef(null);

  useEffect(() => {
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: REDUCE_MOTION_QUERY },
    }).add((self) => {
      if (self.matches.reduceMotion) {
        animate(REVEAL_TARGETS, { opacity: 1, y: 0, duration: 0 });
        return;
      }

      createTimeline({ defaults: { ease: "outExpo" } })
        .add(".hero-photo", {
          opacity: [0, 1],
          y: [24, 0],
          duration: 700,
          delay: stagger(80),
        })
        .add(
          ".hero-title h1",
          {
            opacity: [0, 1],
            y: ["100%", "0%"],
            duration: 800,
          },
          "-=400"
        )
        .add(
          ".hero-subtitle h2",
          {
            opacity: [0, 1],
            duration: 500,
          },
          "-=300"
        );
    });

    return () => scope.revert();
  }, []);

  return (
    <section id="hero-section" ref={root}>
      <div className="hero-content">
        <div className="hero-photo-grid" aria-label="Homepage preview images">
          <figure className="hero-photo">
            <img src={homepage1} alt="Homepage preview 1" />
          </figure>
          <figure className="hero-photo">
            <img src={homepage2} alt="Homepage preview 2" />
          </figure>
          <figure className="hero-photo">
            <img src={homepage3} alt="Homepage preview 3" />
          </figure>
        </div>

        <div className="hero-title">
          <h1>DEBRIEF</h1>
        </div>
        <div className="hero-subtitle">
          <h2>A DATING APP MEANT FOR DATING</h2>
        </div>
      </div>
    </section>
  );
}
