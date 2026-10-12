// =====================================================
// Gestor de tareas
// Autor: Hennry
// Permite crear, editar, completar y eliminar tareas,
// con filtros, búsqueda, orden y guardado en el navegador.
// =====================================================

const CLAVE_TAREAS = "gestor_tareas";
const CLAVE_TEMA = "gestor_tema";
const CATEGORIAS = ["Estudio", "Trabajo", "Personal", "Casa"];
const PRIORIDADES = ["alta", "media", "baja"];
const PESO_PRIORIDAD = { alta: 3, media: 2, baja: 1 };

// ---------- Estado de la aplicación ----------
let tareas = [];
let editandoId = null;
let ultimaEliminada = null;
let temporizadorToast = null;

const filtros = {
  estado: "todas",
  categoria: "todas",
  prioridad: "todas",
  busqueda: "",
  orden: "recientes"
};

// ---------- Referencias al DOM ----------
const $ = (id) => document.getElementById(id);
const formulario = $("formTarea");
const lista = $("lista");

// ---------- Utilidades ----------
function crearElemento(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Fecha de hoy en formato AAAA-MM-DD usando la hora local
function hoy() {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  return ahora.toISOString().slice(0, 10);
}

function formatearFecha(texto) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function estaVencida(tarea) {
  return !tarea.completada && tarea.fecha !== "" && tarea.fecha < hoy();
}

// Revisa que una tarea tenga datos válidos (también sirve al importar archivos)
function normalizarTarea(t) {
  if (!t || typeof t.titulo !== "string" || !t.titulo.trim()) return null;
  return {
    id: t.id ? String(t.id) : generarId(),
    titulo: t.titulo.trim().slice(0, 80),
    descripcion: String(t.descripcion || "").slice(0, 300),
    prioridad: PRIORIDADES.includes(t.prioridad) ? t.prioridad : "media",
    categoria: CATEGORIAS.includes(t.categoria) ? t.categoria : "Personal",
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(t.fecha) ? t.fecha : "",
    completada: Boolean(t.completada),
    creada: Number(t.creada) || Date.now()
  };
}

// ---------- Almacenamiento ----------
function cargarTareas() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_TAREAS));
    return Array.isArray(datos) ? datos.map(normalizarTarea).filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function guardarTareas() {
  try {
    localStorage.setItem(CLAVE_TAREAS, JSON.stringify(tareas));
  } catch (e) {
    mostrarAviso("No se pudo guardar en el navegador.");
  }
}

// ---------- Operaciones sobre las tareas ----------
function guardarDesdeFormulario() {
  const titulo = $("titulo").value.trim();
  if (titulo.length < 3) {
    $("errorTitulo").textContent = "El título debe tener al menos 3 caracteres.";
    $("titulo").focus();
    return;
  }
  $("errorTitulo").textContent = "";

  const datos = {
    titulo,
    descripcion: $("descripcion").value.trim(),
    prioridad: $("prioridad").value,
    categoria: $("categoria").value,
    fecha: $("fecha").value
  };

  if (editandoId) {
    const tarea = tareas.find((t) => t.id === editandoId);
    Object.assign(tarea, datos);
    mostrarAviso("Tarea actualizada.");
  } else {
    tareas.unshift({ id: generarId(), completada: false, creada: Date.now(), ...datos });
    mostrarAviso("Tarea agregada.");
  }

  cancelarEdicion();
  actualizar();
}

function alternarCompletada(id) {
  const tarea = tareas.find((t) => t.id === id);
  if (tarea) tarea.completada = !tarea.completada;
  actualizar();
}

function eliminarTarea(id) {
  const indice = tareas.findIndex((t) => t.id === id);
  if (indice === -1) return;
  ultimaEliminada = { tarea: tareas[indice], indice };
  tareas.splice(indice, 1);
  if (editandoId === id) cancelarEdicion();
  actualizar();
  mostrarAviso("Tarea eliminada.", "Deshacer", deshacerEliminar);
}

function deshacerEliminar() {
  if (!ultimaEliminada) return;
  tareas.splice(ultimaEliminada.indice, 0, ultimaEliminada.tarea);
  ultimaEliminada = null;
  actualizar();
  mostrarAviso("Tarea restaurada.");
}

function borrarCompletadas() {
  const cantidad = tareas.filter((t) => t.completada).length;
  if (cantidad === 0) return mostrarAviso("No hay tareas completadas.");
  if (!confirm("¿Borrar " + cantidad + " tarea(s) completada(s)?")) return;
  tareas = tareas.filter((t) => !t.completada);
  actualizar();
  mostrarAviso("Se borraron " + cantidad + " tarea(s).");
}

