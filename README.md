# Debrief - A dating app to let it all air out

[My Notes](notes.md)

Debrief is a dating app built around what happens *after* the date. Users match, chat, and propose dates through an in-app venue/event picker — then privately debrief once the date is over. A trained relationship coach reviews every submission, screens out harassment, and feeds structured signal into a compatibility algorithm that improves with every date. The result is a dating app that learns from real outcomes instead of guessing from profiles. Let's air it out.

> [!NOTE]
> This is a template for your startup application. You must modify this `README.md` file for each phase of your development. You only need to fill in the section for each deliverable when that deliverable is submitted in Canvas. Without completing the section for a deliverable, the TA will not know what to look for when grading your submission. Feel free to add additional information to each deliverable description, but make sure you at least have the list of rubric items and a description of what you did for each item.

> [!NOTE]
> If you are not familiar with Markdown then you should review the [documentation](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) before continuing.

### Elevator pitch

You've been on that date. You know the one - their dating profile shows photos from 2019, they spent 40 minutes talking about their ex, and you still texted "had a great time!" because what else are you supposed to do? Debrief is the dating app that finally lets you air it all out. After every date, both people privately rate how it went using metrics such as respect, safety, chemistry, and whether their match actually showed up as advertised. Once submitted, a trained relationship coach reads every debrief, filters the petty stuff, and feeds real signals into a matching algorithm that actually learns you. No public scores, no pile-ons, no way to torch a stranger out of spite — just honest feedback in a place built to handle it. Every other app optimizes for the swipe. We optimize for the second date. Let's air it out.

### Design

![Design image](homepage.png)

The Debrief experience flows across four core screens. 
**Discover** presents one profile at a time as a swipeable card with photos and a short bio — no scores, no aggregate ratings, nothing that turns the browse into a leaderboard. Once two users mutually swipe, they unlock  **Chat**, a real-time conversation view where either person can tap "Propose a date" to open the **Date Proposal** modal. The modal queries the Google Maps Places API for nearby restaurants, cafés, and activities, lets the user attach a venue and time, and sends the proposal as a structured card inside the chat. After the date, both users open the **Debrief** form: six yes/no checks, two 1–5 scales, a short open-text note, and a self-debrief tab that asks the same questions about their own behavior. Submitted debriefs route to a relationship coach for review before feeding the compatibility algorithm. The sketches below show each of these four screens.

```mermaid
sequenceDiagram
    actor UserA
    actor UserB
    actor UserA as User A
    actor UserB as User B
    participant Frontend as React Frontend
    participant Backend as Node/Express
    participant DB as MongoDB
    participant Maps as Google Maps API

    UserA->>Frontend: Swipe right on UserB
    Frontend->>Backend: POST /api/like
    Backend->>DB: Record like
    UserB->>Frontend: Swipe right on UserA
    Frontend->>Backend: POST /api/like
    Backend->>DB: Record like; check if UserA also likes, create match
    Backend->>Frontend: Match notification (WebSocket)

    UserA->>Frontend: Open chat, propose date
    Frontend->>Backend: GET /api/venues-events
    Backend->>Maps: Places API request
    Maps->>Backend: Nearby venues
    Backend->>Frontend: Venue/Event list
    UserA->>Frontend: Select venue, date, time; send proposal to UserB
    Frontend->>Backend: POST /api/date-proposal
    Backend->>DB: Save proposal
    Backend->>UserB: Proposal notification
    UserB->>Frontend: Accept/decline proposal

    Note over UserA + UserB go on a date

    UserA->>Frontend: Submit debrief
    Frontend->>Backend: Post /api/debrief
    Backend->>DB: Save debrief as pending review
    Coach->>Backend: Open review queue
    Backend->>DB: Fetch pending debriefs
    Coach->>Backend: Approve debrief, add coach notes
    Backend->>DB: Mark approved, update compatability signal
    Backend->>UserA: Debrief reviewed (WebSocket)
```

### Key features

