import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ======================================================
// VARIABLES
// ======================================================

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


// ======================================================
// REFERENCIA A FIRESTORE
// ======================================================

const productosRef = collection(db, "productos");


// ======================================================
// CARGAR CARRITO
// ======================================================

function cargarCarrito() {

  const carritoGuardado =
    localStorage.getItem("cloudstock_carrito");

  if (carritoGuardado) {

    try {

      const carritoParseado =
        JSON.parse(carritoGuardado);

      if (Array.isArray(carritoParseado)) {
        carrito = carritoParseado;
      } else {
        carrito = [];
      }

    } catch (error) {

      console.error(
        "Error leyendo el carrito:",
        error
      );

      carrito = [];
    }
  }

  actualizarCarrito();
}


// ======================================================
// GUARDAR CARRITO
// ======================================================

function guardarCarrito() {

  localStorage.setItem(
    "cloudstock_carrito",
    JSON.stringify(carrito)
  );
}


// ======================================================
// CARGAR PRODUCTOS DESDE FIRESTORE
// ======================================================

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

    const snapshot =
      await getDocs(productosRef);

    productos = [];


    snapshot.forEach((documento) => {

      productos.push({
        id: documento.id,
        ...documento.data()
      });

    });


    console.log(
      "Productos cargados desde Firestore:",
      productos
    );


    connectionStatus.textContent =
      `✓ Conectado a Firestore · ${productos.length} productos encontrados`;

    connectionStatus.className =
      "connection-status success";


    mostrarProductos(productos);

    actualizarStockCarrito();

  } catch (error) {

    console.error(
      "Error cargando productos:",
      error
    );


    connectionStatus.textContent =
      "✕ Error de conexión con Firestore";

    connectionStatus.className =
      "connection-status error";


    productsContainer.innerHTML = `
      <div class="no-products">

        <h3>Error al cargar los productos</h3>

        <p>
          No fue posible obtener los productos desde Firebase.
        </p>

        <p>
          Revisa la conexión a Internet,
          la configuración de Firebase
          y las reglas de Firestore.
        </p>

        <button
          id="retryBtn"
          class="inventory-refresh"
        >
          ↻ Intentar nuevamente
        </button>

      </div>
    `;


    const retryBtn =
      document.getElementById("retryBtn");

    if (retryBtn) {

      retryBtn.addEventListener(
        "click",
        cargarProductos
      );

    }

  }

}


// ======================================================
// MOSTRAR PRODUCTOS
// ======================================================

function mostrarProductos(lista) {

  productsContainer.innerHTML = "";


  if (lista.length === 0) {

    productsContainer.innerHTML = `
      <div class="no-products">

        <h3>No hay productos</h3>

        <p>
          No se encontraron productos en el inventario.
        </p>

      </div>
    `;

    return;
  }


  lista.forEach((producto) => {

    const stock =
      convertirStock(producto.stock);

    const precio =
      convertirPrecio(producto.precio);


    let stockClass = "";

    let stockTexto =
      `Stock disponible: ${stock}`;


    if (stock === 0) {

      stockClass = "out";

      stockTexto =
        "Sin stock";

    } else if (stock <= 5) {

      stockClass = "low";

      stockTexto =
        `Últimas unidades: ${stock}`;

    }


    const card =
      document.createElement("article");

    card.className =
      "product-card";


    card.innerHTML = `

      <div class="product-icon">
        ${obtenerIcono(producto.categoria)}
      </div>

      <p class="product-category">
        ${escaparHTML(
          producto.categoria || "General"
        )}
      </p>

      <h3>
        ${escaparHTML(
          producto.nombre || "Producto"
        )}
      </h3>

      <p class="product-description">
        ${escaparHTML(
          producto.descripcion ||
          "Sin descripción disponible."
        )}
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
        ${
          stock === 0
            ? "Sin stock"
            : "🛒 Agregar al carrito"
        }
      </button>

      <div class="product-admin-buttons">

        <button
          class="edit-product-btn"
          data-id="${producto.id}"
        >
          ✏️ Editar
        </button>

        <button
          class="delete-product-btn"
          data-id="${producto.id}"
        >
          🗑️ Eliminar
        </button>

      </div>

    `;


    productsContainer.appendChild(card);

  });


  agregarEventosProductos();
}


// ======================================================
// EVENTOS DE PRODUCTOS
// ======================================================

