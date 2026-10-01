import type { Routes } from '@angular/router';

export const catalogueRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./catalogue.component').then(
        (module) => module.CatalogueComponent,
      ),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./product-form/product-form.component').then(
        (module) => module.ProductFormComponent,
      ),
  },
  {
    path: ':productId/plans/create',
    loadComponent: () =>
      import('./plan-form/plan-form.component').then(
        (module) => module.PlanFormComponent,
      ),
  },
  {
    path: ':productId/plans/:planId/edit',
    loadComponent: () =>
      import('./plan-form/plan-form.component').then(
        (module) => module.PlanFormComponent,
      ),
  },
  {
    path: ':productId/plans/:planId/delete',
    loadComponent: () =>
      import('./plan-delete/plan-delete.component').then(
        (module) => module.PlanDeleteComponent,
      ),
  },
  {
    path: ':productId/plans/:planId',
    loadComponent: () =>
      import('./plan-view/plan-view.component').then(
        (module) => module.PlanViewComponent,
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./product-form/product-form.component').then(
        (module) => module.ProductFormComponent,
      ),
  },
  {
    path: ':id/delete',
    loadComponent: () =>
      import('./product-delete/product-delete.component').then(
        (module) => module.ProductDeleteComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./product-view/product-view.component').then(
        (module) => module.ProductViewComponent,
      ),
  },
];
