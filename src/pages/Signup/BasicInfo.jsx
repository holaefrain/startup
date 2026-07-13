import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer.jsx";

export default function BasicInfo() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    job_title: "",
    school: "",
    education_level: "",
    religion: "",
    hometown: "",
    politics: "",
    languages: "",
    dating_intentions: "",
    relationship_type: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // TODO: update the endpoint to match your backend API.
    // The server should attach this info to the signed-up user's profile.
    try {
      await fetch("/api/signup/basic-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    } catch (error) {
      console.error("Basic info request failed", error);
    }

    navigate("/signup/more-info");
  };

  return (
    <div id="basic-info">
      <main>
        <h1>Basic Information</h1>

        <form id="signup-step3" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Step 3 - Basic information</legend>

            <label htmlFor="job_title">Job title</label>
            <input
              id="job_title"
              name="job_title"
              type="text"
              value={formData.job_title}
              onChange={handleChange}
            />

            <label htmlFor="school">School</label>
            <input
              id="school"
              name="school"
              type="text"
              value={formData.school}
              onChange={handleChange}
            />

            <label htmlFor="education_level">Education level</label>
            <select
              id="education_level"
              name="education_level"
              value={formData.education_level}
              onChange={handleChange}
            >
              <option value="">Select education level</option>
              <option value="high_school">High school</option>
              <option value="some_college">Some college</option>
              <option value="associates">Associate's degree</option>
              <option value="bachelors">Bachelor's degree</option>
              <option value="masters">Master's degree</option>
              <option value="phd">PhD / Doctorate</option>
              <option value="trade_school">Trade school</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>

            <label htmlFor="religion">Religious beliefs</label>
            <select
              id="religion"
              name="religion"
              value={formData.religion}
              onChange={handleChange}
            >
              <option value="">Select religious beliefs</option>
              <option value="agnostic">Agnostic</option>
              <option value="atheist">Atheist</option>
              <option value="buddhist">Buddhist</option>
              <option value="catholic">Catholic</option>
              <option value="christian">Christian</option>
              <option value="hindu">Hindu</option>
              <option value="jewish">Jewish</option>
              <option value="muslim">Muslim</option>
              <option value="spiritual">Spiritual</option>
              <option value="other">Other</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>

            <label htmlFor="hometown">Hometown</label>
            <input
              id="hometown"
              name="hometown"
              type="text"
              value={formData.hometown}
              onChange={handleChange}
            />

            <label htmlFor="politics">Politics</label>
            <select
              id="politics"
              name="politics"
              value={formData.politics}
              onChange={handleChange}
            >
              <option value="">Select political views</option>
              <option value="liberal">Liberal</option>
              <option value="moderate">Moderate</option>
              <option value="conservative">Conservative</option>
              <option value="not_political">Not political</option>
              <option value="other">Other</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>

            <label htmlFor="languages">Languages spoken</label>
            <input
              id="languages"
              name="languages"
              type="text"
              placeholder="e.g. English, Spanish"
              value={formData.languages}
              onChange={handleChange}
            />

            <label htmlFor="dating_intentions">Dating intentions</label>
            <select
              id="dating_intentions"
              name="dating_intentions"
              value={formData.dating_intentions}
              onChange={handleChange}
            >
              <option value="">Select dating intentions</option>
              <option value="life_partner">Life partner</option>
              <option value="long_term">Long-term relationship</option>
              <option value="long_term_open_short">
                Long-term, open to short
              </option>
              <option value="short_term_open_long">
                Short-term, open to long
              </option>
              <option value="short_term">Short-term fun</option>
              <option value="figuring_out">
                Figuring out my intentions
              </option>
              <option value="prefer_not">Prefer not to say</option>
            </select>

            <label htmlFor="relationship_type">Relationship type</label>
            <select
              id="relationship_type"
              name="relationship_type"
              value={formData.relationship_type}
              onChange={handleChange}
            >
              <option value="">Select relationship type</option>
              <option value="monogamy">Monogamy</option>
              <option value="non_monogamy">Non-monogamy</option>
              <option value="figuring_out">
                Figuring out my relationship type
              </option>
              <option value="prefer_not">Prefer not to say</option>
            </select>

            <button type="submit">Next</button>
          </fieldset>
        </form>
      </main>

      <Footer />
    </div>
  );
}
