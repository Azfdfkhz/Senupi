/* Ganti isi pesan di bawah ini kapan saja tanpa mengubah sistem animasi. */
window.STORY_CONFIG = {
  recipient: "",
  soundEnabled: true,
  manualControls: true,
  scenes: [
    {
      id: "welcome",
      animation: "idle",
      message: "Hai! Temani aku sebentar, yuk.",
      caption: "Snoopy sedang santai",
      hint: "Tekan “Lanjutkan” untuk mengikuti cerita.",
      sound: "chime"
    },
    {
      id: "walk",
      animation: "walk",
      message: "Aku punya sesuatu yang ingin kusampaikan...",
      caption: "Snoopy mulai berjalan",
      hint: "Sepertinya Snoopy mau menunjukkan sesuatu.",
      sound: "step"
    },
    {
      id: "message-1",
      animation: "point",
      message: "PESAN_1 — ganti teks ini di messages.js",
      caption: "Snoopy membawa pesan",
      hint: "Pesan pertama bisa kamu ubah di messages.js.",
      sound: "chime"
    },
    {
      id: "dance",
      animation: "dance",
      message: "Oke, intermezzo kecil dulu. Tadaaa! ✨",
      caption: "Snoopy sedang melucu",
      hint: "Kadang pesan serius butuh sedikit tarian.",
      sound: "pop"
    },
    {
      id: "message-2",
      animation: "point",
      message: "PESAN_2 — ganti teks ini di messages.js",
      caption: "Snoopy menyampaikan pesan",
      hint: "Pesan kedua bisa kamu ubah di messages.js.",
      sound: "chime"
    },
    {
      id: "surprise",
      animation: "surprised",
      message: "Nanti bakal ada sesuatu, yaitu BOM!",
      caption: "Snoopy punya kejutan",
      hint: "Ssst... kejutan besar akan datang. 💥",
      sound: "boom"
    },
    {
      id: "ending",
      animation: "wave",
      message: "Sampai jumpa! Semoga harimu penuh hal baik. ♡",
      caption: "Snoopy melambaikan tangan",
      hint: "Cerita selesai. Kamu bisa mengulanginya kapan saja.",
      sound: "chime"
    }
  ]
};
