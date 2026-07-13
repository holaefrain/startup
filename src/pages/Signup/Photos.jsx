import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer.jsx";

const PHOTO_COUNT = 8;
const MIN_PHOTOS = 3;

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

    const uploadedCount = photos.filter((file) => file).length;
    if (uploadedCount < MIN_PHOTOS) {
      setError(`Please upload at least ${MIN_PHOTOS} photos before continuing.`);
      return;
    }
    setError("");

    // Files can't be JSON-encoded, so this step posts multipart form data
    // instead of the JSON body used by the earlier signup steps. All files
    // share one field name ("photos") to match multer.array() on the server.
    const body = new FormData();
    photos.forEach((file) => {
      if (file) body.append("photos", file);
    });

    try {
      const response = await fetch("/api/signup/photos", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const { error: message } = await response.json();
        setError(message || "Photo upload failed. Please try again.");
        return;
      }
    } catch (error) {
      console.error("Photo upload failed", error);
      setError("Photo upload failed. Please try again.");
      return;
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
            <p>Add up to 8 photos for your profile ({MIN_PHOTOS} minimum).</p>

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
