(() => {
  const form = document.getElementById("visitorMessageForm");
  if (!form) return;
  const message = document.getElementById("visitorMessage");
  const name = document.getElementById("visitorName");
  const count = document.getElementById("charCount");
  const status = document.getElementById("formStatus");
  const submit = document.getElementById("sendMessageBtn");
  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle("error", isError);
  };

  message.addEventListener("input", () => {
    count.textContent = `${message.value.length}/1000`;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = message.value.trim();
    if (text.length < 2) {
      setStatus("Pesannya masih terlalu pendek. Coba tulis sedikit lagi, ya.", true);
      return;
    }
    if (text.length > 1000) {
      setStatus("Pesan maksimal 1000 karakter.", true);
      return;
    }

    submit.disabled = true;
    submit.textContent = "Mengirim...";
    setStatus("");
    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.value.trim(),
          message: text,
          website: form.elements.website.value
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Pesan belum berhasil dikirim. Coba lagi.");
      form.reset();
      count.textContent = "0/1000";
      setStatus("Pesanmu sudah dikirim ke Telegram. Terima kasih sudah mampir! ✿");
    } catch (error) {
      setStatus(error.message || "Ada kendala saat mengirim pesan. Coba lagi nanti.", true);
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Kirim ke Snoopy <span aria-hidden="true">↗</span>';
    }
  });
})();
