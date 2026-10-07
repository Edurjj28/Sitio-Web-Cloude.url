import { db } from "./firebase.js";

import {
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

// getAuth() usa la app que ya inicializa firebase.js
const auth = getAuth();
const productosRef = collection(db, "productos");

// ======================================================
// ESTADO
// ======================================================
let productos = [];
let carrito = [];
let rol = null;          // "admin" | "user" | null
let usuarioActual = null;
let editandoId = null;

const $ = (id) => document.getElementById(id);
const esAdmin = () => rol === "admin";

// ======================================================
// UTILIDADES
// ======================================================
const escaparHTML = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const numero = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
const stockValido = (v) => (Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
const precioFmt = (n) => Number(n).toLocaleString("es-CL");

function toast(mensaje, tipo = "ok") {
  const el = $("toast");
  el.textContent = mensaje;
  el.className = `toast show ${tipo}`;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.className = "toast"), 3200);
}

function icono(categoria) {
  const c = String(categoria || "").toLowerCase();
  if (c.includes("comput") || c.includes("notebook")) return "💻";
  if (c.includes("perif")) return "🖱️";
  if (c.includes("tecl")) return "⌨️";
  if (c.includes("audio")) return "🎧";
  if (c.includes("monitor")) return "🖥️";
  if (c.includes("celular")) return "📱";
  return "📦";
}

// ======================================================
// AUTENTICACIÓN Y ROLES
// ======================================================
let intentosFallidos = 0;
let bloqueadoHasta = 0;

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("loginMessage");
  const email = $("loginEmail").value.trim();
  const clave = $("loginPassword").value;

  if (Date.now() < bloqueadoHasta) {
    const seg = Math.ceil((bloqueadoHasta - Date.now()) / 1000);
    msg.className = "form-message error";
    msg.textContent = `Demasiados intentos. Espera ${seg} segundos.`;
    return;
  }
  if (!email || !clave) {
    msg.className = "form-message error";
    msg.textContent = "Ingresa tu correo y tu contraseña.";
    return;
  }

  $("loginBtn").disabled = true;
  msg.textContent = "";

  try {
    await signInWithEmailAndPassword(auth, email, clave);
    intentosFallidos = 0;
    $("loginForm").reset();
  } catch (error) {
    intentosFallidos++;
    if (intentosFallidos >= 5) {
      bloqueadoHasta = Date.now() + 30000;
      intentosFallidos = 0;
    }
    msg.className = "form-message error";
    // Mensaje genérico: no revela si el correo existe
    msg.textContent = error.code === "auth/too-many-requests"
      ? "Demasiados intentos. Prueba de nuevo en unos minutos."
      : "Correo o contraseña incorrectos.";
  } finally {
    $("loginBtn").disabled = false;
  }
});

// ---------- Pestañas ingresar / crear cuenta ----------
function mostrarPanel(panel) {
  const registro = panel === "registro";
  $("loginForm").hidden = registro;
  $("registerForm").hidden = !registro;
  $("tabLogin").classList.toggle("active", !registro);
  $("tabRegister").classList.toggle("active", registro);
  $("tabLogin").setAttribute("aria-selected", String(!registro));
  $("tabRegister").setAttribute("aria-selected", String(registro));
  $("authHint").textContent = registro
    ? "Crea una cuenta para consultar el inventario y armar tu pedido."
    : "Ingresa con tu cuenta para ver el inventario.";
  $("loginMessage").textContent = "";
  $("registerMessage").textContent = "";
}

$("tabLogin").addEventListener("click", () => mostrarPanel("login"));
$("tabRegister").addEventListener("click", () => mostrarPanel("registro"));

// ---------- Registro (siempre con rol Usuario) ----------
const erroresRegistro = {
  "auth/email-already-in-use": "Ese correo ya tiene una cuenta. Prueba iniciando sesión.",
  "auth/invalid-email": "El correo no es válido.",
  "auth/weak-password": "La contraseña es demasiado débil. Usa al menos 8 caracteres.",
  "auth/network-request-failed": "Sin conexión. Revisa tu Internet e inténtalo de nuevo.",
  "auth/operation-not-allowed": "El registro con correo no está activado en Firebase (Authentication → Sign-in method → Correo/contraseña).",
  "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Settings → Dominios autorizados).",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "La apiKey de firebase.js no es válida. Revisa tu firebaseConfig.",
  "auth/invalid-api-key": "La apiKey de firebase.js no es válida. Revisa tu firebaseConfig.",
  "auth/configuration-not-found": "Authentication no está activado en tu proyecto. Pulsa \"Comenzar\" en la sección Authentication.",
  "auth/too-many-requests": "Demasiados intentos. Prueba de nuevo en unos minutos."
};

