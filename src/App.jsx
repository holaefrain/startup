import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import Signup from "./pages/Signup/Signup.jsx";
import Discover from "./pages/Discover/Discover.jsx";
import Footer from "./components/Footer.jsx";
import "./App.css";

function PlaceholderPage({ title }) {
  return (
    <div>
      <main>
        <h1>{title}</h1>
        <p>This page is a placeholder for a future Debrief feature.</p>
        <Link to="/discover">Back to discover</Link>
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/liked" element={<PlaceholderPage title="Liked me" />} />
        <Route path="/chats" element={<PlaceholderPage title="Chats" />} />
        <Route path="/profile" element={<PlaceholderPage title="Profile" />} />
      </Routes>
    </BrowserRouter>
  );
}
