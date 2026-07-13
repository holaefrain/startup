export default function IdentityStep({ formData, onChange }) {
  return (
    <fieldset>
      <legend>Step 2 - Identity</legend>

      <label htmlFor="pronouns">Pronouns</label>
      <select id="pronouns" name="pronouns" value={formData.pronouns} onChange={onChange} required>
        <option value="">Select pronouns</option>
        <option value="she_her">She / Her</option>
        <option value="he_him">He / Him</option>
        <option value="they_them">They / Them</option>
        <option value="ze_zir">Ze / Zir</option>
        <option value="other">Other</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>

      <label htmlFor="gender">Gender</label>
      <select id="gender" name="gender" value={formData.gender} onChange={onChange} required>
        <option value="">Select gender</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="nonbinary">Non-binary</option>
        <option value="trans">Transgender</option>
        <option value="other">Other</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>

      <label htmlFor="sexuality">Sexuality</label>
      <select id="sexuality" name="sexuality" value={formData.sexuality} onChange={onChange} required>
        <option value="">Select sexuality</option>
        <option value="heterosexual">Heterosexual / Straight</option>
        <option value="homosexual">Homosexual / Gay</option>
        <option value="bisexual">Bisexual</option>
        <option value="pansexual">Pansexual</option>
        <option value="asexual">Asexual</option>
        <option value="other">Other</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>

      <label htmlFor="interested_in">Interested in</label>
      <select
        id="interested_in"
        name="interested_in"
        value={formData.interested_in}
        onChange={onChange}
        required
      >
        <option value="">Select who you're interested in</option>
        <option value="women">Women</option>
        <option value="men">Men</option>
        <option value="nonbinary">Non-binary people</option>
        <option value="everyone">Everyone</option>
        <option value="other">Other</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>
    </fieldset>
  );
}
