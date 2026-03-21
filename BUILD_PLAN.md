# FocusBond - Development Build Plan

## Context
Building the FocusBond web app from scratch. The plan orders work so each phase builds on the previous — no phase requires code that hasn't been built yet.

**Current Status:** FocusBond 0.5 - Beta. Deployed on Netlify with Supabase backend. Dark mode only for MVP.

---

## Phase 1: Foundation (no backend needed) --- COMPLETED
> Goal: Scaffold the project, build the design system, and get all pages rendering with static UI.

### 1.1 --- Core CSS Design System [DONE]
Create the 3 shared CSS files that every page uses.
- `css/global.css` --- CSS reset, CSS variables (colors, spacing, fonts), body defaults, dark theme
- `css/components.css` --- `.btn`, `.input`, `.card`, `.avatar`, `.badge`, `.progress-bar`, `.emoji-display`, `.modal`
- `css/layout.css` --- `.container`, `.page-header`, `.page-content`, flex/grid utilities

### 1.2 --- JS Foundation [DONE]
Create the shared JS files.
- `js/config.js` --- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SESSION_STATES`, `PARTICIPANT_STATUS` constants
- `js/supabase.js` --- Supabase client singleton
- `js/utils/dom.js` --- DOM helpers
- `js/utils/storage.js` --- localStorage wrapper
- `js/utils/validation.js` --- Form validation (email, password match, required fields, name/username rules)
- `js/utils/time.js` --- Timer formatting, time calculations
- `js/app.js` --- Auth guard + auth state listener

### 1.3 --- Static HTML Pages (UI only, no JS logic) [DONE]
Build all 6 HTML pages with correct structure, CSS loading, and placeholder content matching the designs.
- `index.html` --- Login page
- `pages/register.html` --- Create Account page
- `pages/home.html` --- Dashboard with session requests section
- `pages/profile.html` --- Edit Profile form
- `pages/friends.html` --- Manage Friends (list, requests, add)
- `pages/add-friend.html` --- Add Friends search
- `pages/session.html` --- Session page (all states as hideable sections)

Also created page-specific CSS:
- `css/pages/auth.css`
- `css/pages/home.css`
- `css/pages/profile.css`
- `css/pages/friends.css`
- `css/pages/session.css`

**Milestone: ACHIEVED --- All pages visually match designs with static/dummy data.**

---

## Phase 2: Supabase Setup --- COMPLETED
> Goal: Create the database schema, RLS policies, and verify connectivity.

### 2.1 --- Database Schema [DONE]
Created all 5 tables in Supabase:
- `profiles` --- linked to `auth.users`
- `friends` --- friend requests with status
- `sessions` --- focus sessions
- `session_participants` --- per-user session tracking (includes `hidden` column)
- `session_requests` --- session invitations

### 2.2 --- Row Level Security (RLS) [DONE]
RLS policies for all tables:
- `profiles` --- anyone can read, only owner can update
- `friends` --- requester/receiver can read/insert, receiver can update status
- `sessions` --- participants can read, creator can update
- `session_participants` --- users can read all in their session, update only own row
- `session_requests` --- sender/receiver can read, receiver can update

### 2.3 --- Security Definer Function [DONE]
- Created `SECURITY DEFINER` function to resolve recursive RLS policy issues
- Auto-set `updated_at` on profile update via trigger

**Milestone: ACHIEVED --- Supabase project ready with tables, RLS, security definer function, and working anon key.**

---

## Phase 3: Auth Module --- COMPLETED
> Goal: Working login, register, logout, and auth guards.

### 3.1 --- Auth Service [DONE]
- `js/services/auth.js` --- `AuthService` with: `login()`, `register()`, `logout()`, `getCurrentUser()`, `getSession()`

### 3.2 --- Login Page Logic [DONE]
- `js/pages/login.js` --- Form submit -> `AuthService.login()` -> redirect to home
- Validation: required fields, error display
- If already logged in, redirect to home
- Password eye toggle for show/hide
- "FocusBond" branding on login page

### 3.3 --- Register Page Logic [DONE]
- `js/pages/register.js` --- Form submit -> `AuthService.register()` -> redirect to home
- Validation: all fields required, password match, email format, username uniqueness
- Name: letters and spaces only, max 30 characters
- Username: alphanumeric and underscore only, max 15 characters
- Back button to return to Login

### 3.4 --- Auth Guard Activation [DONE]
- `js/app.js` --- Auth guard on all protected pages (home, profile, friends, add-friend, session)
- Redirects unauthenticated users to login

**Milestone: ACHIEVED --- Users can register, login, logout. Protected pages redirect to login if not authenticated.**

---

## Phase 4: Profile Module --- COMPLETED
> Goal: Users can view and edit their profile.

### 4.1 --- User Service [DONE]
- `js/services/user.js` --- `UserService` with: `getProfile()`, `updateProfile()`

### 4.2 --- Edit Profile Page Logic [DONE]
- `js/pages/profile.js` --- Load current profile into form, handle save
- Name and username editable with validation
- Email shown as muted/non-editable
- Change password via separate in-app modal
- Back button to return to Dashboard
- Validation: name (letters/spaces, max 30), username (alphanumeric/underscore, max 15), uniqueness check

**Milestone: ACHIEVED --- Users can update their name and username, and change password via modal.**

---

## Phase 5: Friends Module --- COMPLETED
> Goal: Users can search, add, and manage friends.

### 5.1 --- Friends Service [DONE]
- `js/services/friends.js` --- `FriendsService` with: `searchByUsername()`, `sendRequest()`, `getMyFriends()`, `getPendingRequests()`, `getSentRequests()`, `acceptRequest()`, `rejectRequest()`, `cancelRequest()`, `removeFriend()`

### 5.2 --- Manage Friends Page Logic [DONE]
- `js/pages/friends.js` --- Load and render friend list, accept/reject incoming requests, cancel sent requests, remove friends

### 5.3 --- Add Friends Page Logic [DONE]
- `js/pages/addFriend.js` --- Search input with results, "Add Friend" button per result, prevent adding existing friends or self

**Milestone: ACHIEVED --- Full friend lifecycle works --- search, send request, accept/reject, cancel sent, remove friend.**

---

## Phase 6: Home / Dashboard --- COMPLETED
> Goal: Dashboard shows session requests, past sessions, and provides navigation.

### 6.1 --- Home Page Logic [DONE]
- `js/pages/home.js` --- Load and display:
  - Welcome message with user's name
  - Pending session requests from `session_requests` table
  - Accept/Reject buttons that update request status
  - Past sessions with detailed timeline (requested time, join time, leave time)
  - Green/red card borders for completed/ended sessions
  - "Manage Friends" button with notification dot for pending requests
  - "New Session" button with modern friend dropdown
  - Sticky bottom buttons with gradient fade effect
  - Avatar menu (top-right) with logout
- Header with "FocusBond 0.5 - Beta" branding
- Realtime updates for new session requests and cancellations

### 6.2 --- Dark Mode [DONE]
- Dark mode is the only theme for MVP (light mode / toggle removed)

**Milestone: ACHIEVED --- Dashboard is the main hub --- shows invites, past sessions, navigates to friends and new sessions.**

---

## Phase 7: Session Module (Core Feature) --- COMPLETED
> Goal: The full focus session lifecycle --- create, invite, wait, focus, complete.

### 7.1 --- Session Service [DONE]
- `js/services/session.js` --- `SessionService` with:
  - `createSession(durationMinutes)` --- creates session + adds creator as participant
  - `getSession(sessionId)` --- fetch session with participants
  - `updateParticipantStatus(sessionId, status)` --- update own status
  - `submitFocusTime(sessionId, focusTimeSeconds)` --- log final time
  - `subscribeToSession(sessionId, callback)` --- realtime listener
  - `unsubscribe(channel)` --- cleanup

### 7.2 --- Session Page Logic (all states in one page) [DONE]
- `js/pages/session.js` --- Manages state machine:

  **State: Waiting**
  - Show participants with status badges (Ready/Waiting)
  - Realtime updates as participants join
  - "Leave Session" button
  - Host-leaves-while-waiting: cancels session for all
  - Reject-while-waiting: participant removed, host notified

  **State: Active**
  - Green background during active session
  - Realtime timer with milliseconds (00:00:00 format)
  - Progress bar fills in real-time
  - Participant statuses via realtime subscription
  - Partner left notification with single beep sound
  - "Leave Session" with in-app confirmation modal
  - Continue/complete prompt when timer reaches target

  **State: Outcome (Left Early / Completed / Outdid)**
  - Compare actual focus time vs target duration
  - Show appropriate emoji + message + colored time
  - "Submit" saves focus time to DB
  - "Edit Time" with in-app modal (not browser native)

### 7.3 --- Session Realtime [DONE]
- Subscribe to `session_participants` changes for live status updates
- Subscribe to `session_requests` changes for cancellation detection
- Handle edge cases: partner leaves, host leaves while waiting
- Cleanup subscriptions on page unload

### 7.4 --- Start Session Flow (from Home page) [DONE]
- "New Session" button on Home -> friend dropdown -> select friend + duration -> create session + send request -> navigate to session page in Waiting state

### 7.5 --- Accept Session Flow (from Home page) [DONE]
- Accept button on session request -> join as participant -> navigate to session page in Waiting state

**Milestone: ACHIEVED --- Complete focus session flow works end-to-end with realtime updates between two users.**

---

## Phase 8: Polish & Edge Cases --- PARTIALLY COMPLETED
> Goal: Handle UX details, errors, and edge cases.

- [x] Loading states on data fetches
- [x] Empty states (no friends, no session requests)
- [x] Error display on forms
- [x] Form disable during submission (prevent double-clicks)
- [x] Navigation consistency (back buttons, header nav)
- [x] In-app confirmation modals (replace browser native dialogs)
- [x] Session edge cases: host leaves while waiting, reject while waiting, partner leaves during active
- [x] Notification dot on Manage Friends button for pending requests
- [x] Past sessions display with timeline details
- [ ] Responsive tweaks for tablet/desktop (mobile-first done)
- [ ] Error toast/notification component (using inline errors currently)
- [ ] Session timeout handling (what if user closes browser mid-session)

---

## Future Phases (Not Started)

### Phase 9: Settings & Preferences
- Settings page
- Light mode / theme toggle
- Minimum 5-min session duration enforcement (currently 1 min for testing)

### Phase 10: Analytics & History
- Session history analytics
- Focus time trends
- Streak tracking

### Phase 11: Notifications
- Push notifications for session invites
- Browser notifications

---

## Build Order Summary

| Order | Module | Status | Key Files |
|---|---|---|---|
| 1 | CSS Design System | DONE | `global.css`, `components.css`, `layout.css` |
| 2 | JS Foundation | DONE | `config.js`, `supabase.js`, `utils/*` |
| 3 | Static HTML Pages | DONE | all `.html` files + `pages/*.css` |
| 4 | Supabase Schema | DONE | 5 tables + RLS + security definer function |
| 5 | Auth Module | DONE | `services/auth.js`, `pages/login.js`, `pages/register.js` |
| 6 | Profile Module | DONE | `services/user.js`, `pages/profile.js` |
| 7 | Friends Module | DONE | `services/friends.js`, `pages/friends.js`, `pages/addFriend.js` |
| 8 | Home Dashboard | DONE | `pages/home.js` |
| 9 | Session Module | DONE | `services/session.js`, `pages/session.js` |
| 10 | Polish | PARTIAL | Across all files (most UX polish done, some items remaining) |
| 11 | Settings | NOT STARTED | Future |
| 12 | Analytics | NOT STARTED | Future |
| 13 | Notifications | NOT STARTED | Future |