$("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("registerMessage");
  msg.className = "form-message error";

  const email = $("regEmail").value.trim();
  const clave = $("regPassword").value;
  const clave2 = $("regPassword2").value;

  if (!email) { msg.textContent = "Ingresa tu correo electrónico."; return; }
  if (clave.length < 8) { msg.textContent = "La contraseña debe tener al menos 8 caracteres."; return; }
  if (clave !== clave2) { msg.textContent = "Las contraseñas no coinciden."; return; }

  $("registerBtn").disabled = true;
  msg.textContent = "";

  try {
    // Al crear la cuenta Firebase inicia sesión solo y onAuthStateChanged abre el inventario
    await createUserWithEmailAndPassword(auth, email, clave);
    $("registerForm").reset();
    toast("Cuenta creada. ¡Bienvenido!");
  } catch (error) {
    console.error("Error al registrar:", error.code, error.message);
    msg.textContent = erroresRegistro[error.code] || `No se pudo crear la cuenta (${error.code || "error desconocido"}).`;
  } finally {
    $("registerBtn").disabled = false;
  }
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

// Copia el UID del usuario actual (sirve para crear su documento en /usuarios y darle rol admin)
$("copyUidBtn").addEventListener("click", async () => {
  if (!usuarioActual) return;
  const uid = usuarioActual.uid;
  try {
    await navigator.clipboard.writeText(uid);
    toast("UID copiado al portapapeles.");
  } catch {
    prompt("Copia tu UID:", uid);
  }
});

async function obtenerRol(uid) {
  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    return snap.exists() && snap.data().rol === "admin" ? "admin" : "user";
  } catch (error) {
    console.error("No se pudo leer el rol:", error);
    return "user"; // ante la duda, permisos mínimos
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    usuarioActual = null;
    rol = null;
    productos = [];
    carrito = [];
    document.body.classList.remove("is-admin");
    $("authGate").hidden = false;
    $("appArea").hidden = true;
    $("sessionBox").hidden = true;
    $("productsContainer").innerHTML = "";
    return;
  }

  usuarioActual = user;
  rol = await obtenerRol(user.uid);

  document.body.classList.toggle("is-admin", esAdmin());
  $("authGate").hidden = true;
  $("appArea").hidden = false;
  $("sessionBox").hidden = false;
  $("sessionEmail").textContent = user.email;
  $("roleBadge").textContent = esAdmin() ? "Administrador" : "Usuario";
  $("roleBadge").className = `role-badge ${esAdmin() ? "admin" : ""}`;

  cargarCarrito();
  cargarProductos();
});

// ======================================================
// PRODUCTOS (lectura)
// ======================================================
async function cargarProductos() {
  const estado = $("connectionStatus");
  $("productsContainer").innerHTML = `<div class="loading">Cargando productos...</div>`;
  estado.textContent = "Conectando con Firebase Firestore...";
  estado.className = "connection-status";

  try {
    const snapshot = await getDocs(productosRef);
    productos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    estado.textContent = `Conectado · ${productos.length} ${productos.length === 1 ? "producto" : "productos"}`;
    estado.className = "connection-status success";

    actualizarCategorias();
    filtrar();
    sincronizarCarrito();
  } catch (error) {
    console.error("Error cargando productos:", error);
    estado.textContent = "No se pudo conectar con Firestore";
    estado.className = "connection-status error";
    $("productsContainer").innerHTML = `
      <div class="no-products">
        <h3>No pudimos cargar los productos</h3>
        <p>Revisa tu conexión a Internet y las reglas de Firestore, y vuelve a intentarlo.</p>
        <button type="button" class="btn-primary" id="retryBtn">↻ Reintentar</button>
      </div>`;
    $("retryBtn").addEventListener("click", cargarProductos);
  }
}

function tarjeta(p) {
  const stock = stockValido(p.stock);
  let clase = "", texto = `${stock} en stock`;
  if (stock === 0) { clase = "out"; texto = "Sin stock"; }
  else if (stock <= 5) { clase = "low"; texto = `Últimas ${stock} unidades`; }

  const id = escaparHTML(p.id);

  return `
    <article class="product-card">
      <div class="product-icon" aria-hidden="true">${icono(p.categoria)}</div>
      <h4>${escaparHTML(p.nombre || "Producto")}</h4>
      <p class="product-description">${escaparHTML(p.descripcion || "Sin descripción.")}</p>
      <p class="product-price">$${precioFmt(numero(p.precio))}</p>
      <p class="product-stock ${clase}">${texto}</p>

      <button type="button" class="btn-primary full" data-action="add" data-id="${id}" ${stock === 0 ? "disabled" : ""}>
        ${stock === 0 ? "Sin stock" : "🛒 Agregar al carrito"}
      </button>

      <div class="product-admin-buttons admin-only">
        <button type="button" class="btn-secondary" data-action="edit" data-id="${id}">✏️ Editar</button>
        <button type="button" class="btn-danger-outline" data-action="delete" data-id="${id}">🗑️ Eliminar</button>
      </div>
    </article>`;
}

