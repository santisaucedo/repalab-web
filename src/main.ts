const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function formatPrice(value: number): string {
  return money.format(value).replace(/\s/g, "");
}

type ThemePreference = "dark" | "light" | "system";

const storageKeys = {
  theme: "repalab-theme",
  sound: "repalab-sound",
  volume: "repalab-volume",
} as const;

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // La experiencia sigue funcionando si el navegador bloquea localStorage.
  }
}

function initPreferences(): void {
  const root = document.documentElement;
  const panel = document.querySelector<HTMLElement>("#preferencias");
  const openButton = document.querySelector<HTMLButtonElement>(".preferences-toggle");
  const closeButton = document.querySelector<HTMLButtonElement>(".preferences-close");
  const backdrop = document.querySelector<HTMLElement>(".preferences-backdrop");
  const themeButtons = document.querySelectorAll<HTMLButtonElement>("[data-theme-option]");
  const soundButton = document.querySelector<HTMLButtonElement>(".sound-toggle");
  const volumeInput = document.querySelector<HTMLInputElement>(".volume-control input");
  const volumeOutput = document.querySelector<HTMLOutputElement>(".volume-control output");
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  if (!panel || !openButton || !closeButton || !backdrop || !soundButton || !volumeInput || !volumeOutput) return;

  const storedTheme = readPreference(storageKeys.theme);
  let theme: ThemePreference =
    storedTheme === "light" || storedTheme === "system" || storedTheme === "dark"
      ? storedTheme
      : "dark";
  let soundEnabled = readPreference(storageKeys.sound) !== "off";
  const storedVolumeValue = readPreference(storageKeys.volume);
  const storedVolume = storedVolumeValue === null ? Number.NaN : Number(storedVolumeValue);
  let volume = Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 100
    ? storedVolume
    : 28;
  let audioContext: AudioContext | null = null;

  const resolvedTheme = (): "dark" | "light" =>
    theme === "system" ? (systemTheme.matches ? "dark" : "light") : theme;

  const applyTheme = () => {
    const activeTheme = resolvedTheme();
    root.dataset.theme = activeTheme;
    root.style.colorScheme = activeTheme;
    themeColor?.setAttribute("content", activeTheme === "dark" ? "#080b10" : "#f3f6f8");
    themeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeOption === theme));
    });
  };

  const applySoundControls = () => {
    soundButton.setAttribute("aria-checked", String(soundEnabled));
    volumeInput.disabled = !soundEnabled;
    volumeInput.value = String(volume);
    volumeOutput.value = `${volume}%`;
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const playClick = (tone = 460) => {
    if (!soundEnabled || volume === 0 || prefersReducedMotion.matches) return;
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(tone, now);
    oscillator.frequency.exponentialRampToValueAtTime(tone * 0.78, now + 0.045);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, (volume / 100) * 0.09), now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  };

  const setPanelOpen = (open: boolean) => {
    panel.hidden = !open;
    backdrop.hidden = !open;
    openButton.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("preferences-open", open);
    if (open) closeButton.focus();
    else openButton.focus();
  };

  openButton.addEventListener("click", () => setPanelOpen(Boolean(panel.hidden)));
  closeButton.addEventListener("click", () => setPanelOpen(false));
  backdrop.addEventListener("click", () => setPanelOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setPanelOpen(false);
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = button.dataset.themeOption;
      if (nextTheme !== "dark" && nextTheme !== "light" && nextTheme !== "system") return;
      theme = nextTheme;
      savePreference(storageKeys.theme, theme);
      applyTheme();
    });
  });

  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    savePreference(storageKeys.sound, soundEnabled ? "on" : "off");
    applySoundControls();
  });

  volumeInput.addEventListener("input", () => {
    volume = Number(volumeInput.value);
    volumeOutput.value = `${volume}%`;
    savePreference(storageKeys.volume, String(volume));
  });
  volumeInput.addEventListener("change", () => playClick(520));

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const interactive = target.closest("a, button, input[type='checkbox'], input[type='radio']");
    if (!interactive || interactive === volumeInput) return;
    const isOption = interactive.matches(".billing-btn, [data-theme-option], .sound-toggle");
    playClick(isOption ? 560 : 420);
  });

  systemTheme.addEventListener("change", () => {
    if (theme === "system") applyTheme();
  });

  applyTheme();
  applySoundControls();
}

