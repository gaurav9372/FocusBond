# FocusBond - Accountability Partner App

## Overview
A web app where friends hold each other accountable through timed focus sessions. Users can add friends, invite them to sessions, and track focus performance together. Dark mode only for MVP. Deployed on Netlify with Supabase backend.

**Current Version:** FocusBond 0.5 - Beta

---

## Screens & Features

### 1. Login
- Fields: Email, Password
- Password eye toggle for show/hide
- "FocusBond" branding header
- Actions: Login, Navigate to Create Account
- Auto-redirects to Home if already logged in
- Validation: required fields, error display

### 2. Create Account (Register)
- Fields: Name, Username, Email, Password, Re-enter Password
- Back button to return to Login
- Validation:
  - Name: letters and spaces only, max 30 characters
  - Username: alphanumeric and underscore only, max 15 characters
  - Email format validation
  - Password match check
  - Username uniqueness check
- Actions: Submit (register), Navigate to Login

### 3. Home / Dashboard
- Header: "FocusBond 0.5 - Beta" branding
- Welcome message with user's name
- Avatar menu (top-right) with logout option
- **Session Requests** section:
  - Shows incoming invitations from friends
  - Each request displays: friend avatar, name, username, session duration, invite time
  - Accept / Reject buttons per request
  - Realtime updates for new requests and cancellations
- **Past Sessions** section:
  - Shows completed/ended sessions with detailed timeline
  - Requested time, join time, leave time displayed per session
  - Green card borders for completed sessions, red for ended early
- **New Session** button with modern friend dropdown for selecting a friend and duration
- **Manage Friends** button with notification dot indicator for pending friend requests
- Sticky bottom buttons with gradient fade effect

### 4. Edit Profile
- Fields: Name (editable), Username (editable), Email (shown as muted/non-editable)
- Back button to return to Dashboard
- Change Password modal (separate from profile form)
- Validation:
  - Name: letters and spaces only, max 30 characters
  - Username: alphanumeric and underscore only, max 15 characters
  - Username uniqueness check on save

### 5. Friends (Manage Friends)
- Tabs/sections for:
  - Friend list with avatar, name, username
  - Pending incoming requests (accept/reject)
  - Sent pending requests (cancel)
- Remove friend functionality
- Search friends by username
- Add friend by username search with "Add Friend" button per result
- Prevents adding existing friends or self

---

## Session Flow

### Creating a Session
- From Home page, click "New Session" button
- Modern dropdown appears with friend list
- Select a friend and set session duration
- Session request is sent to the selected friend

### State 1: Waiting
- Session info displayed (participants, duration)
- Participant list with statuses: **Ready** / **Waiting**
- Realtime status updates as participants join
- Action: "Leave Session"
- Host-leaves-while-waiting: session is cancelled for all participants
- Reject-while-waiting: participant removed, host notified

### State 2: Active
- Green background during active session
- Realtime timer with milliseconds display (00:00:00 format)
- Progress bar fills as time passes
- Participant statuses update via realtime: **Active** / **Left**
- Partner left notification with single beep sound
- Action: "Leave Session" with in-app confirmation modal
- When timer reaches target duration: continue/complete prompt appears

### State 3: Left Early (outcome)
- Emoji: Sad face
- Message: "You Left Early"
- Focus time in red vs target
- Edit time modal (in-app, not browser native)
- Actions: Submit, Edit Time

### State 4: Session Completed (outcome)
- Emoji: Party face
- Message: "Session Completed"
- Focus time matches target in green
- Edit time modal (in-app, not browser native)
- Actions: Submit, Edit Time

### State 5: Outdid Yourself (outcome)
- Emoji: Cool face
- Message: "You Outdid Yourself!"
- Focus time exceeds target in green
- Edit time modal (in-app, not browser native)
- Actions: Submit, Edit Time

---

## Key Design Details
- **Theme**: Dark mode only (light mode removed for MVP)
- **Colors**: Purple buttons (primary), Green (active/success), Red (left/failed)
- **Typography**: Clean, modern sans-serif (Inter / Segoe UI)
- **Layout**: Mobile-first, card-based UI
- **Avatars**: Circular with initial letter + color background
- **Modals**: In-app confirmation modals (no browser native dialogs)
- **Realtime**: Live updates for session status, friend requests, and session requests

---

## What's Remaining (Future)
- Settings page (coming soon)
- Light mode / theme toggle
- Session history analytics
- Push notifications
- Minimum 5-min session duration (currently 1 min for testing)
