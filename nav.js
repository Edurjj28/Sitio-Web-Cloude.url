// Navegación entre pestañas
import { renderQRCodes } from "./projects.js";
import { refreshIcons } from "./ui.js";

const VIEWS = ["proyectos", "qr", "admin"];

export function switchTab(tabName) {
  // La administración solo está disponible en pantallas grandes
  if (tabName === "admin" && window.innerWidth < 768) tabName = "proyectos";

  VIEWS.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    const btn = document.getElementById(`tab-btn-${v}`);
    if (!el || !btn) return;

    if (v === tabName) {
      el.classList.remove("hidden", "animate-fade-up");
      void el.offsetWidth; // reinicia la animación
      el.classList.add("animate-fade-up");
      btn.classList.remove("text-emerald-100", "hover:text-white");
      btn.classList.add("bg-white", "text-[#005C3E]", "shadow-sm");
    } else {
      el.classList.add("hidden");
      btn.classList.add("text-emerald-100", "hover:text-white");
      btn.classList.remove("bg-white", "text-[#005C3E]", "shadow-sm");
    }
  });

  if (tabName === "qr") renderQRCodes();
  refreshIcons();
}

export function initNav() {
  document.getElementById("brand-home").addEventListener("click", () => switchTab("proyectos"));
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  window.addEventListener("resize", () => {
    const admin = document.getElementById("view-admin");
    if (window.innerWidth < 768 && admin && !admin.classList.contains("hidden")) {
      switchTab("proyectos");
    }
  });
}
