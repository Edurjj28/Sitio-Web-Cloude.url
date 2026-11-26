// Punto de entrada: autenticación, sincronización en vivo y eventos
import {
  auth, projectsCol, metaDocRef,
  signInAnonymously, onAuthStateChanged,
  doc, setDoc, getDoc, getDocs, onSnapshot
} from "./firebase.js";
import { DEMO_PROJECTS } from "./config.js";
import { state } from "./state.js";
import { refreshDeviceVotedBanner } from "./storage.js";
import { refreshIcons, showToast, updateConnectionStatus } from "./ui.js";
import { initNav, switchTab } from "./nav.js";
import { initStars } from "./stars.js";
import {
  renderProjects, renderQRCodes, renderAdminList, suggestNextCode,
  handleSaveProject, editProject, resetAdminForm,
  deleteSingleProject, deleteAllProjects, resetAllVotes
} from "./projects.js";
import { openVoteModal, closeVoteModal, handleRutInput, submitVote } from "./voting.js";

/* ---------- Eventos de la interfaz ---------- */
function bindEvents() {
  initNav();
  initStars();

  document.getElementById("search-input").addEventListener("input", renderProjects);
  document.getElementById("print-btn").addEventListener("click", () => window.print());

  // Tarjetas de proyectos -> abrir modal
  document.getElementById("projects-grid").addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="vote"]');
    if (btn) openVoteModal(btn.dataset.id);
  });

  // Lista de administración -> editar / eliminar
  document.getElementById("admin-projects-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "edit") editProject(btn.dataset.id);
    if (btn.dataset.action === "delete") deleteSingleProject(btn.dataset.id);
  });

  document.getElementById("project-form").addEventListener("submit", handleSaveProject);
  document.getElementById("cancel-edit-btn").addEventListener("click", resetAdminForm);
  document.getElementById("reset-votes-btn").addEventListener("click", resetAllVotes);
  document.getElementById("delete-all-btn").addEventListener("click", deleteAllProjects);

  // Modal
  const modal = document.getElementById("vote-modal");
  document.getElementById("modal-close-btn").addEventListener("click", closeVoteModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeVoteModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeVoteModal();
  });
  document.getElementById("vote-form").addEventListener("submit", submitVote);
  document.getElementById("voter-rut").addEventListener("input", (e) => handleRutInput(e.target));
}

/* ---------- Deep link ?proyecto=PROY-01 ---------- */
function handleDeepLink() {
  if (state.initialDeepLinkHandled || state.projects.length === 0) return;
  state.initialDeepLinkHandled = true;

  const targetId = new URLSearchParams(window.location.search).get("proyecto");
  if (!targetId) return;

  const found = state.projects.find((p) => p.id.toLowerCase() === targetId.toLowerCase());
  if (found) openVoteModal(found.id);
  else showToast(`El proyecto "${targetId}" no se encuentra disponible.`, "warning");
}

/* ---------- Firebase ---------- */
let unsubscribeProjects = null;

async function seedIfEmpty() {
  try {
    const metaSnap = await getDoc(metaDocRef);
    if (metaSnap.exists()) return;

    const existing = await getDocs(projectsCol);
    if (existing.empty) {
      for (const p of DEMO_PROJECTS) await setDoc(doc(projectsCol, p.id), p);
    }
    await setDoc(metaDocRef, { initialized: true, createdAt: Date.now() });
  } catch (e) {
    console.warn("Verificación inicial:", e);
  }
}

function startRealtimeSync() {
  if (unsubscribeProjects) return; // evita suscripciones duplicadas

  unsubscribeProjects = onSnapshot(
    projectsCol,
    (snapshot) => {
      state.projects = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

      renderProjects();
      renderQRCodes();
      renderAdminList();
      suggestNextCode();
      handleDeepLink();
    },
    (error) => {
      console.error("Error en Firestore:", error);
      updateConnectionStatus(false, "Sin acceso a datos (revisa reglas de Firestore)");
    }
  );
}

function initFirebase() {
  signInAnonymously(auth).catch((err) => {
    console.error("Error de autenticación:", err);
    updateConnectionStatus(false, "Error de conexión con Firebase");
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    updateConnectionStatus(true, "Conectado en vivo · Sincronización activa");
    await seedIfEmpty();
    startRealtimeSync();
  });
}

/* ---------- Inicio ---------- */
bindEvents();
refreshDeviceVotedBanner();
if (window.location.protocol === "file:") {
  document.getElementById("local-warning").classList.remove("hidden");
}
switchTab("proyectos");
initFirebase();
refreshIcons();
