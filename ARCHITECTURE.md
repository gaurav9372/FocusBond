# FocusBond - Project Architecture

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Supabase
  - Auth: email/password auth (login supports username or email via resolver RPC)
  - Database: PostgreSQL with RLS
  - Realtime: `session_participants` + `session_requests`
- **Theme:** Dark-only (MVP)
- **Routing:** Multi-page app (no SPA router)
- **Deploy:** Netlify (frontend) + Supabase (backend)

---

## Folder Structure

```text
FocusBond/
├── index.html
├── pages/
│   ├── register.html
│   ├── home.html
│   ├── profile.html
│   ├── friends.html
│   ├── add-friend.html
│   ├── session.html
│   ├── report.html
│   └── notifications.html
├── css/
│   ├── global.css
│   ├── components.css
│   ├── layout.css
│   └── pages/
│       ├── auth.css
│       ├── home.css
│       ├── profile.css
│       ├── friends.css
│       └── session.css
├── js/
│   ├── app.js
│   ├── config.js
│   ├── supabase.js
│   ├── services/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── friends.js
│   │   └── session.js
│   ├── pages/
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── home.js
│   │   ├── profile.js
│   │   ├── friends.js
│   │   ├── addFriend.js
│   │   └── session.js
│   └── utils/
│       ├── dom.js
│       ├── validation.js
│       ├── time.js
│       └── storage.js
├── assets/
│   └── icons/
│       ├── back.svg
│       ├── delete.svg
│       ├── Frame.svg
│       ├── Frame-1.svg
│       ├── Frame-2.svg
│       ├── Frame-3.svg
│       └── plus.svg
├── APP_INFO.md
├── ARCHITECTURE.md
├── BUILD_PLAN.md
└── CODING_GUIDELINES.md
```

---

## JS Architecture

### Client Singleton
`js/supabase.js` creates one shared client:

```javascript
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Layer Responsibilities
- `services/*`: Supabase calls + business logic (no DOM updates)
- `pages/*`: DOM rendering and event handlers
- `utils/*`: shared helpers
- `app.js`: auth guard + global listeners

### Data Flow

```text
User action -> js/pages/* -> js/services/* -> db (Supabase client) -> Supabase
                                                    |
                                            response payload
                                                    |
                                          js/pages/* updates DOM
```

---

## Page Mapping

| Page | HTML | CSS | JS |
|---|---|---|---|
| Login | `index.html` | `auth.css` | `pages/login.js` |
| Register | `pages/register.html` | `auth.css` | `pages/register.js` |
| Home | `pages/home.html` | `home.css` | `pages/home.js` |
| Profile | `pages/profile.html` | `profile.css` | `pages/profile.js` |
| Friends | `pages/friends.html` | `friends.css` | `pages/friends.js` |
| Add Friends | `pages/add-friend.html` | `friends.css` | `pages/addFriend.js` |
| Session | `pages/session.html` | `session.css` | `pages/session.js` |
| Report | `pages/report.html` | `layout.css` | none (placeholder) |
| Notifications | `pages/notifications.html` | `layout.css` | none (placeholder) |

---

## Navigation Model

- Bottom tab bar is shown only on:
  - Home
  - Friends
  - Report
  - Notifications
- Bottom tab bar is hidden on:
  - Profile
  - Add Friends
  - Session
- Home has a separate `+ New Session` action button above the tab bar.

---

## Supabase Schema (Current)

### `profiles`
- `id`, `name`, `username` (unique), `email`, `avatar_color`, `created_at`, `updated_at`

### `friends`
- `requester_id`, `receiver_id`, `status` (`pending|accepted|rejected`)

### `sessions`
- `created_by`, `duration_minutes`, `status` (`waiting|active|completed`), `started_at`, `ended_at`

### `session_participants`
- `session_id`, `user_id`, `status` (`waiting|ready|active|left`), `focus_time_seconds`, `joined_at`, `left_at`, `hidden`

### `session_requests`
- `session_id`, `sender_id`, `receiver_id`, `duration_minutes`, `status` (`pending|accepted|rejected|cancelled`)

---

## RLS and Security Definer Functions

### RLS Notes
- `session_requests` allows:
  - sender/receiver read
  - sender insert
  - receiver update
  - sender cancel update (`status='cancelled'`)
  - sender/receiver delete

### Security Definer Functions in use
- `public.is_session_participant(uuid)` for participant membership checks in policies
- `public.get_login_email(text)` for username/email login resolution

---

## Auth Flow

### Register
1. `supabase.auth.signUp({ email, password })`
2. Insert into `profiles`

### Login
1. User enters identifier (`username` or `email`) + password
2. `AuthService.resolveLoginEmail(identifier)`:
   - if email -> use directly
   - if username -> RPC `get_login_email`
3. `supabase.auth.signInWithPassword({ email: resolvedEmail, password })`

### Logout
- `supabase.auth.signOut()`

---

## Realtime

- Session page subscribes to:
  - `session_participants` for live participant status
  - `session_requests` for invite status updates/cancellations
- Home page subscribes to:
  - `session_requests` (incoming request changes)

---

## localStorage

- App uses `utils/storage.js` wrapper for app-level keys.
- Supabase SDK manages auth token storage internally.
