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

- [x] **Rented EC2 server** - I completed this part of the deliverable.
- [x] **Leased domain name** - I completed this part of the deliverable.
- [x] **Server accessible** from my domain: [https://debrief.works](https://debrief.works) - I completed this part of the deliverable.

## 🚀 HTML deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [x] **HTML pages** - I created React pages for Home, Signup, and Discover, with placeholder routes for Liked me, Chats, and Profile.
- [x] **Proper HTML element usage** - The pages use semantic structure such as `nav`, `main`, `section`, `article`, `form`, `fieldset`, `legend`, `label`, and headings.
- [x] **Links** - React Router links connect Home, Signup, Discover, Liked me, Chats, and Profile routes.
- [x] **Text** - The pages include product copy for Debrief, profile placeholder text, form labels, and navigation text.
- [x] **3rd party API placeholder** - The Discover page includes a Google Maps venue suggestions placeholder for future date ideas.
- [x] **Images** - The Home page includes an actual image element using the Debrief design image.
- [x] **Login placeholder** - The Home page includes a login dialog placeholder with email and password fields.
- [x] **DB data placeholder** - The Discover page includes a profile card placeholder for future MongoDB profile records.
- [x] **WebSocket placeholder** - The Discover page includes a notifications section for future live match, chat, and date proposal updates.

## 🚀 CSS deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [ ] **Visually appealing colors and layout. No overflowing elements.** - I did not complete this part of the deliverable.
- [ ] **Use of a CSS framework** - I did not complete this part of the deliverable.
- [ ] **All visual elements styled using CSS** - I did not complete this part of the deliverable.
- [ ] **Responsive to window resizing using flexbox and/or grid display** - I did not complete this part of the deliverable.
- [ ] **Use of a imported font** - I did not complete this part of the deliverable.
- [ ] **Use of different types of selectors including element, class, ID, and pseudo selectors** - I did not complete this part of the deliverable.

## 🚀 React part 1: Routing deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [ ] **Bundled using Vite** - I did not complete this part of the deliverable.
- [ ] **Components** - I did not complete this part of the deliverable.
- [ ] **Router** - I did not complete this part of the deliverable.

## 🚀 React part 2: Reactivity deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [ ] **All functionality implemented or mocked out** - I did not complete this part of the deliverable.
- [ ] **Hooks** - I did not complete this part of the deliverable.

## 🚀 Service deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [ ] **Node.js/Express HTTP service** - I did not complete this part of the deliverable.
- [ ] **Static middleware for frontend** - I did not complete this part of the deliverable.
- [ ] **Calls to third party endpoints** - I did not complete this part of the deliverable.
- [ ] **Backend service endpoints** - I did not complete this part of the deliverable.
- [ ] **Frontend calls service endpoints** - I did not complete this part of the deliverable.
- [ ] **Supports registration, login, logout, and restricted endpoint** - I did not complete this part of the deliverable.
- [ ] **Uses BCrypt to hash passwords** - I did not complete this part of the deliverable.

## 🚀 DB deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [ ] **Stores data in MongoDB** - I did not complete this part of the deliverable.
- [ ] **Stores credentials in MongoDB** - I did not complete this part of the deliverable.

## 🚀 WebSocket deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] I completed the prerequisites for this deliverable (Simon deployed, GitHub link, Git commits)
- [ ] **Backend listens for WebSocket connection** - I did not complete this part of the deliverable.
- [ ] **Frontend makes WebSocket connection** - I did not complete this part of the deliverable.
- [ ] **Data sent over WebSocket connection** - I did not complete this part of the deliverable.
- [ ] **WebSocket data displayed** - I did not complete this part of the deliverable.
- [ ] **Application is fully functional** - I did not complete this part of the deliverable.
