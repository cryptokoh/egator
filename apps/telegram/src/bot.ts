import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const API_BASE = process.env.API_BASE_URL || 'https://egator-api.fly.dev';

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ---- API helpers ----

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

// ---- Formatting ----

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

function formatEvent(e: any, idx: number): string {
  const emoji = e.mainCategoryEmoji || '📅';
  const date = formatDate(e.startTime);
  const time = formatTime(e.startTime);
  const venue = e.venue?.name ? `📍 ${e.venue.name}` : '';
  const price = e.isFree ? '🆓 Free' : e.price ? `💵 $${e.price.min}${e.price.max > e.price.min ? '-$' + e.price.max : ''}` : '';
  const org = e.organizer?.name ? `by ${e.organizer.name}` : '';
  const soldOut = e.isSoldOut ? ' ⛔ SOLD OUT' : '';
  const attendees = e.attendeeCount ? `👥 ${e.attendeeCount}` : '';

  let text = `${emoji} <b>${escapeHtml(e.title)}</b>${soldOut}\n`;
  text += `🗓 ${date} at ${time}`;
  if (venue) text += `\n${venue}`;
  if (org) text += `\n${escapeHtml(org)}`;

  const meta = [price, attendees].filter(Boolean);
  if (meta.length) text += `\n${meta.join(' | ')}`;

  if (e.url) text += `\n<a href="${e.url}">View Event →</a>`;

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
  text += slice.map((e, i) => formatEvent(e, start + i)).join('\n\n');

  if (hasMore) {
    text += `\n\n<i>Showing ${start + 1}-${start + slice.length} of ${events.length}</i>`;
  }

  return { text, hasMore };
}

// ---- Category keyboard ----

async function getCategoryKeyboard(): Promise<TelegramBot.InlineKeyboardButton[][]> {
  const data = await apiGet('/api/v1/categories');
  const cats = data.categories;

  // 2 columns
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

  // Quick filters row
  rows.push([
    { text: '🌙 Tonight', callback_data: 'quick:tonight:0' },
    { text: '📅 This Week', callback_data: 'quick:week:0' },
    { text: '🆓 Free Only', callback_data: 'quick:free:0' },
  ]);

  // Search
  rows.push([
    { text: '🔍 Search Events', callback_data: 'search' },
    { text: '📊 All Events', callback_data: 'cat:all:0' },
  ]);

  return rows;
}

// ---- Handlers ----

bot.onText(/\/start/, async (msg) => {
  const keyboard = await getCategoryKeyboard();

  await bot.sendMessage(
    msg.chat.id,
    `<b>🐊 FlowB — ETHDenver 2026 Events</b>\n\n` +
    `Your guide to 100+ side events, hackathons, parties, and meetups happening around ETHDenver.\n\n` +
    `Pick a category to browse:`,
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }
  );
});

bot.onText(/\/events/, async (msg) => {
  const keyboard = await getCategoryKeyboard();
  await bot.sendMessage(msg.chat.id, `<b>Browse by category:</b>`, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
  });
});

bot.onText(/\/tonight/, async (msg) => {
  try {
    const data = await apiGet('/api/v1/discover/tonight');
    if (!data.events.length) {
      return bot.sendMessage(msg.chat.id, 'No events happening tonight. Check /events for upcoming events.');
    }
    const { text } = formatEventList(data.events, '🌙 Tonight\'s Events');
    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML', disable_web_page_preview: true });
  } catch (err) {
    await bot.sendMessage(msg.chat.id, 'Failed to fetch tonight\'s events. Try again later.');
  }
});

bot.onText(/\/weekend/, async (msg) => {
  try {
    const data = await apiGet('/api/v1/discover/weekend');
    if (!data.events.length) {
      return bot.sendMessage(msg.chat.id, 'No weekend events found. Check /events for all events.');
    }
    const { text, hasMore } = formatEventList(data.events, '📅 This Weekend');
    const buttons: TelegramBot.InlineKeyboardButton[][] = [];
    if (hasMore) {
      buttons.push([{ text: 'Show More →', callback_data: 'quick:weekend:1' }]);
    }
    buttons.push([{ text: '← Back to Categories', callback_data: 'home' }]);
    await bot.sendMessage(msg.chat.id, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (err) {
    await bot.sendMessage(msg.chat.id, 'Failed to fetch weekend events. Try again later.');
  }
});

bot.onText(/\/search (.+)/, async (msg, match) => {
  const query = match?.[1] || '';
  if (!query) return;

  try {
    const data = await apiPost('/api/v1/discover', { query, limit: 10 });
    if (!data.events.length) {
      return bot.sendMessage(msg.chat.id, `No events found for "${escapeHtml(query)}". Try /events to browse categories.`, { parse_mode: 'HTML' });
    }
    const { text } = formatEventList(data.events, `🔍 Results for "${escapeHtml(query)}"`);
    await bot.sendMessage(msg.chat.id, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[{ text: '← Back to Categories', callback_data: 'home' }]],
      },
    });
  } catch (err) {
    await bot.sendMessage(msg.chat.id, 'Search failed. Try again later.');
  }
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `<b>🐊 FlowB Commands</b>\n\n` +
    `/start — Browse events by category\n` +
    `/events — Show category menu\n` +
    `/tonight — Tonight's events\n` +
    `/weekend — This weekend's events\n` +
    `/search <query> — Search events\n` +
    `/help — Show this help`,
    { parse_mode: 'HTML' }
  );
});

