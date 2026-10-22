// Vercel Serverless Function: POST /api/message
const { processMessage } = require("../lib/message-core");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Cek cepat: buka /api/message di browser untuk memastikan fungsi aktif dan variabel terbaca.
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      function: "aktif",
      telegram_token_terisi: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      telegram_chat_id_terisi: Boolean(process.env.TELEGRAM_CHAT_ID)
    });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metode tidak diizinkan." });
  }

  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const key = forwarded || req.socket?.remoteAddress || "unknown";

  const { status, body } = await processMessage(data, key);
  return res.status(status).json(body);
};
