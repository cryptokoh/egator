const API = 'https://egator-api.fly.dev';

// OpenClaw Gateway config (set via Netlify env or override here)
const OPENCLAW_GATEWAY = window.FLOWB_GATEWAY_URL || 'https://gateway.openclaw.ai';
const OPENCLAW_TOKEN = window.FLOWB_GATEWAY_TOKEN || '';
const FLOWB_AGENT_ID = 'flowb';

// State
let allEvents = [];
let categories = [];
let activeCategory = 'all';
let activeFilter = null;
let searchQuery = '';
let displayCount = 12;
let chatHistory = [];
let isStreaming = false;

// DOM - Events
const grid = document.getElementById('eventsGrid');
const catRow = document.getElementById('categoriesRow');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const resultsMeta = document.getElementById('resultsMeta');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const emptyState = document.getElementById('emptyState');

// DOM - Chat
const chatBtn = document.getElementById('chatWithFlowB');
const chatModal = document.getElementById('flowbChatModal');
const chatBackdrop = document.getElementById('flowbChatBackdrop');
const chatClose = document.getElementById('flowbChatClose');
const chatBody = document.getElementById('flowbChatBody');
const chatWelcome = document.getElementById('flowbWelcome');
const chatMessages = document.getElementById('flowbMessages');
const chatForm = document.getElementById('flowbChatForm');
const chatInput = document.getElementById('flowbChatInput');
const chatSendBtn = document.getElementById('flowbSendBtn');
const chatStatus = document.getElementById('flowbStatus');
const chatStatusText = document.getElementById('flowbStatusText');

// ===== API =====

async function fetchCategories() {
  try {
    const res = await fetch(`${API}/api/v1/categories`);
    const data = await res.json();
    categories = data.categories || [];
    renderCategories();
  } catch (err) {
    console.error('Failed to fetch categories:', err);
  }
}