function mostrarProductos(lista) {
  const cont = $("productsContainer");

  if (!lista.length) {
    cont.innerHTML = `
      <div class="no-products">
        <h3>No hay productos para mostrar</h3>
        <p>${esAdmin() ? "Agrega el primero con el botón “Nuevo producto”." : "Prueba con otra búsqueda o vuelve más tarde."}</p>
      </div>`;
    return;
  }

  // Cada categoría tiene su propio apartado
  const grupos = lista.reduce((acc, p) => {
    const cat = (p.categoria || "General").trim() || "General";
    (acc[cat] ||= []).push(p);
    return acc;
  }, {});

  cont.innerHTML = Object.entries(grupos)
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([cat, items]) => `
      <div class="cat-block">
        <h3 class="cat-title"><span aria-hidden="true">${icono(cat)}</span>${escaparHTML(cat)}<small>${items.length}</small></h3>
        <div class="products-grid">${items.map(tarjeta).join("")}</div>
      </div>`)
    .join("");
}

function filtrar() {
  const t = $("searchInput").value.trim().toLowerCase();
  if (!t) return mostrarProductos(productos);
  mostrarProductos(productos.filter((p) =>
    [p.nombre, p.descripcion, p.categoria].some((v) => String(v || "").toLowerCase().includes(t))
  ));
}

function actualizarCategorias() {
  const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort();
  $("categoryList").innerHTML = cats.map((c) => `<option value="${escaparHTML(c)}">`).join("");
}

$("searchInput").addEventListener("input", filtrar);
$("refreshBtn").addEventListener("click", cargarProductos);

$("productsContainer").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "add") agregarAlCarrito(id);
  if (action === "edit") abrirModal(id);
  if (action === "delete") eliminarProducto(id);
});

// ======================================================
// MODAL: AGREGAR / EDITAR (solo administrador)
// ======================================================
const modal = $("productModal");

function abrirModal(id = null) {
  if (!esAdmin()) return toast("Solo un administrador puede hacer esto.", "error");

  editandoId = id;
  $("productForm").reset();
  $("formMessage").textContent = "";

  if (id) {
    const p = productos.find((x) => x.id === id);
    if (!p) return toast("No se encontró el producto.", "error");
    $("modalTitle").textContent = "Editar producto";
    $("modalSubtitle").textContent = "Modifica los datos y guarda los cambios.";
    $("productName").value = p.nombre || "";
    $("productCategory").value = p.categoria || "";
    $("productDescription").value = p.descripcion || "";
    $("productPrice").value = p.precio ?? "";
    $("productStock").value = p.stock ?? "";
  } else {
    $("modalTitle").textContent = "Nuevo producto";
    $("modalSubtitle").textContent = "Completa los datos del producto.";
  }

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  $("productName").focus();
}

function cerrarModal() {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
  editandoId = null;
}

$("addProductBtn").addEventListener("click", () => abrirModal());
$("closeModalBtn").addEventListener("click", cerrarModal);
$("cancelProductBtn").addEventListener("click", cerrarModal);
modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("active")) cerrarModal();
});

$("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("formMessage");
  msg.className = "form-message error";

  if (!esAdmin()) { msg.textContent = "No tienes permisos para guardar productos."; return; }

  const nombre = $("productName").value.trim();
  const categoria = $("productCategory").value.trim();
  const descripcion = $("productDescription").value.trim();
  const precio = Number($("productPrice").value);
  const stock = Number($("productStock").value);

  if (!nombre || !categoria || !descripcion) { msg.textContent = "Completa nombre, categoría y descripción."; return; }
  if (!Number.isFinite(precio) || precio <= 0) { msg.textContent = "El precio debe ser mayor que 0."; return; }
  if (!Number.isInteger(stock) || stock < 0) { msg.textContent = "El stock debe ser un número entero, 0 o mayor."; return; }

  const repetido = productos.some((p) =>
    p.id !== editandoId && String(p.nombre || "").trim().toLowerCase() === nombre.toLowerCase());
  if (repetido) { msg.textContent = "Ya existe un producto con ese nombre."; return; }

  const datos = { nombre, categoria, descripcion, precio, stock };
  const btn = $("saveProductBtn");
  btn.disabled = true;

  try {
    if (editandoId) {
      await updateDoc(doc(db, "productos", editandoId), datos);
      toast("Producto actualizado.");
    } else {
      await addDoc(productosRef, datos);
      toast("Producto agregado.");
    }
    cerrarModal();
    await cargarProductos();
  } catch (error) {
    console.error("Error guardando producto:", error);
    msg.textContent = "No se pudo guardar. Verifica tu conexión y tus permisos.";
  } finally {
    btn.disabled = false;
  }
});

