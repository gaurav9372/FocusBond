# FocusBond - Project Architecture

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript (vanilla, no frameworks)
- **Backend**: Supabase (BaaS)
  - **Auth**: Supabase Auth (email/password sign up & login)
  - **Database**: Supabase PostgreSQL (5 tables, RLS policies, security definer function)
  - **Realtime**: Supabase Realtime (live session status, friend requests, session requests)
- **Styling**: Custom CSS with CSS variables for theming
- **Theme**: Dark mode only (light mode removed for MVP)
- **Supabase JS SDK**: Loaded via CDN (`@supabase/supabase-js@2`)
- **Deployment**: Netlify (frontend) + Supabase (backend)
- **Routing**: Multi-page app with relative paths (no SPA router)

---

## Folder Structure

```
FocusBond/
├── index.html                    # Login page (entry point)
├── pages/
│   ├── register.html             # Create Account
│   ├── home.html                 # Dashboard
│   ├── profile.html              # Edit Profile
│   ├── friends.html              # Manage Friends (list, requests, add)
│   ├── add-friend.html           # Add Friends (search by username)
│   └── session.html              # Session (all states)
│
├── css/
│   ├── global.css                # Reset, CSS variables, dark theme, typography
│   ├── components.css            # Reusable: buttons, inputs, cards, avatars, modals
│   ├── layout.css                # Page layout, header, containers
│   └── pages/
│       ├── auth.css              # Login + Register styles
│       ├── home.css              # Dashboard styles
│       ├── profile.css           # Edit Profile styles
│       ├── friends.css           # Friends + Add Friends styles
│       └── session.css           # Session (all states) styles
│
├── js/
│   ├── app.js                    # App init, auth guard, global state
│   ├── config.js                 # Supabase URL, anon key, constants
│   ├── supabase.js               # Supabase client init (single instance)
│   ├── services/
│   │   ├── auth.js               # Supabase Auth (login, register, logout, session)
│   │   ├── user.js               # Profile CRUD (profiles table)
│   │   ├── friends.js            # Friend requests, friend list, search (friends table)
│   │   └── session.js            # Session CRUD, realtime subscriptions (sessions + participants tables)
│   ├── pages/
│   │   ├── login.js              # Login page logic
│   │   ├── register.js           # Register page logic
│   │   ├── home.js               # Dashboard logic (session requests, past sessions, new session)
│   │   ├── profile.js            # Edit profile logic + change password modal
│   │   ├── friends.js            # Manage friends logic (list, accept/reject, cancel, remove)
│   │   ├── addFriend.js          # Search + add friend logic
│   │   └── session.js            # Timer, progress bar, state transitions, realtime
│   └── utils/
│       ├── dom.js                # DOM helpers (querySelector shortcuts)
│       ├── validation.js         # Form validation helpers
│       ├── time.js               # Timer logic, time formatting
│       └── storage.js            # localStorage wrapper
│
├── assets/
│   ├── icons/
│   │   ├── back.svg              # Back button icon
│   │   └── delete.svg            # Delete/remove icon
│   └── images/                   # (empty, reserved for future use)
│
├── APP_INFO.md                   # App features & screen documentation
├── ARCHITECTURE.md               # This file
├── BUILD_PLAN.md                 # Development phases & completion status
└── CODING_GUIDELINES.md          # Coding conventions & patterns
```

---

## File Responsibilities

### HTML Files
- Each page is a separate HTML file (multi-page app, no SPA)
- `index.html` is the login page and app entry point
- Each HTML file loads only the CSS and JS it needs
- Relative paths used for navigation between pages

### CSS Layer

| File | Purpose |
|---|---|
| `global.css` | CSS reset, CSS variables (colors, spacing, fonts), body/dark theme defaults |
| `components.css` | Reusable component styles: `.btn`, `.btn-primary`, `.input`, `.card`, `.avatar`, `.badge`, `.progress-bar`, `.modal` |
| `layout.css` | `.container`, `.page-header`, `.page-content`, flex/grid utilities |
| `pages/*.css` | Page-specific styles that don't belong in components |

### JS Layer

| Layer | Purpose | Rules |
|---|---|---|
| `supabase.js` | Supabase client singleton | Creates and exports the single `supabase` client instance |
| `services/` | Supabase queries and business logic | NEVER touches the DOM. Returns data only. Uses `supabase` client. |
| `pages/` | Page-specific UI logic | Handles DOM manipulation. Calls services for data. |
| `utils/` | Shared helper functions | Stateless, pure functions. No side effects. |
| `config.js` | Constants and configuration | Supabase URL, anon key, app-wide constants |
| `app.js` | App initialization | Auth guards, session listeners, global event listeners |

---

## CSS Variables (defined in global.css)

```css
:root {
  /* Background */
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #2a2a3e;
  --bg-input: #3a3a4e;

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-muted: #6a6a7a;

  /* Accent Colors */
  --color-purple: #8b5cf6;
  --color-purple-hover: #7c3aed;
  --color-green: #22c55e;
  --color-red: #ef4444;
  --color-yellow: #eab308;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 50%;

  /* Font */
  --font-family: 'Inter', 'Segoe UI', sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
}
```

---

## Reusable Component Classes (defined in components.css)

