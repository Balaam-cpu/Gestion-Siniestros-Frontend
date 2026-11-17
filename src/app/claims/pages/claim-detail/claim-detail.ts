import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-claim-detail',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Detalle del siniestro {{ id() }}</h1>
    <a routerLink="/claims">Volver al listado</a>
  `,
})
export class ClaimDetail {
  readonly id = input.required<string>();
}
