import { Router } from '@angular/router';

export function readNavigationNotice(router: Router): string | null {
  const notice = router.getCurrentNavigation()?.extras.state?.['notice'];
  return typeof notice === 'string' ? notice : null;
}