```
.btn                 -> Base button styles
.btn-primary         -> Purple filled button
.btn-secondary       -> Outlined/ghost button
.btn-danger          -> Red outlined button (Reject)
.btn-success         -> Green button (Accept)
.btn-block           -> Full-width button

.input               -> Styled text input
.input-group         -> Label + input wrapper

.card                -> Dark card container
.card-header         -> Card top section
.card-body           -> Card content area

.avatar              -> Circular avatar with initial
.avatar-sm/md/lg     -> Avatar sizes

.badge               -> Status badge (Ready, Active, Left, Waiting)
.badge-ready         -> Green badge
.badge-active        -> Green badge
.badge-waiting       -> Yellow badge
.badge-left          -> Red badge

.progress-bar        -> Session progress bar container
.progress-fill       -> Inner fill element (width set via JS)

.emoji-display       -> Large centered emoji for session outcomes

.modal               -> In-app modal overlay (confirmation, edit time, change password)
```

---

## Page -> File Mapping

| Page | HTML | CSS | JS (page) | JS (services) |
|---|---|---|---|---|
| Login | `index.html` | `auth.css` | `login.js` | `auth.js` |
| Register | `register.html` | `auth.css` | `register.js` | `auth.js` |
| Home | `home.html` | `home.css` | `home.js` | `session.js`, `friends.js`, `auth.js` |
| Edit Profile | `profile.html` | `profile.css` | `profile.js` | `user.js`, `auth.js` |
| Manage Friends | `friends.html` | `friends.css` | `friends.js` | `friends.js` (service) |
| Add Friends | `add-friend.html` | `friends.css` | `addFriend.js` | `friends.js` (service) |
| Session | `session.html` | `session.css` | `session.js` | `session.js` (service) |

---

## Data Flow Pattern

```
User Action -> pages/*.js (DOM event handler)
                  |
            services/*.js (Supabase query)
                  |
            supabase.js (client instance)
                  |
            Supabase (Auth / Database / Realtime)
                  |
            Response -> pages/*.js (update DOM)
```

### Realtime Flow (Sessions & Requests)
```
supabase.channel('session:123')
  .on('postgres_changes', { table: 'session_participants' }, callback)
  .subscribe()
        |
  Participant status changes in DB
        |
  Realtime event fires -> pages/session.js updates DOM

supabase.channel('home-requests')
  .on('postgres_changes', { table: 'session_requests' }, callback)
  .subscribe()
        |
  New request / cancellation in DB
        |
  Realtime event fires -> pages/home.js updates request list
```

---

## Supabase Configuration

### Client Init (js/supabase.js)
```javascript
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```
- Single instance, imported by all services
- Loaded via CDN in every HTML file before other JS

### HTML Script Loading Order
```html
<!-- Supabase CDN -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- App JS -->
<script src="/js/config.js"></script>
<script src="/js/supabase.js"></script>
<script src="/js/utils/[needed-utils].js"></script>
<script src="/js/services/[needed-services].js"></script>
<script src="/js/app.js"></script>
<script src="/js/pages/[page].js"></script>
```

---

## Supabase Database Schema

### profiles
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | References `auth.users.id` |
| `name` | text | Display name |
| `username` | text (unique) | Unique handle for friend search |
| `email` | text | User email |
| `avatar_color` | text | Hex color for avatar circle |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set on update |

### friends
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `requester_id` | uuid (FK) | Who sent the request -> profiles.id |
| `receiver_id` | uuid (FK) | Who received it -> profiles.id |
| `status` | text | `pending`, `accepted`, `rejected` |
| `created_at` | timestamptz | Auto-set |

### sessions
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `created_by` | uuid (FK) | Who started the session -> profiles.id |
| `duration_minutes` | integer | Target duration (e.g., 60) |
| `status` | text | `waiting`, `active`, `completed` |
| `started_at` | timestamptz | When session became active |
| `ended_at` | timestamptz | When session ended |
| `created_at` | timestamptz | Auto-set |

### session_participants
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `session_id` | uuid (FK) | -> sessions.id |
| `user_id` | uuid (FK) | -> profiles.id |
| `status` | text | `waiting`, `ready`, `active`, `left` |
| `focus_time_seconds` | integer | Actual focus time logged |
| `joined_at` | timestamptz | When they joined |
| `left_at` | timestamptz | When they left/finished |
| `hidden` | boolean | Whether to hide from past sessions list |

### session_requests
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `session_id` | uuid (FK) | -> sessions.id |
| `sender_id` | uuid (FK) | Who invited -> profiles.id |
| `receiver_id` | uuid (FK) | Who was invited -> profiles.id |
| `duration_minutes` | integer | Proposed duration |
| `status` | text | `pending`, `accepted`, `rejected` |
| `created_at` | timestamptz | Invite timestamp |

---

## Supabase Row Level Security (RLS) Summary

| Table | Policy |
|---|---|
| `profiles` | Users can read any profile, update only their own |
| `friends` | Users can read/insert where they are requester or receiver |
| `sessions` | Participants can read; creator can update |
| `session_participants` | Users can read/update their own participant row |
| `session_requests` | Sender/receiver can read; receiver can update status |

### Security Definer Function
A `SECURITY DEFINER` function exists in Supabase to resolve recursive RLS policy issues. This function runs with elevated privileges to avoid infinite recursion when RLS policies on one table need to query another RLS-protected table.

---

## Supabase Auth Flow

| Action | Supabase Method |
|---|---|
| Register | `supabase.auth.signUp({ email, password })` + insert into `profiles` |
| Login | `supabase.auth.signInWithPassword({ email, password })` |
| Logout | `supabase.auth.signOut()` |
| Get current user | `supabase.auth.getUser()` |
| Auth state change | `supabase.auth.onAuthStateChange(callback)` |
| Auth guard | Redirect to login if no active session |
| Change password | `supabase.auth.updateUser({ password })` |

---

## localStorage Keys (managed by utils/storage.js)

> **Note:** Auth tokens are managed automatically by Supabase SDK (stored in localStorage internally). Do NOT manually manage auth tokens. The app currently uses dark mode only, so no theme preference is stored.
