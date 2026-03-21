# FocusBond - Development Build Plan

## Context
Building the FocusBond web app from scratch. The project directory is empty (except docs). We need to build all frontend code (HTML/CSS/JS) and set up the Supabase backend (schema + RLS). The plan orders work so each phase builds on the previous — no phase requires code that hasn't been built yet.

---

## Phase 1: Foundation (no backend needed)
> Goal: Scaffold the project, build the design system, and get all pages rendering with static UI.

### 1.1 — Core CSS Design System
Create the 3 shared CSS files that every page uses.
- `css/global.css` — CSS reset, CSS variables (colors, spacing, fonts), body defaults, dark theme
- `css/components.css` — `.btn`, `.input`, `.card`, `.avatar`, `.badge`, `.progress-bar`, `.emoji-display`
- `css/layout.css` — `.container`, `.page-header`, `.page-content`, flex/grid utilities

### 1.2 — JS Foundation
Create the shared JS files (with placeholder Supabase creds for now).
- `js/config.js` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SESSION_STATES`, `PARTICIPANT_STATUS` constants
- `js/supabase.js` — Supabase client singleton
- `js/utils/dom.js` — DOM helpers
- `js/utils/storage.js` — localStorage wrapper
- `js/utils/validation.js` — Form validation (email, password match, required fields)
- `js/utils/time.js` — Timer formatting, time calculations
- `js/app.js` — Auth guard + auth state listener (skeleton)

### 1.3 — Static HTML Pages (UI only, no JS logic)
Build all 7 HTML pages with correct structure, CSS loading, and placeholder content matching the designs.
- `index.html` — Login page
- `pages/register.html` — Create Account page
- `pages/home.html` — Dashboard with session requests section
- `pages/profile.html` — Edit Profile form
- `pages/friends.html` — My Friends list
- `pages/add-friend.html` — Add Friends search
- `pages/session.html` — Session page (all 5 states as hideable sections)

Also create page-specific CSS:
- `css/pages/auth.css`
- `css/pages/home.css`
- `css/pages/profile.css`
- `css/pages/friends.css`
- `css/pages/session.css`

**Milestone: All pages visually match the designs with static/dummy data. No backend needed.**

---

## Phase 2: Supabase Setup
> Goal: Create the database schema, RLS policies, and verify connectivity.

### 2.1 — Database Schema
Create SQL for all 5 tables (user runs this in Supabase SQL editor):
- `profiles` — linked to `auth.users`
- `friends` — friend requests with status
- `sessions` — focus sessions
- `session_participants` — per-user session tracking
- `session_requests` — session invitations

### 2.2 — Row Level Security (RLS)
Write RLS policies for all tables:
- `profiles` — anyone can read, only owner can update
- `friends` — requester/receiver can read/insert, receiver can update status
- `sessions` — participants can read, creator can update
- `session_participants` — users can read all in their session, update only own row
- `session_requests` — sender/receiver can read, receiver can update

### 2.3 — Database Triggers
- Auto-create `profiles` row on `auth.users` insert (optional, can also handle in JS)
- Auto-set `updated_at` on profile update

**Deliverable: A single `schema.sql` file the user runs in Supabase dashboard.**

**Milestone: Supabase project ready with tables, RLS, and working anon key in config.js.**

---

## Phase 3: Auth Module
> Goal: Working login, register, logout, and auth guards.

### 3.1 — Auth Service
- `js/services/auth.js` — `AuthService` with: `login()`, `register()`, `logout()`, `getCurrentUser()`, `getSession()`

### 3.2 — Login Page Logic
- `js/pages/login.js` — Form submit → `AuthService.login()` → redirect to home
- Validation: required fields, error display
- If already logged in, redirect to home

### 3.3 — Register Page Logic
- `js/pages/register.js` — Form submit → `AuthService.register()` → redirect to home
- Validation: all fields required, password match, email format, username uniqueness

### 3.4 — Auth Guard Activation
- `js/app.js` — Enable auth guard on all protected pages (home, profile, friends, add-friend, session)
- Redirect unauthenticated users to login

**Milestone: Users can register, login, logout. Protected pages redirect to login if not authenticated.**

---

## Phase 4: Profile Module
> Goal: Users can view and edit their profile.

### 4.1 — User Service
- `js/services/user.js` — `UserService` with: `getProfile()`, `updateProfile()`

### 4.2 — Edit Profile Page Logic
- `js/pages/profile.js` — Load current profile into form, handle save
- Validation: username uniqueness check, password match if changing password

**Milestone: Users can update their name, username, email, and password.**

---

## Phase 5: Friends Module
> Goal: Users can search, add, and view friends.

### 5.1 — Friends Service
- `js/services/friends.js` — `FriendsService` with: `searchByUsername()`, `sendRequest()`, `getMyFriends()`, `getPendingRequests()`, `acceptRequest()`, `rejectRequest()`, `removeFriend()`

### 5.2 — My Friends Page Logic
- `js/pages/friends.js` — Load and render friend list, "Start Session" button per friend, "+" button links to add-friend

### 5.3 — Add Friends Page Logic
- `js/pages/addFriend.js` — Search input with results, "Add Friend" button per result, prevent adding existing friends or self

**Milestone: Full friend lifecycle works — search, send request, accept/reject, view list.**

---

## Phase 6: Home / Dashboard
> Goal: Dashboard shows session requests and provides navigation.

### 6.1 — Home Page Logic
- `js/pages/home.js` — Load and display:
  - Welcome message with user's name
  - Pending session requests (from `session_requests` table)
  - Accept/Reject buttons that update request status
  - "Manage Friends" navigation button
- Header with "FocusBond" branding + dark mode toggle

### 6.2 — Dark Mode Toggle
- Toggle between dark/light theme
- Save preference to localStorage via `Storage`
- Apply on page load from saved preference

**Milestone: Dashboard is the main hub — shows invites, navigates to friends.**

---

## Phase 7: Session Module (Core Feature)
> Goal: The full focus session lifecycle — create, invite, wait, focus, complete.

### 7.1 — Session Service
- `js/services/session.js` — `SessionService` with:
  - `createSession(friendId, durationMinutes)` — creates session + session_request + adds creator as participant
  - `getSession(sessionId)` — fetch session with participants
  - `updateParticipantStatus(sessionId, status)` — update own status
  - `submitFocusTime(sessionId, focusTimeSeconds)` — log final time
  - `subscribeToSession(sessionId, callback)` — realtime listener
  - `unsubscribe(channel)` — cleanup

### 7.2 — Session Page Logic (all 5 states in one page)
- `js/pages/session.js` — Manages state machine:

  **State: Waiting**
  - Show session info (number, date, time range)
  - Show participants with status badges (Ready/Waiting)
  - "Leave Session" button
  - When all participants are Ready → auto-transition to Active

  **State: Active**
  - Start timer (counts up from 00:00)
  - Update progress bar in real-time
  - Show participant statuses via realtime subscription
  - "Stop Session" button → transitions to outcome

  **State: Outcome (Left Early / Completed / Outdid)**
  - Compare actual focus time vs target duration
  - Show appropriate emoji + message + colored time
  - "Submit" saves focus time to DB
  - "Edit Time" allows manual adjustment before submit

### 7.3 — Session Realtime
- Subscribe to `session_participants` changes for live status updates
- Handle edge cases: partner leaves, connection drops
- Cleanup subscriptions on page unload

### 7.4 — Start Session Flow (from Friends page)
- "Start Session" button on friends page → prompt for duration → create session + send request → navigate to session page in Waiting state

### 7.5 — Accept Session Flow (from Home page)
- Accept button on session request → join as participant → navigate to session page in Waiting state

**Milestone: Complete focus session flow works end-to-end with realtime updates between two users.**

---

## Phase 8: Polish & Edge Cases
> Goal: Handle UX details, errors, and edge cases.

- Loading states (spinners/skeletons) on all data fetches
- Empty states (no friends, no session requests)
- Error toast/notification component
- Form disable during submission (prevent double-clicks)
- Responsive tweaks for tablet/desktop
- Session timeout handling (what if user closes browser mid-session)
- Navigation consistency (back buttons, header nav)

---

## Build Order Summary

| Order | Module | Depends On | Key Files |
|---|---|---|---|
| 1 | CSS Design System | nothing | `global.css`, `components.css`, `layout.css` |
| 2 | JS Foundation | nothing | `config.js`, `supabase.js`, `utils/*` |
| 3 | Static HTML Pages | Phase 1+2 | all `.html` files + `pages/*.css` |
| 4 | Supabase Schema | nothing | `schema.sql` |
| 5 | Auth Module | Phase 1-4 | `services/auth.js`, `pages/login.js`, `pages/register.js` |
| 6 | Profile Module | Auth | `services/user.js`, `pages/profile.js` |
| 7 | Friends Module | Auth, Profile | `services/friends.js`, `pages/friends.js`, `pages/addFriend.js` |
| 8 | Home Dashboard | Auth, Friends, Session | `pages/home.js` |
| 9 | Session Module | All above | `services/session.js`, `pages/session.js` |
| 10 | Polish | All above | Across all files |
