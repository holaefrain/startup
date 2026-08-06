import { Link } from "react-router-dom";
import homepage1 from "../../../assets/img/homepage1.jpg";
import homepage2 from "../../../assets/img/homepage2.jpg";
import homepage3 from "../../../assets/img/homepage3.jpeg";

export default function Hero() {
  return (
    <section className="home-scene home-hero" id="hero-section">
      <div className="home-copy home-hero-copy">
        <p className="scene-kicker">01 — AIR IT OUT</p>
        <h1>LET IT<br />ALL<br />AIR OUT</h1>
        <p className="home-hero-lede">Match. Date. Debrief.</p>
        <p className="home-hero-body">Meet people who are ready to make a plan—<br />then take some time to reflect.</p>
        <Link className="home-primary-cta" to="/signup">CREATE YOUR PROFILE</Link>
        <p className="home-scroll-cue">SCROLL TO START ↓</p>
      </div>

      <div className="hero-portrait-wrap" aria-label="People enjoying a date outdoors">
        <figure className="hero-portrait">
          <img src={homepage1} alt="A couple sharing a joyful moment outdoors" />
          <figcaption>CONVERSATIONS WITH CHEMISTRY</figcaption>
        </figure>
        <aside className="hero-note">
          <h2>BUILT FOR<br />THE AFTER.</h2>
          <p>The match is only<br />where things begin.</p>
        </aside>
      </div>

      <div className="hero-photo-stack" aria-hidden="true">
        <figure><img src={homepage2} alt="" /></figure>
        <figure><img src={homepage3} alt="" /></figure>
      </div>

      <div className="home-motion-key" aria-hidden="true">
        <div>
          <p>HOW THE SCROLL FEELS</p>
          <span>Pinned scene · gentle vertical drift · crossfade at the handoff</span>
        </div>
        <ol>
          <li className="is-current"><i></i>INTRO</li>
          <li><i></i>WHY</li>
          <li><i></i>HOW</li>
          <li><i></i>APPROACH</li>
        </ol>
      </div>
    </section>
  );
}
