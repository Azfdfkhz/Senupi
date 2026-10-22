# Snoopy Message Garden

Website interaktif HTML, CSS, dan JavaScript vanilla dengan formulir agar pengunjung dapat mengirim pesan ke Telegram.

## Menjalankan secara lokal

Memerlukan Node.js 18 atau lebih baru (tidak perlu `npm install`).

1. Ekstrak proyek.
2. Buat file `.env` dengan menyalin `.env.example`, lalu isi konfigurasi Telegram.
3. Jalankan server. File `.env` dibaca otomatis oleh `dev-server.js` (atau pakai environment variables):
   ```bash
   npm start
   ```
4. Buka `http://localhost:8000`.

Jika pesan tidak terkirim saat dijalankan lokal, jalankan `npm run check`. Perintah ini memeriksa versi Node, file `.env`, token, koneksi ke Telegram, dan chat ID, lalu mengirim pesan percobaan serta menjelaskan apa yang salah. Pesan error lengkap juga tampil di terminal tempat `npm start` berjalan. Buka website lewat `http://localhost:8000` (bukan dengan klik dua kali `index.html`).

Jangan pernah menaruh bot token di `messages.js`, `script.js`, atau kode frontend. Token hanya boleh berada di environment server.

## Menghubungkan bot Telegram

1. Di Telegram, buka `@BotFather`, buat bot atau pilih bot yang sudah ada dengan `/newbot`. Simpan token secara privat.
2. Buka chat dengan bot milikmu dan tekan **Start**.
3. Dapatkan chat ID tujuan. Cara sederhana untuk chat pribadi: kirim pesan ke bot, lalu buka:
   `https://api.telegram.org/bot<TOKEN_BOT_KAMU>/getUpdates`
   Cari `message.chat.id` pada hasil JSON. Jangan membagikan URL tersebut karena berisi token.
4. Set `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` sebagai environment variables di server/hosting.
5. Restart server. Kirim pesan percobaan dari formulir website.

Untuk grup: tambahkan bot ke grup, kirim pesan di grup, lalu periksa `getUpdates` untuk ID grup. Pastikan bot memiliki izin yang diperlukan.

## Deploy ke Vercel

Struktur: file website ada di `public/`, backend serverless di `api/` dan `lib/`. `dev-server.js` hanya untuk menjalankan lokal. Vercel tidak menjalankan `dev-server.js`; form memakai fungsi serverless `api/message.js` (logika yang sama ada di `lib/message-core.js`).

1. Upload proyek ke GitHub (tanpa `.env`) lalu import di Vercel. Framework preset: **Other**, tanpa build command, Root Directory dikosongkan (root repo).
2. Di **Project Settings → Environment Variables**, tambahkan `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` (centang Production, Preview, Development).
3. **Redeploy** setelah menambah variabel (variabel baru tidak berlaku untuk deployment lama).
4. Cek log di tab **Functions/Logs** jika pesan gagal terkirim.

Catatan: rate limit di Vercel bersifat sederhana (per instance fungsi). Untuk trafik besar, gunakan Vercel Firewall/WAF atau CAPTCHA.

## Hosting lain

GitHub Pages saja tidak bisa menjalankan backend. Gunakan Vercel (di atas) atau hosting Node.js yang menjalankan `npm start`; atur dua environment variables Telegram di dashboard, jangan commit `.env`.

## Keamanan dan batasan

- Server hanya menyajikan file publik (isi folder `public/`). `.env`, `dev-server.js`, dll. tidak bisa diunduh lewat browser.
- Jika di-deploy di belakang proxy/hosting, set `TRUST_PROXY=true` agar rate limit memakai IP pengunjung asli.
- Bot token tidak pernah dikirim ke browser.
- Validasi pesan 2–1000 karakter, honeypot, dan rate limit sederhana di backend.
- Jangan meminta pengguna mengirim kata sandi, data finansial, atau informasi pribadi sensitif.
- Untuk website publik dengan trafik besar, gunakan rate limiting berbasis IP di reverse proxy/hosting, CAPTCHA jika diperlukan, dan logging yang tidak menyimpan pesan sensitif.

## Mengganti isi cerita

Edit `messages.js`, ganti `PESAN_1` dan `PESAN_2`, serta sesuaikan adegan lain. Form pesan pengunjung dikelola oleh `visitor-message.js`.
