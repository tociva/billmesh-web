import type { Routes } from '@angular/router';

export const catalogueRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./products/product-list/product-list.component').then(
        (module) => module.ProductListComponent,
      ),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./products/product-create/product-create.component').then(
        (module) => module.ProductCreateComponent,
      ),
  },
  {
    path: ':productId/plans/create',
    loadComponent: () =>
      import('./plans/plan-create/plan-create.component').then(
        (module) => module.PlanCreateComponent,
      ),
  },
  {
    path: ':productId/plans/:planId/edit',
    loadComponent: () =>
      import('./plans/plan-edit/plan-edit.component').then(
        (module) => module.PlanEditComponent,
      ),
  },
  {
    path: ':productId/plans/:planId/delete',
    loadComponent: () =>
      import('./plans/plan-archive/plan-archive.component').then(
        (module) => module.PlanArchiveComponent,
      ),
  },
  {
    path: ':productId/plans/:planId',
    loadComponent: () =>
      import('./plans/plan-details/plan-details.component').then(
        (module) => module.PlanDetailsComponent,
      ),
  },
  {
    path: ':productId/edit',
    loadComponent: () =>
      import('./products/product-edit/product-edit.component').then(
        (module) => module.ProductEditComponent,
      ),
  },
  {
    path: ':productId/delete',
    loadComponent: () =>
      import('./products/product-archive/product-archive.component').then(
        (module) => module.ProductArchiveComponent,
      ),
  },
  {
    path: ':productId',
    loadComponent: () =>
      import('./products/product-details/product-details.component').then(
        (module) => module.ProductDetailsComponent,
      ),
  },
];
