// Diagnosa Telegram: jalankan `npm run check`
// Memeriksa: Node.js, file .env, token bot, koneksi ke Telegram, chat ID, dan mengirim pesan percobaan.
const fs = require("node:fs");
const path = require("node:path");

const ok = (t) => console.log(`✅ ${t}`);
const bad = (t, hint) => { console.log(`❌ ${t}`); if (hint) console.log(`   → ${hint}`); };

// Muat .env (sama seperti dev-server.js)
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  ok("File .env ditemukan");
} else {
  console.log("ℹ️  File .env tidak ada (tidak masalah jika variabel diset lewat environment)");
}

(async () => {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 18) {
    bad(`Node.js ${process.versions.node} terlalu lama`, "Butuh Node.js 18 atau lebih baru (cek dengan `node -v`).");
    return;
  }
  ok(`Node.js ${process.versions.node}`);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || token.includes("isi_token")) {
    bad("TELEGRAM_BOT_TOKEN belum diisi", "Salin .env.example menjadi .env (nama file harus persis `.env`), lalu isi token dari @BotFather.");
    return;
  }
  if (!chatId || chatId.includes("isi_chat")) {
    bad("TELEGRAM_CHAT_ID belum diisi", "Isi dengan angka chat ID tujuan (lihat README).");
    return;
  }
  ok("Token dan chat ID terisi");

  const call = async (method, body) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(10_000)
    });
    return res.json().catch(() => ({}));
  };

  let me;
  try {
    me = await call("getMe");
  } catch (error) {
    bad(`Tidak bisa terhubung ke api.telegram.org (${error.cause?.code || error.name})`,
      "Cek internet. Di beberapa jaringan/ISP Telegram diblokir: coba ganti jaringan (hotspot HP), DNS 1.1.1.1, atau VPN.");
    return;
  }
  if (!me.ok) {
    bad(`Token ditolak Telegram: ${me.description}`, "Salin ulang token dari @BotFather. Jangan ada spasi, tanda kutip ekstra, atau kata 'bot' di depannya.");
    return;
  }
  ok(`Token valid: bot @${me.result.username}`);

  const sent = await call("sendMessage", { chat_id: chatId, text: "✅ Tes dari Snoopy Message Garden: koneksi berhasil!" });
  if (!sent.ok) {
    bad(`Gagal kirim pesan: ${sent.description}`);
    if (/chat not found/i.test(sent.description)) {
      console.log("   → Chat ID salah, ATAU kamu belum membuka bot dan menekan Start. Buka t.me/" + me.result.username + ", tekan Start, kirim satu pesan, lalu jalankan lagi.");
      const updates = await call("getUpdates");
      const ids = [...new Set((updates.result || []).map(u => u.message?.chat?.id).filter(Boolean))];
      if (ids.length) console.log(`   → Chat ID yang terdeteksi dari pesan masuk ke bot: ${ids.join(", ")}`);
    } else if (/blocked|forbidden/i.test(sent.description)) {
      console.log("   → Bot diblokir atau tidak punya izin. Tekan Start / unblock bot, atau tambahkan bot ke grup.");
    }
    return;
  }
  ok("Pesan percobaan terkirim. Cek Telegram-mu! Semuanya siap.");
})().catch(e => console.log("❌ Error tak terduga:", e.message));
