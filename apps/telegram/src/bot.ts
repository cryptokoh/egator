import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const API_BASE = process.env.API_BASE_URL || 'https://egator-api.fly.dev';
const BOT_USERNAME = process.env.BOT_USERNAME || 'flow_b_bot';

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ============================================================================
// Message Queue + Classifier
// ============================================================================

interface QueuedMessage {
  msg: TelegramBot.Message;
  intent: Intent;
  queuedAt: number;
}

interface Intent {
  type: 'events' | 'tonight' | 'weekend' | 'week' | 'free' | 'search' | 'categories' | 'browse' | 'help' | 'greeting' | 'unknown';
  query?: string;
  category?: string;
  city?: string;
}

/** Per-chat queue: debounces rapid messages, processes sequentially */
class FlowBQueue {
  private queues = new Map<number, QueuedMessage[]>();
  private processing = new Set<number>();
  private debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly DEBOUNCE_MS = 800; // wait for follow-up messages

  enqueue(chatId: number, msg: TelegramBot.Message, intent: Intent) {
    if (!this.queues.has(chatId)) this.queues.set(chatId, []);
    this.queues.get(chatId)!.push({ msg, intent, queuedAt: Date.now() });

    // Debounce: wait a bit in case user sends multiple messages quickly
    const existing = this.debounceTimers.get(chatId);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(chatId, setTimeout(() => {
      this.debounceTimers.delete(chatId);
      this.processChat(chatId);
    }, this.DEBOUNCE_MS));
  }

  private async processChat(chatId: number) {
    if (this.processing.has(chatId)) return; // already processing
    this.processing.add(chatId);

    try {
      const queue = this.queues.get(chatId);
      if (!queue?.length) return;

      // Grab all queued messages, clear the queue
      const batch = queue.splice(0);

      // If multiple messages queued, merge intents intelligently
      if (batch.length === 1) {
        await handleIntent(chatId, batch[0].intent, batch[0].msg);
      } else {
        // Multiple rapid messages - combine into one response
        const merged = mergeIntents(batch);
        await handleIntent(chatId, merged, batch[batch.length - 1].msg);
      }
    } finally {
      this.processing.delete(chatId);
      // Check if more messages arrived while processing
      const queue = this.queues.get(chatId);
      if (queue?.length) {
        this.processChat(chatId);
      }
    }
  }
}

const queue = new FlowBQueue();

// ============================================================================
// Intent Classifier
// ============================================================================

const FLOWB_TRIGGERS = [
  'flowb', 'flow b', '@' + BOT_USERNAME, 'hey flowb', 'yo flowb',
];

const EVENT_KEYWORDS = [
  'event', 'events', 'happening', 'going on', "what's on", 'whats on',
  'party', 'parties', 'meetup', 'hackathon', 'side event',
  'conference', 'workshop', 'talk', 'panel', 'mixer',
];

const TONIGHT_KEYWORDS = ['tonight', 'this evening', 'tonite', 'later today'];
const WEEKEND_KEYWORDS = ['weekend', 'this weekend', 'saturday', 'sunday'];
const WEEK_KEYWORDS = ['this week', 'next few days', 'upcoming'];
const FREE_KEYWORDS = ['free event', 'free stuff', 'no cost', 'free only'];
const HELP_KEYWORDS = ['help', 'commands', 'what can you do', 'how do i', 'menu'];
const GREETING_KEYWORDS = ['hey', 'hi', 'hello', 'yo', 'sup', 'gm', 'good morning'];

const CATEGORY_MAP: Record<string, string> = {
  defi: 'defi', ai: 'ai', infra: 'infra', build: 'build',
  capital: 'capital', social: 'social', wellness: 'wellness',
  privacy: 'privacy', art: 'art', music: 'art',
  nft: 'art', gaming: 'social', dao: 'social',
};

