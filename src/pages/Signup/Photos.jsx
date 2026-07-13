import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer.jsx";

const PHOTO_COUNT = 8;

export default function Photos() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState(Array(PHOTO_COUNT).fill(null));
  const [error, setError] = useState("");

  const previewUrls = useMemo(
    () => photos.map((file) => (file ? URL.createObjectURL(file) : null)),
    [photos]
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handlePhotoChange = (index) => (event) => {
    const file = event.target.files[0] ?? null;
    setPhotos((prev) => prev.map((photo, i) => (i === index ? file : photo)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (photos.some((file) => !file)) {
      setError("Please upload all 8 photos before continuing.");
      return;
    }
    setError("");

    // Files can't be JSON-encoded, so this step posts multipart form data
    // instead of the JSON body used by the earlier signup steps.
    const body = new FormData();
    photos.forEach((file, index) => {
      body.append(`photo_${index + 1}`, file);
    });

    // TODO: update the endpoint to match your backend API.
    // The server should store these photos (e.g. in object storage) and
    // attach the resulting URLs to the signed-up user's profile.
    try {
      await fetch("/api/signup/photos", {
        method: "POST",
        body,
      });
    } catch (error) {
      console.error("Photo upload failed", error);
    }

    navigate("/discover");
  };

  return (
    <div id="photos">
      <main>
        <h1>Upload Photos</h1>

        <form id="signup-step5" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Step 5 - Photos</legend>
            <p>Add 8 photos for your profile.</p>

            {photos.map((_, index) => (
              <div key={index}>
                <label htmlFor={`photo_${index + 1}`}>
                  Photo {index + 1}
                </label>
                <input
                  id={`photo_${index + 1}`}
                  name={`photo_${index + 1}`}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange(index)}
                />
                {previewUrls[index] && (
                  <img
                    className="photo-preview"
                    src={previewUrls[index]}
                    alt={`Photo ${index + 1} preview`}
                  />
                )}
              </div>
            ))}

            {error && <p role="alert">{error}</p>}

            <button type="submit">Finish</button>
          </fieldset>
        </form>
      </main>

      <Footer />
    </div>
  );
}