function agregarEventosProductos() {

  document
    .querySelectorAll(".add-cart-btn")
    .forEach((boton) => {

      boton.addEventListener(
        "click",
        () => {

          agregarAlCarrito(
            boton.dataset.id
          );

        }
      );

    });


  document
    .querySelectorAll(".edit-product-btn")
    .forEach((boton) => {

      boton.addEventListener(
        "click",
        () => {

          editarProducto(
            boton.dataset.id
          );

        }
      );

    });


  document
    .querySelectorAll(".delete-product-btn")
    .forEach((boton) => {

      boton.addEventListener(
        "click",
        () => {

          eliminarProducto(
            boton.dataset.id
          );

        }
      );

    });

}


// ======================================================
// CREAR PRODUCTO
// ======================================================

async function crearProducto() {

  const nombre = prompt("Nombre del producto:");

  if (nombre === null) {
    return;
  }

  const nombreLimpio = nombre.trim();

  // ================================
  // VALIDAR NOMBRE
  // ================================

  if (nombreLimpio === "") {
    alert("El nombre del producto es obligatorio.");
    return;
  }

  // Evitar nombres repetidos
  const nombreRepetido = productos.some(producto =>
    String(producto.nombre || "")
      .trim()
      .toLowerCase() === nombreLimpio.toLowerCase()
  );

  if (nombreRepetido) {
    alert("Ya existe un producto con ese nombre.");
    return;
  }


  // ================================
  // CATEGORÍA
  // ================================

  const categoria = prompt(
    "Categoría del producto:"
  );

  if (categoria === null) {
    return;
  }

  const categoriaLimpia = categoria.trim();

  if (categoriaLimpia === "") {
    alert("La categoría es obligatoria.");
    return;
  }


  // ================================
  // DESCRIPCIÓN
  // ================================

  const descripcion = prompt(
    "Descripción del producto:"
  );

  if (descripcion === null) {
    return;
  }

  const descripcionLimpia = descripcion.trim();

  if (descripcionLimpia === "") {
    alert("La descripción es obligatoria.");
    return;
  }


  // ================================
  // PRECIO
  // ================================

  const precioTexto = prompt(
    "Precio del producto:"
  );

  if (precioTexto === null || precioTexto.trim() === "") {
    alert("El precio es obligatorio.");
    return;
  }

  const precio = Number(
    precioTexto
      .trim()
      .replace(/\./g, "")
      .replace(",", ".")
  );

  if (!Number.isFinite(precio) || precio <= 0) {
    alert("El precio debe ser un número mayor que 0.");
    return;
  }


  // ================================
  // STOCK
  // ================================

  const stockTexto = prompt(
    "Stock del producto:"
  );

  if (stockTexto === null || stockTexto.trim() === "") {
    alert("El stock es obligatorio.");
    return;
  }

  const stock = Number(stockTexto.trim());

  if (!Number.isInteger(stock) || stock < 0) {
    alert("El stock debe ser un número entero mayor o igual a 0.");
    return;
  }


  // ================================
  // GUARDAR EN FIRESTORE
  // ================================

  try {

    await addDoc(productosRef, {

      nombre: nombreLimpio,
      categoria: categoriaLimpia,
      descripcion: descripcionLimpia,
      precio: precio,
      stock: stock

    });

    alert("Producto creado correctamente.");

    await cargarProductos();

  } catch (error) {

    console.error(
      "Error al crear producto:",
      error
    );

    alert(
      "No se pudo crear el producto. Revisa la conexión con Firebase."
    );
  }
}

// ======================================================
// EDITAR PRODUCTO
// ======================================================

async function editarProducto(id) {

  const producto =
    productos.find(
      (item) => item.id === id
    );


  if (!producto) {

    alert(
      "No se encontró el producto."
    );

    return;
  }


  const nombre =
    prompt(
      "Nombre del producto:",
      producto.nombre || ""
    );

  if (nombre === null) {
    return;
  }


  const nombreLimpio =
    nombre.trim();


  if (!nombreLimpio) {

    alert(
      "El nombre del producto es obligatorio."
    );

    return;
  }


  const categoria =
    prompt(
      "Categoría:",
      producto.categoria || "General"
    );

  if (categoria === null) {
    return;
  }


  const categoriaLimpia =
    categoria.trim() || "General";


  const descripcion =
    prompt(
      "Descripción:",
      producto.descripcion || ""
    );

  if (descripcion === null) {
    return;
  }


  const descripcionLimpia =
    descripcion.trim() ||
    "Sin descripción";


  const precioTexto =
    prompt(
      "Precio:",
      String(producto.precio ?? 0)
    );

  if (precioTexto === null) {
    return;
  }


  const precio =
    Number(
      precioTexto
        .replace(/\./g, "")
        .replace(",", ".")
    );


  if (
    !Number.isFinite(precio) ||
    precio < 0
  ) {

    alert(
      "El precio debe ser un número válido mayor o igual a 0."
    );

    return;
  }


  const stockTexto =
    prompt(
      "Stock:",
      String(producto.stock ?? 0)
    );

  if (stockTexto === null) {
    return;
  }


  const stock =
    Number(stockTexto);


  if (
    !Number.isInteger(stock) ||
    stock < 0
  ) {

    alert(
      "El stock debe ser un número entero mayor o igual a 0."
    );

    return;
  }


  try {

    const productoRef =
      doc(
        db,
        "productos",
        id
      );


    await updateDoc(
      productoRef,
      {
        nombre: nombreLimpio,
        categoria: categoriaLimpia,
        descripcion: descripcionLimpia,
        precio: precio,
        stock: stock
      }
    );


    alert(
      "✓ Producto actualizado correctamente."
    );


    await cargarProductos();

  } catch (error) {

    console.error(
      "Error actualizando producto:",
      error
    );


    alert(
      "No fue posible actualizar el producto. Revisa la conexión y las reglas de Firestore."
    );

  }

}


