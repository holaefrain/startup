import { useEffect, useState } from "react";
import AppNav from "../../components/AppNav.jsx";
import CrossIcon from "../../components/CrossIcon.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import CityAutocompleteInput from "../../components/CityAutocompleteInput.jsx";
import OptionSelect, { FIELD_OPTIONS, optionLabel } from "../../components/OptionSelect.jsx";
import { PROFILE_FIELD_GROUPS, ALL_PROFILE_FIELDS } from "../../constants/profileFields.js";
import "./Profile.css";

// These two fields get the city/region autocomplete instead of a plain text input.
const CITY_AUTOCOMPLETE_FIELDS = new Set(["location", "hometown"]);
// Matches server/profile.js's MAX_PHOTOS, which itself matches server/index.js's signup upload cap.
const MAX_PHOTOS = 8;

// The most details this profile could ever put in front of someone. interested_in is excluded because the server withholds it from every projection no matter what the visibility map says (see LOCKED_HIDDEN_FIELDS in server/userSchema.js) - counting it would leave the total permanently one short of itself.
const SHOWABLE_FIELD_COUNT = ALL_PROFILE_FIELDS.filter((field) => field.locked !== "hidden").length;

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

  // Whether this field currently reaches other users. A field nobody has ever touched counts as shown, which is the same default the server applies - see projectVisibleFields in server/userSchema.js, where only an explicit "hidden" withholds one.
  function isShown(field) {
    if (field.locked === "visible") return true;
    if (field.locked === "hidden") return false;
    return visibility[field.key] !== "hidden";
  }

  // The word beside a locked switch, saying why it can't be pressed rather than leaving it greyed with no explanation. Null for the fields you actually control, which is most of them.
  function lockMark(field) {
    if (field.locked === "visible") return "Always";
    if (field.locked === "hidden") return "Never";
    return null;
  }

  // Counts what another user would actually be shown, which needs both halves: Discover drops a field that's switched off and equally drops one that's simply empty, so a blank field nobody hid still isn't on your profile.
  const shownCount = values
    ? ALL_PROFILE_FIELDS.filter((field) => isShown(field) && values[field.key]).length
    : 0;

  return (
    <div id="profile">
      <AppNav />

      <main>
        <section className="profile-header">
          <div className="profile-photo-grid">
            {(user?.photoKeys ?? []).map((_, index) => (
              <div key={index} className="profile-photo-tile">
                <img src={`/api/photos/${user.id}/${index}`} alt={`Photo ${index + 1}`} />

                {/* The first photo does more work than the rest and nothing on this page said so: it's the avatar on every Chat row, message and panel (faceOf in Chat.jsx), both faces in Discover's match overlay, and the photo Discover's carousel opens on. Plain text rather than an icon so it's read out as well as seen. */}
                {index === 0 && <span className="profile-photo-main">Main</span>}
                <button
                  type="button"
                  className="profile-photo-remove"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => handleRemovePhoto(index)}
                  disabled={removingIndex === index}
                >
                  <CrossIcon />
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

          {values && (
            <p className="profile-public-count">
              <b>{shownCount}</b> of {SHOWABLE_FIELD_COUNT} details visible on Discover
            </p>
          )}
        </section>

        {values &&
          PROFILE_FIELD_GROUPS.map((group) => (
            <section key={group.title} className="profile-field-group">
              <h2 className="profile-group-title">{group.title}</h2>

              {/* HTML Deilverable: Proper HTML element usage - the same card > dl > row > dt/dd tree Discover's fact card uses, so one field renders as the same object on both pages. The label is plain text rather than part of a button: only the value is editable, which is what lets the edit controls sit as siblings instead of nested inside one. */}
              <div className="profile-field-card">
                <dl className="profile-field-list">
                  {group.fields.map((field) => {
                    const displayValue = optionLabel(field.key, values[field.key]);
                    const shown = isShown(field);
                    const mark = lockMark(field);

                    return (
                      // data-hidden is what ghosts the row. Read from the same `shown` the switch below reports, so the two can't ever disagree about whether this field reaches anyone.
                      <div className="profile-field-row" data-hidden={!shown} key={field.key}>
                        <dt className="profile-field-label">{field.label}</dt>
                        <dd className="profile-field-control">
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
                              />
                            ) : (
                              <input
                                autoFocus
                                value={values[field.key]}
                                onChange={(event) => handleFieldInput(field.key, event.target.value)}
                                onBlur={() => commitField(field.key)}
                                onKeyDown={(event) => event.key === "Enter" && commitField(field.key)}
                              />
                            )
                          ) : (
                            // Labelled by what pressing it does rather than by the value it shows - tabbing a column of pills would otherwise announce bare values with nothing saying which field each one belongs to.
                            <button
                              type="button"
                              className={`profile-field-value${displayValue ? "" : " profile-field-value-empty"}`}
                              aria-label={`Edit ${field.label}`}
                              onClick={() => setEditingKey(field.key)}
                            >
                              {displayValue || "Add"}
                            </button>
                          )}

                          {mark && <span className="profile-field-lock">{mark}</span>}

                          {/* The same switch AppNav's real/demo toggle uses - one component, so "on" looks identical wherever the app asks a yes/no question. Labelled per field because the track carries no text of its own. */}
                          <button
                            type="button"
                            className="profile-field-switch"
                            role="switch"
                            aria-checked={shown}
                            aria-label={
                              field.locked
                                ? `${field.label} is ${field.locked === "visible" ? "always" : "never"} shown on your profile`
                                : `Show ${field.label} on your profile`
                            }
                            disabled={!!field.locked}
                            onClick={() => toggleVisibility(field.key)}
                          >
                            <span className="switch-track" aria-hidden="true">
                              <span className="switch-knob" />
                            </span>
                          </button>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </section>
          ))}
      </main>
    </div>
  );
}