async function fetchEvents(params = {}) {
  try {
    const res = await fetch(`${API}/api/v1/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 200, ...params }),
    });
    const data = await res.json();
    return data.events || [];
  } catch (err) {
    console.error('Failed to fetch events:', err);
    return [];
  }
}

async function fetchTonight() {
  const res = await fetch(`${API}/api/v1/discover/tonight`);
  const data = await res.json();
  return data.events || [];
}

// ===== Render =====

function renderCategories() {
  const allBtn = catRow.querySelector('[data-cat="all"]');
  catRow.innerHTML = '';
  catRow.appendChild(allBtn);

  for (const cat of categories) {
    const btn = document.createElement('button');
    btn.className = 'cat-chip';
    btn.dataset.cat = cat.id;
    btn.innerHTML = `${cat.emoji} ${cat.label} <span class="cat-count">${cat.count}</span>`;
    btn.addEventListener('click', () => selectCategory(cat.id));
    catRow.appendChild(btn);
  }
}

function renderEvents(events) {
  const visible = events.slice(0, displayCount);
  emptyState.classList.toggle('hidden', events.length > 0);

  if (events.length === 0) {
    grid.innerHTML = '';
    loadMoreWrap.style.display = 'none';
    return;
  }

  grid.innerHTML = visible.map(e => createEventCard(e)).join('');
  loadMoreWrap.style.display = events.length > displayCount ? '' : 'none';
  resultsMeta.textContent = `${events.length} events${searchQuery ? ` matching "${searchQuery}"` : ''}${activeCategory !== 'all' ? ` in ${getCatLabel(activeCategory)}` : ''}`;
}

function getCatLabel(catId) {
  const cat = categories.find(c => c.id === catId);
  return cat ? cat.label : catId;
}

function createEventCard(e) {
  const date = new Date(e.startTime);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const catEmoji = e.mainCategoryEmoji || '';
  const catLabel = e.mainCategoryLabel || '';
  const venue = e.venue?.name || (e.isOnline ? 'Online' : '');
  const org = e.organizer?.name || '';

  let priceHtml = '';
  if (e.isSoldOut) {
    priceHtml = '<span class="event-sold-out">Sold Out</span>';
  } else if (e.isFree) {
    priceHtml = '<span class="event-price free">Free</span>';
  } else if (e.price?.min) {
    priceHtml = `<span class="event-price paid">$${e.price.min}${e.price.max > e.price.min ? '–$' + e.price.max : ''}</span>`;
  }

  const attendeesHtml = e.attendeeCount
    ? `<span class="event-attendees"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>${e.attendeeCount}</span>`
    : '';

  const imgHtml = e.imageUrl
    ? `<img class="event-card-img" src="${e.imageUrl}" alt="" loading="lazy" onerror="this.outerHTML='<div class=\\'event-card-img placeholder\\'>${catEmoji}</div>'">`
    : `<div class="event-card-img placeholder">${catEmoji}</div>`;

  const safeUrl = e.url ? e.url.replace(/'/g, "\\'") : '#';

  return `
    <article class="event-card" onclick="onEventClick('${safeUrl}')">
      ${imgHtml}
      <div class="event-card-body">
        <div class="event-card-cat">${catEmoji} ${catLabel}</div>
        <h3 class="event-card-title">${escapeHtml(e.title)}</h3>
        <div class="event-card-meta">
          <div class="event-card-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${dateStr} at ${timeStr}
          </div>
          ${venue ? `<div class="event-card-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(venue)}
          </div>` : ''}
          ${org ? `<div class="event-card-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${escapeHtml(org)}
          </div>` : ''}
        </div>
        <div class="event-card-footer">
          ${priceHtml}
          ${attendeesHtml}
        </div>
      </div>
    </article>
  `;
}

function onEventClick(url) {
  awardPoints(2, 'Event viewed');
  awardFirstAction('first_event_click', 5, 'First event click!');
  if (url && url !== '#') window.open(url, '_blank');
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Actions =====

async function selectCategory(catId) {
  activeCategory = catId;
  activeFilter = null;
  displayCount = 12;

  catRow.querySelectorAll('.cat-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === catId);
  });

  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));

  if (catId !== 'all') {
    awardPoints(1, 'Category browsed');
    awardFirstAction('first_category', 3, 'First category browse!');
  }

  showLoading();
  const params = {};
  if (catId !== 'all') params.mainCategory = catId;
  if (searchQuery) params.query = searchQuery;
  allEvents = await fetchEvents(params);
  renderEvents(allEvents);
}

async function applyFilter(filter) {
  if (activeFilter === filter) {
    activeFilter = null;
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    return selectCategory(activeCategory);
  }

  activeFilter = filter;
  displayCount = 12;

  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  awardPoints(1, 'Filter applied');
  awardFirstAction('first_filter', 3, 'First filter used!');

  showLoading();

  if (filter === 'tonight') {
    allEvents = await fetchTonight();
  } else if (filter === 'week') {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const params = {
      startDate: now.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
    if (activeCategory !== 'all') params.mainCategory = activeCategory;
    allEvents = await fetchEvents(params);
  } else if (filter === 'free') {
    const params = { freeOnly: true };
    if (activeCategory !== 'all') params.mainCategory = activeCategory;
    allEvents = await fetchEvents(params);
  }

  renderEvents(allEvents);
}

function showLoading() {
  grid.innerHTML = Array(6).fill('<div class="skeleton-card"></div>').join('');
  emptyState.classList.add('hidden');
  loadMoreWrap.style.display = 'none';
}

// ===== Search =====

let searchTimeout;
searchInput.addEventListener('input', () => {
  const val = searchInput.value.trim();
  searchClear.classList.toggle('hidden', !val);

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    searchQuery = val;
    displayCount = 12;
    showLoading();
    const params = {};
    if (val) params.query = val;
    if (activeCategory !== 'all') params.mainCategory = activeCategory;
    allEvents = await fetchEvents(params);
    renderEvents(allEvents);

    if (val) {
      awardPoints(3, 'Search bonus');
      awardFirstAction('first_search', 5, 'First search!');
    }
  }, 300);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.add('hidden');
  searchQuery = '';
  selectCategory(activeCategory);
});

// ===== Filter pills =====
document.querySelectorAll('.filter-pill').forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

// ===== "All" category =====
catRow.querySelector('[data-cat="all"]').addEventListener('click', () => selectCategory('all'));

// ===== Load More =====
loadMoreBtn.addEventListener('click', () => {
  displayCount += 12;
  renderEvents(allEvents);
});

// ===================================================================
// FlowB Chat - OpenClaw Integration
// ===================================================================

function openChat() {
  chatModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  chatInput.focus();
  awardFirstAction('first_chat_open', 3, 'Chat opened!');
}

function closeChat() {
  chatModal.classList.add('hidden');
  document.body.style.overflow = '';
}

chatBtn.addEventListener('click', openChat);
chatBackdrop.addEventListener('click', closeChat);
chatClose.addEventListener('click', closeChat);

// Escape key closes chat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !chatModal.classList.contains('hidden')) {
    closeChat();
  }
});

// Auto-resize textarea
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

// Enter to send (Shift+Enter for newline)
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});

// Quick actions
document.querySelectorAll('.flowb-quick-chip').forEach(btn => {
  btn.addEventListener('click', () => sendChatMessage(btn.dataset.msg));
});

// Suggestion buttons
document.querySelectorAll('.flowb-suggestion').forEach(btn => {
  btn.addEventListener('click', () => sendChatMessage(btn.dataset.msg));
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg || isStreaming) return;
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendChatMessage(msg);
});

// ===== Chat Message Rendering =====

function addChatMessage(text, type) {
  // Hide welcome on first message
  if (chatWelcome) {
    chatWelcome.classList.add('hidden-welcome');
  }

  const div = document.createElement('div');
  div.className = `flowb-msg ${type}`;

  const avatarText = type === 'bot' ? 'F' : (Auth.isAuthenticated ? Auth.user.username[0].toUpperCase() : 'U');

  const html = formatMarkdown(text);

  div.innerHTML = `
    <div class="flowb-msg-avatar">${avatarText}</div>
    <div class="flowb-msg-content">${html}</div>
  `;
  chatMessages.appendChild(div);
  scrollChatToBottom();
  return div;
}

function addTypingIndicator() {
  if (chatWelcome) chatWelcome.classList.add('hidden-welcome');

  const div = document.createElement('div');
  div.className = 'flowb-msg bot';
  div.id = 'flowbTyping';
  div.innerHTML = `
    <div class="flowb-msg-avatar">F</div>
    <div class="flowb-msg-content">
      <div class="flowb-typing"><span></span><span></span><span></span></div>
    </div>
  `;
  chatMessages.appendChild(div);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('flowbTyping');
  if (el) el.remove();
}

function scrollChatToBottom() {
  chatBody.scrollTop = chatBody.scrollHeight;
}

function formatMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
}

function setStatus(status, text) {
  chatStatusText.textContent = text;
  if (status === 'error') {
    chatStatus.classList.add('error');
  } else {
    chatStatus.classList.remove('error');
  }
}

// ===== OpenClaw Chat Completions =====

async function sendToOpenClaw(userMessage) {
  // Add to history
  chatHistory.push({ role: 'user', content: userMessage });

  // Get user's display name for replies
  const userName = Auth.isAuthenticated ? Auth.user.username : null;

  // Build system message with context
  const systemMsg = {
    role: 'system',
    content: `You are FlowB, a friendly AI assistant for ETHDenver 2026 side events. You help users discover events, hackathons, parties, meetups, and summits happening during ETHDenver week (Feb 13-20, 2026) in Denver.

You have access to a tool called "flowb" that can search events, browse categories, check tonight's events, find free events, and more. Use it when users ask about events.

CRITICAL RULES:
1. ALWAYS reply in a SINGLE message. If the user asks multiple questions, address ALL of them in ONE cohesive response with clear sections. NEVER send multiple separate messages.
2. If a user asks two things like "what is X? also show me Y events", gather ALL the information first, then respond once with everything.
3. When using the flowb tool, batch your tool calls and combine all results into one response.
4. ${userName ? `Address the user as "${userName}" when greeting them.` : 'Be friendly and conversational.'}
5. Respond when the user mentions "flowb" or "@flowb" — treat it as them talking to you.
6. Be conversational, helpful, and concise. Use emojis sparingly.
7. Format event listings clearly with titles, dates, venues, and prices.

The user's platform is "web" and their user_id is "${Points.anonId || 'anon'}".`
  };

  const messages = [systemMsg, ...chatHistory.slice(-20)]; // Keep last 20 messages

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (OPENCLAW_TOKEN) {
      headers['Authorization'] = `Bearer ${OPENCLAW_TOKEN}`;
    }

    const res = await fetch(`${OPENCLAW_GATEWAY}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: `openclaw:${FLOWB_AGENT_ID}`,
        messages,
        stream: false,
        user: Points.anonId || 'web-anon',
      }),
    });

    if (!res.ok) {
      throw new Error(`Gateway returned ${res.status}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'No response from FlowB.';

    chatHistory.push({ role: 'assistant', content: reply });
    return reply;
  } catch (err) {
    console.warn('[flowb-chat] OpenClaw gateway error:', err.message);
    throw err;
  }
}

// ===== Local Fallback (when OpenClaw unavailable) =====

/** Strip "flowb" / "@flowb" / "hey flowb" prefix from input */
function stripFlowbMention(text) {
  return text.replace(/^(?:@?flowb[,:]?\s*|hey\s+flowb[,:]?\s*)/i, '').trim();
}

/** Split multi-part questions into segments */
function segmentQuestions(text) {
  // Split on "also", "and also", "? " followed by another question, ";", or "+" as separators
  const segments = text
    .split(/(?:\?\s+(?:also\s+)?|;\s*|\balso\b\s*|\band\s+also\b\s*)/i)
    .map(s => s.replace(/\?$/, '').trim())
    .filter(s => s.length > 2);
  return segments.length > 0 ? segments : [text];
}

async function processLocalCommand(input) {
  // Strip FlowB mentions
  input = stripFlowbMention(input);
  const lower = input.toLowerCase().trim();

  // Handle multi-part questions
  const segments = segmentQuestions(lower);
  if (segments.length > 1) {
    const results = [];
    for (const seg of segments) {
      const result = await processSingleCommand(seg.trim());
      results.push(result);
    }
    const userName = Auth.isAuthenticated ? Auth.user.username : null;
    const greeting = userName ? `Hey ${userName}, ` : '';
    return `${greeting}here's what I found:\n\n${results.join('\n\n---\n\n')}`;
  }

  return processSingleCommand(lower);
}

async function processSingleCommand(lower) {
  // Normalize natural language to commands
  // "what's happening tonight" → "tonight"
  // "show me free events" → "free"
  // "what are the best parties" → "browse social"
  // "whats danz" → knowledge answer
  lower = lower
    .replace(/^(?:what'?s?|show me|find|tell me about|give me|list)\s+/i, '')
    .replace(/^(?:happening|going on)\s+/i, '')
    .trim();

  // Handle "danz" / "what is danz" type questions (FlowBond ecosystem knowledge)
  if (/^(?:danz|danz\.now|danz now)/i.test(lower)) {
    return `**DANZ.Now** is a vibrant dance community platform within the FlowBond ecosystem. It connects dancers, offers challenges with USDC rewards on the Base network, and helps you find and register for dance events.\n\nYou can track your stats, join leaderboards, and engage with other dancers. Say "stats" to check your stats or "challenges" for active challenges.`;
  }

  // Handle "flowb" / "what is flowb" questions
  if (/^(?:flowb|flow\s?b|flow\s?bond)/i.test(lower)) {
    return `**FlowB** is your AI-powered assistant for discovering events and connecting with communities. I can help you find ETHDenver 2026 side events, hackathons, parties, and meetups.\n\nI'm part of the FlowBond ecosystem, which includes DANZ.Now (dance community) and the eGator event aggregator.\n\nTry "categories" to browse events or "tonight" to see what's happening!`;
  }

  if (lower === 'help') {
    return `Here's what I can help with:\n\n**categories** — browse by type\n**browse [type]** — events in a category (defi, ai, infra, build, capital, social, wellness, privacy, art)\n**tonight** — tonight's events\n**week** — this week's events\n**free** — free events only\n**search [query]** — search events\n**points** — check your points\n\nOr just ask me anything about ETHDenver!`;
  }

  if (lower === 'points' || lower === 'my points') {
    const current = getMilestoneForPoints(Points.total);
    const next = getNextMilestone(Points.total);
    let text = `**Your FlowB Points**\n\n**${Points.total}** pts`;
    if (current) text += `  |  ${current.title}`;
    if (Points.streak > 1) text += `\nStreak: ${Points.streak} day${Points.streak > 1 ? 's' : ''}`;
    if (next) text += `\n\nNext: **${next.title}** at ${next.points} pts (${next.points - Points.total} to go)`;
    if (Auth.isAuthenticated) text += `\n\nLogged in as **${Auth.user.username}**`;
    else text += `\n\nSign in to save your progress!`;
    return text;
  }

  if (lower === 'categories' || lower === 'cats') {
    const res = await fetch(`${API}/api/v1/categories`);
    const data = await res.json();
    let text = '**Event Categories**\n\n';
    for (const cat of data.categories) {
      text += `${cat.emoji} **${cat.label}** — ${cat.count} events\n`;
    }
    text += '\nSay "browse defi" or "browse ai" to see events.';
    return text;
  }

  if (lower === 'tonight' || /tonight/i.test(lower)) {
    const res = await fetch(`${API}/api/v1/discover/tonight`);
    const data = await res.json();
    if (!data.events?.length) return 'No events tonight. Try "week" or "categories".';
    return formatChatEvents(data.events, "Tonight's Events");
  }

  if (lower === 'week' || lower === 'this week') {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const events = await fetchEvents({
      startDate: now.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      limit: 10,
    });
    if (!events.length) return 'No events this week.';
    return formatChatEvents(events, "This Week");
  }

  if (lower === 'free' || /free\s*(?:events|only|stuff)?$/i.test(lower)) {
    const events = await fetchEvents({ freeOnly: true, limit: 10 });
    if (!events.length) return 'No free events found.';
    return formatChatEvents(events, "Free Events");
  }

  if (lower.startsWith('browse ')) {
    const cat = lower.replace('browse ', '').trim();
    const aliases = {
      defi: 'defi', trading: 'defi', finance: 'defi',
      ai: 'ai', agents: 'ai',
      infra: 'infra', infrastructure: 'infra', l2: 'infra',
      build: 'build', builder: 'build', dev: 'build', hack: 'build',
      capital: 'capital', vc: 'capital', investor: 'capital',
      social: 'social', party: 'social', parties: 'social',
      wellness: 'wellness', fitness: 'wellness',
      privacy: 'privacy', security: 'privacy',
      art: 'art', nft: 'art', culture: 'art',
    };
    const mainCat = aliases[cat] || cat;
    const events = await fetchEvents({ mainCategory: mainCat, limit: 10 });
    if (!events.length) return `No events in "${cat}". Try "categories" to see options.`;
    return formatChatEvents(events, `${mainCat.charAt(0).toUpperCase() + mainCat.slice(1)} Events`);
  }

  if (lower.startsWith('search ')) {
    const query = lower.replace('search ', '').trim();
    const events = await fetchEvents({ query, limit: 10 });
    if (!events.length) return `No events matching "${query}".`;
    return formatChatEvents(events, `Results for "${query}"`);
  }

  // Natural language → category matching
  const catKeywords = {
    'part(?:y|ies)': 'social', 'fun': 'social', 'social': 'social', 'networking': 'social',
    'defi': 'defi', 'trading': 'defi', 'finance': 'defi',
    'ai': 'ai', 'agent': 'ai', 'machine learning': 'ai',
    'hack(?:athon)?': 'build', 'build': 'build', 'dev': 'build',
    'art': 'art', 'nft': 'art', 'culture': 'art',
    'wellness': 'wellness', 'yoga': 'wellness', 'fitness': 'wellness',
    'privacy': 'privacy', 'security': 'privacy', 'zk': 'privacy',
    'infra': 'infra', 'infrastructure': 'infra', 'l2': 'infra',
    'capital': 'capital', 'vc': 'capital', 'invest': 'capital',
  };
  for (const [pattern, cat] of Object.entries(catKeywords)) {
    if (new RegExp(pattern, 'i').test(lower)) {
      const events = await fetchEvents({ mainCategory: cat, limit: 10 });
      if (events.length) return formatChatEvents(events, `${cat.charAt(0).toUpperCase() + cat.slice(1)} Events`);
    }
  }

  // Default: search
  const events = await fetchEvents({ query: lower, limit: 8 });
  if (!events.length) return `No events found for "${lower}". Try "categories" or "help".`;
  return formatChatEvents(events, `Results for "${lower}"`);
}

function formatChatEvents(events, title) {
  let text = `**${title}** (${events.length})\n\n`;
  for (const e of events.slice(0, 8)) {
    const date = new Date(e.startTime);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const emoji = e.mainCategoryEmoji || '';
    const venue = e.venue?.name ? `\uD83D\uDCCD ${e.venue.name}` : '';
    const price = e.isFree ? '\uD83C\uDD93' : e.price?.min ? `$${e.price.min}` : '';
    text += `${emoji} **${e.title}**\n${dateStr} ${timeStr}`;
    if (venue) text += ` | ${venue}`;
    if (price) text += ` | ${price}`;
    if (e.url) text += `\n${e.url}`;
    text += '\n\n';
  }
  return text.trim();
}

// ===== Send Message (tries OpenClaw, falls back to local) =====

async function sendChatMessage(msg) {
  if (isStreaming) return;
  isStreaming = true;
  chatSendBtn.disabled = true;

  addChatMessage(msg, 'user');
  addTypingIndicator();
  awardPoints(1, 'Chat message');

  // Clean the message for processing (strip "flowb" prefix, keep original for display)
  const cleanMsg = stripFlowbMention(msg);

  try {
    // Try OpenClaw gateway first
    const response = await sendToOpenClaw(cleanMsg);
    removeTypingIndicator();
    addChatMessage(response, 'bot');
    setStatus('ok', 'connected');
  } catch (err) {
    // Fall back to local command processing
    console.log('[flowb-chat] Falling back to local processing');
    setStatus('ok', 'local mode');
    try {
      const response = await processLocalCommand(cleanMsg);
      removeTypingIndicator();
      addChatMessage(response, 'bot');
    } catch (innerErr) {
      removeTypingIndicator();
      addChatMessage('Something went wrong. Try again!', 'bot');
    }
  }

  isStreaming = false;
  chatSendBtn.disabled = false;
  chatInput.focus();
}

// ===== Init =====
(async () => {
  awardPoints(1, 'Daily visit', 'info');
  awardFirstAction('first_visit', 5, 'Welcome to FlowB!');

  // Read URL params (from FlowB web links)
  const urlParams = new URLSearchParams(window.location.search);
  const paramSearch = urlParams.get('search');
  const paramCategory = urlParams.get('category');
  const paramFilter = urlParams.get('filter');
  const paramCity = urlParams.get('city');

  if (paramSearch) {
    searchInput.value = paramSearch;
    searchQuery = paramSearch;
    searchClear.classList.remove('hidden');
  }

  if (paramCategory && paramCategory !== 'all') {
    activeCategory = paramCategory;
  }

  await fetchCategories();

  // Apply category from URL
  if (paramCategory && paramCategory !== 'all') {
    catRow.querySelectorAll('.cat-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === paramCategory);
    });
  }

  // Build initial fetch params from URL
  const initParams = {};
  if (paramSearch) initParams.query = paramSearch;
  if (paramCategory && paramCategory !== 'all') initParams.mainCategory = paramCategory;
  if (paramCity) initParams.city = paramCity;

  // Apply filter from URL (tonight/week/free)
  if (paramFilter === 'tonight') {
    allEvents = await fetchTonight();
    activeFilter = 'tonight';
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'tonight');
    });
  } else if (paramFilter === 'week') {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    initParams.startDate = now.toISOString().slice(0, 10);
    initParams.endDate = end.toISOString().slice(0, 10);
    allEvents = await fetchEvents(initParams);
    activeFilter = 'week';
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'week');
    });
  } else if (paramFilter === 'free') {
    initParams.freeOnly = true;
    allEvents = await fetchEvents(initParams);
    activeFilter = 'free';
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'free');
    });
  } else {
    allEvents = await fetchEvents(initParams);
  }

  renderEvents(allEvents);

  // Check OpenClaw gateway availability
  try {
    const res = await fetch(`${OPENCLAW_GATEWAY}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      setStatus('ok', 'connected');
    } else {
      setStatus('ok', 'local mode');
    }
  } catch {
    setStatus('ok', 'local mode');
  }
})();
