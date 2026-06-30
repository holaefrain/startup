import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";

export default function Chat() {
  return (
    <div id="chat">
      <header>
        <h1>Chat</h1>
        <p>Messages with your matches will appear here.</p>
        <AppNav />
      </header>

      <main>
        <section aria-live="polite">
          <h2>Conversation</h2>
          <p>WebSocket placeholder: live chat messages will load here.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
