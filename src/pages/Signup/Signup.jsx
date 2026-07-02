import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../components/Footer.jsx";

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ //controlled form state
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleChange = (event) => { //update state when user types
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => { //handle form submission
    event.preventDefault();

    // TODO: update the endpoint to match your backend API.
    // The server should create a user record associated with the provided
    // email, phone, and password, then return success before navigating.
    try {
      await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    } catch (error) {
      console.error("Signup request failed", error);
    }

    navigate("/signup/identity");
  };

  return (
    <div id="signup">
      <main>
        <h1>Sign up</h1>

        <form id="signup-step1" onSubmit={handleSubmit}> //controlled form with handler
          <fieldset>
            <legend>Step 1 - Basic information</legend>

            <label htmlFor="first_name">First name</label> //htmlFor since for is for JS
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={formData.first_name} //input value is controlled by state
              onChange={handleChange} //onChange updates state when user types
              required
            />

            <label htmlFor="last_name">Last name</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange}
              required
            />

            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1-555-555-5555"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <button type="submit">Next</button>
          </fieldset>
        </form>

        <p>
          <Link to="/">Back to home</Link>
        </p>
      </main>

      <Footer />
    </div>
  );
}
