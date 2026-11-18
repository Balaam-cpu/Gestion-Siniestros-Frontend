/**
 * Devuelve el id numérico de un parámetro de ruta, o null si no es un entero positivo.
 */
export function parseRouteId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
