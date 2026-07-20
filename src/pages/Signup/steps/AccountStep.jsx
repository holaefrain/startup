import { useState } from "react";

const DUPLICATE_MESSAGES = {
  email: "This email is already registered.",
  phone: "This phone number is already registered.",
};

export default function AccountStep({ formData, onChange }) {
  const [fieldErrors, setFieldErrors] = useState({ email: "", phone: "" });

  // Clears any duplicate error from a previous blur as soon as the user edits the field again, so an old message can't linger on a value that no longer matches it.
  function handleFieldChange(field, event) {
    event.target.setCustomValidity("");
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    onChange(event);
  }

  // Only checks once the field is already valid on its own (non-empty, right shape) - setCustomValidity makes a hit here block the wizard's "Next" submit the same way the phone `pattern` already does.
  async function handleFieldBlur(field, event) {
    const inputEl = event.target;
    if (!inputEl.value || !inputEl.checkValidity()) return;

    try {
      const response = await fetch(`/api/users/exists?${new URLSearchParams({ [field]: inputEl.value })}`);
      const data = response.ok ? await response.json() : null;
      if (data?.[field]) {
        inputEl.setCustomValidity(DUPLICATE_MESSAGES[field]);
        setFieldErrors((prev) => ({ ...prev, [field]: DUPLICATE_MESSAGES[field] }));
      }
    } catch {
      // Best-effort early check - the final /api/signup + /api/auth submit still guards this if the request itself fails.
    }
  }

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
        pattern="\+?(\d[\s\-.]?){7,15}"
        title="Enter a valid phone number (7-15 digits, e.g. +1-555-555-5555)"
        required
      />
      <p className="field-hint">Digits only, with optional +, spaces, dashes, or dots (7-15 digits).</p>

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
