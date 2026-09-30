import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { AppConfig } from './app-config.model';
import { AppConfigService } from './app-config.service';

interface AppConfigState {
  config: AppConfig | null;
  error: string | null;
  isLoading: boolean;
}

const initialState: AppConfigState = {
  config: null,
  error: null,
  isLoading: false,
};

export const AppConfigStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ config }) => ({
    activeApiBaseUrl: computed(() => config()?.apiBaseUrl ?? null),
    activeAuth: computed(() => config()?.auth ?? null),
    isReady: computed(() => config() !== null),
  })),
  withMethods((store, service = inject(AppConfigService)) => ({
    async load(): Promise<AppConfig | null> {
      patchState(store, { config: null, error: null, isLoading: true });

      try {
        const config = await service.loadConfig();
        patchState(store, { config, error: null, isLoading: false });
        return config;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load app config.';
        patchState(store, { config: null, error: message, isLoading: false });
        return null;
      }
    },
  })),
);
