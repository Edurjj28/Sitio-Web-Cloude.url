// Selector de estrellas (clic, hover y arrastre) y animación de celebración
import { state } from "./state.js";
import { STAR_DESCRIPTIONS } from "./config.js";

const STAR_SVG = `
  <svg class="w-9 h-9 sm:w-10 sm:h-10 text-slate-300 fill-current" viewBox="0 0 24 24">
    <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/>
  </svg>`;

let lastRenderedStars = 0;

function getButtons() {
  return document.querySelectorAll("#star-selector button[data-star]");
}

function beatNewlyFilled(prev, next) {
  let step = 0;
  getButtons().forEach((btn) => {
    const val = Number(btn.dataset.star);
    if (val > prev && val <= next) {
      setTimeout(() => {
        btn.classList.remove("is-beating");
        void btn.offsetWidth;
        btn.classList.add("is-beating");
        setTimeout(() => btn.classList.remove("is-beating"), 450);
      }, step++ * 55);
    }
  });
}

function paintStars(count, animate = true) {
  if (animate && count > lastRenderedStars) beatNewlyFilled(lastRenderedStars, count);
  lastRenderedStars = count;

  getButtons().forEach((btn) => {
    const active = Number(btn.dataset.star) <= count;
    const svg = btn.querySelector("svg");
    btn.classList.toggle("is-active", active);
    svg.classList.toggle("text-amber-400", active);
    svg.classList.toggle("text-slate-300", !active);
    btn.setAttribute("aria-pressed", String(Number(btn.dataset.star) === state.selectedStars));
  });

  document.getElementById("star-label").textContent = STAR_DESCRIPTIONS[count] || STAR_DESCRIPTIONS[5];
}

function starFromPointerX(clientX) {
  const buttons = Array.from(getButtons());
  if (!buttons.length) return state.selectedStars;

  const first = buttons[0].getBoundingClientRect();
  const last = buttons[buttons.length - 1].getBoundingClientRect();
  if (clientX <= first.left + first.width * 0.2) return 1;
  if (clientX >= last.right - last.width * 0.1) return 5;

  for (let i = 0; i < buttons.length; i++) {
    if (clientX <= buttons[i].getBoundingClientRect().right) return i + 1;
  }
  return 5;
}

function selectStar(val) {
  state.selectedStars = val;
  paintStars(val, true);
}

// Restablece a 5 estrellas al abrir el modal
export function resetStars() {
  state.selectedStars = 5;
  lastRenderedStars = 0;
  paintStars(5, true);
}

export function initStars() {
  const selector = document.getElementById("star-selector");

  selector.innerHTML = [1, 2, 3, 4, 5].map((n) => `
    <button type="button" data-star="${n}" class="star-choice p-1.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" aria-label="${n} ${n === 1 ? "estrella" : "estrellas"}">
      ${STAR_SVG}
    </button>`).join("");

  // Hover (solo mouse)
  getButtons().forEach((btn) => {
    btn.addEventListener("mouseenter", () => paintStars(Number(btn.dataset.star), true));
    btn.addEventListener("mouseleave", () => {
      lastRenderedStars = Math.min(lastRenderedStars, state.selectedStars);
      paintStars(state.selectedStars, false);
    });
  });

  // Clic / toque / arrastre
  let dragging = false;

  selector.addEventListener("pointerdown", (e) => {
    dragging = true;
    try { selector.setPointerCapture(e.pointerId); } catch (_) {}
    selectStar(starFromPointerX(e.clientX));
  });

  selector.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const val = starFromPointerX(e.clientX);
    if (val !== state.selectedStars) selectStar(val);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try {
      if (selector.hasPointerCapture(e.pointerId)) selector.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };
  selector.addEventListener("pointerup", endDrag);
  selector.addEventListener("pointercancel", endDrag);

  // Teclado (Enter / Espacio sobre una estrella)
  selector.addEventListener("keydown", (e) => {
    const btn = e.target.closest("button[data-star]");
    if (btn && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      selectStar(Number(btn.dataset.star));
    }
  });

  paintStars(state.selectedStars, false);
}

export function launchFiveStarCelebration() {
  const layer = document.getElementById("celebration-layer");
  if (!layer) return;
  layer.innerHTML = "";

  const palette = ["#008556", "#C5A059", "#F59E0B", "#10B981", "#38BDF8", "#F43F5E", "#A855F7"];
  const totalConfetti = 52;
  const totalStreamers = 14;

  for (let i = 0; i < totalConfetti; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    const isCircle = i % 3 === 0;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${isCircle ? 9 : 7 + (i % 5)}px`;
    piece.style.height = `${isCircle ? 9 : 11 + (i % 7)}px`;
    piece.style.borderRadius = isCircle ? "999px" : "3px";
    piece.style.backgroundColor = palette[i % palette.length];
    piece.style.setProperty("--drift-x", `${(Math.random() - 0.5) * 180}px`);
    piece.style.setProperty("--rot-end", `${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540)}deg`);
    piece.style.animationDuration = `${1.6 + Math.random() * 1.1}s`;
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    layer.appendChild(piece);
  }

  for (let j = 0; j < totalStreamers; j++) {
    const ribbon = document.createElement("span");
    ribbon.className = "streamer-ribbon";
    ribbon.style.left = `${4 + j * (92 / totalStreamers) + (Math.random() - 0.5) * 4}%`;
    ribbon.style.background = `linear-gradient(180deg, ${palette[j % palette.length]} 0%, ${palette[(j + 2) % palette.length]} 100%)`;
    ribbon.style.setProperty("--drift-x", `${(Math.random() - 0.5) * 90}px`);
    ribbon.style.animationDuration = `${1.9 + Math.random() * 0.9}s`;
    ribbon.style.animationDelay = `${Math.random() * 0.25}s`;
    layer.appendChild(ribbon);
  }

  setTimeout(() => { layer.innerHTML = ""; }, 3200);
}
