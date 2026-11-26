// Catálogo, QR y administración de proyectos
import {
  db, projectsCol, votesCol, rutRegistryCol, metaDocRef,
  doc, setDoc, getDocs, deleteDoc, writeBatch
} from "./firebase.js";
import { state } from "./state.js";
import { escapeHtml } from "./utils.js";
import { getLocalVoteRecord, clearLocalVoteRecord } from "./storage.js";
import { refreshIcons, showToast } from "./ui.js";

/* ---------- Helpers ---------- */

function getAverageStars(p) {
  const votes = p.votes || 0;
  return votes === 0 ? "0.0" : ((p.starsTotal || 0) / votes).toFixed(1);
}

export function getStaticProjectUrl(projectId) {
  const url = new URL(window.location.href);
  url.search = `?proyecto=${encodeURIComponent(projectId)}`;
  url.hash = "";
  return url.toString();
}

// Firestore permite 500 operaciones por lote: se divide en bloques
async function commitInChunks(ops, size = 400) {
  for (let i = 0; i < ops.length; i += size) {
    const batch = writeBatch(db);
    ops.slice(i, i + size).forEach((op) => op(batch));
    await batch.commit();
  }
}

/* ---------- Catálogo ---------- */

export function renderProjects() {
  const grid = document.getElementById("projects-grid");
  const query = (document.getElementById("search-input")?.value || "").toLowerCase().trim();
  const localRec = getLocalVoteRecord();

  const filtered = state.projects.filter((p) =>
    [p.title, p.category, p.team, p.id].some((f) => String(f || "").toLowerCase().includes(query))
  );

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <i data-lucide="folder-open" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i>
        <p class="font-bold text-slate-700">No se encontraron proyectos</p>
        <p class="text-xs text-slate-500 mt-1">Intenta con otro término o agrega nuevos proyectos desde un computador.</p>
      </div>`;
    refreshIcons();
    return;
  }

  grid.innerHTML = filtered.map((p) => {
    const votes = p.votes || 0;
    const isMine = localRec && localRec.projectId === p.id;
    return `
      <article class="project-card bg-white rounded-2xl border ${isMine ? "border-emerald-400 ring-2 ring-emerald-500/20" : "border-slate-200/90"} p-5 sm:p-6 flex flex-col justify-between shadow-sm">
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="font-mono text-xs font-extrabold text-[#005C3E] bg-[#E6F4EF] px-2.5 py-1 rounded-lg border border-[#008556]/20">${escapeHtml(p.id)}</span>
            <div class="flex items-center gap-1.5">
              ${isMine ? '<span class="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Tu voto</span>' : ""}
              <span class="inline-flex items-center gap-1 text-xs font-extrabold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200">
                <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400 text-amber-500"></i>
                ${p.starsTotal || 0} pts (${getAverageStars(p)}★)
              </span>
            </div>
          </div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#008556] block mb-1">${escapeHtml(p.category)}</span>
          <h3 class="text-lg font-extrabold text-slate-900 leading-snug mb-2">${escapeHtml(p.title)}</h3>
          <p class="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed mb-4">${escapeHtml(p.description)}</p>
        </div>
        <div class="pt-4 border-t border-slate-100">
          <div class="flex items-center justify-between gap-2 text-xs text-slate-500 mb-3.5">
            <span class="flex items-center gap-1.5 min-w-0">
              <i data-lucide="users" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
              <span class="truncate font-medium">${escapeHtml(p.team)}</span>
            </span>
            <span class="font-semibold text-slate-600 shrink-0">${votes} ${votes === 1 ? "voto" : "votos"}</span>
          </div>
          <button type="button" data-action="vote" data-id="${escapeHtml(p.id)}" class="w-full btn-st text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm">
            <i data-lucide="star" class="w-4 h-4"></i>
            <span>Calificar con Estrellas (1 a 5)</span>
          </button>
        </div>
      </article>`;
  }).join("");

  refreshIcons();
}

/* ---------- Códigos QR ---------- */

export function renderQRCodes() {
  const container = document.getElementById("print-qr-area");
  if (!container) return;

  if (state.projects.length === 0) {
    container.innerHTML = `<div class="col-span-full bg-white p-8 rounded-2xl text-center text-sm text-slate-500">No hay proyectos para generar códigos QR.</div>`;
    return;
  }

  container.innerHTML = state.projects.map((p) => `
    <div class="qr-print-card bg-white rounded-2xl border-2 border-slate-200 p-6 flex flex-col items-center text-center shadow-sm">
      <div class="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <span class="text-xs font-extrabold uppercase tracking-wider text-[#005C3E]">Santo Tomás</span>
        <span class="font-mono text-xs font-extrabold bg-[#E6F4EF] text-[#005C3E] px-2.5 py-0.5 rounded-md">${escapeHtml(p.id)}</span>
      </div>
      <div data-qr="${escapeHtml(p.id)}" class="p-3 bg-white rounded-xl border border-slate-200 shadow-inner mb-4 flex items-center justify-center"></div>
      <h3 class="font-extrabold text-slate-900 text-base leading-snug mb-1">${escapeHtml(p.title)}</h3>
      <p class="text-xs text-slate-500 mb-3">${escapeHtml(p.team)}</p>
      <div class="w-full bg-[#005C3E] text-white text-xs font-bold py-2 px-3 rounded-xl">
        Escanea con tu celular para votar (1 voto por RUT)
      </div>
      <p class="text-[10px] text-slate-400 mt-2 break-all select-all">${escapeHtml(getStaticProjectUrl(p.id))}</p>
    </div>`).join("");

  if (typeof QRCode === "undefined") return;
  container.querySelectorAll("[data-qr]").forEach((el) => {
    new QRCode(el, {
      text: getStaticProjectUrl(el.dataset.qr),
      width: 176,
      height: 176,
      colorDark: "#00432D",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  });
}

/* ---------- Administración ---------- */

export function renderAdminList() {
  const container = document.getElementById("admin-projects-list");
  if (!container) return;

  if (state.projects.length === 0) {
    container.innerHTML = `
      <div class="py-10 text-center">
        <p class="text-sm font-bold text-slate-700">No hay proyectos registrados</p>
        <p class="text-xs text-slate-500 mt-1">Usa el formulario de la izquierda para agregar los stands reales de tu feria.</p>
      </div>`;
    return;
  }

  container.innerHTML = state.projects.map((p) => `
    <div class="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-mono text-xs font-extrabold text-[#005C3E] bg-[#E6F4EF] px-2 py-0.5 rounded">${escapeHtml(p.id)}</span>
          <span class="text-xs font-bold text-amber-700">${p.starsTotal || 0} estrellas</span>
          <span class="text-xs font-semibold text-slate-500">· ${p.votes || 0} votos</span>
        </div>
        <h4 class="font-bold text-slate-900 text-sm mt-1 truncate">${escapeHtml(p.title)}</h4>
        <p class="text-xs text-slate-500 truncate">${escapeHtml(p.category)} · ${escapeHtml(p.team)}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" data-action="edit" data-id="${escapeHtml(p.id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1">
          <i data-lucide="pencil" class="w-3.5 h-3.5"></i><span>Editar</span>
        </button>
        <button type="button" data-action="delete" data-id="${escapeHtml(p.id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i><span>Eliminar</span>
        </button>
      </div>
    </div>`).join("");

  refreshIcons();
}

export function suggestNextCode() {
  if (document.getElementById("edit-project-id").value) return;
  const padded = String(state.projects.length + 1).padStart(2, "0");
  document.getElementById("proj-code").value = `PROY-${padded}`;
}

export async function handleSaveProject(e) {
  e.preventDefault();
  const editId = document.getElementById("edit-project-id").value.trim();
  const rawCode = document.getElementById("proj-code").value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const title = document.getElementById("proj-title").value.trim();
  const category = document.getElementById("proj-category").value.trim();
  const team = document.getElementById("proj-team").value.trim();
  const description = document.getElementById("proj-desc").value.trim();

  if (!rawCode || !title) return;

  const btn = document.getElementById("save-project-btn");
  btn.disabled = true;

  try {
    const docId = editId || rawCode;
    const existing = state.projects.find((p) => p.id === docId);

    // Evita sobrescribir sin querer un proyecto existente al crear uno nuevo
    if (!editId && existing) {
      showToast(`Ya existe un proyecto con el código ${docId}.`, "warning");
      return;
    }

    await setDoc(doc(projectsCol, docId), {
      id: docId,
      title,
      category,
      team,
      description,
      votes: existing ? existing.votes || 0 : 0,
      starsTotal: existing ? existing.starsTotal || 0 : 0
    });

    await setDoc(metaDocRef, { initialized: true }, { merge: true });
    showToast(editId ? "Proyecto actualizado correctamente." : "Proyecto agregado y QR listo.", "success");
    resetAdminForm();
  } catch (err) {
    console.error(err);
    showToast("No se pudo guardar el proyecto. Revisa tu conexión.", "error");
  } finally {
    btn.disabled = false;
  }
}

export function editProject(id) {
  const p = state.projects.find((item) => item.id === id);
  if (!p) return;

  document.getElementById("edit-project-id").value = p.id;
  const codeInput = document.getElementById("proj-code");
  codeInput.value = p.id;
  codeInput.readOnly = true;
  codeInput.classList.add("opacity-70", "cursor-not-allowed");

  document.getElementById("proj-title").value = p.title;
  document.getElementById("proj-category").value = p.category;
  document.getElementById("proj-team").value = p.team;
  document.getElementById("proj-desc").value = p.description;

  document.getElementById("form-badge").textContent = `Editando ${p.id}`;
  document.getElementById("form-title").textContent = "Modificar Stand";
  document.getElementById("cancel-edit-btn").classList.remove("hidden");
  document.getElementById("save-project-btn").innerHTML = `<i data-lucide="save" class="w-4 h-4"></i><span>Guardar Cambios</span>`;
  refreshIcons();
}

export function resetAdminForm() {
  document.getElementById("project-form").reset();
  document.getElementById("edit-project-id").value = "";
  const codeInput = document.getElementById("proj-code");
  codeInput.readOnly = false;
  codeInput.classList.remove("opacity-70", "cursor-not-allowed");

  document.getElementById("form-badge").textContent = "Nuevo Stand";
  document.getElementById("form-title").textContent = "Agregar Proyecto";
  document.getElementById("cancel-edit-btn").classList.add("hidden");
  document.getElementById("save-project-btn").innerHTML = `<i data-lucide="plus-circle" class="w-4 h-4"></i><span>Guardar Proyecto</span>`;
  suggestNextCode();
  refreshIcons();
}

export async function deleteSingleProject(id) {
  if (!confirm(`¿Seguro que deseas eliminar el proyecto ${id} y liberar los RUT que votaron en él?`)) return;
  try {
    await deleteDoc(doc(projectsCol, id));

    const [votesSnap, rutSnap] = await Promise.all([getDocs(votesCol), getDocs(rutRegistryCol)]);
    const ops = [];
    votesSnap.forEach((d) => {
      if (d.id.startsWith(`${id}_`) || d.data()?.projectId === id) ops.push((b) => b.delete(d.ref));
    });
    rutSnap.forEach((d) => {
      if (d.data()?.projectId === id) ops.push((b) => b.delete(d.ref));
    });
    await commitInChunks(ops);

    const localRec = getLocalVoteRecord();
    if (localRec && localRec.projectId === id) clearLocalVoteRecord();

    await setDoc(metaDocRef, { initialized: true }, { merge: true });
    showToast(`Proyecto ${id} eliminado.`, "success");
  } catch (err) {
    console.error(err);
    showToast("Error al eliminar el proyecto.", "error");
  }
}

export async function deleteAllProjects() {
  if (!confirm("¿Estás seguro de borrar TODOS los proyectos y registros de votos para empezar desde cero?")) return;
  try {
    const snaps = await Promise.all([getDocs(projectsCol), getDocs(votesCol), getDocs(rutRegistryCol)]);
    const ops = [];
    snaps.forEach((snap) => snap.forEach((d) => ops.push((b) => b.delete(d.ref))));
    await commitInChunks(ops);

    await setDoc(metaDocRef, { initialized: true }, { merge: true });
    clearLocalVoteRecord();
    showToast("Todos los proyectos y votos fueron eliminados.", "success");
  } catch (err) {
    console.error(err);
    showToast("Error al vaciar los proyectos.", "error");
  }
}

export async function resetAllVotes() {
  if (!confirm("¿Deseas reiniciar a 0 los votos y estrellas de todos los proyectos y liberar todos los RUT?")) return;
  try {
    const snaps = await Promise.all([getDocs(projectsCol), getDocs(votesCol), getDocs(rutRegistryCol)]);
    const ops = [];
    snaps[0].forEach((d) => ops.push((b) => b.update(d.ref, { votes: 0, starsTotal: 0 })));
    snaps[1].forEach((d) => ops.push((b) => b.delete(d.ref)));
    snaps[2].forEach((d) => ops.push((b) => b.delete(d.ref)));
    await commitInChunks(ops);

    clearLocalVoteRecord();
    showToast("Votos, estrellas y registros de RUT reiniciados a 0.", "success");
  } catch (err) {
    console.error(err);
    showToast("Error al reiniciar votos.", "error");
  }
}