function initBillingToggle(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".billing-btn");
  const amounts = document.querySelectorAll<HTMLElement>(".amount");
  const yearlyNotes = document.querySelectorAll<HTMLElement>(".yearly-only");

  const setBilling = (mode: "monthly" | "yearly") => {
    buttons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.billing === mode);
    });
    amounts.forEach((el) => {
      const value = Number(el.dataset[mode]);
      if (!Number.isNaN(value)) el.textContent = formatPrice(value);
    });
    yearlyNotes.forEach((note) => {
      note.hidden = mode !== "yearly";
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.billing === "yearly" ? "yearly" : "monthly";
      setBilling(mode);
    });
  });
}

function initNavDrawer(): void {
  const toggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
  const drawer = document.querySelector<HTMLElement>("#menu-movil");
  if (!toggle || !drawer) return;

  const close = () => {
    drawer.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });

  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", close);
  });
}

function initReveal(): void {
  const items = document.querySelectorAll<HTMLElement>(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
  );

  items.forEach((el) => observer.observe(el));
}

function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>("#contacto-form");
  const status = form?.querySelector<HTMLElement>(".form-status");
  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nombre = String(data.get("nombre") || "").trim();
    const email = String(data.get("email") || "").trim();
    const mensaje = String(data.get("mensaje") || "").trim();

    if (!nombre || !email || !mensaje) {
      status.textContent = "Completá todos los campos.";
      return;
    }

    const subject = encodeURIComponent(`Consulta RepaLab — ${nombre}`);
    const body = encodeURIComponent(
      `Nombre: ${nombre}\nEmail: ${email}\n\n${mensaje}`,
    );
    window.location.href = `mailto:hola@repalab.com.ar?subject=${subject}&body=${body}`;
    status.textContent = "Abriendo tu cliente de correo…";
    form.reset();
  });
}

function initYear(): void {
  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}

function initHeroCarousel(): void {
  const carousel = document.querySelector<HTMLElement>(".hero-carousel");
  const slides = Array.from(document.querySelectorAll<HTMLImageElement>("[data-hero-slide]"));
  const dots = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-hero-dot]"));
  const previous = document.querySelector<HTMLButtonElement>("[data-hero-prev]");
  const next = document.querySelector<HTMLButtonElement>("[data-hero-next]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!carousel || slides.length < 2 || !previous || !next) return;

  let active = 0;
  let timer: number | undefined;

  const show = (index: number) => {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const selected = slideIndex === active;
      slide.classList.toggle("is-active", selected);
      slide.setAttribute("aria-hidden", String(!selected));
    });
    dots.forEach((dot, dotIndex) => {
      const selected = dotIndex === active;
      dot.classList.toggle("is-active", selected);
      dot.setAttribute("aria-pressed", String(selected));
    });
  };

  const stop = () => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  const start = () => {
    stop();
    if (!reduceMotion.matches) {
      timer = window.setInterval(() => show(active + 1), 5200);
    }
  };

  previous.addEventListener("click", () => {
    show(active - 1);
    start();
  });
  next.addEventListener("click", () => {
    show(active + 1);
    start();
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      show(Number(dot.dataset.heroDot || 0));
      start();
    });
  });
  carousel.addEventListener("mouseenter", stop);
  carousel.addEventListener("mouseleave", start);
  carousel.addEventListener("focusin", stop);
  carousel.addEventListener("focusout", start);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  show(0);
  start();
}

initPreferences();
initBillingToggle();
initNavDrawer();
initReveal();
initContactForm();
initYear();
initHeroCarousel();