// ======================================================
// ELIMINAR PRODUCTO
// ======================================================

async function eliminarProducto(id) {

  const producto =
    productos.find(
      (item) => item.id === id
    );


  if (!producto) {

    alert(
      "No se encontró el producto."
    );

    return;
  }


  const confirmar =
    confirm(
      `¿Seguro que quieres eliminar "${producto.nombre}"?`
    );


  if (!confirmar) {
    return;
  }


  try {

    const productoRef =
      doc(
        db,
        "productos",
        id
      );


    await deleteDoc(
      productoRef
    );


    carrito =
      carrito.filter(
        (item) => item.id !== id
      );


    guardarCarrito();

    actualizarCarrito();


    alert(
      "✓ Producto eliminado correctamente."
    );


    await cargarProductos();

  } catch (error) {

    console.error(
      "Error eliminando producto:",
      error
    );


    alert(
      "No fue posible eliminar el producto. Revisa la conexión y las reglas de Firestore."
    );

  }

}


// ======================================================
// ICONOS
// ======================================================

function obtenerIcono(categoria) {

  const categoriaTexto =
    String(categoria || "")
      .toLowerCase();


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

  if (categoriaTexto.includes("celular")) {
    return "📱";
  }

  if (categoriaTexto.includes("mouse")) {
    return "🖱️";
  }

  return "📦";

}


// ======================================================
// AGREGAR AL CARRITO
// ======================================================

function agregarAlCarrito(id) {

  const producto =
    productos.find(
      (item) => item.id === id
    );


  if (!producto) {

    alert(
      "No se encontró el producto."
    );

    return;
  }


  const stock =
    convertirStock(producto.stock);


  if (stock <= 0) {

    alert(
      "Este producto no tiene stock disponible."
    );

    return;
  }


  const productoCarrito =
    carrito.find(
      (item) => item.id === id
    );


  if (productoCarrito) {

    if (
      productoCarrito.cantidad < stock
    ) {

      productoCarrito.cantidad++;

    } else {

      alert(
        "No puedes agregar más unidades que el stock disponible."
      );

      return;
    }

  } else {

    carrito.push({

      id: producto.id,

      nombre:
        producto.nombre ||
        "Producto",

      precio:
        convertirPrecio(
          producto.precio
        ),

      stock: stock,

      cantidad: 1

    });

  }


  guardarCarrito();

  actualizarCarrito();

}


// ======================================================
// ACTUALIZAR STOCK DEL CARRITO
// ======================================================

function actualizarStockCarrito() {

  carrito =
    carrito.filter((item) => {

      const producto =
        productos.find(
          (producto) =>
            producto.id === item.id
        );


      if (!producto) {
        return false;
      }


      const stock =
        convertirStock(
          producto.stock
        );


      item.stock = stock;


      if (
        item.cantidad > stock
      ) {

        item.cantidad = stock;

      }


      return item.cantidad > 0;

    });


  guardarCarrito();

  actualizarCarrito();

}


