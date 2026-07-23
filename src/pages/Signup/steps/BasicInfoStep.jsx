import CityAutocompleteInput from "../../../components/CityAutocompleteInput.jsx";
import OptionSelect from "../../../components/OptionSelect.jsx";

export default function BasicInfoStep({ formData, onChange }) {
  return (
    <fieldset>
      <legend>Step 3 - Basic information</legend>

      <label htmlFor="job_title">Job title</label>
      <input id="job_title" name="job_title" type="text" value={formData.job_title} onChange={onChange} />

      <label htmlFor="school">School</label>
      <input id="school" name="school" type="text" value={formData.school} onChange={onChange} />

      <label htmlFor="education_level">Education level</label>
      <OptionSelect
        field="education_level"
        placeholder="Select education level"
        id="education_level"
        name="education_level"
        value={formData.education_level}
        onChange={onChange}
      />

      <label htmlFor="religion">Religious beliefs</label>
      <OptionSelect
        field="religion"
        placeholder="Select religious beliefs"
        id="religion"
        name="religion"
        value={formData.religion}
        onChange={onChange}
      />

      <label htmlFor="hometown">Hometown</label>
      <CityAutocompleteInput id="hometown" name="hometown" value={formData.hometown} onChange={onChange} />

      <label htmlFor="politics">Politics</label>
      <OptionSelect
        field="politics"
        placeholder="Select political views"
        id="politics"
        name="politics"
        value={formData.politics}
        onChange={onChange}
      />

      <label htmlFor="languages">Languages spoken</label>
      <input
        id="languages"
        name="languages"
        type="text"
        placeholder="e.g. English, Spanish"
        value={formData.languages}
        onChange={onChange}
      />

      <label htmlFor="dating_intentions">Dating intentions</label>
      <OptionSelect
        field="dating_intentions"
        placeholder="Select dating intentions"
        id="dating_intentions"
        name="dating_intentions"
        value={formData.dating_intentions}
        onChange={onChange}
      />

      <label htmlFor="relationship_type">Relationship type</label>
      <OptionSelect
        field="relationship_type"
        placeholder="Select relationship type"
        id="relationship_type"
        name="relationship_type"
        value={formData.relationship_type}
        onChange={onChange}
      />
    </fieldset>
  );
}
