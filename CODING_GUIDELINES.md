# FocusBond - Coding Guidelines

## General Rules

1. **One file, one responsibility** — never mix page logic across files
2. **No inline styles** — all styling goes in CSS files
3. **No inline JS** — all logic goes in JS files, loaded via `<script>` tags
4. **Semantic HTML** — use proper tags (`<form>`, `<button>`, `<header>`, `<main>`, `<section>`)
5. **Mobile-first** — design for 375px width, scale up

---

## HTML Conventions

- Use `data-*` attributes for JS hooks (not classes)
  ```html
  <button data-action="accept-request" data-id="123">Accept</button>
  ```
- Use classes only for styling
- IDs for unique page-level elements only (`#loginForm`, `#sessionTimer`)
- Each page loads CSS/JS in this order:
  ```html
  <!-- CSS -->
  <link rel="stylesheet" href="/css/global.css">
  <link rel="stylesheet" href="/css/components.css">
  <link rel="stylesheet" href="/css/layout.css">
  <link rel="stylesheet" href="/css/pages/[page].css">

  <!-- Supabase CDN (always first) -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <!-- JS (at end of body) -->
  <script src="/js/config.js"></script>
  <script src="/js/supabase.js"></script>
  <script src="/js/utils/[needed-utils].js"></script>
  <script src="/js/services/[needed-services].js"></script>
  <script src="/js/app.js"></script>
  <script src="/js/pages/[page].js"></script>
  ```

---

## CSS Conventions

- Use CSS variables from `global.css` — never hardcode colors or spacing
  ```css
  /* GOOD */
  background: var(--bg-card);
  padding: var(--spacing-md);

  /* BAD */
  background: #2a2a3e;
  padding: 16px;
  ```
- BEM-like naming for page-specific styles:
  ```css
  .session-timer { }
  .session-timer__display { }
  .session-timer--active { }
  ```
- Component classes in `components.css` use flat naming: `.btn`, `.btn-primary`, `.card`
- Media queries at the bottom of each page CSS file

---

## JavaScript Conventions

### Supabase Client (js/supabase.js)
```javascript
// supabase.js — SINGLETON PATTERN
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```
- One file, one instance — all services import from here
- Never create a second client

### Services (js/services/)
```javascript
// services/auth.js — EXAMPLE PATTERN

const AuthService = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async register({ email, password, name, username }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Create profile row after signup
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, name, username, email });
    if (profileError) throw profileError;

    return data;
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};
```

```javascript
// services/friends.js — EXAMPLE PATTERN

const FriendsService = {
  async searchByUsername(username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_color')
      .ilike('username', `%${username}%`);
    if (error) throw error;
    return data;
  },

  async sendRequest(receiverId) {
    const user = await AuthService.getCurrentUser();
    const { error } = await supabase
      .from('friends')
      .insert({ requester_id: user.id, receiver_id: receiverId, status: 'pending' });
    if (error) throw error;
  },

  async getMyFriends() {
    const user = await AuthService.getCurrentUser();
    const { data, error } = await supabase
      .from('friends')
      .select('*, requester:profiles!requester_id(*), receiver:profiles!receiver_id(*)')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted');
    if (error) throw error;
    return data;
  }
};
```

```javascript
// services/session.js — REALTIME EXAMPLE PATTERN

const SessionService = {
  subscribeToSession(sessionId, onUpdate) {
    return supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` },
        (payload) => onUpdate(payload)
      )
      .subscribe();
  },

  unsubscribe(channel) {
    supabase.removeChannel(channel);
  }
};
```

**Rules:**
- Services are plain objects with methods (not classes)
- Services NEVER touch the DOM
- Services return data or throw errors
- All queries go through the `supabase` client (never raw fetch)
- Always destructure `{ data, error }` from Supabase calls
- Always check and throw `error` before using `data`

### Pages (js/pages/)
```javascript
// pages/login.js — EXAMPLE PATTERN

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('[data-field="email"]').value;
    const password = form.querySelector('[data-field="password"]').value;

    try {
      const result = await AuthService.login(email, password);
      Storage.set('fb_token', result.token);
      window.location.href = '/pages/home.html';
    } catch (error) {
      showError(error.message);
    }
  });
});
```

**Rules:**
- All page logic wrapped in `DOMContentLoaded`
- Use `data-*` attributes to query elements
- Call services for data, handle DOM updates in page file
- Handle errors with user-facing messages

### Utils (js/utils/)
```javascript
// utils/time.js — EXAMPLE PATTERN

const TimeUtils = {
  formatTimer(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  },

  parseMinutes(str) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  }
};
```

**Rules:**
- Utils are pure functions — no side effects, no DOM, no API calls
- Grouped by domain: `time.js`, `validation.js`, `dom.js`, `storage.js`

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| HTML files | kebab-case | `add-friend.html` |
| CSS files | kebab-case | `global.css` |
| JS files | camelCase | `addFriend.js` |
| CSS classes | kebab-case / BEM | `.btn-primary`, `.session-timer__display` |
| JS variables | camelCase | `sessionTimer`, `friendList` |
| JS constants | UPPER_SNAKE | `API_BASE_URL`, `MAX_SESSION_DURATION` |
| JS service objects | PascalCase | `AuthService`, `SessionService` |
| JS util objects | PascalCase | `TimeUtils`, `Storage` |
| data attributes | kebab-case | `data-session-id`, `data-action` |
| localStorage keys | snake_prefix | `fb_token`, `fb_user` |

---

## Error Handling Pattern

```javascript
// In services — always check Supabase error:
async getSomething() {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  return data;
}

// In page files — catch and display:
try {
  const data = await SomeService.doThing();
  // update DOM with data
} catch (error) {
  showError(error.message);
}
```

---

## Auth Guard Pattern (js/app.js)

```javascript
// Redirect to login if not authenticated (use on protected pages)
async function authGuard() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/index.html';
  }
}

// Listen for auth state changes (logout from another tab, token expiry)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = '/index.html';
  }
});
```

---

## Realtime Cleanup Pattern

```javascript
// Always unsubscribe when leaving a page or session
let sessionChannel = null;

function startListening(sessionId) {
  sessionChannel = SessionService.subscribeToSession(sessionId, handleUpdate);
}

function stopListening() {
  if (sessionChannel) {
    SessionService.unsubscribe(sessionChannel);
    sessionChannel = null;
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopListening);
```

---

## Session States Reference

Use these constants in `config.js`:

```javascript
const SESSION_STATES = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  LEFT_EARLY: 'left_early',
  COMPLETED: 'completed',
  OUTDID: 'outdid'
};

const PARTICIPANT_STATUS = {
  WAITING: 'waiting',
  READY: 'ready',
  ACTIVE: 'active',
  LEFT: 'left'
};
```