/** Check if a message is directed at FlowB */
function isForFlowB(msg: TelegramBot.Message): boolean {
  const text = (msg.text || '').toLowerCase();
  const isPrivateChat = msg.chat.type === 'private';
  const isReplyToBot = msg.reply_to_message?.from?.username === BOT_USERNAME;
  const mentionsBot = FLOWB_TRIGGERS.some(t => text.includes(t));

  // Always respond in DMs
  if (isPrivateChat) return true;
  // Always respond to replies to our messages
  if (isReplyToBot) return true;
  // Respond when mentioned
  if (mentionsBot) return true;

  // In groups, only respond to event-related questions that seem directed at a bot
  // (questions with ? or imperative commands with event keywords)
  const isQuestion = text.includes('?');
  const hasEventKeyword = EVENT_KEYWORDS.some(k => text.includes(k));
  if (isQuestion && hasEventKeyword) return true;

  return false;
}

/** Extract intent from message text */
function classifyIntent(msg: TelegramBot.Message): Intent {
  const raw = (msg.text || '').toLowerCase();
  // Strip bot mention to get the actual query
  let text = raw;
  for (const trigger of FLOWB_TRIGGERS) {
    text = text.replace(trigger, '').trim();
  }
  // Strip leading punctuation/comma
  text = text.replace(/^[,!?\s]+/, '').trim();

  // Check for specific intents
  if (HELP_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'help' };
  }

  if (TONIGHT_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'tonight' };
  }

  if (WEEKEND_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'weekend' };
  }

  if (FREE_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'free' };
  }

  if (WEEK_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'week' };
  }

  // Check for category browsing: "show me defi events", "ai stuff"
  for (const [keyword, catId] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword)) {
      return { type: 'browse', category: catId };
    }
  }

  // Check for city-specific events: "events in denver", "what's happening in boulder"
  const cityMatch = text.match(/(?:events?\s+in|happening\s+in|in)\s+([a-z\s]+?)(?:\?|$|,|\.|!)/);
  if (cityMatch) {
    return { type: 'events', city: cityMatch[1].trim() };
  }

  // General event queries
  if (EVENT_KEYWORDS.some(k => text.includes(k)) || text.includes('categories') || text.includes('browse')) {
    return { type: 'events' };
  }

  // Just a greeting with no real question
  if (GREETING_KEYWORDS.some(k => text === k || text.startsWith(k + ' ')) && text.length < 20) {
    return { type: 'greeting' };
  }

  // If there's meaningful text left, treat as search
  if (text.length > 2) {
    return { type: 'search', query: text };
  }

  return { type: 'unknown' };
}

/** Merge multiple rapid-fire messages into one intent */
function mergeIntents(batch: QueuedMessage[]): Intent {
  // If any have a concrete intent, use the most specific one
  const concrete = batch.filter(b => b.intent.type !== 'unknown' && b.intent.type !== 'greeting');
  if (concrete.length) {
    // Prefer search/browse/events over help/greeting
    const best = concrete.find(b => ['search', 'browse', 'events', 'tonight', 'weekend'].includes(b.intent.type))
      || concrete[concrete.length - 1];
    return best.intent;
  }

  // All unknown/greeting - combine text as search
  const combined = batch.map(b => (b.msg.text || '').trim()).join(' ');
  if (combined.length > 5) {
    return { type: 'search', query: combined };
  }

  return { type: 'greeting' };
}

// ============================================================================
// API helpers
// ============================================================================

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function apiPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ============================================================================
// Formatting
// ============================================================================

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m > 0 ? `${hour}:${m.toString().padStart(2, '0')} ${ampm}` : `${hour} ${ampm}`;
}