// ---------- Edición ----------
function empezarEdicion(id) {
  const tarea = tareas.find((t) => t.id === id);
  if (!tarea) return;
  editandoId = id;
  $("titulo").value = tarea.titulo;
  $("descripcion").value = tarea.descripcion;
  $("prioridad").value = tarea.prioridad;
  $("categoria").value = tarea.categoria;
  $("fecha").value = tarea.fecha;
  $("tituloForm").textContent = "Editar tarea";
  $("btnGuardar").textContent = "Guardar cambios";
  $("btnCancelar").hidden = false;
  $("titulo").focus();
}

function cancelarEdicion() {
  editandoId = null;
  formulario.reset();
  $("errorTitulo").textContent = "";
  $("tituloForm").textContent = "Nueva tarea";
  $("btnGuardar").textContent = "Agregar tarea";
  $("btnCancelar").hidden = true;
}

// ---------- Filtros y orden ----------
function obtenerVisibles() {
  const texto = filtros.busqueda.toLowerCase();

  const resultado = tareas.filter((t) => {
    if (filtros.estado === "pendientes" && t.completada) return false;
    if (filtros.estado === "completadas" && !t.completada) return false;
    if (filtros.categoria !== "todas" && t.categoria !== filtros.categoria) return false;
    if (filtros.prioridad !== "todas" && t.prioridad !== filtros.prioridad) return false;
    return t.titulo.toLowerCase().includes(texto) || t.descripcion.toLowerCase().includes(texto);
  });

  const criterios = {
    recientes: (a, b) => b.creada - a.creada,
    fecha: (a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999"),
    prioridad: (a, b) => PESO_PRIORIDAD[b.prioridad] - PESO_PRIORIDAD[a.prioridad]
  };
  return resultado.sort(criterios[filtros.orden]);
}

// ---------- Dibujar en pantalla ----------
function crearItemTarea(tarea) {
  const item = crearElemento("li", "tarea " + tarea.prioridad + (tarea.completada ? " hecha" : ""));
  item.dataset.id = tarea.id;

  const casilla = crearElemento("input");
  casilla.type = "checkbox";
  casilla.checked = tarea.completada;
  casilla.dataset.accion = "completar";
  casilla.setAttribute("aria-label", "Marcar como completada: " + tarea.titulo);

  const contenido = crearElemento("div");
  contenido.append(crearElemento("h3", "", tarea.titulo));
  if (tarea.descripcion) contenido.append(crearElemento("p", "", tarea.descripcion));

  const etiquetas = crearElemento("div", "etiquetas");
  etiquetas.append(
    crearElemento("span", "etiqueta", "Prioridad " + tarea.prioridad),
    crearElemento("span", "etiqueta", tarea.categoria)
  );
  if (tarea.fecha) {
    etiquetas.append(crearElemento("span", "etiqueta", "Límite: " + formatearFecha(tarea.fecha)));
  }
  if (estaVencida(tarea)) etiquetas.append(crearElemento("span", "etiqueta es-vencida", "Vencida"));
  contenido.append(etiquetas);

  const acciones = crearElemento("div", "acciones");
  const botonEditar = crearElemento("button", "btn secundario chico", "Editar");
  botonEditar.type = "button";
  botonEditar.dataset.accion = "editar";
  const botonEliminar = crearElemento("button", "btn secundario chico peligro", "Eliminar");
  botonEliminar.type = "button";
  botonEliminar.dataset.accion = "eliminar";
  acciones.append(botonEditar, botonEliminar);

  item.append(casilla, contenido, acciones);
  return item;
}

function dibujarLista() {
  const visibles = obtenerVisibles();
  lista.replaceChildren(...visibles.map(crearItemTarea));

  const vacio = $("vacio");
  vacio.hidden = visibles.length > 0;
  if (visibles.length === 0) {
    vacio.textContent = tareas.length === 0
      ? "Aún no tienes tareas. Agrega la primera con el formulario."
      : "Ninguna tarea coincide con los filtros.";
  }
}

function dibujarResumen() {
  const total = tareas.length;
  const completadas = tareas.filter((t) => t.completada).length;
  const vencidas = tareas.filter(estaVencida).length;
  const porcentaje = total === 0 ? 0 : Math.round((completadas / total) * 100);

  $("statTotal").textContent = total;
  $("statPendientes").textContent = total - completadas;
  $("statCompletadas").textContent = completadas;
  $("statVencidas").textContent = vencidas;
  $("barra").style.width = porcentaje + "%";
  $("pista").setAttribute("aria-valuenow", porcentaje);
  $("textoProgreso").textContent = total === 0
    ? "Sin tareas todavía"
    : porcentaje + "% completado (" + completadas + " de " + total + ")";
}

function actualizar() {
  guardarTareas();
  dibujarLista();
  dibujarResumen();
}

// ---------- Avisos ----------
function mostrarAviso(mensaje, textoBoton, accion) {
  const toast = $("toast");
  toast.replaceChildren(crearElemento("span", "", mensaje));
  if (textoBoton) {
    const boton = crearElemento("button", "", textoBoton);
    boton.type = "button";
    boton.addEventListener("click", () => {
      accion();
      toast.classList.remove("visible");
    });
    toast.append(boton);
  }
  toast.classList.add("visible");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.remove("visible"), 5000);
}

