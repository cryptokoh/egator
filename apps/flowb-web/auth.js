// ===== FlowB Auth System =====
// Login via DANZ (Privy) with localStorage session persistence

const AUTH_KEY = 'flowb-auth';
const DANZ_URL = 'https://danz.now';

// State
const Auth = {
  user: null,
  isAuthenticated: false,
};

// ===== Init =====

function initAuth() {
  // Check stored session
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      Auth.user = JSON.parse(stored);
      Auth.isAuthenticated = true;
      renderAuthState();
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  // Check for callback token in URL (from DANZ redirect)
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const username = params.get('username');
  if (token && username) {
    handleAuthCallback(token, username);
    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('username');
    window.history.replaceState({}, '', url.toString());
  }

  // Wire up buttons
  document.getElementById('authBtn')?.addEventListener('click', showLoginModal);
  document.getElementById('loginClose')?.addEventListener('click', hideLoginModal);
  document.getElementById('loginBackdrop')?.addEventListener('click', hideLoginModal);
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  document.getElementById('userAvatar')?.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.toggle('hidden');
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (menu && dropdown && !menu.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // Wallet button
  document.getElementById('loginWalletBtn')?.addEventListener('click', () => {
    // Open DANZ login with wallet option
    window.open(`${DANZ_URL}/login?redirectTo=${encodeURIComponent(window.location.origin)}`, '_blank');
    hideLoginModal();
  });

  renderAuthState();
}

// ===== Auth Callback =====

function handleAuthCallback(token, username) {
  Auth.user = {
    username,
    token,
    loginAt: Date.now(),
  };
  Auth.isAuthenticated = true;
  localStorage.setItem(AUTH_KEY, JSON.stringify(Auth.user));

  // Award first login bonus
  if (typeof awardFirstAction === 'function') {
    awardFirstAction('first_login', 10, 'First login bonus!');
  }

  // Transfer anon points to user account
  const anonId = localStorage.getItem('flowb-anon-id');
  if (anonId && typeof Points !== 'undefined' && Points.total > 0) {
    // Points already in localStorage, they persist
    console.log(`[auth] Linked ${Points.total} anon points to ${username}`);
  }

  renderAuthState();
}

// ===== Login Modal =====

function showLoginModal() {
  document.getElementById('loginModal')?.classList.remove('hidden');
}

function hideLoginModal() {
  document.getElementById('loginModal')?.classList.add('hidden');
}

// ===== Logout =====

function logout() {
  Auth.user = null;
  Auth.isAuthenticated = false;
  localStorage.removeItem(AUTH_KEY);
  document.getElementById('userDropdown')?.classList.add('hidden');
  renderAuthState();
}

// ===== Render =====

function renderAuthState() {
  const authBtn = document.getElementById('authBtn');
  const userMenu = document.getElementById('userMenu');
  const userAvatar = document.getElementById('userAvatar');
  const userDropdownHeader = document.getElementById('userDropdownHeader');

  if (Auth.isAuthenticated && Auth.user) {
    authBtn?.classList.add('hidden');
    userMenu?.classList.remove('hidden');

    // Avatar
    const initial = (Auth.user.username || '?')[0].toUpperCase();
    if (userAvatar) userAvatar.textContent = initial;

    // Dropdown header
    if (userDropdownHeader) {
      userDropdownHeader.innerHTML = `
        <div style="font-weight:600;font-size:0.85rem">${escapeHtml(Auth.user.username)}</div>
        <div style="font-size:0.7rem;color:var(--text-dim)">Connected via DANZ</div>`;
    }
  } else {
    authBtn?.classList.remove('hidden');
    userMenu?.classList.add('hidden');
  }
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Init
initAuth();