async function eliminarProducto(id) {
  if (!esAdmin()) return toast("Solo un administrador puede eliminar productos.", "error");
  const p = productos.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;

  try {
    await deleteDoc(doc(db, "productos", id));
    toast("Producto eliminado.");
    await cargarProductos();
  } catch (error) {
    console.error("Error eliminando producto:", error);
    toast("No se pudo eliminar el producto.", "error");
  }
}

// ======================================================
// CARRITO (guardado por usuario en este navegador)
// ======================================================
const claveCarrito = () => `cloudstock_carrito_${usuarioActual?.uid || "anon"}`;

function cargarCarrito() {
  try {
    const guardado = JSON.parse(localStorage.getItem(claveCarrito()));
    carrito = Array.isArray(guardado) ? guardado : [];
  } catch {
    carrito = [];
  }
  pintarCarrito();
}

function guardarCarrito() {
  if (usuarioActual) localStorage.setItem(claveCarrito(), JSON.stringify(carrito));
}

function agregarAlCarrito(id) {
  const p = productos.find((x) => x.id === id);
  if (!p) return toast("No se encontró el producto.", "error");
  const stock = stockValido(p.stock);
  if (stock <= 0) return toast("Este producto no tiene stock.", "error");

  const item = carrito.find((i) => i.id === id);
  if (item) {
    if (item.cantidad >= stock) return toast("Ya tienes todo el stock disponible.", "error");
    item.cantidad++;
  } else {
    carrito.push({ id, nombre: p.nombre || "Producto", precio: numero(p.precio), cantidad: 1 });
  }
  guardarCarrito();
  pintarCarrito();
  toast(`${p.nombre} agregado al carrito.`);
}

// Ajusta el carrito a los precios y stock actuales de Firestore
function sincronizarCarrito() {
  carrito = carrito.filter((item) => {
    const p = productos.find((x) => x.id === item.id);
    if (!p) return false;
    item.nombre = p.nombre || item.nombre;
    item.precio = numero(p.precio);
    item.cantidad = Math.min(item.cantidad, stockValido(p.stock));
    return item.cantidad > 0;
  });
  guardarCarrito();
  pintarCarrito();
}

function pintarCarrito() {
  const cont = $("cartItems");

  if (!carrito.length) {
    cont.innerHTML = `<p class="empty-cart">Tu carrito está vacío. Agrega productos desde el inventario.</p>`;
    $("cartCount").textContent = "0 productos";
    $("total").textContent = "Total: $0";
    return;
  }

  let total = 0, unidades = 0;

  cont.innerHTML = carrito.map((item) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    unidades += item.cantidad;
    const id = escaparHTML(item.id);
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${escaparHTML(item.nombre)}</h4>
          <p>$${precioFmt(item.precio)} c/u</p>
        </div>
        <div class="quantity-controls">
          <button type="button" data-action="minus" data-id="${id}" aria-label="Quitar una unidad">−</button>
          <span class="quantity">${item.cantidad}</span>
          <button type="button" data-action="plus" data-id="${id}" aria-label="Agregar una unidad">+</button>
        </div>
        <div class="cart-item-price">$${precioFmt(subtotal)}</div>
        <button type="button" class="remove-item" data-action="remove" data-id="${id}">Quitar</button>
      </div>`;
  }).join("");

  $("cartCount").textContent = `${unidades} ${unidades === 1 ? "producto" : "productos"}`;
  $("total").textContent = `Total: $${precioFmt(total)}`;
}

$("cartItems").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  const item = carrito.find((i) => i.id === id);
  if (!item) return;

  if (action === "plus") {
    const p = productos.find((x) => x.id === id);
    if (p && item.cantidad < stockValido(p.stock)) item.cantidad++;
    else return toast("Alcanzaste el stock disponible.", "error");
  } else if (action === "minus") {
    item.cantidad--;
    if (item.cantidad <= 0) carrito = carrito.filter((i) => i.id !== id);
  } else if (action === "remove") {
    carrito = carrito.filter((i) => i.id !== id);
  }
  guardarCarrito();
  pintarCarrito();
});

$("clearCartBtn").addEventListener("click", () => {
  if (!carrito.length) return;
  if (!confirm("¿Quieres vaciar el carrito?")) return;
  carrito = [];
  guardarCarrito();
  pintarCarrito();
});

// ======================================================
// MENÚ MÓVIL
// ======================================================
const menuBtn = $("menuBtn");
const navLinks = $("navLinks");

menuBtn.addEventListener("click", () => {
  const abierto = navLinks.classList.toggle("show");
  menuBtn.setAttribute("aria-expanded", String(abierto));
});

navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("show");
    menuBtn.setAttribute("aria-expanded", "false");
  })
);
