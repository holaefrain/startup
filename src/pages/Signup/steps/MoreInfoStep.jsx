const HEIGHT_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const totalInches = 54 + index; // 4'6" to 7'0"
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { value: String(totalInches), label: `${feet}'${inches}"` };
});

export default function MoreInfoStep({ formData, onChange, age, zodiacSign }) {
  return (
    <fieldset>
      <legend>Step 4 - More info</legend>

      <label htmlFor="height">Height</label>
      <select id="height" name="height" value={formData.height} onChange={onChange}>
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
        onChange={onChange}
      />

      <label htmlFor="ethnicity">Ethnicity</label>
      <select id="ethnicity" name="ethnicity" value={formData.ethnicity} onChange={onChange}>
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
      <select id="children" name="children" value={formData.children} onChange={onChange}>
        <option value="">Select an option</option>
        <option value="have_children">Have children</option>
        <option value="dont_have_children">Don't have children</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>

      <label htmlFor="family_plans">Family plans</label>
      <select id="family_plans" name="family_plans" value={formData.family_plans} onChange={onChange}>
        <option value="">Select an option</option>
        <option value="want_children">Want children</option>
        <option value="dont_want_children">Don't want children</option>
        <option value="open_to_children">Open to children</option>
        <option value="not_sure">Not sure yet</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>

      <label htmlFor="pets">Pets</label>
      <select id="pets" name="pets" value={formData.pets} onChange={onChange}>
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
      <input id="age" name="age" type="text" value={age ?? "—"} disabled readOnly />

      <label htmlFor="zodiac_sign">Zodiac sign</label>
      <input id="zodiac_sign" name="zodiac_sign" type="text" value={zodiacSign ?? "—"} disabled readOnly />
    </fieldset>
  );
}