- **Structured post-date debrief** - After every date, both people privately rate how it went across six yes/no checks (showed up as advertised, photos matched, on time, respectful, made me feel safe, would see again) and two 1–5 scales (engaged in conversation, chemistry), plus a short open-text note. A self-debrief mirrors the same questions back at the user.
- **Coach-reviewed signal, not raw scores** - A trained relationship coach reviews every debrief, screens out harassment and revenge ratings, and writes private notes that feed a compatibility algorithm — so the app gets sharper at matching with every date.
- **Match-gated visibility** - Ratings are never public. Once two users match, they can see each other's debrief history, but only after the rated user has logged at least five debriefs — enough to dilute outliers without locking new users out.
- **In-chat date proposals with venue lookup** - Either person can propose a date directly inside the conversation. A Google Maps integration surfaces nearby restaurants, cafés, and activities, so plans actually get made instead of dying in "wyd this weekend?"
- **Real-time chat and notifications** - Messages, date proposals, and debrief reminders are delivered live over WebSocket, so the conversation feels like a conversation, not an inbox.
- **Reporting and flagging** - Users can report profiles, messages, or ratings at any point; flagged content routes to the coach review queue for prioritized handling.

### Technologies

I am going to use the required technologies in the following ways.

- **HTML** - Semantic structure for the core pages: discovery feed, match list, conversation view, date proposal, debrief form, and profile. Forms for login, registration, and debrief submission.
- **CSS** - Responsive layout via flexbox and grid, custom color system and typography reflecting the Debrief brand, swipe and transition animations on the discovery feed, and a styled debrief form that adapts cleanly between mobile and desktop.
- **React** - Single-page application bundled with Vite. Components for the swipe card, match list, chat thread, date proposal modal, debrief form, and coach review queue. React Router handles navigation between Discover, Matches, Chat, Date Proposal, Debrief, and Profile views. Hooks manage auth state, live messages, and debrief drafts.
- **Service** - Node.js/Express backend serving the React frontend via static middleware and exposing REST endpoints for profiles, matches, date proposals, and debrief submissions. The Google Maps Places API is called server-side to surface nearby venues when a user opens the date proposal modal.
- **DB/Login** - MongoDB stores users, profiles, matches, messages, date proposals, debrief submissions, and coach notes. User registration and login are handled with bcrypt-hashed passwords; authenticated sessions gate access to matches, chat, and debrief endpoints.
- **WebSocket** - Real-time chat messages between matched users, live date proposal notifications, and instant alerts when a debrief has been reviewed by the relationship coach.


## 🚀 Specification Deliverable

> [!NOTE]
> Fill in this sections as the submission artifact for this deliverable. You can refer to this [example](https://github.com/webprogramming260/startup-example/blob/main/README.md) for inspiration.

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] I completed the prerequisites for this deliverable (Git commit requirement)
- [x] Proper use of Markdown
- [x] A concise and compelling elevator pitch
- [x] Description of key features
- [x] Description of how you will use each technology
- [x] One or more rough sketches of your application. Images must be embedded in this file using Markdown image references.

## 🚀 AWS deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] **Rented EC2 server** - An Ubuntu 24.04 EC2 instance runs both my `simon` and `startup` services side by side under pm2, reverse-proxied by Caddy.
- [x] **Leased domain name** - `debrief.works`, with `startup.debrief.works` as the DNS record pointed at the EC2 instance for this app specifically.
- [x] **Server accessible** from my domain: [https://startup.debrief.works](https://startup.debrief.works) - Caddy reverse-proxies that hostname to the Node process on port 4000.

## 🚀 HTML deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [x] **HTML pages** - `index.html` is the single Vite entry point; each route (Home, Signup, Discover, Chat, Profile) is its own page component under `src/pages/`.
- [x] **Proper HTML element usage** - The Discover page's profile card is a semantic `<article>` (`src/pages/Discover/Discover.jsx`), not a generic `<div>`.
- [x] **Links** - The Home page's login card links to Signup with React Router's `<Link to="/signup">` (`src/pages/Home/Home.jsx`).
- [x] **Text** - The Home page's hero `<h1>DEBRIEF</h1>` (`src/pages/Home/sections/Hero.jsx`).
- [x] **3rd party API placeholder** - Now a real integration: the server calls the Google Places API (`server/places.js`), used by Chat's date-planner venue search and Signup's city autocomplete.
- [x] **Images** - Each profile's photos render in the Discover page's carousel via `<img>` tags pointed at `/api/photos/:userId/:index` (`src/pages/Discover/Discover.jsx`).
- [x] **Login placeholder** - Now the real login form on the Home page (`src/pages/Home/Home.jsx`).
- [x] **DB data placeholder** - Now real data: the Discover page fetches `/api/discover`, which reads live profiles out of MongoDB (`src/pages/Discover/Discover.jsx`).
- [x] **WebSocket placeholder** - Now a real connection: the Chat page displays messages pushed live over WebSocket (`src/pages/Chat/Chat.jsx`).

## 🚀 CSS deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [x] **Visually appealing colors and layout. No overflowing elements.** - A custom color system is defined once as CSS variables in `src/index.css`'s `:root` block (`--color-page`, `--color-text`, `--color-accent`, etc.) and reused site-wide.
- [x] **Use of a CSS framework** - Tailwind is wired in via `@tailwind base/components/utilities` (`src/index.css`) and the `@tailwindcss/vite` plugin (`vite.config.js`).
- [x] **All visual elements styled using CSS** - Every element type gets a base style, e.g. the global `button` rule in `src/index.css`.
- [x] **Responsive to window resizing using flexbox and/or grid display** - The Home page's hero uses CSS grid (`src/pages/Home/Home.css`'s `.hero-content`) that reflows at the `@media (max-width: 760px)` breakpoint.
- [ ] **Use of a imported font** - Not actually done yet: `src/index.css` names `Inter` in its `font-family` stack, but nothing imports it (no `@font-face`, Google Fonts link, or `@fontsource` package), so it silently falls back to a system font.
- [x] **Use of different types of selectors including element, class, ID, and pseudo selectors** - `button` (element) and `button:hover` (pseudo) in `src/index.css`; `#discover .swipe-area` (ID + class combined) in `src/pages/Discover/Discover.css`.

