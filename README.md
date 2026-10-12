# ✅ Gestor de tareas

Aplicación web para organizar tareas pendientes, desarrollada con **HTML, CSS y JavaScript puro** (sin librerías ni servidor). Proyecto de portafolio que demuestra lógica de programación, manejo del DOM y persistencia de datos.

## Funcionalidades

- Crear, editar, completar y eliminar tareas
- Prioridad (alta, media, baja), categoría y fecha límite
- Detección automática de tareas vencidas
- Búsqueda por texto y filtros por estado, categoría y prioridad
- Orden por fecha de creación, fecha límite o prioridad
- Panel de resumen con barra de progreso
- Deshacer al eliminar una tarea
- Exportar e importar tareas en formato JSON
- Modo claro y oscuro (respeta la preferencia del sistema)
- Datos guardados en el navegador con `localStorage`
- Validación de formularios y diseño responsive

## Estructura

```
├── index.html   # Estructura de la página
├── estilos.css  # Estilos y temas
└── app.js       # Lógica de la aplicación
```

## Cómo ejecutarlo

1. Descarga o clona el repositorio
2. Abre `index.html` en tu navegador

## Conceptos aplicados

- Manipulación del DOM sin `innerHTML` para evitar inyección de código
- Delegación de eventos
- Arreglos y métodos funcionales (`filter`, `map`, `sort`)
- Persistencia con `localStorage` y manejo de errores con `try/catch`
- Lectura y descarga de archivos con `FileReader` y `Blob`

## Autor

Hennry — estudiante de Ingeniería de Sistemas, UDABOL.
