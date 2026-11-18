import { HttpErrorResponse } from '@angular/common/http';

interface ApiProblemDetails {
  title?: string;
  detail?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

const DEFAULT_MESSAGE = 'Ocurrió un error inesperado. Intenta de nuevo.';

export function isNotFoundError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}

export function getErrorMessages(error: unknown, notFoundMessage = 'El siniestro no existe o fue eliminado.'): string[] {
  if (!(error instanceof HttpErrorResponse)) {
    return [DEFAULT_MESSAGE];
  }

  if (error.status === 0) {
    return ['No se pudo establecer conexión con la API. Inténtalo de nuevo.'];
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