// ---- Callback Queries (button presses) ----

bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  const msgId = query.message?.message_id;
  if (!chatId || !msgId) return;

  const data = query.data || '';
  await bot.answerCallbackQuery(query.id);

  try {
    // Home / category menu
    if (data === 'home') {
      const keyboard = await getCategoryKeyboard();
      return bot.editMessageText(
        `<b>🐊 FlowB — ETHDenver 2026 Events</b>\n\nPick a category to browse:`,
        {
          chat_id: chatId,
          message_id: msgId,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard },
        }
      );
    }

    // Search prompt
    if (data === 'search') {
      return bot.editMessageText(
        `<b>🔍 Search Events</b>\n\nSend a message with /search followed by your query.\n\nExamples:\n• /search AI agents\n• /search hackathon\n• /search brunch\n• /search Monad`,
        {
          chat_id: chatId,
          message_id: msgId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '← Back to Categories', callback_data: 'home' }]],
          },
        }
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
        title = '📊 All Events';
      } else {
        const result = await apiPost('/api/v1/discover', { mainCategory: catId, limit: 200 });
        events = result.events;
        const catData = await apiGet('/api/v1/categories');
        const cat = catData.categories.find((c: any) => c.id === catId);
        title = cat ? `${cat.emoji} ${cat.label}` : catId;
      }

      if (!events.length) {
        return bot.editMessageText(`No events in this category yet.`, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: {
            inline_keyboard: [[{ text: '← Back to Categories', callback_data: 'home' }]],
          },
        });
      }

      const { text, hasMore } = formatEventList(events, title, page);
      const buttons: TelegramBot.InlineKeyboardButton[][] = [];

      const navRow: TelegramBot.InlineKeyboardButton[] = [];
      if (page > 0) navRow.push({ text: '← Prev', callback_data: `cat:${catId}:${page - 1}` });
      if (hasMore) navRow.push({ text: 'Next →', callback_data: `cat:${catId}:${page + 1}` });
      if (navRow.length) buttons.push(navRow);
      buttons.push([{ text: '← Back to Categories', callback_data: 'home' }]);

      return bot.editMessageText(text, {
        chat_id: chatId,
        message_id: msgId,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: buttons },
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
        title = '🌙 Tonight';
      } else if (type === 'weekend') {
        const result = await apiGet('/api/v1/discover/weekend');
        events = result.events;
        title = '📅 This Weekend';
      } else if (type === 'week') {
        const now = new Date();
        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        const result = await apiPost('/api/v1/discover', {
          startDate: now.toISOString().slice(0, 10),
          endDate: endOfWeek.toISOString().slice(0, 10),
          limit: 200,
        });
        events = result.events;
        title = '📅 This Week';
      } else if (type === 'free') {
        const result = await apiPost('/api/v1/discover', { freeOnly: true, limit: 200 });
        events = result.events;
        title = '🆓 Free Events';
      } else {
        return;
      }

      if (!events.length) {
        return bot.editMessageText(`No events found for ${title}.`, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: {
            inline_keyboard: [[{ text: '← Back to Categories', callback_data: 'home' }]],
          },
        });
      }

      const { text, hasMore } = formatEventList(events, title, page);
      const buttons: TelegramBot.InlineKeyboardButton[][] = [];

      const navRow: TelegramBot.InlineKeyboardButton[] = [];
      if (page > 0) navRow.push({ text: '← Prev', callback_data: `quick:${type}:${page - 1}` });
      if (hasMore) navRow.push({ text: 'Next →', callback_data: `quick:${type}:${page + 1}` });
      if (navRow.length) buttons.push(navRow);
      buttons.push([{ text: '← Back to Categories', callback_data: 'home' }]);

      return bot.editMessageText(text, {
        chat_id: chatId,
        message_id: msgId,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: buttons },
      });
    }
  } catch (err) {
    console.error('Callback error:', err);
    try {
      await bot.editMessageText('Something went wrong. Try /start to go back.', {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: {
          inline_keyboard: [[{ text: '← Back to Categories', callback_data: 'home' }]],
        },
      });
    } catch {}
  }
});

// Handle plain text as search
bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return; // skip commands
  if (!msg.text?.trim()) return;

  const query = msg.text.trim();
  try {
    const data = await apiPost('/api/v1/discover', { query, limit: 10 });
    if (!data.events.length) {
      return bot.sendMessage(
        msg.chat.id,
        `No events found for "${escapeHtml(query)}". Try browsing categories with /events.`,
        { parse_mode: 'HTML' }
      );
    }
    const { text } = formatEventList(data.events, `🔍 "${escapeHtml(query)}"`);
    await bot.sendMessage(msg.chat.id, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[{ text: '← Browse Categories', callback_data: 'home' }]],
      },
    });
  } catch (err) {
    await bot.sendMessage(msg.chat.id, 'Search failed. Try /events to browse categories.');
  }
});

console.log('🐊 FlowB Telegram bot running...');
