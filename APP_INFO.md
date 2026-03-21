# FocusBond - Accountability Partner App

## Overview
A web app where friends hold each other accountable through timed focus sessions. Users can add friends, invite them to sessions, and track focus performance together.

---

## Screens & Features

### 1. Login
- Fields: Username or email, Password
- Actions: Login, Navigate to Create Account

### 2. Create Account
- Fields: Name, Username, Email, Password, Re-enter Password
- Actions: Submit (register), Navigate to Login

### 3. Home / Dashboard
- Header: "FocusBond" branding + dark mode toggle
- Welcome message with user's name
- **Session Requests** section:
  - Shows incoming invitations from friends
  - Each request displays: friend avatar, name, username, session duration, invite time
  - Accept / Reject buttons per request
- "Manage Friends" button at bottom

### 4. Edit Profile
- Fields: Name, Username, Password, Re-enter Password, Email
- Action: Save

### 5. My Friends
- List of friends with avatar, name, username
- "Start Session" button next to each friend
- "+" button (top-right) to navigate to Add Friends

### 6. Add Friends
- Search field: "Enter Username"
- Results section showing matched users with avatar, name, username
- "Add Friend" button per result

---

## Session Flow (5 States)

### State 1: Waiting
- Session header: Session number, date
- Time range display (e.g., 08:00 PM - 09:00 PM)
- Progress bar (empty)
- Timer: 00:00 / target duration
- Participant list with statuses: **Ready** / **Waiting**
- Action: "Leave Session"

### State 2: Active
- Progress bar fills (green) as time passes
- Timer counts up (e.g., 00:36 / 01:00) — displayed in red when behind
- Participant statuses update: **Active** / **Left**
- Action: "Stop Session"

### State 3: Left Early (outcome)
- Emoji: Sad face
- Message: "You Left Early"
- Focus time in red vs target (e.g., 00:36 | 01:00)
- Actions: Submit, Edit Time

### State 4: Session Completed (outcome)
- Emoji: Party face
- Message: "Session Completed"
- Focus time matches target in green (e.g., 01:00 | 01:00)
- Actions: Submit, Edit Time

### State 5: Outdid Yourself (outcome)
- Emoji: Cool face
- Message: "You Outdid Yourself!"
- Focus time exceeds target in green (e.g., 01:15 | 01:00)
- Actions: Submit, Edit Time

---

## Key Design Details
- **Theme**: Dark background with purple and green accents
- **Colors**: Purple buttons (primary), Green (active/success), Red (left/failed)
- **Typography**: Clean, modern sans-serif
- **Layout**: Mobile-first, card-based UI
- **Avatars**: Circular with initial letter + color background
