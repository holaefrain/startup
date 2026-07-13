export default function AccountStep({ formData, onChange }) {
  return (
    <fieldset>
      <legend>Step 1 - Basic information</legend>

      <label htmlFor="first_name">First name</label>
      <input
        id="first_name"
        name="first_name"
        type="text"
        value={formData.first_name}
        onChange={onChange}
        required
      />

      <label htmlFor="last_name">Last name</label>
      <input
        id="last_name"
        name="last_name"
        type="text"
        value={formData.last_name}
        onChange={onChange}
        required
      />

      <label htmlFor="birthday">Birthday</label>
      <input
        id="birthday"
        name="birthday"
        type="date"
        value={formData.birthday}
        onChange={onChange}
        required
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        value={formData.email}
        onChange={onChange}
        required
      />

      <label htmlFor="phone">Phone number</label>
      <input
        id="phone"
        name="phone"
        type="tel"
        placeholder="+1-555-555-5555"
        value={formData.phone}
        onChange={onChange}
        required
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        value={formData.password}
        onChange={onChange}
        required
      />
    </fieldset>
  );
}
