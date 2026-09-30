import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { AuthConfig } from '@billmesh/config';
import { firstValueFrom } from 'rxjs';
import type { BffLogoutResponse, BrowserSession } from './auth.model';
import { BrowserSessionStateService } from './browser-session-state.service';

const DEFAULT_RETURN_PATH = '/app';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionState = inject(BrowserSessionStateService);

  async loadSession(config: AuthConfig): Promise<BrowserSession | null> {
    try {
      const session = await firstValueFrom(
        this.http.get<BrowserSession>(`${this.baseUrl(config)}/session`, {
          withCredentials: true,
        }),
      );
      this.sessionState.set(session);
      return session;
    } catch (error) {
      this.sessionState.clear();
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return null;
      }
      throw error;
    }
  }

  startLogin(config: AuthConfig, returnTo = DEFAULT_RETURN_PATH): void {
    const safeReturnTo = this.safeReturnPath(returnTo);
    const loginUrl = new URL(
      `${this.baseUrl(config)}/login`,
      window.location.origin,
    );
    loginUrl.searchParams.set('returnTo', safeReturnTo);
    window.location.assign(loginUrl.toString());
  }

  async startLogout(config: AuthConfig): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<BffLogoutResponse>(
        `${this.baseUrl(config)}/logout`,
        {},
        { withCredentials: true },
      ),
    );
    this.sessionState.clear();
    window.location.assign(result.logoutUrl);
  }

  currentReturnPath(): string {
    return this.safeReturnPath(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }

  safeReturnPath(candidate: string): string {
    if (
      !candidate.startsWith('/') ||
      candidate.startsWith('//') ||
      candidate.includes('\\')
    ) {
      return DEFAULT_RETURN_PATH;
    }

    const resolved = new URL(candidate, window.location.origin);
    if (
      resolved.origin !== window.location.origin ||
      (resolved.pathname !== DEFAULT_RETURN_PATH &&
        !resolved.pathname.startsWith(`${DEFAULT_RETURN_PATH}/`))
    ) {
      return DEFAULT_RETURN_PATH;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  }

  private baseUrl(config: AuthConfig): string {
    return config.bffBaseUrl.replace(/\/$/, '');
  }
}
