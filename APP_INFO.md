# FocusBond - Accountability Partner App

## Overview
A web app where two friends hold each other accountable through timed focus sessions.

- Dark mode only (MVP)
- Frontend: HTML/CSS/JS (multi-page app)
- Backend: Supabase Auth + Postgres + Realtime
- Deployment: Netlify + Supabase

**Current Version:** FocusBond 0.5 - Beta

---

## Screens & Features

### 1. Login
- Fields: **Username or Email**, Password
- Password eye toggle for show/hide
- Actions: Login, navigate to Create Account
- Validation: required fields, error toast
- If already authenticated, auto-redirect to Home

### 2. Create Account (Register)
- Fields: Name, Username, Email, Password, Re-enter Password
- Validation:
  - Name: letters/spaces/hyphen/apostrophe, max 30
  - Username: lowercase letters, numbers, underscore, max 15
  - Email format validation
  - Password match + min length
  - Username uniqueness check
- Back/Login navigation

### 3. Home / Dashboard
- Header branding + avatar menu (Edit Profile, Settings placeholder, Logout)
- Incoming Session Requests (accept/reject, realtime updates)
- Past Sessions timeline cards (completed / left / cancelled / rejected outcomes)
- New Session modal with friend picker and duration
- Separate **New Session CTA button** above tab bar
- Bottom tab bar navigation (Home / Report / Friends / Notifications)
- Friend request notification dot on Manage Friends CTA

### 4. Edit Profile
- Editable: Name, Username
- Read-only: Email
- Change Password modal

### 5. Friends (Manage Friends)
- Friend list
- Incoming requests accept/reject
- Remove friend
- Top-right plus button to open Add Friends page
- Bottom tab bar visible on this page

### 6. Add Friends
- Search by username
- Add Friend / Cancel pending / already-friends status
- No bottom tab bar on this page (focused sub-flow)

### 7. Session
- Waiting, Active, and Outcome states in one page
- Realtime participant updates and session request updates
- Timer + progress bar + leave/stop handling
- Outcome summary with submit/edit-time flow
- No bottom tab bar on this page (focused session flow)

### 8. Report
- Placeholder page: **Coming soon**
- Bottom tab bar visible

### 9. Notifications
- Placeholder page: **Coming soon**
- Bottom tab bar visible

---

## Primary Navigation Rules

- Bottom tab bar appears only on:
  - `home.html`
  - `friends.html`
  - `report.html`
  - `notifications.html`
- Bottom tab bar is hidden on:
  - `profile.html`
  - `add-friend.html`
  - `session.html`
- Home includes a separate centered `+ New Session` action button above the tab bar.

---

## Session Flow Summary

### Create Session
1. Open New Session modal from Home
2. Pick friend + duration
3. Send request and enter waiting session

### Waiting State
- Shows participants and invite targets
- Realtime status updates
- Host can cancel by leaving

### Active State
- Live timer (`MM:SS:CS`) + progress bar
- Partner-left realtime alert + beep
- Continue/complete prompt when target reached

### Outcome State
- Left Early / Completed / Outdid Yourself
- Submit focus time or edit before submit

---

## Current MVP Notes

- Dark mode only
- Settings page not implemented (menu placeholder)
- Report page is placeholder
- Notifications page is placeholder
- Push/browser notifications are future scope
