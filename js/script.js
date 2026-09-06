import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ================================
// VARIABLES
// ================================

let productos = [];
let carrito = [];

const productsContainer = document.getElementById("productsContainer");
const searchInput = document.getElementById("searchInput");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const totalElemento = document.getElementById("total");
const connectionStatus = document.getElementById("connectionStatus");
const refreshBtn = document.getElementById("refreshBtn");
const clearCartBtn = document.getElementById("clearCartBtn");


// ================================
// CARGAR CARRITO
// ================================

function cargarCarrito() {

  const carritoGuardado = localStorage.getItem("cloudstock_carrito");

  if (carritoGuardado) {

    try {
      carrito = JSON.parse(carritoGuardado);
    } catch (error) {
      carrito = [];
    }

  }

  actualizarCarrito();
}


// ================================
// GUARDAR CARRITO
// ================================

function guardarCarrito() {

  localStorage.setItem(
    "cloudstock_carrito",
    JSON.stringify(carrito)
  );

}


// ================================
// CARGAR PRODUCTOS FIRESTORE
// ================================

async function cargarProductos() {

  productsContainer.innerHTML = `
    <div class="loading">
      ☁ Cargando productos desde Firestore...
    </div>
  `;

  connectionStatus.textContent =
    "Conectando con Firebase Firestore...";

  connectionStatus.className =
    "connection-status";


  try {

    const productosRef = collection(db, "productos");

    const snapshot = await getDocs(productosRef);

    productos = [];

    snapshot.forEach((documento) => {

      productos.push({
        id: documento.id,
        ...documento.data()
      });

    });


    console.log("Productos cargados:", productos);


    connectionStatus.textContent =
      `✓ Conectado a Firestore · ${productos.length} productos encontrados`;

    connectionStatus.className =
      "connection-status success";


    mostrarProductos(productos);

  } catch (error) {

    console.error(
      "Error cargando productos:",
      error
    );

    connectionStatus.textContent =
      "✕ No fue posible conectar con Firestore";

    connectionStatus.className =
      "connection-status error";


    productsContainer.innerHTML = `
      <div class="no-products">
        <h3>Error al cargar los productos</h3>

        <p>
          Revisa la configuración de Firebase
          y las reglas de Firestore.
        </p>
      </div>
    `;

  }

}


// ================================
// MOSTRAR PRODUCTOS
// ================================

function mostrarProductos(lista) {

  productsContainer.innerHTML = "";


  if (lista.length === 0) {

    productsContainer.innerHTML = `
      <div class="no-products">
        No se encontraron productos.
      </div>
    `;

    return;
  }


  lista.forEach((producto) => {

    const stock = Number(producto.stock) || 0;
    const precio = Number(producto.precio) || 0;


    let stockClass = "";
    let stockTexto = `Stock disponible: ${stock}`;


    if (stock === 0) {

      stockClass = "out";
      stockTexto = "Sin stock";

    } else if (stock <= 5) {

      stockClass = "low";
      stockTexto = `Últimas unidades: ${stock}`;

    }


    const card = document.createElement("article");

    card.className = "product-card";


    card.innerHTML = `

      <div class="product-icon">
        ${obtenerIcono(producto.categoria)}
      </div>

      <p class="product-category">
        ${producto.categoria || "General"}
      </p>

      <h3>
        ${producto.nombre || "Producto"}
      </h3>

      <p class="product-description">
        ${producto.descripcion || "Sin descripción disponible."}
      </p>

      <p class="product-price">
        $${formatearPrecio(precio)}
      </p>

      <p class="product-stock ${stockClass}">
        ${stockTexto}
      </p>

      <button
        class="add-cart-btn"
        data-id="${producto.id}"
        ${stock === 0 ? "disabled" : ""}
      >
        ${stock === 0 ? "Sin stock" : "🛒 Agregar al carrito"}
      </button>

    `;


    productsContainer.appendChild(card);

  });


  document
    .querySelectorAll(".add-cart-btn")
    .forEach((boton) => {

      boton.addEventListener(
        "click",
        () => agregarAlCarrito(boton.dataset.id)
      );

    });

}


// ================================
// ICONOS
// ================================

function obtenerIcono(categoria) {

  const categoriaTexto =
    String(categoria || "").toLowerCase();


  if (categoriaTexto.includes("comput")) {
    return "💻";
  }

  if (categoriaTexto.includes("perif")) {
    return "🖱️";
  }

  if (categoriaTexto.includes("tecl")) {
    return "⌨️";
  }

  if (categoriaTexto.includes("audio")) {
    return "🎧";
  }

  if (categoriaTexto.includes("monitor")) {
    return "🖥️";
  }

  return "📦";

}


// ================================
// AGREGAR AL CARRITO
// ================================

function agregarAlCarrito(id) {

  const producto = productos.find(
    (item) => item.id === id
  );


  if (!producto) {
    return;
  }


  const stock = Number(producto.stock) || 0;


  const productoCarrito =
    carrito.find(
      (item) => item.id === id
    );


  if (productoCarrito) {

    if (productoCarrito.cantidad < stock) {

      productoCarrito.cantidad++;

    } else {

      alert(
        "No puedes agregar más unidades que el stock disponible."
      );

    }

  } else {

    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio) || 0,
      stock: stock,
      cantidad: 1
    });

  }


  guardarCarrito();
  actualizarCarrito();

}


