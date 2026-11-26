// Modal de votación, validación de RUT y registro del voto
import { rutRegistryCol, votesCol, projectsCol, db, doc, getDoc, runTransaction } from "./firebase.js";
import { state } from "./state.js";
import { cleanRutString, formatRut, validateRut } from "./utils.js";
import { getLocalVoteRecord, setLocalVoteRecord } from "./storage.js";
import { refreshIcons, showToast } from "./ui.js";
import { renderProjects } from "./projects.js";
import { resetStars, launchFiveStarCelebration } from "./stars.js";

const RUT_HINT = "Si ya votaste con tu RUT en este u otro proyecto, no podrás volver a votar.";
let rutCheckRequestId = 0;

function setFeedback(text, cls) {
  const el = document.getElementById("rut-feedback");
  el.textContent = text;
  el.className = `text-xs mt-1.5 ${cls}`;
}

function setAlreadyVotedWarning(message) {
  const box = document.getElementById("already-voted-box");
  const text = document.getElementById("already-voted-box-text");
  const btn = document.getElementById("confirm-vote-btn");

  if (message) {
    text.textContent = message;
    box.classList.remove("hidden");
    btn.disabled = true;
    refreshIcons();
  } else {
    box.classList.add("hidden");
    text.textContent = "";
    btn.disabled = false;
  }
}

export function openVoteModal(projectId) {
  const p = state.projects.find((item) => item.id === projectId);
  if (!p) return;

  state.selectedProject = p;
  resetStars();

  document.getElementById("modal-proj-code").textContent = p.id;
  document.getElementById("modal-proj-title").textContent = p.title;
  document.getElementById("modal-proj-team").textContent = `${p.category} · ${p.team}`;
  document.getElementById("modal-proj-desc").textContent = p.description;

  const rutInput = document.getElementById("voter-rut");
  rutInput.value = "";
  setFeedback(RUT_HINT, "text-slate-500");

  const localRec = getLocalVoteRecord();
  setAlreadyVotedWarning(
    localRec && localRec.projectId
      ? `Este dispositivo ya registró el voto del RUT ${localRec.rutFormatted || ""} en el proyecto ${localRec.projectId} (${localRec.projectTitle || ""}). Cada persona solo puede votar por 1 proyecto.`
      : null
  );

  const modal = document.getElementById("vote-modal");
  const card = document.getElementById("vote-modal-card");
  card.classList.remove("animate-modal-out", "animate-modal");
  void card.offsetWidth;
  card.classList.add("animate-modal");

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  if (!localRec) setTimeout(() => rutInput.focus(), 120);
}

export function closeVoteModal() {
  const modal = document.getElementById("vote-modal");
  const card = document.getElementById("vote-modal-card");

  card.classList.remove("animate-modal");
  card.classList.add("animate-modal-out");

  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    card.classList.remove("animate-modal-out");
    state.selectedProject = null;

    if (window.location.search.includes("proyecto=")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, 200);
}

export async function handleRutInput(input) {
  input.value = formatRut(input.value);
  const clean = cleanRutString(input.value);
  const localRec = getLocalVoteRecord();

  if (clean.length < 8) {
    setFeedback("Ingresa tu RUT sin espacios (ej: 19.456.789-K).", "text-slate-500");
    if (!localRec) setAlreadyVotedWarning(null);
    return;
  }

  if (!validateRut(clean)) {
    setFeedback("El dígito verificador del RUT no coincide.", "text-red-600 font-semibold");
    if (!localRec) setAlreadyVotedWarning(null);
    return;
  }

  setFeedback("Verificando disponibilidad del RUT...", "text-slate-600 font-semibold");
  const currentReq = ++rutCheckRequestId;

  try {
    const snap = await getDoc(doc(rutRegistryCol, clean));
    if (currentReq !== rutCheckRequestId) return; // llegó una consulta más nueva

    if (snap.exists()) {
      const prevId = snap.data()?.projectId || "otro proyecto";
      const prevObj = state.projects.find((item) => item.id === prevId);
      const prevName = prevObj ? ` (${prevObj.title})` : "";
      setFeedback(`Este RUT ya votó en ${prevId}${prevName}. No puede votar por otro proyecto.`, "text-red-600 font-bold");
      setAlreadyVotedWarning(`El RUT ${input.value} ya utilizó su único voto en el proyecto ${prevId}${prevName}. No es posible votar por ningún otro proyecto.`);
    } else if (!localRec) {
      setAlreadyVotedWarning(null);
      setFeedback("RUT disponible para emitir tu único voto en este proyecto.", "text-emerald-600 font-semibold");
    }
  } catch (_) {
    if (!localRec) {
      setAlreadyVotedWarning(null);
      setFeedback("RUT válido listo para registrar tu único voto.", "text-emerald-600 font-semibold");
    }
  }
}

