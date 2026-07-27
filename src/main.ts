const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function formatPrice(value: number): string {
  return money.format(value).replace(/\s/g, "");
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

initBillingToggle();
initNavDrawer();
initReveal();
initContactForm();
initYear();
