const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

// Muat file .env (jika ada) tanpa dependency. Variabel yang sudah diset di environment tidak ditimpa.
try {
  const envText = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || line.trim().startsWith("#")) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
} catch { /* .env opsional */ }

const PORT = Number(process.env.PORT || 8000);
const ROOT = __dirname;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_BODY = 12_000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const recentRequests = new Map();
// Set TRUST_PROXY=true jika di belakang proxy/hosting (Nginx, Cloudflare, Render, dll.)
// agar rate limit memakai IP pengunjung asli, bukan IP proxy.
const TRUST_PROXY = process.env.TRUST_PROXY === "true";

// Hanya file ini yang boleh diakses publik. File lain (.env, server.js, package.json, dll.) tidak pernah disajikan.
const PUBLIC_FILES = new Set(["index.html", "style.css", "script.js", "messages.js", "visitor-message.js"]);
const PUBLIC_DIRS = ["assets"];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > MAX_BODY) {
        reject(new Error("BODY_TOO_LARGE"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(new Error("INVALID_JSON")); }
    });
    req.on("error", reject);
  });
}

function getClientKey(req) {
  if (TRUST_PROXY) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || "unknown";
}

function rateLimit(req) {
  const key = getClientKey(req);
  const now = Date.now();
  // Bersihkan entri lama supaya Map tidak membesar tanpa batas.
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
  if (!BOT_TOKEN || !CHAT_ID) {
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

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      disable_web_page_preview: true
    }),
    signal: AbortSignal.timeout(10_000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    console.error("Telegram API rejected message:", result.description || response.status);
    throw new Error("Telegram belum bisa menerima pesan saat ini.");
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    console.error("Unhandled request error:", error.message);
    if (!res.headersSent) sendJson(res, 500, { error: "Terjadi kesalahan pada server." });
    else res.destroy();
  });
});

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/message") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { error: "Metode tidak diizinkan." });
    }
    if (rateLimit(req)) {
      return sendJson(res, 429, { error: "Terlalu banyak pesan. Tunggu sebentar lalu coba lagi." });
    }

    let data;
    try {
      data = await readJson(req);
    } catch (error) {
      return sendJson(res, error.message === "BODY_TOO_LARGE" ? 413 : 400, {
        error: error.message === "BODY_TOO_LARGE" ? "Ukuran pesan terlalu besar." : "Format pesan tidak valid."
      });
    }

    // Honeypot field: silently accept automated spam without forwarding it.
    if (typeof data.website === "string" && data.website.trim()) {
      return sendJson(res, 200, { ok: true });
    }

    const name = typeof data.name === "string" ? data.name.trim().slice(0, 50) : "";
    const message = typeof data.message === "string" ? data.message.trim() : "";
    if (message.length < 2 || message.length > 1000) {
      return sendJson(res, 400, { error: "Pesan harus berisi 2–1000 karakter." });
    }

    try {
      await sendToTelegram(name, message);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      console.error(error.message);
      return sendJson(res, 502, { error: "Pesan gagal dikirim. Coba lagi beberapa saat." });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { error: "Metode tidak diizinkan." });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return sendJson(res, 400, { error: "URL tidak valid." });
  }
  if (pathname === "/") pathname = "/index.html";
  const relative = pathname.replace(/^\/+/, "");
  const isPublic = PUBLIC_FILES.has(relative) || PUBLIC_DIRS.some(dir => relative.startsWith(`${dir}/`));
  if (!isPublic || relative.includes("\0")) {
    return sendJson(res, 404, { error: "File tidak ditemukan." });
  }
  const filePath = path.resolve(ROOT, relative);
  if (!filePath.startsWith(ROOT + path.sep)) {
    return sendJson(res, 403, { error: "Akses ditolak." });
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) return sendJson(res, 404, { error: "File tidak ditemukan." });
    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'"
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).on("error", () => res.destroy()).pipe(res);
  });
}

server.listen(PORT, () => {
  console.log(`Snoopy Message Garden berjalan di http://localhost:${PORT}`);
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("Telegram belum dikonfigurasi. Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID.");
  }
});
