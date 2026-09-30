import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { browserSessionInterceptor } from '@billmesh/auth';
import { AppConfigStore } from '@billmesh/config';
import { defaultThemePreset, provideTailngTheme } from '@tailng-ui/theme';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([browserSessionInterceptor])),
    provideRouter(routes),
    provideTailngTheme({ theme: defaultThemePreset }),
    provideAppInitializer(() => inject(AppConfigStore).load()),
  ],
};
