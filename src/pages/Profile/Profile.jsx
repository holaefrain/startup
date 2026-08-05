import { useEffect, useState } from "react";
import AppNav from "../../components/AppNav.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import CityAutocompleteInput from "../../components/CityAutocompleteInput.jsx";
import OptionSelect, { FIELD_OPTIONS, optionLabel } from "../../components/OptionSelect.jsx";
import { PROFILE_FIELD_GROUPS, ALL_PROFILE_FIELDS } from "../../constants/profileFields.js";
import "./Profile.css";

// These two fields get the city/region autocomplete instead of a plain text input.
const CITY_AUTOCOMPLETE_FIELDS = new Set(["location", "hometown"]);
// Matches server/profile.js's MAX_PHOTOS, which itself matches server/index.js's signup upload cap.
const MAX_PHOTOS = 8;

function patchProfile(body) {
  return fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  // null until seeded from `user` - seeded exactly once (see the effect
  // below), not re-synced on every refreshUser() call, since our own
  // optimistic updates already keep this accurate and re-syncing would
  // risk clobbering an in-progress edit on a different field mid-typing.
  const [values, setValues] = useState(null);
  const [visibility, setVisibility] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [removingIndex, setRemovingIndex] = useState(null);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!user || values !== null) return;
    const initial = {};
    for (const field of ALL_PROFILE_FIELDS) {
      initial[field.key] = user[field.key] ?? "";
    }
    setValues(initial);
    setVisibility(user.visibility ?? {});
  }, [user, values]);

  function handleAddPhoto(event) {
    const file = event.target.files[0] ?? null;
    event.target.value = ""; // lets the same file be picked again later (e.g. after removing it)
    if (!file) return;

    setPhotoError("");
    setAddingPhoto(true);
    const body = new FormData();
    body.append("photo", file);
    fetch("/api/profile/photo", { method: "POST", body })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to add photo.");
        return refreshUser();
      })
      .catch(() => setPhotoError("Couldn't add photo. Please try again."))
      .finally(() => setAddingPhoto(false));
  }

  function handleRemovePhoto(index) {
    setPhotoError("");
    setRemovingIndex(index);
    fetch(`/api/profile/photo/${index}`, { method: "DELETE" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to remove photo.");
        return refreshUser();
      })
      .catch(() => setPhotoError("Couldn't remove photo. Please try again."))
      .finally(() => setRemovingIndex(null));
  }

  function handleFieldInput(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // overrideValue lets a caller commit a value that hasn't landed in `values` yet - selecting a CityAutocompleteInput suggestion calls this synchronously, before the onChange it also fired has actually applied its setValues update. extraFields rides along in the same PATCH so editing your location updates its place id (and, server-side, its coordinates) atomically rather than in a second request that could fail on its own.
  function commitField(key, overrideValue, extraFields) {
    setEditingKey(null);
    patchProfile({ fields: { [key]: overrideValue ?? values[key], ...extraFields } }).then(
      (response) => response.ok && refreshUser()
    );
  }

  function toggleVisibility(key) {
    const next = visibility[key] === "hidden" ? "visible" : "hidden";
    setVisibility((prev) => ({ ...prev, [key]: next }));
    patchProfile({ visibility: { [key]: next } }).then((response) => response.ok && refreshUser());
  }

  function visibilityLabel(field) {
    if (field.locked === "visible") return "Always Visible";
    if (field.locked === "hidden") return "Always Hidden";
    return visibility[field.key] === "hidden" ? "Hidden" : "Visible";
  }

  return (
    <div id="profile">
      <AppNav />

      <main>
        <section className="profile-header">
          <div className="profile-photo-grid">
            {(user?.photoKeys ?? []).map((_, index) => (
              <div key={index} className="profile-photo-tile">
                <img src={`/api/photos/${user.id}/${index}`} alt={`Photo ${index + 1}`} />
                <button
                  type="button"
                  className="profile-photo-remove"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => handleRemovePhoto(index)}
                  disabled={removingIndex === index}
                >
                  &#10005;
                </button>
              </div>
            ))}
            {(user?.photoKeys?.length ?? 0) < MAX_PHOTOS && (
              <label className="profile-photo-add" htmlFor="profile-photo-input">
                {addingPhoto ? "Adding..." : "+ Add Photo"}
              </label>
            )}
            <input id="profile-photo-input" type="file" accept="image/*" onChange={handleAddPhoto} hidden />
          </div>
          {photoError && (
            <p role="alert" className="profile-photo-error">
              {photoError}
            </p>
          )}
          {/* The page's only h1 now that the "Profile" header is gone - you are the title. Joined rather than interpolated so a missing last name doesn't leave a trailing space, and falls back because both names are editable from the rows below and can be committed empty (signup marks them required, the server doesn't enforce it). */}
          {values && (
            <h1 className="profile-name">
              {[values.first_name, values.last_name].filter(Boolean).join(" ") || "Your profile"}
            </h1>
          )}
          {user?.email && <p className="profile-email">{user.email}</p>}
        </section>

        {values &&
          PROFILE_FIELD_GROUPS.map((group) => (
            <section key={group.title} className="profile-field-group">
              <h2>{group.title}</h2>
              <ul>
                {group.fields.map((field) => (
                  <li key={field.key} className="profile-field-row">
                    <button type="button" className="profile-field-main" onClick={() => setEditingKey(field.key)}>
                      <span className="profile-field-label">{field.label}</span>
                      {editingKey === field.key ? (
                        CITY_AUTOCOMPLETE_FIELDS.has(field.key) ? (
                          <CityAutocompleteInput
                            autoFocus
                            name={field.key}
                            value={values[field.key]}
                            onChange={(event) => handleFieldInput(field.key, event.target.value)}
                            onBlur={() => commitField(field.key)}
                            onKeyDown={(event) => event.key === "Enter" && commitField(field.key)}
                            onCommit={(description, placeId) =>
                              commitField(
                                field.key,
                                description,
                                field.key === "location" && placeId ? { location_place_id: placeId } : null
                              )
                            }
                            onClick={(event) => event.stopPropagation()}
                          />
                        ) : FIELD_OPTIONS[field.key] ? (
                          <OptionSelect
                            field={field.key}
                            placeholder={`Select ${field.label}`}
                            autoFocus
                            value={values[field.key]}
                            onChange={(event) => {
                              const value = event.target.value;
                              handleFieldInput(field.key, value);
                              commitField(field.key, value);
                            }}
                            onClick={(event) => event.stopPropagation()}
                          />
                        ) : (
                          <input
                            autoFocus
                            value={values[field.key]}
                            onChange={(event) => handleFieldInput(field.key, event.target.value)}
                            onBlur={() => commitField(field.key)}
                            onKeyDown={(event) => event.key === "Enter" && commitField(field.key)}
                            onClick={(event) => event.stopPropagation()}
                          />
                        )
                      ) : (
                        <span className="profile-field-value">{optionLabel(field.key, values[field.key]) || "Add"}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="profile-field-visibility"
                      disabled={!!field.locked}
                      onClick={() => toggleVisibility(field.key)}
                    >
                      {visibilityLabel(field)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </main>
    </div>
  );
}
