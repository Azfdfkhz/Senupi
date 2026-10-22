// Logika bersama untuk server lokal (server.js) dan Vercel (api/message.js).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const recentRequests = new Map();

function isRateLimited(key) {
  const now = Date.now();
  if (recentRequests.size > 5000) {
    for (const [k, v] of recentRequests) if (now - v.start >= WINDOW_MS) recentRequests.delete(k);
  }
  const current = recentRequests.get(key);
  if (!current || now - current.start >= WINDOW_MS) {
    recentRequests.set(key, { start: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_PER_WINDOW;
}

async function sendToTelegram(name, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Server belum dikonfigurasi dengan Telegram Bot Token dan Chat ID.");
  }
  const text = [
    "🌷 Pesan baru dari Snoopy Message Garden",
    "",
    `Nama: ${name.replace(/[\r\n]+/g, " ") || "Anonim"}`,
    "",
    message,
    "",
    `Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    console.error("Telegram API rejected message:", result.description || response.status);
    throw new Error("Telegram belum bisa menerima pesan saat ini.");
  }
}

// Mengembalikan { status, body } untuk dikirim sebagai JSON.
async function processMessage(data, clientKey) {
  if (isRateLimited(clientKey)) {
    return { status: 429, body: { error: "Terlalu banyak pesan. Tunggu sebentar lalu coba lagi." } };
  }
  if (!data || typeof data !== "object") {
    return { status: 400, body: { error: "Format pesan tidak valid." } };
  }
  // Honeypot: terima diam-diam tanpa meneruskan ke Telegram.
  if (typeof data.website === "string" && data.website.trim()) {
    return { status: 200, body: { ok: true } };
  }
  const name = typeof data.name === "string" ? data.name.trim().slice(0, 50) : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (message.length < 2 || message.length > 1000) {
    return { status: 400, body: { error: "Pesan harus berisi 2–1000 karakter." } };
  }
  try {
    await sendToTelegram(name, message);
    return { status: 200, body: { ok: true } };
  } catch (error) {
    console.error(error.message);
    return { status: 502, body: { error: "Pesan gagal dikirim. Coba lagi beberapa saat." } };
  }
}

module.exports = { processMessage };
