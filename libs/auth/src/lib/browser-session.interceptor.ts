import {
  HttpErrorResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AppConfigStore } from '@billmesh/config';
import { catchError, throwError } from 'rxjs';
import { BrowserSessionStateService } from './browser-session-state.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function matchesBaseUrl(requestUrl: string, baseUrl: string): boolean {
  const request = new URL(requestUrl, window.location.origin);
  const base = new URL(baseUrl, window.location.origin);
  const basePath = base.pathname.replace(/\/$/, '');

  return (
    request.origin === base.origin &&
    (request.pathname === basePath ||
      request.pathname.startsWith(`${basePath}/`))
  );
}

export const browserSessionInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(AppConfigStore).config();
  const sessionState = inject(BrowserSessionStateService);

  if (
    !config ||
    (!matchesBaseUrl(request.url, config.apiBaseUrl) &&
      !matchesBaseUrl(request.url, config.auth.bffBaseUrl))
  ) {
    return next(request);
  }

  const csrfToken = sessionState.csrfToken();
  const headers =
    csrfToken && !SAFE_METHODS.has(request.method.toUpperCase())
      ? request.headers.set('X-CSRF-Token', csrfToken)
      : request.headers;

  return next(request.clone({ headers, withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        sessionState.clear();
      }
      return throwError(() => error);
    }),
  );
};