export async function submitVote(e) {
  e.preventDefault();
  if (!state.selectedProject) return;

  const localRec = getLocalVoteRecord();
  if (localRec && localRec.projectId) {
    showToast(`Este dispositivo ya votó en ${localRec.projectId} con el RUT ${localRec.rutFormatted || ""}. Solo se permite 1 voto.`, "warning");
    return;
  }

  const rutInput = document.getElementById("voter-rut");
  const formattedRut = rutInput.value.trim();
  const cleanRut = cleanRutString(formattedRut);

  if (!validateRut(cleanRut)) {
    showToast("Por favor ingresa un RUT chileno válido.", "error");
    rutInput.focus();
    return;
  }

  const stars = state.selectedStars;
  if (stars < 1 || stars > 5) {
    showToast("Selecciona entre 1 y 5 estrellas.", "warning");
    return;
  }

  const btn = document.getElementById("confirm-vote-btn");
  btn.disabled = true;
  btn.innerHTML = `<span>Validando y guardando voto...</span>`;

  const { id: projId, title: projTitle } = state.selectedProject;
  const rutRef = doc(rutRegistryCol, cleanRut);
  const voteRef = doc(votesCol, `${projId}_${cleanRut}`);
  const projectRef = doc(projectsCol, projId);

  try {
    await runTransaction(db, async (tx) => {
      const rutSnap = await tx.get(rutRef);
      if (rutSnap.exists()) {
        throw new Error(`ALREADY_VOTED_GLOBAL:${rutSnap.data()?.projectId || "otro proyecto"}`);
      }
      if ((await tx.get(voteRef)).exists()) {
        throw new Error(`ALREADY_VOTED_GLOBAL:${projId}`);
      }
      const projSnap = await tx.get(projectRef);
      if (!projSnap.exists()) throw new Error("PROJECT_NOT_FOUND");

      const now = Date.now();
      tx.set(rutRef, { rut: cleanRut, rutFormatted: formattedRut, projectId: projId, projectTitle: projTitle, stars, timestamp: now });
      tx.set(voteRef, { projectId: projId, rut: cleanRut, stars, timestamp: now });
      tx.update(projectRef, {
        votes: (projSnap.data().votes || 0) + 1,
        starsTotal: (projSnap.data().starsTotal || 0) + stars
      });
    });

    setLocalVoteRecord({ rut: cleanRut, rutFormatted: formattedRut, projectId: projId, projectTitle: projTitle, stars, timestamp: Date.now() });
    renderProjects();

    if (stars === 5) launchFiveStarCelebration();
    closeVoteModal();
    showToast(
      stars === 5
        ? `¡5 estrellas para "${projTitle}"! Tu voto único con RUT ${formattedRut} quedó registrado.`
        : `¡Registraste ${stars} ${stars === 1 ? "estrella" : "estrellas"} para "${projTitle}"! Tu RUT ya no podrá votar por otros proyectos.`,
      "success"
    );
  } catch (err) {
    if (err.message?.startsWith("ALREADY_VOTED_GLOBAL:")) {
      const prevId = err.message.split(":")[1];
      const prevObj = state.projects.find((item) => item.id === prevId);
      const label = prevObj ? `${prevId} (${prevObj.title})` : prevId;
      setAlreadyVotedWarning(`El RUT ${formattedRut} ya votó en ${label}. Cada persona solo puede votar por un único proyecto en toda la feria.`);
      showToast(`El RUT ${formattedRut} ya votó en ${label}. No puede votar por otros proyectos.`, "warning");
    } else {
      console.error(err);
      showToast("No se pudo registrar el voto. Verifica tu conexión a internet.", "error");
    }
  } finally {
    btn.innerHTML = `<i data-lucide="check-circle-2" class="w-5 h-5"></i><span>Confirmar Voto Único</span>`;
    // Solo se rehabilita si no hay un aviso de "voto ya usado"
    btn.disabled = !document.getElementById("already-voted-box").classList.contains("hidden");
    refreshIcons();
  }
}
