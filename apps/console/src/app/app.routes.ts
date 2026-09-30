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
    canActivate: [authenticatedGuard, permissionGuard('billing:read')],
    loadComponent: () =>
      import('./workspace/workspace.component').then(
        (module) => module.WorkspaceComponent,
      ),
  },
  {
    path: 'auth/error',
    data: {
      title: 'Sign-in failed',
      message: 'Billmesh could not establish an IdNest browser session.',
    },
    component: StatusPageComponent,
  },
  {
    path: 'auth/logout',
    data: {
      title: 'Signed out',
      message: 'Your Billmesh Console browser session has ended.',
    },
    component: StatusPageComponent,
  },
  {
    path: 'forbidden',
    data: {
      title: 'Access denied',
      message: 'Your account does not have billing:read permission.',
    },
    component: StatusPageComponent,
  },
  {
    path: '**',
    data: {
      title: 'Page not found',
      message: 'The requested Billmesh Console page does not exist.',
    },
    component: StatusPageComponent,
  },
];
