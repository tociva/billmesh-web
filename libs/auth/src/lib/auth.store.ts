import { computed, inject } from '@angular/core';
import { AppConfigStore } from '@billmesh/config';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { AuthService } from './auth.service';
import { BrowserSessionStateService } from './browser-session-state.service';

interface AuthState {
  error: string | null;
  isLoading: boolean;
  sessionChecked: boolean;
}

const initialState: AuthState = {
  error: null,
  isLoading: false,
  sessionChecked: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((_state, sessionState = inject(BrowserSessionStateService)) => ({
    currentUser: computed(() => sessionState.session()?.user ?? null),
    isAuthenticated: computed(
      () => sessionState.session()?.authenticated === true,
    ),
    permissions: computed(
      () => sessionState.session()?.permissions ?? ([] as readonly string[]),
    ),
    session: computed(() => sessionState.session()),
  })),
  withMethods(
    (
      store,
      authService = inject(AuthService),
      configStore = inject(AppConfigStore),
      sessionState = inject(BrowserSessionStateService),
    ) => ({
      can(permission: string): boolean {
        return (
          sessionState.session()?.permissions?.includes(permission) ?? false
        );
      },

      async initialize(force = false): Promise<boolean> {
        if (!force && store.sessionChecked()) {
          return sessionState.session() !== null;
        }

        const authConfig = configStore.activeAuth();
        if (!authConfig) {
          patchState(store, {
            error: 'Authentication configuration is unavailable.',
            isLoading: false,
            sessionChecked: true,
          });
          return false;
        }

        patchState(store, { error: null, isLoading: true });
        try {
          const session = await authService.loadSession(authConfig);
          patchState(store, {
            error: null,
            isLoading: false,
            sessionChecked: true,
          });
          return session !== null;
        } catch (error) {
          patchState(store, {
            error:
              error instanceof Error
                ? error.message
                : 'Unable to check the browser session.',
            isLoading: false,
            sessionChecked: true,
          });
          return false;
        }
      },

      login(): void {
        const authConfig = configStore.activeAuth();
        if (!authConfig) {
          patchState(store, {
            error: 'Authentication configuration is unavailable.',
          });
          return;
        }

        authService.startLogin(authConfig, authService.currentReturnPath());
      },

      async logout(): Promise<void> {
        const authConfig = configStore.activeAuth();
        if (!authConfig) {
          patchState(store, {
            error: 'Authentication configuration is unavailable.',
          });
          return;
        }

        patchState(store, { error: null, isLoading: true });
        try {
          await authService.startLogout(authConfig);
        } catch (error) {
          patchState(store, {
            error:
              error instanceof Error ? error.message : 'Unable to sign out.',
            isLoading: false,
          });
        }
      },

      clearSession(): void {
        sessionState.clear();
        patchState(store, initialState);
      },
    }),
  ),
);
