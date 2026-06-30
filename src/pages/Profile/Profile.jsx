import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";

export default function Profile() {
  return (
    <div id="profile">
      <header>
        <h1>Profile</h1>
        <p>Your public dating profile details will appear here.</p>
        <AppNav />
      </header>

      <main>
        <section>
          <h2>Profile details</h2>
          <p>Database placeholder: profile photos, bio, and preferences will load here.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
