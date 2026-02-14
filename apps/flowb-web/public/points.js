// ===== FlowB Points System (Vanilla JS) =====
// Ported from apps/web/src/components/gamification/

const STORAGE_KEY = 'flowb-points';
const ANON_ID_KEY = 'flowb-anon-id';
const MILESTONE_KEY = 'flowb-milestone-level';
const CLAIM_DISMISSED_KEY = 'flowb-claim-dismissed';
const STREAK_KEY = 'flowb-streak';
const LAST_ACTIVE_KEY = 'flowb-last-active';
const REF_CODE_KEY = 'flowb-ref-code';
const FIRST_ACTIONS_KEY = 'flowb-first-actions';

const MILESTONES = [
  { points: 25,  level: 1, title: 'Explorer',    message: "You're getting the hang of this!" },
  { points: 50,  level: 2, title: 'Seeker',      message: "You've found your rhythm." },
  { points: 100, level: 3, title: 'Pathfinder',  message: '100 points — you know your way around.' },
  { points: 250, level: 4, title: 'Navigator',   message: 'A true navigator of vibes.' },
  { points: 500, level: 5, title: 'Trailblazer', message: 'Half a thousand. Impressive.' },
  { points: 1000,level: 6, title: 'Legend',      message: 'Welcome to the 1K club.' },
];

const RING_CIRCUMFERENCE = 2 * Math.PI * 16; // r=16

// State
const Points = {
  total: 0,
  milestoneLevel: 0,
  streak: 0,
  anonId: '',
  firstActions: new Set(),
};

// ===== Helpers =====

function getOrCreateAnonId() {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

function getMilestoneForPoints(total) {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (total >= MILESTONES[i].points) return MILESTONES[i];
  }
  return null;
}

function getNextMilestone(total) {
  for (const m of MILESTONES) {
    if (total < m.points) return m;
  }
  return null;
}

function getMilestoneProgress(total) {
  const current = getMilestoneForPoints(total);
  const next = getNextMilestone(total);
  if (!next) return 1;
  const floor = current?.points ?? 0;
  const range = next.points - floor;
  if (range <= 0) return 0;
  return (total - floor) / range;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ===== Init =====

function initPoints() {
  Points.total = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  Points.milestoneLevel = parseInt(localStorage.getItem(MILESTONE_KEY) || '0', 10);
  Points.streak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
  Points.anonId = getOrCreateAnonId();

  const storedFirst = localStorage.getItem(FIRST_ACTIONS_KEY);
  if (storedFirst) {
    try { Points.firstActions = new Set(JSON.parse(storedFirst)); } catch {}
  }

  // Update streak
  const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
  const today = todayStr();
  if (lastActive && lastActive !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastActive === yesterday.toISOString().slice(0, 10)) {
      Points.streak += 1;
    } else {
      Points.streak = 1;
    }
    localStorage.setItem(STREAK_KEY, String(Points.streak));
  } else if (!lastActive) {
    Points.streak = 1;
    localStorage.setItem(STREAK_KEY, '1');
  }
  localStorage.setItem(LAST_ACTIVE_KEY, today);

  // Referral code in URL
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    localStorage.setItem(REF_CODE_KEY, ref);
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', url.toString());
  }

  renderPointsBadge();
}

// ===== Award Points =====

function awardPoints(amount, label, variant = 'default') {
  Points.total += amount;
  localStorage.setItem(STORAGE_KEY, String(Points.total));

  // Check milestone
  const newMilestone = getMilestoneForPoints(Points.total);
  if (newMilestone && newMilestone.level > Points.milestoneLevel) {
    Points.milestoneLevel = newMilestone.level;
    localStorage.setItem(MILESTONE_KEY, String(Points.milestoneLevel));
    showMilestoneBanner(newMilestone);
  }

  showPointsToast(amount, label, variant);
  renderPointsBadge();
  pulsePointsBadge();
}

function awardFirstAction(actionKey, amount, label) {
  if (Points.firstActions.has(actionKey)) return;
  Points.firstActions.add(actionKey);
  localStorage.setItem(FIRST_ACTIONS_KEY, JSON.stringify([...Points.firstActions]));
  awardPoints(amount, label, 'bonus');
}

