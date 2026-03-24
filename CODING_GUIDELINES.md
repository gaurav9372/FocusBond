# FocusBond - Coding Guidelines

## General Rules
1. One file, one responsibility.
2. Keep styling in CSS files (avoid inline styles except rare dynamic color cases like avatar color chips).
3. Keep logic in JS files (no inline JS in HTML).
4. Use semantic HTML.
5. Mobile-first, then scale up.

---

## HTML Conventions
- Use `data-*` attributes for JS hooks where useful.
- Use classes for styling.
- Use IDs for unique page-level elements.
- Keep script order consistent:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/js/config.js"></script>
<script src="/js/supabase.js"></script>
<script src="/js/utils/[...].js"></script>
<script src="/js/services/[...].js"></script>
<script src="/js/app.js"></script>
<script src="/js/pages/[page].js"></script>
```

---

## CSS Conventions
- Reuse tokens from `global.css` (`--spacing-*`, `--radius-*`, `--color-*`).
- Keep reusable UI primitives in `components.css`.
- Keep page-specific overrides in `css/pages/*`.
- Place media queries near the end of each page stylesheet.

---

## JavaScript Conventions

### Supabase Client
Use the shared singleton from `js/supabase.js`:

```javascript
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Services Layer (`js/services/*`)
- No DOM access in services.
- Return `{ data, error }` (or `{ error }`) consistently.
- Keep business logic close to the query.
- Use helper methods for shared behavior (example: login email resolver).

Current login pattern:
- `AuthService.login(identifier, password)` supports username/email.
- Username path resolves via RPC `get_login_email`.

### Pages Layer (`js/pages/*`)
- Wrap page bootstrapping in `DOMContentLoaded`.
- Read/write DOM here only.
- Show user-facing errors via toast/inline messages.
- Disable submit buttons during async actions.

### Utils Layer (`js/utils/*`)
- Keep utilities pure where possible.
- Group by domain (`time`, `validation`, `dom`, `storage`).

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| HTML files | kebab-case | `add-friend.html` |
| CSS files | kebab-case | `home.css` |
| JS files | camelCase | `addFriend.js` |
| CSS classes | kebab-case/BEM-like | `.bottom-nav__item` |
| JS variables | camelCase | `selectedFriendId` |
| Service objects | PascalCase | `AuthService` |
| Utility objects | PascalCase | `TimeUtils` |

---

## Error Handling Pattern

Service:
```javascript
const { data, error } = await db.from('table').select('*');
return { data, error };
```

Page:
```javascript
const { data, error } = await SomeService.doThing();
if (error) {
  Dom.showToast(error.message || 'Something went wrong');
  return;
}
```

---

## Auth Guard Pattern (`js/app.js`)
- Protect private pages via `db.auth.getSession()`.
- Redirect unauthenticated users to login.
- Handle `SIGNED_OUT` auth event and redirect to login.

---

## Realtime Cleanup Pattern
Always unsubscribe channels on unload:

```javascript
window.addEventListener('beforeunload', () => {
  SessionService.unsubscribe(channel);
});
```

---

## Navigation/UI Rules
- Bottom tab bar belongs only on main tab pages:
  - Home, Friends, Report, Notifications
- No bottom tab bar on focused sub-flows:
  - Profile, Add Friends, Session
- Home owns the `+ New Session` CTA above tab bar.