// ================================
// ACTUALIZAR CARRITO
// ================================

function actualizarCarrito() {

  cartItems.innerHTML = "";


  if (carrito.length === 0) {

    cartItems.innerHTML = `
      <p class="empty-cart">
        Tu carrito está vacío.
      </p>
    `;

    cartCount.textContent =
      "0 productos";

    totalElemento.textContent =
      "Total: $0";

    return;
  }


  let total = 0;
  let cantidadTotal = 0;


  carrito.forEach((item) => {

    const subtotal =
      item.precio * item.cantidad;


    total += subtotal;
    cantidadTotal += item.cantidad;


    const elemento =
      document.createElement("div");


    elemento.className =
      "cart-item";


    elemento.innerHTML = `

      <div class="cart-item-info">

        <h4>
          ${item.nombre}
        </h4>

        <p>
          $${formatearPrecio(item.precio)} cada uno
        </p>

      </div>


      <div class="quantity-controls">

        <button
          data-action="minus"
          data-id="${item.id}"
        >
          −
        </button>

        <span class="quantity">
          ${item.cantidad}
        </span>

        <button
          data-action="plus"
          data-id="${item.id}"
        >
          +
        </button>

      </div>


      <div class="cart-item-price">

        $${formatearPrecio(subtotal)}

      </div>


      <button
        class="remove-item"
        data-action="remove"
        data-id="${item.id}"
      >
        Eliminar
      </button>

    `;


    cartItems.appendChild(elemento);

  });


  cartCount.textContent =
    `${cantidadTotal} ${
      cantidadTotal === 1
        ? "producto"
        : "productos"
    }`;


  totalElemento.textContent =
    `Total: $${formatearPrecio(total)}`;


  agregarEventosCarrito();

}


// ================================
// EVENTOS DEL CARRITO
// ================================

function agregarEventosCarrito() {

  cartItems
    .querySelectorAll("button")
    .forEach((boton) => {

      boton.addEventListener(
        "click",
        () => {

          const id =
            boton.dataset.id;

          const action =
            boton.dataset.action;


          if (action === "plus") {

            aumentarCantidad(id);

          } else if (action === "minus") {

            disminuirCantidad(id);

          } else if (action === "remove") {

            eliminarDelCarrito(id);

          }

        }
      );

    });

}


// ================================
// AUMENTAR CANTIDAD
// ================================

function aumentarCantidad(id) {

  const item =
    carrito.find(
      (producto) => producto.id === id
    );


  if (!item) {
    return;
  }


  if (item.cantidad < item.stock) {

    item.cantidad++;

  } else {

    alert(
      "Has alcanzado el stock disponible."
    );

  }


  guardarCarrito();
  actualizarCarrito();

}


// ================================
// DISMINUIR CANTIDAD
// ================================

function disminuirCantidad(id) {

  const item =
    carrito.find(
      (producto) => producto.id === id
    );


  if (!item) {
    return;
  }


  item.cantidad--;


  if (item.cantidad <= 0) {

    carrito =
      carrito.filter(
        (producto) => producto.id !== id
      );

  }


  guardarCarrito();
  actualizarCarrito();

}


// ================================
// ELIMINAR PRODUCTO
// ================================

function eliminarDelCarrito(id) {

  carrito =
    carrito.filter(
      (producto) => producto.id !== id
    );


  guardarCarrito();
  actualizarCarrito();

}


// ================================
// VACIAR CARRITO
// ================================

clearCartBtn.addEventListener(
  "click",
  () => {

    if (carrito.length === 0) {
      return;
    }


    const confirmar =
      confirm(
        "¿Quieres vaciar el carrito?"
      );


    if (!confirmar) {
      return;
    }


    carrito = [];

    guardarCarrito();
    actualizarCarrito();

  }
);


// ================================
// BUSCADOR
// ================================

searchInput.addEventListener(
  "input",
  () => {

    const texto =
      searchInput.value
        .trim()
        .toLowerCase();


    if (!texto) {

      mostrarProductos(productos);

      return;
    }


    const resultados =
      productos.filter((producto) => {

        const nombre =
          String(producto.nombre || "")
            .toLowerCase();

        const descripcion =
          String(producto.descripcion || "")
            .toLowerCase();

        const categoria =
          String(producto.categoria || "")
            .toLowerCase();


        return (
          nombre.includes(texto) ||
          descripcion.includes(texto) ||
          categoria.includes(texto)
        );

      });


    mostrarProductos(resultados);

  }
);


// ================================
// ACTUALIZAR FIRESTORE
// ================================

refreshBtn.addEventListener(
  "click",
  cargarProductos
);


// ================================
// FORMATO DE PRECIO
// ================================

function formatearPrecio(numero) {

  return Number(numero).toLocaleString(
    "es-CL"
  );

}


// ================================
// MENÚ MÓVIL
// ================================

const menuBtn =
  document.getElementById("menuBtn");

const navLinks =
  document.getElementById("navLinks");


menuBtn.addEventListener(
  "click",
  () => {

    navLinks.classList.toggle("show");

  }
);


document
  .querySelectorAll(".nav-links a")
  .forEach((link) => {

    link.addEventListener(
      "click",
      () => {

        navLinks.classList.remove("show");

      }
    );

  });


// ================================
// INICIO
// ================================

cargarCarrito();
cargarProductos();