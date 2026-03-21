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
const PUBLIC_PAGES = ['index.html', 'register.html'];

// Auth guard — redirect to login if not authenticated
async function authGuard() {
  const currentPath = window.location.pathname;
  const isPublicPage = PUBLIC_PAGES.some(p => currentPath.endsWith(p));

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

// Listen for auth state changes
db.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    const currentPath = window.location.pathname;
    const isPublicPage = PUBLIC_PAGES.some(p => currentPath.endsWith(p));
    if (!isPublicPage) {
      window.location.href = resolveAppPath('index.html');
    }
  }
});

// Apply saved theme on load
(function applyTheme() {
  const theme = Storage.get('fb_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();

// Run auth guard on DOMContentLoaded
document.addEventListener('DOMContentLoaded', authGuard);
