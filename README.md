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
        claim-list/             Listado
        claim-form/             Alta y edición
        claim-detail/           Detalle con historial
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
