import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-claim-form',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isEdit() ? 'Editar siniestro' : 'Nuevo siniestro' }}</h1>
    <a routerLink="/claims">Volver al listado</a>
  `,
})
export class ClaimForm {
  readonly id = input<string>();

  readonly isEdit = computed(() => this.id() !== undefined);
}
