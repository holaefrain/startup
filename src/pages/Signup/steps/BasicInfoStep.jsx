export default function BasicInfoStep({ formData, onChange }) {
  return (
    <fieldset>
      <legend>Step 3 - Basic information</legend>

      <label htmlFor="job_title">Job title</label>
      <input id="job_title" name="job_title" type="text" value={formData.job_title} onChange={onChange} />

      <label htmlFor="school">School</label>
      <input id="school" name="school" type="text" value={formData.school} onChange={onChange} />

      <label htmlFor="education_level">Education level</label>
      <select id="education_level" name="education_level" value={formData.education_level} onChange={onChange}>
        <option value="">Select education level</option>
        <option value="high_school">High school</option>
        <option value="some_college">Some college</option>
        <option value="associates">Associate's degree</option>
        <option value="bachelors">Bachelor's degree</option>
        <option value="masters">Master's degree</option>
        <option value="phd">PhD / Doctorate</option>
        <option value="trade_school">Trade school</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>

      <label htmlFor="religion">Religious beliefs</label>
      <select id="religion" name="religion" value={formData.religion} onChange={onChange}>
        <option value="">Select religious beliefs</option>
        <option value="agnostic">Agnostic</option>
        <option value="atheist">Atheist</option>
        <option value="buddhist">Buddhist</option>
        <option value="catholic">Catholic</option>
        <option value="christian">Christian</option>
        <option value="hindu">Hindu</option>
        <option value="jewish">Jewish</option>
        <option value="muslim">Muslim</option>
        <option value="spiritual">Spiritual</option>
        <option value="other">Other</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>

      <label htmlFor="hometown">Hometown</label>
      <input id="hometown" name="hometown" type="text" value={formData.hometown} onChange={onChange} />

      <label htmlFor="politics">Politics</label>
      <select id="politics" name="politics" value={formData.politics} onChange={onChange}>
        <option value="">Select political views</option>
        <option value="liberal">Liberal</option>
        <option value="moderate">Moderate</option>
        <option value="conservative">Conservative</option>
        <option value="not_political">Not political</option>
        <option value="other">Other</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>

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
      <select id="dating_intentions" name="dating_intentions" value={formData.dating_intentions} onChange={onChange}>
        <option value="">Select dating intentions</option>
        <option value="life_partner">Life partner</option>
        <option value="long_term">Long-term relationship</option>
        <option value="long_term_open_short">Long-term, open to short</option>
        <option value="short_term_open_long">Short-term, open to long</option>
        <option value="short_term">Short-term fun</option>
        <option value="figuring_out">Figuring out my intentions</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>

      <label htmlFor="relationship_type">Relationship type</label>
      <select id="relationship_type" name="relationship_type" value={formData.relationship_type} onChange={onChange}>
        <option value="">Select relationship type</option>
        <option value="monogamy">Monogamy</option>
        <option value="non_monogamy">Non-monogamy</option>
        <option value="figuring_out">Figuring out my relationship type</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>
    </fieldset>
  );
}