// ===== Render Badge =====

function renderPointsBadge() {
  const countEl = document.getElementById('pointsCount');
  const ringEl = document.getElementById('pointsRingProgress');
  const streakWrap = document.getElementById('pointsStreak');
  const streakIcon = document.getElementById('streakIcon');
  const streakCount = document.getElementById('streakCount');
  const tooltipTitle = document.getElementById('tooltipTitle');
  const tooltipProgress = document.getElementById('tooltipProgress');
  const tooltipStreak = document.getElementById('tooltipStreak');

  if (!countEl) return;

  countEl.textContent = Points.total;

  // Progress ring
  const progress = getMilestoneProgress(Points.total);
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  ringEl.setAttribute('stroke-dashoffset', String(offset));

  // Streak
  if (Points.streak > 1) {
    streakWrap.classList.remove('hidden');
    streakIcon.textContent = Points.streak >= 7 ? '\uD83D\uDD25' : '\uD83D\uDD38';
    streakCount.textContent = Points.streak;
  } else {
    streakWrap.classList.add('hidden');
  }

  // Tooltip
  const current = getMilestoneForPoints(Points.total);
  const next = getNextMilestone(Points.total);
  tooltipTitle.textContent = `${Points.total} pts${current ? '  ' + current.title : ''}`;

  if (next) {
    tooltipProgress.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-dim);margin-bottom:3px">
        <span>${Points.total}</span><span>${next.points} ${next.title}</span>
      </div>
      <div style="width:120px;height:5px;border-radius:4px;background:rgba(99,102,241,0.1);overflow:hidden">
        <div style="height:100%;border-radius:4px;background:var(--accent);width:${progress * 100}%;transition:width 0.7s"></div>
      </div>`;
  } else {
    tooltipProgress.innerHTML = '<span style="color:var(--accent-light);font-size:0.7rem">Max level reached!</span>';
  }

  if (Points.streak > 0) {
    tooltipStreak.classList.remove('hidden');
    const icon = Points.streak >= 7 ? '\uD83D\uDD25' : Points.streak >= 3 ? '\uD83D\uDD38' : '\u00B7';
    tooltipStreak.textContent = `${icon} ${Points.streak} day streak`;
  } else {
    tooltipStreak.classList.add('hidden');
  }
}

function pulsePointsBadge() {
  const badge = document.getElementById('pointsBadge');
  if (!badge) return;
  badge.classList.add('points-pulse');
  setTimeout(() => badge.classList.remove('points-pulse'), 500);
}

// ===== Toast =====

function showPointsToast(amount, label, variant = 'default') {
  const container = document.getElementById('pointsToasts');
  if (!container) return;

  const colors = {
    default: { border: 'rgba(99,102,241,0.3)', color: 'var(--accent-light)' },
    bonus:   { border: 'rgba(251,191,36,0.4)', color: '#fbbf24' },
    info:    { border: 'rgba(52,211,153,0.3)', color: '#34d399' },
  };
  const style = colors[variant] || colors.default;

  const toast = document.createElement('div');
  toast.className = 'points-toast';
  toast.style.borderColor = style.border;
  toast.innerHTML = `
    ${variant === 'bonus' ? '<span style="font-size:0.85rem">&#x2728;</span>' : ''}
    <span style="font-size:1rem;font-weight:700;color:${style.color}">+${amount}</span>
    <span style="font-size:0.8rem;color:var(--text-muted)">${label}</span>`;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));

  // Remove after 2s
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ===== Milestone Banner =====

function showMilestoneBanner(milestone) {
  const banner = document.getElementById('milestoneBanner');
  const title = document.getElementById('milestoneTitle');
  const msg = document.getElementById('milestoneMsg');
  if (!banner) return;

  title.textContent = milestone.title;
  msg.textContent = milestone.message;
  banner.classList.remove('hidden');

  setTimeout(() => banner.classList.add('hidden'), 8000);
}

document.getElementById('milestoneClose')?.addEventListener('click', () => {
  document.getElementById('milestoneBanner')?.classList.add('hidden');
});

// Init on load
initPoints();
