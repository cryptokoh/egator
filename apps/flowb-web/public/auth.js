// ===== FlowB Auth System =====
// Login via Privy with localStorage session persistence

const AUTH_KEY = 'flowb-auth';

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

  // Listen for Privy auth state changes
  window.addEventListener('privy-auth-change', (e) => {
    const { authenticated, user } = e.detail;

    if (authenticated && user) {
      handlePrivyLogin(user);
    } else if (!authenticated && Auth.isAuthenticated) {
      // User logged out via Privy
      logout();
    }
  });

  // Wire up buttons
  document.getElementById('authBtn')?.addEventListener('click', () => {
    if (window.flowbPrivy) {
      window.flowbPrivy.login();
    }
  });
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (window.flowbPrivy) {
      window.flowbPrivy.logout();
    }
    logout();
  });

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

  renderAuthState();
}

// ===== Privy Login Handler =====

function handlePrivyLogin(user) {
  Auth.user = {
    id: user.id,
    username: user.displayName,
    wallet: user.wallet,
    email: user.email,
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
    console.log(`[auth] Linked ${Points.total} anon points to ${user.displayName}`);
  }

  renderAuthState();
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
        <div style="font-size:0.7rem;color:var(--text-dim)">Connected via Privy</div>`;
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
