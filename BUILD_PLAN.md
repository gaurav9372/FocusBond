# FocusBond - Development Build Plan

## Current Status
**FocusBond 0.5 - Beta** is live on Netlify + Supabase.  
Core accountability/session flow is complete for MVP, with UI placeholder pages for Report and Notifications.

---

## Phase Status Snapshot

### Phase 1 - Foundation
**Status:** DONE
- Shared CSS system (`global.css`, `components.css`, `layout.css`)
- JS foundation (`config.js`, `supabase.js`, `utils/*`, `app.js`)
- Multi-page scaffold

### Phase 2 - Supabase Setup
**Status:** DONE
- Base tables: `profiles`, `friends`, `sessions`, `session_participants`, `session_requests`
- RLS policies + realtime publication
- Production patches applied:
  - `session_participants.hidden`
  - `session_requests.status` includes `cancelled`
  - policy updates for sender cancel/delete
  - security definer helpers: `is_session_participant`, `get_login_email`

### Phase 3 - Auth Module
**Status:** DONE
- Register/login/logout/auth guard implemented
- Login supports **username or email** + password

### Phase 4 - Profile Module
**Status:** DONE
- Edit profile (name/username)
- Change password modal

### Phase 5 - Friends Module
**Status:** DONE
- Search/add/cancel/accept/reject/remove flows implemented

### Phase 6 - Home Dashboard
**Status:** DONE
- Incoming session requests
- Past session timeline cards
- New session modal + creation flow
- Avatar menu/logout

### Phase 7 - Session Module
**Status:** DONE
- Waiting/active/outcome lifecycle
- Realtime participant updates
- Edge-case handling (host leaves, reject while waiting, partner leaves)

### Phase 8 - Polish & Navigation
**Status:** PARTIAL
- Done:
  - Bottom tab bar on 4 main pages (Home, Friends, Report, Notifications)
  - Separate Home `+ New Session` CTA above tab bar
  - Active tab states per page
  - Report/Notifications placeholders marked "Coming soon"
- Remaining:
  - Additional responsive tuning
  - Additional visual polish and consistency pass
  - Session timeout/recovery edge-case hardening

---

## Current Page Inventory

- `index.html` (Login)
- `pages/register.html`
- `pages/home.html`
- `pages/profile.html`
- `pages/friends.html`
- `pages/add-friend.html`
- `pages/session.html`
- `pages/report.html` (coming soon)
- `pages/notifications.html` (coming soon)

---

## Future Phases

### Phase 9 - Settings & Preferences
- Real settings page
- Theme options (if reintroduced)
- Session default preferences

### Phase 10 - Analytics
- Report page implementation (charts/trends/streak)

### Phase 11 - Notifications
- Real in-app notification feed
- Browser/push notifications (future backend work)

---

## Build Order Summary

| Order | Module | Status |
|---|---|---|
| 1 | Foundation | DONE |
| 2 | Supabase Schema/RLS | DONE |
| 3 | Auth | DONE |
| 4 | Profile | DONE |
| 5 | Friends | DONE |
| 6 | Home Dashboard | DONE |
| 7 | Session Lifecycle | DONE |
| 8 | Polish + Nav | PARTIAL |
| 9 | Settings | NOT STARTED |
| 10 | Analytics | NOT STARTED |
| 11 | Notifications | NOT STARTED |
