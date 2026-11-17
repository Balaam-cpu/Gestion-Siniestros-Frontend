import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-claim-list',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Siniestros</h1>
    <a routerLink="/claims/new">Nuevo siniestro</a>
  `,
})
export class ClaimList {}
