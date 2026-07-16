import homepage1 from "../../../assets/img/homepage1.jpg";
import homepage2 from "../../../assets/img/homepage2.jpg";
import homepage3 from "../../../assets/img/homepage3.jpeg";

export default function Hero() {
  return (
    <section id="hero-section">
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
