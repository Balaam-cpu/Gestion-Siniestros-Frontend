import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'claims' },
  {
    path: 'claims',
    title: 'Siniestros',
    loadComponent: () => import('./claims/pages/claim-list/claim-list').then((m) => m.ClaimList),
  },
  {
    path: 'claims/new',
    title: 'Nuevo siniestro',
    loadComponent: () => import('./claims/pages/claim-form/claim-form').then((m) => m.ClaimForm),
  },
  {
    path: 'claims/:id',
    title: 'Detalle del siniestro',
    loadComponent: () => import('./claims/pages/claim-detail/claim-detail').then((m) => m.ClaimDetail),
  },
  {
    path: 'claims/:id/edit',
    title: 'Editar siniestro',
    loadComponent: () => import('./claims/pages/claim-form/claim-form').then((m) => m.ClaimForm),
  },
  { path: '**', redirectTo: 'claims' },
];
