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
const MAX_BODY = 12_000;
const { processMessage } = require("./lib/message-core");
// Set TRUST_PROXY=true jika di belakang proxy/hosting (Nginx, Cloudflare, Render, dll.)
// agar rate limit memakai IP pengunjung asli, bukan IP proxy.
const TRUST_PROXY = process.env.TRUST_PROXY === "true";

// Hanya file ini yang boleh diakses publik. File lain (.env, server.js, package.json, dll.) tidak pernah disajikan.
const PUBLIC_FILES = new Set(["index.html", "style.css", "script.js", "messages.js", "visitor-message.js"]);
const PUBLIC_DIRS = ["assets"];

function getClientKey(req) {
  if (TRUST_PROXY) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || "unknown";
}

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
    let data;
    try {
      data = await readJson(req);
    } catch (error) {
      return sendJson(res, error.message === "BODY_TOO_LARGE" ? 413 : 400, {
        error: error.message === "BODY_TOO_LARGE" ? "Ukuran pesan terlalu besar." : "Format pesan tidak valid."
      });
    }
    const { status, body } = await processMessage(data, getClientKey(req));
    return sendJson(res, status, body);
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
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn("Telegram belum dikonfigurasi. Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID.");
  }
});
