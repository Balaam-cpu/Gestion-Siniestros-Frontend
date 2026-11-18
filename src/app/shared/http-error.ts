import { HttpErrorResponse } from '@angular/common/http';

interface ApiProblemDetails {
  title?: string;
  detail?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

const DEFAULT_MESSAGE = 'Ocurrió un error inesperado. Intenta de nuevo.';

/**
 * Convierte un error HTTP de la API (ProblemDetails) en mensajes para el usuario.
 */
export function getErrorMessages(error: unknown, notFoundMessage = 'El siniestro no existe o fue eliminado.'): string[] {
  if (!(error instanceof HttpErrorResponse)) {
    return [DEFAULT_MESSAGE];
  }

  if (error.status === 0) {
    return ['No se pudo conectar con la API. Verifica que esté en ejecución.'];
  }

  if (error.status === 404) {
    return [notFoundMessage];
  }

  const problem = (error.error ?? null) as ApiProblemDetails | null;

  if (error.status === 400 && problem?.errors) {
    const messages = Object.values(problem.errors).flat();
    if (messages.length) {
      return messages;
    }
  }

  const message = problem?.detail ?? DEFAULT_MESSAGE;
  return [problem?.traceId ? `${message} (traceId: ${problem.traceId})` : message];
}