// ======================================================
// ACTUALIZAR CARRITO
// ======================================================

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

    const precio =
      convertirPrecio(item.precio);

    const cantidad =
      Number(item.cantidad) || 0;


    const subtotal =
      precio * cantidad;


    total += subtotal;

    cantidadTotal += cantidad;


    const elemento =
      document.createElement("div");


    elemento.className =
      "cart-item";


    elemento.innerHTML = `

      <div class="cart-item-info">

        <h4>
          ${escaparHTML(
            item.nombre
          )}
        </h4>

        <p>
          $${formatearPrecio(precio)} cada uno
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
          ${cantidad}
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


// ======================================================
// EVENTOS DEL CARRITO
// ======================================================

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

          } else if (
            action === "minus"
          ) {

            disminuirCantidad(id);

          } else if (
            action === "remove"
          ) {

            eliminarDelCarrito(id);

          }

        }
      );

    });

}


// ======================================================
// AUMENTAR CANTIDAD
// ======================================================

function aumentarCantidad(id) {

  const item =
    carrito.find(
      (producto) =>
        producto.id === id
    );


  if (!item) {
    return;
  }


  const producto =
    productos.find(
      (producto) =>
        producto.id === id
    );


  if (!producto) {

    eliminarDelCarrito(id);

    return;
  }


  const stock =
    convertirStock(
      producto.stock
    );


  item.stock = stock;


  if (
    item.cantidad < stock
  ) {

    item.cantidad++;

  } else {

    alert(
      "Has alcanzado el stock disponible."
    );

    return;
  }


  guardarCarrito();

  actualizarCarrito();

}


// ======================================================
// DISMINUIR CANTIDAD
// ======================================================

function disminuirCantidad(id) {

  const item =
    carrito.find(
      (producto) =>
        producto.id === id
    );


  if (!item) {
    return;
  }


  item.cantidad--;


  if (
    item.cantidad <= 0
  ) {

    carrito =
      carrito.filter(
        (producto) =>
          producto.id !== id
      );

  }


  guardarCarrito();

  actualizarCarrito();

}


// ======================================================
// ELIMINAR DEL CARRITO
// ======================================================

function eliminarDelCarrito(id) {

  carrito =
    carrito.filter(
      (producto) =>
        producto.id !== id
    );


  guardarCarrito();

  actualizarCarrito();

}


// ======================================================
//VACIAR CARRITO
// ======================================================

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


// ======================================================
// BUSCADOR
// ======================================================

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
      productos.filter(
        (producto) => {

          const nombre =
            String(
              producto.nombre || ""
            ).toLowerCase();


          const descripcion =
            String(
              producto.descripcion || ""
            ).toLowerCase();


          const categoria =
            String(
              producto.categoria || ""
            ).toLowerCase();


          return (
            nombre.includes(texto) ||
            descripcion.includes(texto) ||
            categoria.includes(texto)
          );

        }
      );


    mostrarProductos(
      resultados
    );

  }
);


// ======================================================
// BOTÓN ACTUALIZAR
// ======================================================

refreshBtn.addEventListener(
  "click",
  cargarProductos
);


// ======================================================
// CREAR BOTÓN DE PRODUCTO
// ======================================================

function crearBotonAgregarProducto() {

  const inventoryTools =
    document.querySelector(
      ".inventory-tools"
    );


  if (!inventoryTools) {
    return;
  }


  if (
    document.getElementById(
      "addProductBtn"
    )
  ) {
    return;
  }


  const boton =
    document.createElement("button");


  boton.id =
    "addProductBtn";


  boton.className =
    "inventory-refresh";


  boton.textContent =
    "＋ Agregar producto";


  boton.addEventListener(
    "click",
    crearProducto
  );


  inventoryTools.appendChild(
    boton
  );

}


// ======================================================
// FORMATEAR PRECIO
// ======================================================

function formatearPrecio(numero) {

  return Number(numero)
    .toLocaleString("es-CL");

}


// ======================================================
// CONVERTIR PRECIO
// ======================================================

function convertirPrecio(valor) {

  const numero =
    Number(valor);


  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {

    return 0;
  }


  return numero;

}


// ======================================================
// CONVERTIR STOCK
// ======================================================

function convertirStock(valor) {

  const numero =
    Number(valor);


  if (
    !Number.isInteger(numero) ||
    numero < 0
  ) {

    return 0;
  }


  return numero;

}


// ======================================================
// EVITAR HTML INYECTADO
// ======================================================

function escaparHTML(texto) {

  const div =
    document.createElement("div");


  div.textContent =
    String(texto);


  return div.innerHTML;

}


// ======================================================
// MENÚ MÓVIL
// ======================================================

const menuBtn =
  document.getElementById(
    "menuBtn"
  );


const navLinks =
  document.getElementById(
    "navLinks"
  );


if (
  menuBtn &&
  navLinks
) {

  menuBtn.addEventListener(
    "click",
    () => {

      navLinks.classList.toggle(
        "show"
      );

    }
  );


  document
    .querySelectorAll(
      ".nav-links a"
    )
    .forEach((link) => {

      link.addEventListener(
        "click",
        () => {

          navLinks.classList.remove(
            "show"
          );

        }
      );

    });

}


// ======================================================
// INICIO
// ======================================================

crearBotonAgregarProducto();

cargarCarrito();

cargarProductos();
console.log("Script cargado correctamente");
