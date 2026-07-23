import CityAutocompleteInput from "../../../components/CityAutocompleteInput.jsx";
import OptionSelect from "../../../components/OptionSelect.jsx";

export default function MoreInfoStep({ formData, onChange, age, zodiacSign }) {
  return (
    <fieldset>
      <legend>Step 4 - More info</legend>

      <label htmlFor="height">Height</label>
      <OptionSelect
        field="height"
        placeholder="Select height"
        id="height"
        name="height"
        value={formData.height}
        onChange={onChange}
      />

      <label htmlFor="location">Location</label>
      <CityAutocompleteInput
        id="location"
        name="location"
        placeholder="City, State"
        value={formData.location}
        onChange={onChange}
      />

      <label htmlFor="ethnicity">Ethnicity</label>
      <OptionSelect
        field="ethnicity"
        placeholder="Select ethnicity"
        id="ethnicity"
        name="ethnicity"
        value={formData.ethnicity}
        onChange={onChange}
      />

      <label htmlFor="children">Children</label>
      <OptionSelect
        field="children"
        placeholder="Select an option"
        id="children"
        name="children"
        value={formData.children}
        onChange={onChange}
      />

      <label htmlFor="family_plans">Family plans</label>
      <OptionSelect
        field="family_plans"
        placeholder="Select an option"
        id="family_plans"
        name="family_plans"
        value={formData.family_plans}
        onChange={onChange}
      />

      <label htmlFor="pets">Pets</label>
      <OptionSelect
        field="pets"
        placeholder="Select an option"
        id="pets"
        name="pets"
        value={formData.pets}
        onChange={onChange}
      />

      <label htmlFor="age">Age</label>
      <input id="age" name="age" type="text" value={age ?? "—"} disabled readOnly />

      <label htmlFor="zodiac_sign">Zodiac sign</label>
      <input id="zodiac_sign" name="zodiac_sign" type="text" value={zodiacSign ?? "—"} disabled readOnly />
    </fieldset>
  );
}
