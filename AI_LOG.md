# AI_LOG — Frontend (Gestion-Siniestros-Frontend)

Registro de prompts usados con el asistente de IA, sugerencias aceptadas y rechazadas, y sus motivos.

Este archivo registra solo los prompts del frontend. Los del backend están en el `AI_LOG.md` de `Gestion-Siniestros-Api`.

## Etapa 1 — Estructura inicial de la app Angular (2026-11-17)

### Prompt

> Avancemos con el Front end
>
> Lee el README.md y el contexto compartido antes de hacer cambios del contexto principal que te cargue comienza con la seccion ### Frontend y también toma en cuenta la sessión
> ## Instrucciones para trabajar con un asistente de IA. Este repositorio está vacío y será únicamente el frontend.
>
> Crea la aplicación con Angular. Revisa primero las versiones instaladas de Node y npm. Usa componentes standalone y routing.
> No agregues librerías de UI, estado global ni dependencias extra sin una razón concreta.
>
> Prepara una configuración central para la URL de la API, un servicio Angular para las llamadas HTTP y las rutas principales de listado, formulario y detalle. Sigue los nombres de propiedades y estados definidos en el README. Al terminar, ejecuta el build de Angular y corrige errores de compilación.
> Resume los archivos creados y el comando para ejecutar la app.

### Versiones encontradas

- Node 16.14.0 y npm 8.3.1 en `C:\Program Files\nodejs` (leídas de los archivos instalados; el asistente no pudo ejecutar `node -v` ni `npm -v`).
- Hay un `@angular/cli` global, versión no revisada.
- Con Node 16, lo máximo es Angular 16 (sin soporte desde nov 2024). El usuario eligió actualizar Node a 22 o 24 LTS y usar Angular 21.

### Decisiones aceptadas

- Angular 21 con componentes standalone, routing con carga diferida (`loadComponent`) y change detection zoneless (sin `zone.js`).
- Dependencias: solo los paquetes base de Angular, `rxjs` y `tslib`. Sin librerías de UI ni de estado global.
- URL de la API centralizada en `src/environments` (`environment.development.ts` para `ng serve`, `environment.ts` para `ng build`).
- `ClaimService` centraliza las 7 llamadas del contrato (`/claims`, `/claims/{id}`, `/claims/{id}/status`, `/claims/{id}/status-history`).
- Modelos con los nombres de propiedades del README; `ClaimStatus` como unión de strings `'Open' | 'InReview' | 'Closed'` y etiquetas en español.
- `withComponentInputBinding()` para recibir el `:id` de la ruta como `input()`.
- Pantallas de listado, formulario y detalle como componentes mínimos; su funcionalidad queda para la siguiente etapa.
- `.angular/` y `out-tsc/` agregados al `.gitignore`.

### Sugerencias rechazadas

- Angular 16 con Node 16: versión sin soporte.
- Configuración de pruebas (Vitest): no se pidió en esta etapa y agrega dependencias.

### Verificación

- El proyecto se escribió a mano: el asistente no pudo ejecutar `ng new`, `npm install` ni `ng build` (sin terminal en el equipo por falta de espacio en disco). La compilación NO está verificada.

## Organización de los AI_LOG (2026-11-17)

### Prompt

> EN el archivo AILog separa los prompts de dle back y del Front y agrega el nuevo prompt que acabo de escribir para el front y los proximos promts que vengan

### Decisión

- El usuario eligió un `AI_LOG.md` por repositorio: los prompts del backend en `Gestion-Siniestros-Api` y los del frontend en este archivo, incluidos los siguientes.
- Se aclaró el alcance en el título de cada archivo. El prompt inicial del frontend ya estaba registrado en la Etapa 1.

## Etapa 2 — Funcionalidad del frontend conectada a la API (2026-11-17)

### Prompt

> Implementa las funciones del frontend descritas en el README y conéctalas a la API real. No dejes datos mock como implementación final.
> Construye el listado con búsqueda por póliza y filtro por estado; el formulario para crear y editar; y el detalle con historial. Incluye las acciones
> de cambio de estado y eliminación, además de validaciones visibles, estados de carga, errores y lista vacía.
>
> Muestra en español las etiquetas de los estados, pero respeta los valores del contrato JSON. Si un endpoint o campo del README no coincide con la API disponible,
> revisa primero el README y el contrato del backend; no inventes rutas ni ocultes discrepancias con conversiones improvisadas.
> Al terminar, ejecuta el build y dame una guía corta para revisar manualmente crear, buscar, editar, cambiar estado y eliminar.

