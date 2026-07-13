import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer.jsx";

// Each entry is the *end* cutoff of a sign; a date belongs to the first
// entry whose cutoff it falls on or before. Dates after Dec 21 fall through
// to Capricorn (Dec 22-31).
const ZODIAC_CUTOFFS = [
  { sign: "Capricorn", month: 1, day: 19 },
  { sign: "Aquarius", month: 2, day: 18 },
  { sign: "Pisces", month: 3, day: 20 },
  { sign: "Aries", month: 4, day: 19 },
  { sign: "Taurus", month: 5, day: 20 },
  { sign: "Gemini", month: 6, day: 20 },
  { sign: "Cancer", month: 7, day: 22 },
  { sign: "Leo", month: 8, day: 22 },
  { sign: "Virgo", month: 9, day: 22 },
  { sign: "Libra", month: 10, day: 22 },
  { sign: "Scorpio", month: 11, day: 21 },
  { sign: "Sagittarius", month: 12, day: 21 },
];

function getZodiacSign(birthday) {
  const [, month, day] = birthday.split("-").map(Number);
  const match = ZODIAC_CUTOFFS.find(
    (entry) => month < entry.month || (month === entry.month && day <= entry.day)
  );
  return match ? match.sign : "Capricorn";
}

function getAge(birthday) {
  const [year, month, day] = birthday.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

const HEIGHT_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const totalInches = 54 + index; // 4'6" to 7'0"
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { value: String(totalInches), label: `${feet}'${inches}"` };
});

export default function MoreInfo() {
  const navigate = useNavigate();
  const birthday = useMemo(() => localStorage.getItem("birthday"), []);
  const age = useMemo(() => (birthday ? getAge(birthday) : null), [birthday]);
  const zodiacSign = useMemo(
    () => (birthday ? getZodiacSign(birthday) : null),
    [birthday]
  );

  const [formData, setFormData] = useState({
    height: "",
    location: "",
    ethnicity: "",
    children: "",
    family_plans: "",
    pets: "",
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
      await fetch("/api/signup/more-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, age, zodiac_sign: zodiacSign }),
      });
    } catch (error) {
      console.error("More info request failed", error);
    }

    navigate("/signup/photos");
  };

  return (
    <div id="more-info">
      <main>
        <h1>More About You</h1>

        <form id="signup-step4" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Step 4 - More info</legend>

            <label htmlFor="height">Height</label>
            <select
              id="height"
              name="height"
              value={formData.height}
              onChange={handleChange}
            >
              <option value="">Select height</option>
              {HEIGHT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label htmlFor="location">Location</label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="City, State"
              value={formData.location}
              onChange={handleChange}
            />

            <label htmlFor="ethnicity">Ethnicity</label>
            <select
              id="ethnicity"
              name="ethnicity"
              value={formData.ethnicity}
              onChange={handleChange}
            >
              <option value="">Select ethnicity</option>
              <option value="asian">Asian</option>
              <option value="black">Black / African descent</option>
              <option value="hispanic_latino">Hispanic / Latino</option>
              <option value="middle_eastern">Middle Eastern</option>
              <option value="native_american">Native American</option>
              <option value="pacific_islander">Pacific Islander</option>
              <option value="south_asian">South Asian</option>
              <option value="white">White / Caucasian</option>
              <option value="multiracial">Multiracial</option>
              <option value="other">Other</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>

            <label htmlFor="children">Children</label>
            <select
              id="children"
              name="children"
              value={formData.children}
              onChange={handleChange}
            >
              <option value="">Select an option</option>
              <option value="have_children">Have children</option>
              <option value="dont_have_children">Don't have children</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>

            <label htmlFor="family_plans">Family plans</label>
            <select
              id="family_plans"
              name="family_plans"
              value={formData.family_plans}
              onChange={handleChange}
            >
              <option value="">Select an option</option>
              <option value="want_children">Want children</option>
              <option value="dont_want_children">Don't want children</option>
              <option value="open_to_children">Open to children</option>
              <option value="not_sure">Not sure yet</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>

            <label htmlFor="pets">Pets</label>
            <select
              id="pets"
              name="pets"
              value={formData.pets}
              onChange={handleChange}
            >
              <option value="">Select an option</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="dog_and_cat">Dog and cat</option>
              <option value="other_pet">Other pet</option>
              <option value="pet_free">Pet-free</option>
              <option value="want_a_pet">Want a pet</option>
              <option value="allergic">Allergic to pets</option>
            </select>

            <label htmlFor="age">Age</label>
            <input
              id="age"
              name="age"
              type="text"
              value={age ?? "—"}
              disabled
              readOnly
            />

            <label htmlFor="zodiac_sign">Zodiac sign</label>
            <input
              id="zodiac_sign"
              name="zodiac_sign"
              type="text"
              value={zodiacSign ?? "—"}
              disabled
              readOnly
            />
            {!birthday && (
              <p>
                We couldn't find your birthday — go back to step 1 to set it
                so we can calculate your age and zodiac sign.
              </p>
            )}

            <button type="submit">Next</button>
          </fieldset>
        </form>
      </main>

      <Footer />
    </div>
  );
}
