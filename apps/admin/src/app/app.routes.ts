import type { Routes } from '@angular/router';
import { authenticatedGuard, permissionGuard } from '@billmesh/auth';
import { StatusPageComponent } from '@billmesh/ui';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./landing/landing.component').then(
        (module) => module.LandingComponent,
      ),
  },
  {
    path: 'app',
    canActivate: [authenticatedGuard, permissionGuard('billing:admin')],
    loadComponent: () =>
      import('./admin-shell/admin-shell.component').then(
        (module) => module.AdminShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./workspace/workspace.component').then(
            (module) => module.WorkspaceComponent,
          ),
      },
      {
        path: 'catalogue',
        loadChildren: () =>
          import('./catalogue/catalogue.routes').then(
            (module) => module.catalogueRoutes,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/settings.component').then(
            (module) => module.SettingsComponent,
          ),
      },
    ],
  },
  {
    path: 'auth/error',
    data: {
      title: 'Admin sign-in failed',
      message: 'Billmesh could not establish an IdNest admin session.',
    },
    component: StatusPageComponent,
  },
  {
    path: 'auth/logout',
    data: {
      title: 'Signed out',
      message: 'Your Billmesh Admin browser session has ended.',
    },
    component: StatusPageComponent,
  },
  {
    path: 'forbidden',
    data: {
      title: 'Admin access denied',
      message: 'Your account does not have billing:admin permission.',
    },
    component: StatusPageComponent,
  },
  {
    path: '**',
    data: {
      title: 'Page not found',
      message: 'The requested Billmesh Admin page does not exist.',
    },
    component: StatusPageComponent,
  },
];
