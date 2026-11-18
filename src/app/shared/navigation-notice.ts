import { Router } from '@angular/router';

/**
 * Lee el mensaje de confirmación enviado en el state de la navegación actual
 * (por ejemplo, después de crear o eliminar). Solo existe durante esa navegación,
 * así que no reaparece al recargar la página.
 */
export function readNavigationNotice(router: Router): string | null {
  const notice = router.getCurrentNavigation()?.extras.state?.['notice'];
  return typeof notice === 'string' ? notice : null;
}