// ---------- Exportar e importar ----------
function exportarTareas() {
  if (tareas.length === 0) return mostrarAviso("No hay tareas para exportar.");
  const blob = new Blob([JSON.stringify(tareas, null, 2)], { type: "application/json" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "tareas-" + hoy() + ".json";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function importarTareas(archivo) {
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const datos = JSON.parse(lector.result);
      if (!Array.isArray(datos)) throw new Error("Formato inválido");
      const idsExistentes = new Set(tareas.map((t) => t.id));
      let importadas = 0;
      for (const dato of datos) {
        const tarea = normalizarTarea(dato);
        if (!tarea) continue;
        if (idsExistentes.has(tarea.id)) tarea.id = generarId();
        idsExistentes.add(tarea.id);
        tareas.push(tarea);
        importadas++;
      }
      actualizar();
      mostrarAviso("Se importaron " + importadas + " tarea(s).");
    } catch (e) {
      mostrarAviso("El archivo no es válido.");
    }
  };
  lector.readAsText(archivo);
}

// ---------- Tema claro / oscuro ----------
function aplicarTema(tema) {
  document.body.dataset.tema = tema;
  $("btnTema").textContent = tema === "oscuro" ? "Modo claro" : "Modo oscuro";
  try { localStorage.setItem(CLAVE_TEMA, tema); } catch (e) {}
}

function cargarTema() {
  let guardado = null;
  try { guardado = localStorage.getItem(CLAVE_TEMA); } catch (e) {}
  const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  aplicarTema(guardado || (prefiereOscuro ? "oscuro" : "claro"));
}

// ---------- Eventos ----------
formulario.addEventListener("submit", (e) => {
  e.preventDefault();
  guardarDesdeFormulario();
});

$("btnCancelar").addEventListener("click", cancelarEdicion);

lista.addEventListener("click", (e) => {
  const accion = e.target.dataset.accion;
  const item = e.target.closest(".tarea");
  if (!accion || !item) return;
  if (accion === "editar") empezarEdicion(item.dataset.id);
  if (accion === "eliminar") eliminarTarea(item.dataset.id);
});

lista.addEventListener("change", (e) => {
  const item = e.target.closest(".tarea");
  if (e.target.dataset.accion === "completar" && item) alternarCompletada(item.dataset.id);
});

$("busqueda").addEventListener("input", (e) => { filtros.busqueda = e.target.value.trim(); dibujarLista(); });
$("filtroEstado").addEventListener("change", (e) => { filtros.estado = e.target.value; dibujarLista(); });
$("filtroCategoria").addEventListener("change", (e) => { filtros.categoria = e.target.value; dibujarLista(); });
$("filtroPrioridad").addEventListener("change", (e) => { filtros.prioridad = e.target.value; dibujarLista(); });
$("orden").addEventListener("change", (e) => { filtros.orden = e.target.value; dibujarLista(); });

$("btnBorrarCompletadas").addEventListener("click", borrarCompletadas);
$("btnExportar").addEventListener("click", exportarTareas);
$("btnImportar").addEventListener("click", () => $("archivoImportar").click());
$("archivoImportar").addEventListener("change", (e) => {
  if (e.target.files[0]) importarTareas(e.target.files[0]);
  e.target.value = "";
});
$("btnTema").addEventListener("click", () => {
  aplicarTema(document.body.dataset.tema === "oscuro" ? "claro" : "oscuro");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && editandoId) cancelarEdicion();
});

// ---------- Inicio ----------
function iniciar() {
  $("categoria").replaceChildren(...CATEGORIAS.map((c) => new Option(c, c)));
  $("categoria").value = "Estudio";
  $("filtroCategoria").replaceChildren(
    new Option("Todas las categorías", "todas"),
    ...CATEGORIAS.map((c) => new Option(c, c))
  );
  cargarTema();
  tareas = cargarTareas();
  actualizar();
}

iniciar();
