import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from './auth.store';

export const authenticatedGuard: CanActivateFn = async () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const authenticated = authStore.sessionChecked()
    ? authStore.isAuthenticated()
    : await authStore.initialize();

  return authenticated ? true : router.createUrlTree(['/']);
};

export function permissionGuard(permission: string): CanActivateFn {
  return async () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);
    const authenticated = authStore.sessionChecked()
      ? authStore.isAuthenticated()
      : await authStore.initialize();

    if (!authenticated) {
      return router.createUrlTree(['/']);
    }

    return authStore.can(permission)
      ? true
      : router.createUrlTree(['/forbidden']);
  };
}
