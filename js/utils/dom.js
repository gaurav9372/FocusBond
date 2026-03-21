/* ===========================
   FocusBond — DOM Utilities
   =========================== */

const Dom = {
  // Query shortcuts
  get(selector) {
    return document.querySelector(selector);
  },

  getAll(selector) {
    return document.querySelectorAll(selector);
  },

  getById(id) {
    return document.getElementById(id);
  },

  // Show/hide elements
  show(el) {
    if (el) el.classList.remove('hidden');
  },

  hide(el) {
    if (el) el.classList.add('hidden');
  },

  toggle(el, show) {
    if (el) el.classList.toggle('hidden', !show);
  },

  // Create element with attributes and children
  create(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'textContent') {
        el.textContent = value;
      } else if (key === 'innerHTML') {
        el.innerHTML = value;
      } else if (key.startsWith('data')) {
        el.setAttribute(`data-${key.slice(4).toLowerCase()}`, value);
      } else {
        el.setAttribute(key, value);
      }
    }
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child) {
        el.appendChild(child);
      }
    });
    return el;
  },

  // Clear all children
  clear(el) {
    if (el) el.innerHTML = '';
  },

  // Show toast notification
  showToast(message, type = 'error') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  },

  // Build an avatar element
  buildAvatar(name, color, size = 'md') {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const el = document.createElement('div');
    el.className = `avatar avatar-${size}`;
    el.style.backgroundColor = color || '#8b5cf6';
    el.textContent = initial;
    return el;
  },

  // Build a user row (friend, participant, search result)
  buildUserRow(user, actionEl) {
    const row = document.createElement('div');
    row.className = 'user-row';

    const avatar = this.buildAvatar(user.name, user.avatar_color);
    const info = document.createElement('div');
    info.className = 'user-row__info';
    info.innerHTML = `
      <div class="user-row__name">${user.name || 'Unknown'}</div>
      <div class="user-row__username">${user.username || ''}</div>
    `;

    row.appendChild(avatar);
    row.appendChild(info);

    if (actionEl) {
      const actionWrap = document.createElement('div');
      actionWrap.className = 'user-row__action';
      actionWrap.appendChild(actionEl);
      row.appendChild(actionWrap);
    }

    return row;
  }
};
