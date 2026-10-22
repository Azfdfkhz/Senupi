(() => {
  const config = window.STORY_CONFIG;
  const $ = (id) => document.getElementById(id);
  const stage = $("snoopyStage");
  const bubble = $("messageBubble");
  const messageText = $("messageText");
  const caption = $("snoopyCaption");
  const nextBtn = $("nextBtn");
  const restartBtn = $("restartBtn");
  const progressBar = $("progressBar");
  const sceneLabel = $("sceneLabel");
  const progressPercent = $("progressPercent");
  const hint = $("hint");
  const soundToggle = $("soundToggle");
  const soundIcon = $("soundIcon");
  const soundLabel = $("soundLabel");
  const sparkles = $("sparkles");

  let current = 0;
  let soundEnabled = Boolean(config.soundEnabled);
  let audioContext = null;
  const total = config.scenes.length;

  function playTone(kind) {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext ||= new AudioCtx();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      const notes = kind === "boom" ? [[110, 0, .22], [75, .09, .28], [220, .12, .12]]
        : kind === "step" ? [[240, 0, .06]]
        : kind === "pop" ? [[440, 0, .08], [660, .08, .1]]
        : [[523, 0, .1], [659, .1, .12]];
      notes.forEach(([freq, delay, duration]) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = kind === "boom" ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(kind === "boom" ? .09 : .045, now + delay + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, now + delay + duration);
        osc.connect(gain); gain.connect(audioContext.destination);
        osc.start(now + delay); osc.stop(now + delay + duration + .02);
      });
    } catch (error) {
      // Audio adalah enhancement; cerita tetap berfungsi jika audio diblokir browser.
    }
  }

  function addSparkles(count = 7) {
    sparkles.replaceChildren();
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "sparkle";
      el.textContent = ["✦", "✧", "·"][i % 3];
      el.style.left = `${35 + Math.random() * 35}%`;
      el.style.top = `${42 + Math.random() * 27}%`;
      el.style.animationDelay = `${Math.random() * .2}s`;
      sparkles.append(el);
    }
    window.setTimeout(() => sparkles.replaceChildren(), 1200);
  }

  function renderScene(index) {
    const scene = config.scenes[index];
    current = index;
    stage.dataset.animation = scene.animation;
    messageText.textContent = scene.message;
    caption.textContent = scene.caption || "Snoopy";
    hint.textContent = scene.hint || "";
    bubble.classList.remove("hide", "pop");
    // Restart the pop-in animation each time a new message is shown.
    void bubble.offsetWidth;
    bubble.classList.add("pop");
    sceneLabel.textContent = `Adegan ${index + 1} dari ${total}`;
    const percent = Math.round(((index + 1) / total) * 100);
    progressPercent.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
    nextBtn.innerHTML = index === total - 1
      ? 'Ulangi cerita <span aria-hidden="true">↺</span>'
      : 'Lanjutkan <span aria-hidden="true">→</span>';
    if (scene.animation === "dance" || scene.animation === "surprised") addSparkles(scene.animation === "surprised" ? 12 : 7);
    playTone(scene.sound);
  }

  nextBtn.addEventListener("click", () => {
    if (current === total - 1) {
      renderScene(0);
      return;
    }
    renderScene(current + 1);
  });

  restartBtn.addEventListener("click", () => renderScene(0));

  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    soundIcon.textContent = soundEnabled ? "♫" : "♪";
    soundLabel.textContent = soundEnabled ? "Suara aktif" : "Suara mati";
    if (soundEnabled) playTone("chime");
  });

  // Keep the story user-controlled: no automatic scene advancement.
  renderScene(0);
})();
