# Gestion-Siniestros-Frontend
Prueba técnica Zurich, Frontend

Aplicación Angular para registrar y dar seguimiento a siniestros. Consume la API de `Gestion-Siniestros-Api`.

## Requisitos previos

- Node.js `^20.19.0`, `^22.12.0` o `>=24.0.0` (recomendado: 22 o 24 LTS). Angular 21 no funciona con Node 16.
- npm (incluido con Node).
- La API corriendo en `https://localhost:7080` con el certificado de desarrollo de confianza (`dotnet dev-certs https --trust`).

## Instalación y ejecución

```powershell
npm install
npm start          # ng serve, http://localhost:4200
npm run build      # build de producción en dist/
```

## Configuración de la API

La URL base está centralizada en `src/environments`:

| Archivo | Uso | `apiUrl` |
| ------- | --- | -------- |
| `environment.development.ts` | `ng serve` (configuración development) | `https://localhost:7080/api/v1` |
| `environment.ts` | `ng build` (configuración production) | `/api/v1` (ajustar al desplegar) |

El origen `http://localhost:4200` ya está permitido en el CORS de desarrollo de la API.

## Estructura

```
src/
  environments/                 URL de la API por entorno
  app/
    app.config.ts               Providers: router, HttpClient, zoneless
    app.routes.ts               Rutas principales (carga diferida)
    claims/
      models/claim.ts           Contratos JSON y etiquetas de estado
      services/claim.service.ts Llamadas HTTP a /claims
      pages/
        claim-list/             Listado con búsqueda y filtro
        claim-form/             Alta y edición con validaciones
        claim-detail/           Detalle, historial, cambio de estado y eliminación
    shared/
      http-error.ts             Mensajes de error a partir de ProblemDetails de la API
      navigation-notice.ts      Mensajes de confirmación entre pantallas
      route-params.ts           Validación del :id de la ruta
```

## Rutas

| Ruta | Pantalla |
| ---- | -------- |
| `/claims` | Listado |
| `/claims/new` | Formulario de alta |
| `/claims/:id` | Detalle con historial |
| `/claims/:id/edit` | Formulario de edición |

Cualquier otra ruta redirige a `/claims`.

## Estados

| Valor API | Etiqueta en la interfaz |
| --------- | ----------------------- |
| `Open` | Abierto |
| `InReview` | En revisión |
| `Closed` | Cerrado |

## Funcionalidades

- **Listado** (`/claims`): búsqueda por número de póliza (coincidencia por prefijo) combinable con el filtro por estado.
  Muestra estados de carga, error con opción de reintentar y lista vacía (con o sin filtros).
- **Formulario** (`/claims/new` y `/claims/:id/edit`): mismas reglas que la API (campos obligatorios, longitudes
  máximas de 50/200/100, monto mayor que cero con máximo dos decimales). Los errores se muestran por campo al salir de él
  o al guardar; si la API rechaza los datos, se muestran sus mensajes.
- **Detalle** (`/claims/:id`): datos del siniestro, historial de estados (el evento inicial aparece como "registro inicial"),
  cambio de estado (solo ofrece estados distintos al actual) y eliminación con confirmación.
- Mensajes de confirmación al crear, guardar, cambiar estado y eliminar.
- Los estados se muestran en español; a la API siempre se envían los valores del contrato (`Open`, `InReview`, `Closed`).
- Las fechas llegan en UTC y se muestran en la hora local del navegador.
- Errores de la API: sin conexión, 404, validaciones 400 y el 500 genérico con su `traceId`.

## Revisión manual

Con la API en `https://localhost:7080` y `npm start`, abre `http://localhost:4200`:

1. **Crear:** "Nuevo siniestro" → intenta guardar vacío (deben verse los errores por campo) y con monto `0` o `10.555`.
   Luego captura datos válidos y guarda: debe abrir el detalle con "Siniestro creado correctamente.", estado
   Abierto y un evento "registro inicial" en el historial.
2. **Buscar:** en el listado escribe el inicio de un número de póliza y presiona "Buscar"; combina con el filtro
   de estado. Una búsqueda sin resultados muestra "No hay siniestros que coincidan con la búsqueda.". "Limpiar"
   restablece el listado.
3. **Editar:** "Editar" desde el listado o el detalle → cambia datos y guarda: debe mostrar "Cambios guardados
   correctamente." y la nueva fecha de última actualización.
4. **Cambiar estado:** en el detalle elige "En revisión" y luego "Cerrado": el estado y el historial se actualizan
   con estado anterior, nuevo y fecha.
5. **Eliminar:** "Eliminar" → confirma: regresa al listado con "Siniestro eliminado correctamente." y el siniestro
   ya no aparece. Abrir su URL de detalle debe mostrar "El siniestro no existe o fue eliminado.".
6. **Errores:** con la API detenida, recarga el listado: debe mostrar "No se pudo conectar con la API..." y "Reintentar".
