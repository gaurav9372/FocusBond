/* ===========================
   FocusBond — App Init
   =========================== */

// Resolve a path relative to project root regardless of current page location
function resolveAppPath(path) {
  const currentPath = window.location.pathname;
  const inPagesDir = currentPath.includes('/pages/');
  if (path.startsWith('/')) path = path.substring(1);
  return inPagesDir ? '../' + path : './' + path;
}

// Pages that don't require authentication
const PUBLIC_PAGES = ['index.html', 'register.html', 'index', 'register', '/'];

// Auth guard — redirect to login if not authenticated
async function authGuard() {
  const currentPath = window.location.pathname;
  const isPublicPage = PUBLIC_PAGES.some(p => currentPath.endsWith(p)) || currentPath === '/';

  if (isPublicPage) return;

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = resolveAppPath('index.html');
  }
}

// Redirect to home if already logged in (for login/register pages)
async function redirectIfLoggedIn() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    window.location.href = resolveAppPath('pages/home.html');
  }
}

// Track if user was ever signed in this page load
let wasSignedIn = false;

// Listen for auth state changes
db.auth.onAuthStateChange((event, session) => {
  if (session) {
    wasSignedIn = true;
  }
  // Only redirect on SIGNED_OUT if user was previously signed in (actual logout)
  if (event === 'SIGNED_OUT' && wasSignedIn) {
    window.location.href = resolveAppPath('index.html');
  }
});

// Apply saved theme on load
(function applyTheme() {
  const theme = Storage.get('fb_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();

// Password eye toggle
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.eye-toggle');
  if (!btn) return;
  const targetId = btn.getAttribute('data-target');
  const input = document.getElementById(targetId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.querySelector('.eye-open').style.display = isPassword ? 'none' : '';
  btn.querySelector('.eye-closed').style.display = isPassword ? '' : 'none';
});

// Run auth guard on DOMContentLoaded
document.addEventListener('DOMContentLoaded', authGuard);
