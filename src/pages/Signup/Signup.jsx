import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../components/Footer.jsx";
import AccountStep from "./steps/AccountStep.jsx";
import IdentityStep from "./steps/IdentityStep.jsx";
import BasicInfoStep from "./steps/BasicInfoStep.jsx";
import MoreInfoStep from "./steps/MoreInfoStep.jsx";
import PhotosStep from "./steps/PhotosStep.jsx";
import { getAge, getZodiacSign } from "./dateUtils.js";
import { useAuth } from "../../context/AuthContext.jsx";

const TOTAL_STEPS = 5;
const PHOTO_COUNT = 8;

const INITIAL_FORM_DATA = {
  first_name: "",
  last_name: "",
  birthday: "",
  email: "",
  phone: "",
  password: "",
  pronouns: "",
  gender: "",
  sexuality: "",
  interested_in: "",
  job_title: "",
  school: "",
  education_level: "",
  religion: "",
  hometown: "",
  politics: "",
  languages: "",
  dating_intentions: "",
  relationship_type: "",
  height: "",
  location: "",
  ethnicity: "",
  children: "",
  family_plans: "",
  pets: "",
};

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [photos, setPhotos] = useState(Array(PHOTO_COUNT).fill(null));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Computed from birthday as soon as it's entered in step 1 - no bridge
  // between steps needed since it's all one component's state.
  const age = useMemo(() => (formData.birthday ? getAge(formData.birthday) : null), [formData.birthday]);
  const zodiacSign = useMemo(
    () => (formData.birthday ? getZodiacSign(formData.birthday) : null),
    [formData.birthday]
  );

  const previewUrls = useMemo(
    () => photos.map((file) => (file ? URL.createObjectURL(file) : null)),
    [photos]
  );
  useEffect(() => {
    return () => previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
  }, [previewUrls]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (index, event) => {
    const file = event.target.files[0] ?? null;
    if (file && photos.some((photo, i) => i !== index && photo && photo.name === file.name && photo.size === file.size)) {
      setError("That photo is already used for another slot. Please choose a different photo.");
      event.target.value = "";
      return;
    }
    setError("");
    setPhotos((prev) => prev.map((photo, i) => (i === index ? file : photo)));
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => Math.max(1, prev - 1));
  };

  // One <form> spans all 5 steps; only the fields for the current step are
  // mounted, so the browser's native `required` validation only ever
  // checks what's currently visible. "Next" just advances the step -
  // nothing is sent to the server (and nothing needs to be, since it's all
  // one component's state) until the final "Finish" submit.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
      return;
    }

    // multipart/form-data so the photo files and every other field can go
    // in one request. `password` goes to POST /api/auth separately (below,
    // once this profile exists) rather than here - hashing/token issuance
    // is server/auth.js's concern, not this endpoint's.
    const body = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "password" || !value) return;
      body.append(key, value);
    });
    if (age != null) body.append("age", age);
    if (zodiacSign) body.append("zodiac_sign", zodiacSign);
    photos.forEach((file) => {
      if (file) body.append("photos", file);
    });

    setSubmitting(true);
    try {
      const response = await fetch("/api/signup", { method: "POST", body });
      if (!response.ok) {
        const { error: message } = await response.json();
        setError(message || "Signup failed. Please try again.");
        setSubmitting(false);
        return;
      }

      const authResponse = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      if (!authResponse.ok) {
        setError("Signup failed. Please try again.");
        setSubmitting(false);
        return;
      }

      await login();
    } catch (err) {
      console.error("Signup request failed", err);
      setError("Signup failed. Please try again.");
      setSubmitting(false);
      return;
    }

    navigate("/discover");
  };

  return (
    <div id="signup">
      <main>
        <h1>Sign up</h1>
        <p>
          Step {step} of {TOTAL_STEPS}
        </p>

        <form onSubmit={handleSubmit}>
          {step === 1 && <AccountStep formData={formData} onChange={handleChange} />}
          {step === 2 && <IdentityStep formData={formData} onChange={handleChange} />}
          {step === 3 && <BasicInfoStep formData={formData} onChange={handleChange} />}
          {step === 4 && (
            <MoreInfoStep formData={formData} onChange={handleChange} age={age} zodiacSign={zodiacSign} />
          )}
          {step === 5 && (
            <PhotosStep photos={photos} previewUrls={previewUrls} onPhotoChange={handlePhotoChange} />
          )}

          {error && <p role="alert">{error}</p>}

          <div className="controls">
            {step > 1 && (
              <button type="button" onClick={handleBack}>
                Back
              </button>
            )}
            <button type="submit" disabled={submitting}>
              {step < TOTAL_STEPS ? "Next" : "Finish"}
            </button>
          </div>
        </form>

        {step === 1 && (
          <p>
            <Link to="/">Back to home</Link>
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
