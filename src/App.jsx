import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import Signup from "./pages/Signup/Signup.jsx";
import Identity from "./pages/Signup/Identity.jsx";
import BasicInfo from "./pages/Signup/BasicInfo.jsx";
import Discover from "./pages/Discover/Discover.jsx";
import Chat from "./pages/Chat/Chat.jsx";
import Profile from "./pages/Profile/Profile.jsx";
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
        <Route path="/signup/identity" element={<Identity />} />
        <Route path="/signup/basic-info" element={<BasicInfo />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/liked" element={<PlaceholderPage title="Liked me" />} />
      </Routes>
    </BrowserRouter>
  );
}
