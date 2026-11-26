// Utilidades de interfaz: iconos, toast, estado de conexión
export function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

export function updateConnectionStatus(online, text) {
  const dot = document.getElementById("connection-dot");
  const label = document.getElementById("connection-text");
  label.textContent = text;
  dot.className = online
    ? "w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-live"
    : "w-2.5 h-2.5 rounded-full bg-red-500";
}

let toastTimer;
export function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const icon = document.getElementById("toast-icon");
  document.getElementById("toast-msg").textContent = message;

  const icons = {
    success: `<i data-lucide="check-circle" class="w-5 h-5 text-emerald-400"></i>`,
    warning: `<i data-lucide="alert-circle" class="w-5 h-5 text-amber-400"></i>`,
    error:   `<i data-lucide="x-circle" class="w-5 h-5 text-red-400"></i>`
  };
  icon.innerHTML = icons[type] || icons.error;

  toast.classList.remove("hidden");
  toast.classList.add("flex");
  refreshIcons();

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("flex");
  }, 5000);
}
