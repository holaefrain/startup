import { useEffect, useMemo, useState } from "react";
import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import placeholderPhoto from "../../assets/img/1080x1920.png";

const FIELD_GROUPS = [
  {
    title: "My Vitals",
    fields: [
      { key: "name", label: "Name", locked: "visible" },
      { key: "age", label: "Age", locked: "visible" },
      { key: "height", label: "Height", locked: "visible" },
      { key: "location", label: "Location", locked: "visible" },
      { key: "ethnicity", label: "Ethnicity" },
      { key: "children", label: "Children" },
      { key: "family_plans", label: "Family Plans" },
      { key: "pets", label: "Pets" },
      { key: "zodiac_sign", label: "Zodiac Sign" },
    ],
  },
  {
    title: "Identity",
    fields: [
      { key: "pronouns", label: "Pronouns" },
      { key: "gender", label: "Gender" },
      { key: "sexuality", label: "Sexuality" },
      { key: "interested_in", label: "I'm interested in", locked: "hidden" },
    ],
  },
  {
    title: "My Virtues",
    fields: [
      { key: "job_title", label: "Job Title" },
      { key: "school", label: "School" },
      { key: "education_level", label: "Education Level" },
      { key: "religion", label: "Religious Beliefs" },
      { key: "hometown", label: "Hometown" },
      { key: "politics", label: "Politics" },
      { key: "languages", label: "Languages Spoken" },
      { key: "dating_intentions", label: "Dating Intentions" },
      { key: "relationship_type", label: "Relationship Type" },
    ],
  },
];

const INITIAL_VALUES = {
  name: "Jordan Rivera",
  age: "25",
  height: "6'0\"",
  location: "Salt Lake City, UT",
  ethnicity: "Hispanic/Latino",
  children: "Don't have children",
  family_plans: "Not sure",
  pets: "None",
  zodiac_sign: "Aquarius",
  pronouns: "He/Him",
  gender: "Man",
  sexuality: "Straight",
  interested_in: "Women",
  job_title: "Software Engineer",
  school: "State University",
  education_level: "Bachelor's degree",
  religion: "Christian",
  hometown: "Los Angeles, CA",
  politics: "Liberal",
  languages: "English, Spanish",
  dating_intentions: "Long-term relationship",
  relationship_type: "Monogamy",
};

const ALL_FIELDS = FIELD_GROUPS.flatMap((group) => group.fields);
const INITIAL_VISIBILITY = Object.fromEntries(
  ALL_FIELDS.filter((field) => !field.locked).map((field) => [field.key, "visible"])
);

export default function Profile() {
  const { user } = useAuth();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [visibility, setVisibility] = useState(INITIAL_VISIBILITY);
  const [editingKey, setEditingKey] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const photoPreviewUrl = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile]);
  useEffect(() => {
    return () => photoPreviewUrl && URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  function handlePhotoChange(event) {
    setPhotoFile(event.target.files[0] ?? null);
  }

  function updateValue(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleVisibility(key) {
    setVisibility((prev) => ({ ...prev, [key]: prev[key] === "visible" ? "hidden" : "visible" }));
  }

  function visibilityLabel(field) {
    if (field.locked === "visible") return "Always Visible";
    if (field.locked === "hidden") return "Always Hidden";
    return visibility[field.key] === "hidden" ? "Hidden" : "Visible";
  }

  return (
    <div id="profile">
      <header>
        <h1>Profile</h1>
        <p>Your public dating profile details will appear here.</p>
        <AppNav />
      </header>

      <main>
        <section className="profile-header">
          <div className="profile-photo-wrap">
            <img className="profile-photo-avatar" src={photoPreviewUrl ?? placeholderPhoto} alt="" />
            <label className="profile-photo-edit" htmlFor="profile-photo-input" aria-label="Edit profile photo">
              &#9998;
            </label>
            <input
              id="profile-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              hidden
            />
          </div>
          <h2 className="profile-name">{values.name}</h2>
          {user?.email && <p className="profile-email">{user.email}</p>}
        </section>

        {FIELD_GROUPS.map((group) => (
          <section key={group.title} className="profile-field-group">
            <h2>{group.title}</h2>
            <ul>
              {group.fields.map((field) => (
                <li key={field.key} className="profile-field-row">
                  <button
                    type="button"
                    className="profile-field-main"
                    onClick={() => setEditingKey(field.key)}
                  >
                    <span className="profile-field-label">{field.label}</span>
                    {editingKey === field.key ? (
                      <input
                        autoFocus
                        value={values[field.key]}
                        onChange={(event) => updateValue(field.key, event.target.value)}
                        onBlur={() => setEditingKey(null)}
                        onKeyDown={(event) => event.key === "Enter" && setEditingKey(null)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    ) : (
                      <span className="profile-field-value">{values[field.key] || "Add"}</span>
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

      <Footer />
    </div>
  );
}
