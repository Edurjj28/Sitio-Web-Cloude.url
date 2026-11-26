// Registro local del voto (localStorage) y banner "ya votaste"
import { LOCAL_VOTE_KEY } from "./config.js";

export function getLocalVoteRecord() {
  try {
    const raw = localStorage.getItem(LOCAL_VOTE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function setLocalVoteRecord(record) {
  try { localStorage.setItem(LOCAL_VOTE_KEY, JSON.stringify(record)); } catch (_) {}
  refreshDeviceVotedBanner();
}

export function clearLocalVoteRecord() {
  try { localStorage.removeItem(LOCAL_VOTE_KEY); } catch (_) {}
  refreshDeviceVotedBanner();
}

export function refreshDeviceVotedBanner() {
  const banner = document.getElementById("device-voted-banner");
  const detail = document.getElementById("device-voted-detail");
  if (!banner || !detail) return;

  const rec = getLocalVoteRecord();
  if (rec && rec.projectId) {
    detail.textContent = `Desde este teléfono/navegador ya se registró el voto único del RUT ${rec.rutFormatted || ""} en el proyecto ${rec.projectId} (${rec.projectTitle || ""}). No se permiten más votos.`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}
