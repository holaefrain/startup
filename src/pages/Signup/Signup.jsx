import { Link } from "react-router-dom";

export default function Signup() {
  return (
    <main id="signup">
      <h1>Sign up</h1>

      {/* Step 1: Basic information */}
      <form id="signup-step1" action="/signup-step2" method="post">
        <fieldset>
          <legend>Step 1 - Basic information</legend>

          <label htmlFor="first_name">First name</label>
          <input id="first_name" name="first_name" type="text" required />

          <label htmlFor="last_name">Last name</label>
          <input id="last_name" name="last_name" type="text" required />

          <label htmlFor="birthday">Birthday</label>
          <input id="birthday" name="birthday" type="date" required />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />

          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+1-555-555-5555"
            required
          />

          <button type="submit">Next</button>
        </fieldset>
      </form>

      <section id="identity-step">
        <h2>Step 2 - Identity</h2>
        <p>(Shown after submitting basic information)</p>

        <form id="signup-step2" action="/signup-complete" method="post">
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

      <section id="profile-step">
        <h2>Step 3 - Additional profile</h2>
        <p>(All fields required)</p>

        <form id="signup-step3" action="/signup-complete" method="post">
          <label htmlFor="work">Work (Company)</label>
          <input id="work" name="work" type="text" required />

          <label htmlFor="job_title">Job Title</label>
          <input id="job_title" name="job_title" type="text" required />

          <label htmlFor="school">School</label>
          <input id="school" name="school" type="text" required />

          <label htmlFor="education_level">Education Level</label>
          <select id="education_level" name="education_level" required>
            <option value="">Select education level</option>
            <option value="high_school">High school</option>
            <option value="associate">Associate degree</option>
            <option value="bachelor">Bachelor's degree</option>
            <option value="master">Master's degree</option>
            <option value="doctorate">Doctorate</option>
            <option value="other">Other</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>

          <label htmlFor="religion">Religious Beliefs</label>
          <input id="religion" name="religion" type="text" required />

          <label htmlFor="hometown">Hometown</label>
          <input id="hometown" name="hometown" type="text" required />

          <label htmlFor="politics">Politics</label>
          <select id="politics" name="politics" required>
            <option value="">Select political view</option>
            <option value="very_liberal">Very liberal</option>
            <option value="liberal">Liberal</option>
            <option value="moderate">Moderate</option>
            <option value="conservative">Conservative</option>
            <option value="very_conservative">Very conservative</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>

          <label htmlFor="languages">Languages Spoken</label>
          <input
            id="languages"
            name="languages"
            type="text"
            placeholder="English, Spanish, ..."
            required
          />

          <button type="submit">Save profile and finish</button>
        </form>
      </section>

      <p>
        <Link to="/">Back to home</Link>
      </p>
    </main>
  );
}