## 🚀 React part 1: Routing deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [x] **Bundled using Vite** - `vite.config.js` configures the React and Tailwind Vite plugins; `npm run build` produces the production bundle deployed via `deployReact.sh`.
- [x] **Components** - Reusable pieces like the nav (`src/components/AppNav.jsx`) sit alongside page-level components under `src/pages/`.
- [x] **Router** - `src/App.jsx` uses `<BrowserRouter>`/`<Routes>` to map `/`, `/signup`, `/discover`, `/chat`, and `/profile` to their pages.

## 🚀 React part 2: Reactivity deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [x] **All functionality implemented or mocked out** - Auth, Discover/swipe, matching, real-time Chat, and Profile editing are all live against the real backend; only `/liked` and `/settings` remain intentional placeholders (`PlaceholderPage` in `src/App.jsx`).
- [x] **Hooks** - `src/context/AuthContext.jsx` uses `useState`/`useEffect` to track session state app-wide; `src/hooks/useChatSocket.js` is a custom hook wrapping the Chat page's live WebSocket connection.

## 🚀 Service deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [x] **Node.js/Express HTTP service** - `const app = express()` in `server/index.js`.
- [x] **Static middleware for frontend** - `app.use(express.static(PUBLIC_DIR))` in `server/index.js` serves the built React bundle.
- [x] **Calls to third party endpoints** - `server/places.js` calls the Google Places API server-side for the venue search on the Chat page's date planner.
- [x] **Backend service endpoints** - Routers for auth, discover, profile, photos, swipes, chat, and places are all mounted under `/api` in `server/index.js`.
- [x] **Frontend calls service endpoints** - The Chat page fetches `/api/matches` and `/api/matches/:id/messages` on load (`src/pages/Chat/Chat.jsx`).
- [x] **Supports registration, login, logout, and restricted endpoint** - `POST/PUT/DELETE /auth` and `GET /user/me` (401s without a session) in `server/auth.js`.
- [x] **Uses BCrypt to hash passwords** - `bcrypt.hash`/`bcrypt.compare` in `server/auth.js`'s registration and login handlers.

## 🚀 DB deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [x] **Stores data in MongoDB** - Signup writes each new profile into the `users` collection of the `debrief` database (`users.insertOne(...)` in `server/index.js`).
- [x] **Stores credentials in MongoDB** - Registration bcrypt-hashes the password and stores it on that same user document (`users.updateOne(..., { $set: { password: passwordHash, ... } })` in `server/auth.js`).

## 🚀 WebSocket deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [x] **Backend listens for WebSocket connection** - `httpServer.on("upgrade", ...)` handles the `/ws` path in `server/websocket.js`.
- [x] **Frontend makes WebSocket connection** - The Chat page opens `new WebSocket(...)` via the `useChatSocket` hook (`src/hooks/useChatSocket.js`).
- [x] **Data sent over WebSocket connection** - Sending a chat message calls `broadcastToUsers(...)` to push it to both match participants (`server/chat.js`).
- [x] **WebSocket data displayed** - The Chat page's `useChatSocket({ onMessage })` appends incoming messages straight into the visible thread (`src/pages/Chat/Chat.jsx`).
- [x] **Application is fully functional** - Verified end-to-end in production this session: login, Discover swiping, matching, and live Chat messaging all work against the real deployed backend at `startup.debrief.works`.