### Revisión del contrato

- README y backend (`ClaimsController`, DTOs) coinciden en las 7 rutas, los nombres de propiedades y los valores de estado. No se encontraron discrepancias ni se agregaron conversiones.
- Se trabajó sobre la versión del usuario (Angular 21.2.26 instalado; comentarios eliminados por el usuario).

### Decisiones aceptadas

- Sin datos mock: todas las pantallas usan `ClaimService` contra la API real.
- Estado de cada pantalla con signals (carga, errores, datos); formularios reactivos tipados.
- Validaciones del formulario iguales a las del backend: obligatorios sin solo espacios, longitudes 50/200/100, monto mayor que cero y máximo dos decimales. Errores visibles por campo al tocarlo o al guardar.
- Errores de la API traducidos a mensajes en español: sin conexión (status 0), 404, mensajes de validación 400 tal como los envía la API y el 500 genérico con su `traceId`.
- Mensajes de confirmación entre pantallas mediante el `state` de la navegación (no reaparecen al recargar).
- El cambio de estado solo ofrece estados distintos al actual (la API responde 400 si se repite). No se agregaron reglas de transición que el README no define.
- Eliminación con confirmación nativa (`window.confirm`) y desde el detalle.
- Montos con dos decimales sin símbolo de moneda (el README no define moneda); fechas UTC mostradas en hora local.
- Estilos propios en `styles.css`; sin librerías de UI.

### Sugerencias rechazadas

- Datos mock o un servicio en memoria: lo prohibió el usuario.
- Estado global (store): no hace falta; cada pantalla carga sus datos.
- Reglas de transición entre estados: no están en el README ni en el backend.

### Verificación

- El asistente NO ejecutó `ng build` (sin terminal en el equipo y sin paquetes de Angular ni red en su entorno). La compilación está pendiente del usuario.

## Etapa 3 — Defecto: fuga de estado/datos entre siniestros en la interfaz (2026-11-17)

### Defecto

- Fuga de estado/datos en la interfaz: el detalle y el formulario leían el `id` solo en `ngOnInit`. Como el router reutiliza el componente al navegar entre siniestros de la misma ruta (`/claims/1` → `/claims/2`, `/claims/1/edit` → `/claims/2/edit`), la pantalla podía seguir mostrando el siniestro anterior, y una acción (guardar, cambiar estado, eliminar) podía aplicarse sobre él. Una respuesta tardía del siniestro anterior también podía sobrescribir la pantalla actual.
- No es un incidente de seguridad: era un error de sincronización del estado de la interfaz con la ruta.

### Corrección (implementada por el usuario, validada por el asistente)

- Ambas páginas reaccionan al `input` del `id` con `toObservable` + `distinctUntilChanged` + `switchMap`: en cada cambio se reinicia el estado de la pantalla y se cancela la carga anterior.
- Las respuestas de guardar, cambiar estado, eliminar y recargar historial se descartan si el `id` actual ya no es el de la solicitud.
- El detalle carga el siniestro y el historial por separado (`merge`): si falla el historial, los datos del siniestro siguen visibles y el error aparece solo en la sección del historial, con el botón "Reintentar historial".
- Se conserva el comportamiento para identificadores inválidos y para los errores de la API.

### Ajustes del asistente en la validación

- El mensaje de confirmación de la navegación (por ejemplo, "Siniestro creado correctamente.") se borraba en la primera carga; ahora solo se limpia al cambiar a otro siniestro.
- El mensaje para status 0 ya no supone la causa: "No se pudo establecer conexión con la API. Inténtalo de nuevo." (status 0 también ocurre con la API detenida, CORS o el certificado).

### Recarga del historial durante una carga en curso (corregido por el usuario)

- Caso detectado en la validación: si se cambiaba el estado mientras aún cargaba el historial inicial, la recarga se omitía y el nuevo evento podía no mostrarse hasta recargar la página.
- Corrección: `loadHistory` marca la recarga como pendiente (`historyRefreshPending`) cuando ya hay una carga en curso, y `refreshHistoryIfPending()` la ejecuta al terminar cualquier carga del historial (inicial o recarga, con éxito o error). El indicador se reinicia al cambiar de siniestro.

### Verificación

- npm run build pasó después de integrar los ajustes de navegación, carga independiente del historial, conservación del aviso, mensaje HTTP 0 y recarga pendiente del historial. El build se ejecutó desde el entorno de trabajo.
