import OptionSelect from "../../../components/OptionSelect.jsx";

export default function IdentityStep({ formData, onChange }) {
  return (
    <fieldset>
      <legend>Step 2 - Identity</legend>

      <label htmlFor="pronouns">Pronouns</label>
      <OptionSelect
        field="pronouns"
        placeholder="Select pronouns"
        id="pronouns"
        name="pronouns"
        value={formData.pronouns}
        onChange={onChange}
        required
      />

      <label htmlFor="gender">Gender</label>
      <OptionSelect
        field="gender"
        placeholder="Select gender"
        id="gender"
        name="gender"
        value={formData.gender}
        onChange={onChange}
        required
      />

      <label htmlFor="sexuality">Sexuality</label>
      <OptionSelect
        field="sexuality"
        placeholder="Select sexuality"
        id="sexuality"
        name="sexuality"
        value={formData.sexuality}
        onChange={onChange}
        required
      />

      <label htmlFor="interested_in">Interested in</label>
      <OptionSelect
        field="interested_in"
        placeholder="Select who you're interested in"
        id="interested_in"
        name="interested_in"
        value={formData.interested_in}
        onChange={onChange}
        required
      />
    </fieldset>
  );
}