function formatEvent(e: any): string {
  const emoji = e.mainCategoryEmoji || '\u{1F4C5}';
  const date = formatDate(e.startTime);
  const time = formatTime(e.startTime);
  const venue = e.venue?.name ? `\u{1F4CD} ${e.venue.name}` : '';
  const price = e.isFree ? '\u{1F193} Free' : e.price ? `\u{1F4B5} $${e.price.min}${e.price.max > e.price.min ? '-$' + e.price.max : ''}` : '';
  const org = e.organizer?.name ? `by ${e.organizer.name}` : '';
  const soldOut = e.isSoldOut ? ' \u26D4 SOLD OUT' : '';
  const attendees = e.attendeeCount ? `\u{1F465} ${e.attendeeCount}` : '';

  let text = `${emoji} <b>${escapeHtml(e.title)}</b>${soldOut}\n`;
  text += `\u{1F5D3} ${date} at ${time}`;
  if (venue) text += `\n${venue}`;
  if (org) text += `\n${escapeHtml(org)}`;

  const meta = [price, attendees].filter(Boolean);
  if (meta.length) text += `\n${meta.join(' | ')}`;

  if (e.url) text += `\n<a href="${e.url}">View Event \u2192</a>`;

  return text;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatEventList(events: any[], title: string, page = 0, pageSize = 5): { text: string; hasMore: boolean } {
  const start = page * pageSize;
  const slice = events.slice(start, start + pageSize);
  const hasMore = start + pageSize < events.length;

  let text = `<b>${title}</b> (${events.length} events)\n\n`;
  text += slice.map((e) => formatEvent(e)).join('\n\n');

  if (hasMore) {
    text += `\n\n<i>Showing ${start + 1}-${start + slice.length} of ${events.length}</i>`;
  }

  return { text, hasMore };
}

// ============================================================================
// Category keyboard
// ============================================================================

async function getCategoryKeyboard(): Promise<TelegramBot.InlineKeyboardButton[][]> {
  const data = await apiGet('/api/v1/categories');
  const cats = data.categories;

  const rows: TelegramBot.InlineKeyboardButton[][] = [];
  for (let i = 0; i < cats.length; i += 2) {
    const row: TelegramBot.InlineKeyboardButton[] = [];
    row.push({
      text: `${cats[i].emoji} ${cats[i].label} (${cats[i].count})`,
      callback_data: `cat:${cats[i].id}:0`,
    });
    if (cats[i + 1]) {
      row.push({
        text: `${cats[i + 1].emoji} ${cats[i + 1].label} (${cats[i + 1].count})`,
        callback_data: `cat:${cats[i + 1].id}:0`,
      });
    }
    rows.push(row);
  }

  rows.push([
    { text: '\u{1F319} Tonight', callback_data: 'quick:tonight:0' },
    { text: '\u{1F4C5} This Week', callback_data: 'quick:week:0' },
    { text: '\u{1F193} Free Only', callback_data: 'quick:free:0' },
  ]);

  rows.push([
    { text: '\u{1F50D} Search Events', callback_data: 'search' },
    { text: '\u{1F4CA} All Events', callback_data: 'cat:all:0' },
  ]);

  return rows;
}

// ============================================================================
// Intent Handler - processes classified intents
// ============================================================================

async function handleIntent(chatId: number, intent: Intent, msg: TelegramBot.Message) {
  try {
    switch (intent.type) {
      case 'greeting': {
        const name = msg.from?.first_name || 'there';
        await bot.sendMessage(chatId,
          `Hey ${escapeHtml(name)}! I'm FlowB, your ETHDenver events guide.\n\nAsk me about events, or try /events to browse categories.`,
          { parse_mode: 'HTML' },
        );
        break;
      }

      case 'help': {
        await bot.sendMessage(chatId,
          `<b>\u{1F40A} FlowB Commands</b>\n\n` +
          `<b>Ask me naturally:</b>\n` +
          `"what's happening tonight?"\n` +
          `"any free AI events?"\n` +
          `"events in Denver this weekend"\n\n` +
          `<b>Or use commands:</b>\n` +
          `/events \u2014 Browse by category\n` +
          `/tonight \u2014 Tonight's events\n` +
          `/weekend \u2014 Weekend events\n` +
          `/search <query> \u2014 Search events\n` +
          `/help \u2014 This message`,
          { parse_mode: 'HTML' },
        );
        break;
      }

      case 'events': {
        if (intent.city) {
          const data = await apiPost('/api/v1/discover', { city: intent.city, limit: 10 });
          if (!data.events.length) {
            await bot.sendMessage(chatId, `No events found in ${escapeHtml(intent.city)}. Try /events to browse all.`, { parse_mode: 'HTML' });
            break;
          }
          const { text } = formatEventList(data.events, `\u{1F4CD} Events in ${escapeHtml(intent.city)}`);
          await bot.sendMessage(chatId, text, {
            parse_mode: 'HTML', disable_web_page_preview: true,
            reply_markup: { inline_keyboard: [[{ text: '\u2190 Browse Categories', callback_data: 'home' }]] },
          });
        } else {
          const keyboard = await getCategoryKeyboard();
          await bot.sendMessage(chatId, `<b>Browse by category:</b>`, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard },
          });
        }
        break;
      }

      case 'tonight': {
        const data = await apiGet('/api/v1/discover/tonight');
        if (!data.events.length) {
          await bot.sendMessage(chatId, 'No events tonight. Try /events for upcoming events.');
          break;
        }
        const { text } = formatEventList(data.events, '\u{1F319} Tonight\'s Events');
        await bot.sendMessage(chatId, text, { parse_mode: 'HTML', disable_web_page_preview: true });
        break;
      }

      case 'weekend': {
        const data = await apiGet('/api/v1/discover/weekend');
        if (!data.events.length) {
          await bot.sendMessage(chatId, 'No weekend events found. Try /events for all events.');
          break;
        }
        const { text, hasMore } = formatEventList(data.events, '\u{1F4C5} This Weekend');
        const buttons: TelegramBot.InlineKeyboardButton[][] = [];
        if (hasMore) buttons.push([{ text: 'Show More \u2192', callback_data: 'quick:weekend:1' }]);
        buttons.push([{ text: '\u2190 Back to Categories', callback_data: 'home' }]);
        await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML', disable_web_page_preview: true,
          reply_markup: { inline_keyboard: buttons },
        });
        break;
      }

      case 'week': {
        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + 7);
        const data = await apiPost('/api/v1/discover', {
          startDate: now.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          limit: 200,
        });
        if (!data.events.length) {
          await bot.sendMessage(chatId, 'No events this week. Try /events for all events.');
          break;
        }
        const { text, hasMore } = formatEventList(data.events, '\u{1F4C5} This Week');
        const buttons: TelegramBot.InlineKeyboardButton[][] = [];
        if (hasMore) buttons.push([{ text: 'Show More \u2192', callback_data: 'quick:week:1' }]);
        buttons.push([{ text: '\u2190 Back to Categories', callback_data: 'home' }]);
        await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML', disable_web_page_preview: true,
          reply_markup: { inline_keyboard: buttons },
        });
        break;
      }

      case 'free': {
        const data = await apiPost('/api/v1/discover', { freeOnly: true, limit: 200 });
        if (!data.events.length) {
          await bot.sendMessage(chatId, 'No free events found right now.');
          break;
        }
        const { text, hasMore } = formatEventList(data.events, '\u{1F193} Free Events');
        const buttons: TelegramBot.InlineKeyboardButton[][] = [];
        if (hasMore) buttons.push([{ text: 'Show More \u2192', callback_data: 'quick:free:1' }]);
        buttons.push([{ text: '\u2190 Back to Categories', callback_data: 'home' }]);
        await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML', disable_web_page_preview: true,
          reply_markup: { inline_keyboard: buttons },
        });
        break;
      }

      case 'browse': {
        const data = await apiPost('/api/v1/discover', { mainCategory: intent.category, limit: 200 });
        if (!data.events.length) {
          await bot.sendMessage(chatId, `No events in that category yet. Try /events.`);
          break;
        }
        const catLabel = intent.category?.toUpperCase() || 'Category';
        const { text, hasMore } = formatEventList(data.events, `${catLabel} Events`);
        const buttons: TelegramBot.InlineKeyboardButton[][] = [];
        if (hasMore) buttons.push([{ text: 'Show More \u2192', callback_data: `cat:${intent.category}:1` }]);
        buttons.push([{ text: '\u2190 Back to Categories', callback_data: 'home' }]);
        await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML', disable_web_page_preview: true,
          reply_markup: { inline_keyboard: buttons },
        });
        break;
      }

      case 'search': {
        if (!intent.query) {
          await bot.sendMessage(chatId, 'What would you like to search for? Try: "flowb search hackathon"');
          break;
        }
        const data = await apiPost('/api/v1/discover', { query: intent.query, limit: 10 });
        if (!data.events.length) {
          await bot.sendMessage(chatId,
            `No events found for "${escapeHtml(intent.query)}". Try /events to browse categories.`,
            { parse_mode: 'HTML' },
          );
          break;
        }
        const { text } = formatEventList(data.events, `\u{1F50D} "${escapeHtml(intent.query)}"`);
        await bot.sendMessage(chatId, text, {
          parse_mode: 'HTML', disable_web_page_preview: true,
          reply_markup: { inline_keyboard: [[{ text: '\u2190 Browse Categories', callback_data: 'home' }]] },
        });
        break;
      }

      case 'categories': {
        const keyboard = await getCategoryKeyboard();
        await bot.sendMessage(chatId, `<b>Browse by category:</b>`, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard },
        });
        break;
      }

      case 'unknown': {
        // In DMs, give a gentle nudge. In groups, stay silent.
        if (msg.chat.type === 'private') {
          await bot.sendMessage(chatId,
            `Not sure what you mean. Try asking about events!\n\nExamples:\n"what's happening tonight?"\n"any free AI events?"\n\nOr use /help for all commands.`,
          );
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[queue] Error handling intent ${intent.type}:`, err);
    await bot.sendMessage(chatId, 'Something went wrong. Try /events or /help.').catch(() => {});
  }
}

// ============================================================================
// Telegram Handlers - all messages go through classifier + queue
// ============================================================================

// Slash commands - bypass queue, handle immediately
bot.onText(/\/start/, async (msg) => {
  const keyboard = await getCategoryKeyboard();
  await bot.sendMessage(
    msg.chat.id,
    `<b>\u{1F40A} FlowB \u2014 ETHDenver 2026 Events</b>\n\n` +
    `Your guide to 100+ side events, hackathons, parties, and meetups happening around ETHDenver.\n\n` +
    `Pick a category to browse:`,
    { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } },
  );
});

bot.onText(/\/events/, async (msg) => {
  queue.enqueue(msg.chat.id, msg, { type: 'events' });
});

bot.onText(/\/tonight/, async (msg) => {
  queue.enqueue(msg.chat.id, msg, { type: 'tonight' });
});

bot.onText(/\/weekend/, async (msg) => {
  queue.enqueue(msg.chat.id, msg, { type: 'weekend' });
});

bot.onText(/\/search (.+)/, async (msg, match) => {
  const q = match?.[1]?.trim();
  if (q) queue.enqueue(msg.chat.id, msg, { type: 'search', query: q });
});

bot.onText(/\/help/, async (msg) => {
  queue.enqueue(msg.chat.id, msg, { type: 'help' });
});

// Plain text messages - classify first, queue if for FlowB
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  const text = msg.text.trim();
  if (!text) return;

  // Gate: is this message for FlowB?
  if (!isForFlowB(msg)) {
    // Not for us - stay silent
    return;
  }

  const intent = classifyIntent(msg);
  console.log(`[queue] ${msg.chat.type} from ${msg.from?.username || msg.from?.id}: "${text.slice(0, 60)}" -> ${intent.type}${intent.query ? ` q="${intent.query}"` : ''}`);
  queue.enqueue(msg.chat.id, msg, intent);
});

// ============================================================================
// Callback Queries (button presses) - handle inline keyboard actions
// ============================================================================

bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  const msgId = query.message?.message_id;
  if (!chatId || !msgId) return;

  const data = query.data || '';
  await bot.answerCallbackQuery(query.id);

  try {
    if (data === 'home') {
      const keyboard = await getCategoryKeyboard();
      return bot.editMessageText(
        `<b>\u{1F40A} FlowB \u2014 ETHDenver 2026 Events</b>\n\nPick a category to browse:`,
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } },
      );
    }

    if (data === 'search') {
      return bot.editMessageText(
        `<b>\u{1F50D} Search Events</b>\n\nSend a message with /search followed by your query.\n\nExamples:\n\u2022 /search AI agents\n\u2022 /search hackathon\n\u2022 /search brunch`,
        {
          chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: '\u2190 Back to Categories', callback_data: 'home' }]] },
        },
      );
    }

    // Category events: cat:<id>:<page>
    if (data.startsWith('cat:')) {
      const [, catId, pageStr] = data.split(':');
      const page = parseInt(pageStr || '0');

      let events: any[];
      let title: string;

      if (catId === 'all') {
        const result = await apiPost('/api/v1/discover', { limit: 200 });
        events = result.events;
        title = '\u{1F4CA} All Events';
      } else {
        const result = await apiPost('/api/v1/discover', { mainCategory: catId, limit: 200 });
        events = result.events;
        const catData = await apiGet('/api/v1/categories');
        const cat = catData.categories.find((c: any) => c.id === catId);
        title = cat ? `${cat.emoji} ${cat.label}` : catId;
      }

      if (!events.length) {
        return bot.editMessageText(`No events in this category yet.`, {
          chat_id: chatId, message_id: msgId,
          reply_markup: { inline_keyboard: [[{ text: '\u2190 Back to Categories', callback_data: 'home' }]] },
        });
      }

      const { text, hasMore } = formatEventList(events, title, page);
      const buttons: TelegramBot.InlineKeyboardButton[][] = [];
      const navRow: TelegramBot.InlineKeyboardButton[] = [];
      if (page > 0) navRow.push({ text: '\u2190 Prev', callback_data: `cat:${catId}:${page - 1}` });
      if (hasMore) navRow.push({ text: 'Next \u2192', callback_data: `cat:${catId}:${page + 1}` });
      if (navRow.length) buttons.push(navRow);
      buttons.push([{ text: '\u2190 Back to Categories', callback_data: 'home' }]);

      return bot.editMessageText(text, {
        chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
        disable_web_page_preview: true, reply_markup: { inline_keyboard: buttons },
      });
    }

    // Quick filters: quick:<type>:<page>
    if (data.startsWith('quick:')) {
      const [, type, pageStr] = data.split(':');
      const page = parseInt(pageStr || '0');

      let events: any[];
      let title: string;

      if (type === 'tonight') {
        const result = await apiGet('/api/v1/discover/tonight');
        events = result.events;
        title = '\u{1F319} Tonight';
      } else if (type === 'weekend') {
        const result = await apiGet('/api/v1/discover/weekend');
        events = result.events;
        title = '\u{1F4C5} This Weekend';
      } else if (type === 'week') {
        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + 7);
        const result = await apiPost('/api/v1/discover', {
          startDate: now.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          limit: 200,
        });
        events = result.events;
        title = '\u{1F4C5} This Week';
      } else if (type === 'free') {
        const result = await apiPost('/api/v1/discover', { freeOnly: true, limit: 200 });
        events = result.events;
        title = '\u{1F193} Free Events';
      } else {
        return;
      }

      if (!events.length) {
        return bot.editMessageText(`No events found for ${title}.`, {
          chat_id: chatId, message_id: msgId,
          reply_markup: { inline_keyboard: [[{ text: '\u2190 Back to Categories', callback_data: 'home' }]] },
        });
      }

      const { text, hasMore } = formatEventList(events, title, page);
      const buttons: TelegramBot.InlineKeyboardButton[][] = [];
      const navRow: TelegramBot.InlineKeyboardButton[] = [];
      if (page > 0) navRow.push({ text: '\u2190 Prev', callback_data: `quick:${type}:${page - 1}` });
      if (hasMore) navRow.push({ text: 'Next \u2192', callback_data: `quick:${type}:${page + 1}` });
      if (navRow.length) buttons.push(navRow);
      buttons.push([{ text: '\u2190 Back to Categories', callback_data: 'home' }]);

      return bot.editMessageText(text, {
        chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
        disable_web_page_preview: true, reply_markup: { inline_keyboard: buttons },
      });
    }
  } catch (err) {
    console.error('Callback error:', err);
    try {
      await bot.editMessageText('Something went wrong. Try /start to go back.', {
        chat_id: chatId, message_id: msgId,
        reply_markup: { inline_keyboard: [[{ text: '\u2190 Back to Categories', callback_data: 'home' }]] },
      });
    } catch {}
  }
});

console.log('\u{1F40A} FlowB Telegram bot running (queue + classifier active)');
