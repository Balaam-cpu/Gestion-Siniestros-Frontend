# Gestor de Siniestros — Frontend

Prueba técnica Zurich. Aplicación Angular para registrar y dar seguimiento a siniestros mediante la API de Gestion-Siniestros-Api.

## Resumen para revisión

- Angular 21 con componentes standalone y rutas de carga diferida.
- Formularios reactivos con validaciones alineadas con la API.
- Datos reales desde la API; no se usan respuestas mock ni almacenamiento local.
- El servicio, modelos y utilidades compartidas están separados de las páginas de listado, formulario y detalle.
- Los estados de carga, errores, resultados vacíos y confirmaciones se muestran en la interfaz.
- El estado se mantiene por pantalla con signals; no se agrega un store global para este alcance.

## Evidencia de uso de IA

El archivo [AI_LOG.md](AI_LOG.md) registra los prompts, las decisiones aceptadas y rechazadas, y las correcciones realizadas durante la revisión.

## Requisitos

- Node.js: ^20.19.0, ^22.12.0 o >=24.0.0, según el campo engines de package.json.
- npm.
- La API de Gestion-Siniestros-Api ejecutándose en https://localhost:7080.
- Certificado HTTPS de desarrollo confiable. Si hace falta, ejecutar: dotnet dev-certs https --trust.

### Iniciar la API

Desde el proyecto GestionSiniestros.Api del repositorio backend:

    dotnet run --launch-profile https

La API debe tener SQL Server configurado y sus migraciones aplicadas. Consulta el README del backend para esos pasos. La configuración CORS de desarrollo de la API debe permitir http://localhost:4200.

## Instalación y ejecución

Desde la raíz de este repositorio:

    npm install
    npm start

La aplicación queda disponible en http://localhost:4200. Para compilar la versión de producción:

    npm run build

## Configuración de la API

La URL base se define en src/environments:

| Archivo | Uso | URL base |
| --- | --- | --- |
| environment.development.ts | npm start / ng serve | https://localhost:7080/api/v1 |
| environment.ts | npm run build | /api/v1 |

En producción, /api/v1 debe apuntar a la API mediante el mismo origen o un proxy inverso. Ajusta la URL de environment.ts si el despliegue usa otra dirección.

## Organización

    src/
      environments/                 URL de la API por entorno
      app/
        app.component.ts             Componente raíz
        app.component.html           Plantilla del componente raíz
        app.component.css            Estilos del componente raíz
        app.config.ts               Providers de router, HttpClient y zoneless
        app.routes.ts               Rutas con carga diferida
        claims/
          models/claim.ts           Contratos JSON y etiquetas de estado
          services/claim.service.ts Llamadas HTTP a la API
          pages/
            claim-list/
              claim-list.component.ts   Lógica del listado, búsqueda y filtro
              claim-list.component.html Plantilla del listado
            claim-form/
              claim-form.component.ts   Alta y edición con validaciones
              claim-form.component.html Plantilla del formulario
            claim-detail/
              claim-detail.component.ts   Detalle, historial y acciones
              claim-detail.component.html Plantilla del detalle
        shared/
          http-error.ts             Conversión de errores HTTP para la interfaz
          navigation-notice.ts      Mensajes de confirmación entre pantallas
          route-params.ts           Validación del identificador de ruta

## Pantallas y rutas

| Ruta | Funcionalidad |
| --- | --- |
| /claims | Lista siniestros y filtra por prefijo de póliza y estado |
| /claims/new | Registra un siniestro |
| /claims/:id | Consulta detalle e historial, cambia estado y elimina |
| /claims/:id/edit | Edita los datos del siniestro |

Las rutas desconocidas redirigen al listado.

## Operaciones de API utilizadas

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | /api/v1/claims | Lista; acepta policyNumber y status como filtros |
| GET | /api/v1/claims/{id} | Consulta un siniestro |
| POST | /api/v1/claims | Crea un siniestro |
| PUT | /api/v1/claims/{id} | Actualiza sus datos |
| PATCH | /api/v1/claims/{id}/status | Cambia su estado |
| DELETE | /api/v1/claims/{id} | Elimina el siniestro |
| GET | /api/v1/claims/{id}/status-history | Consulta su historial de estados |

## Contrato y comportamiento

| Valor enviado a la API | Etiqueta mostrada |
| --- | --- |
| Open | Abierto |
| InReview | En revisión |
| Closed | Cerrado |

- La búsqueda por póliza coincide desde el inicio del número y se puede combinar con el filtro por estado.
- Los campos de texto son obligatorios, se recortan espacios externos y respetan las longitudes de la API: 50, 200 y 100 caracteres.
- El monto debe ser mayor que cero, admite hasta dos decimales y el formulario lo limita a 9,999,999,999,999.99 para evitar pérdida de precisión en el navegador. La API admite hasta 9999999999999999.99. No se muestra símbolo de moneda porque el contrato no especifica una moneda.
- Las fechas de la API están en UTC y se presentan en la hora local del navegador.
- El formulario y el detalle reaccionan si cambia el identificador de ruta mientras Angular reutiliza el componente.
- El detalle carga el siniestro y el historial por separado. Un error del historial no oculta el siniestro y permite reintentar.
- Los mensajes de error contemplan fallos de conexión, 404, validaciones 400 y errores de servidor con traceId cuando está disponible.

## Guía de revisión manual

Con SQL Server, la API y la aplicación activos:

1. Abre el listado y confirma que aparece el estado vacío o la lista existente.
2. Intenta crear un siniestro vacío, con monto 0 y con monto 10.555; revisa los errores de validación. Después crea uno válido y confirma el estado Abierto y el evento inicial del historial.
3. Busca por el inicio de un número de póliza y combina la búsqueda con un estado. Usa Limpiar para restablecer los filtros.
4. Edita un siniestro y confirma que se muestra el mensaje de éxito y la fecha de actualización nueva.
5. Cambia el estado a En revisión y luego a Cerrado; revisa que el historial muestre los eventos y sus fechas.
6. Elimina un siniestro, confirma la acción y revisa el mensaje en el listado. Si abres su URL anterior, la pantalla debe informar que no existe.
7. Detén la API y vuelve a cargar el listado para revisar el mensaje de conexión y la opción Reintentar.

## Validación

- Compilación de producción: npm run build (verificado).
- Para recorrer el flujo completo contra la API, sigue la guía de revisión manual anterior con SQL Server y la API activos.
