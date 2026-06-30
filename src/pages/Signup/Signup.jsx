<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Debrief | Sign Up</title>
</head>
<body>
  <main>
    <h1>Sign up</h1>

    <!--
      STEP 1: Basic information
      This form POSTS to a server endpoint (`/signup-step2`) which should validate
      and store the basic info in your database, then render the Identity step
      (or redirect to this page with the Identity section visible).
      No JS/CSS included here per request.
    -->
    <form id="signup-step1" action="/signup-step2" method="post">
      <fieldset>
        <legend>Step 1 — Basic information</legend>

        <label for="first_name">First name</label>
        <input id="first_name" name="first_name" type="text" required>

        <label for="last_name">Last name</label>
        <input id="last_name" name="last_name" type="text" required>

        <label for="birthday">Birthday</label>
        <input id="birthday" name="birthday" type="date" required>

        <label for="email">Email</label>
        <input id="email" name="email" type="email" required>

        <label for="phone">Phone number</label>
        <input id="phone" name="phone" type="tel" placeholder="+1-555-555-5555" required>

        <!-- BACKEND: Save these fields to the DB and then render the Identity step. -->

        <button type="submit">Next</button>
      </fieldset>
    </form>

    <!--
      STEP 2: Identity selections
      This section should be shown after successful Step 1 submission. The
      server should render this form (or this section) once the initial data
      is persisted. Each input below is a dropdown select per requirement.
    -->
    <section id="identity-step">
      <h2>Step 2 — Identity</h2>
      <p>(Shown after submitting basic information)</p>

      <form id="signup-step2" action="/signup-complete" method="post">
        <!-- Optionally include hidden inputs to carry step1 values if needed -->

        <label for="pronouns">Pronouns</label>
        <select id="pronouns" name="pronouns" required>
          <option value="">Select pronouns</option>
          <option value="she_her">She / Her</option>
          <option value="he_him">He / Him</option>
          <option value="they_them">They / Them</option>
          <option value="ze_zir">Ze / Zir</option>
          <option value="other">Other</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>

        <label for="gender">Gender</label>
        <select id="gender" name="gender" required>
          <option value="">Select gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="nonbinary">Non-binary</option>
          <option value="trans">Transgender</option>
          <option value="other">Other</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>

        <label for="sexuality">Sexuality</label>
        <select id="sexuality" name="sexuality" required>
          <option value="">Select sexuality</option>
          <option value="heterosexual">Heterosexual / Straight</option>
          <option value="homosexual">Homosexual / Gay</option>
          <option value="bisexual">Bisexual</option>
          <option value="pansexual">Pansexual</option>
          <option value="asexual">Asexual</option>
          <option value="other">Other</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>

        <label for="interested_in">Interested in</label>
        <select id="interested_in" name="interested_in" required>
          <option value="">Select who you're interested in</option>
          <option value="women">Women</option>
          <option value="men">Men</option>
          <option value="nonbinary">Non-binary people</option>
          <option value="everyone">Everyone</option>
          <option value="other">Other</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>

        <!-- BACKEND: When this form is POSTed, merge these identity selections
             with the previously stored basic info and finalize account creation. -->

        <button type="submit">Next</button>
      </form>
    </section>

    <!--
      STEP 3: Additional profile
      Optional additional profile information. The server should render this
      after Identity (or include it in the final account-completion flow).
    -->
    <section id="profile-step">
      <h2>Step 3 — Additional profile</h2>
      <p>(All fields required)</p>

      <form id="signup-step3" action="/signup-complete" method="post">
        <!-- Include hidden inputs from previous steps when rendering server-side if needed -->

        <label for="work">Work (Company)</label>
        <input id="work" name="work" type="text" required>

        <label for="job_title">Job Title</label>
        <input id="job_title" name="job_title" type="text" required>

        <label for="school">School</label>
        <input id="school" name="school" type="text" required>

        <label for="education_level">Education Level</label>
        <select id="education_level" name="education_level" required>
          <option value="">Select education level</option>
          <option value="high_school">High school</option>
          <option value="associate">Associate degree</option>
          <option value="bachelor">Bachelor's degree</option>
          <option value="master">Master's degree</option>
          <option value="doctorate">Doctorate</option>
          <option value="other">Other</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>

        <label for="religion">Religious Beliefs</label>
        <input id="religion" name="religion" type="text" required>

        <label for="hometown">Hometown</label>
        <input id="hometown" name="hometown" type="text" required>

        <label for="politics">Politics</label>
        <select id="politics" name="politics" required>
          <option value="">Select political view</option>
          <option value="very_liberal">Very liberal</option>
          <option value="liberal">Liberal</option>
          <option value="moderate">Moderate</option>
          <option value="conservative">Conservative</option>
          <option value="very_conservative">Very conservative</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>

        <label for="languages">Languages Spoken</label>
        <input id="languages" name="languages" type="text" placeholder="English, Spanish, ..." required>

        <!-- BACKEND: Merge these fields into the user's profile record when posted. -->

        <button type="submit">Save profile and finish</button>
      </form>
    </section>

    <p><a href="index.html">Back to home</a></p>
  </main>
</body>
</html>
