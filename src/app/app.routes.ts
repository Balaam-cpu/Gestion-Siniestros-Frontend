import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'claims' },
  {
    path: 'claims',
    title: 'Siniestros',
    loadComponent: () => import('./claims/pages/claim-list/claim-list.component').then((m) => m.ClaimListComponent),
  },
  {
    path: 'claims/new',
    title: 'Nuevo siniestro',
    loadComponent: () => import('./claims/pages/claim-form/claim-form.component').then((m) => m.ClaimFormComponent),
  },
  {
    path: 'claims/:id',
    title: 'Detalle del siniestro',
    loadComponent: () => import('./claims/pages/claim-detail/claim-detail.component').then((m) => m.ClaimDetailComponent),
  },
  {
    path: 'claims/:id/edit',
    title: 'Editar siniestro',
    loadComponent: () => import('./claims/pages/claim-form/claim-form.component').then((m) => m.ClaimFormComponent),
  },
  { path: '**', redirectTo: 'claims' },
];
