import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer.jsx";

export default function Identity() {
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate("/signup/basic-info");
  };

  return (
    <div id="identity">
      <main>
      <h1>Identity Information</h1>

        <section id="identity-step">
        <h2>Step 2 - Identity</h2>

        <form id="signup-step2" onSubmit={handleSubmit}>
          <label htmlFor="pronouns">Pronouns</label>
          <select id="pronouns" name="pronouns" required>
            <option value="">Select pronouns</option>
            <option value="she_her">She / Her</option>
            <option value="he_him">He / Him</option>
            <option value="they_them">They / Them</option>
            <option value="ze_zir">Ze / Zir</option>
            <option value="other">Other</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>

          <label htmlFor="gender">Gender</label>
          <select id="gender" name="gender" required>
            <option value="">Select gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="nonbinary">Non-binary</option>
            <option value="trans">Transgender</option>
            <option value="other">Other</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>

          <label htmlFor="sexuality">Sexuality</label>
          <select id="sexuality" name="sexuality" required>
            <option value="">Select sexuality</option>
            <option value="heterosexual">Heterosexual / Straight</option>
            <option value="homosexual">Homosexual / Gay</option>
            <option value="bisexual">Bisexual</option>
            <option value="pansexual">Pansexual</option>
            <option value="asexual">Asexual</option>
            <option value="other">Other</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>

          <label htmlFor="interested_in">Interested in</label>
          <select id="interested_in" name="interested_in" required>
            <option value="">Select who you're interested in</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
            <option value="nonbinary">Non-binary people</option>
            <option value="everyone">Everyone</option>
            <option value="other">Other</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>

          <button type="submit">Next</button>
        </form>
      </section>
      </main>

      <Footer />
    </div>
  );
}
