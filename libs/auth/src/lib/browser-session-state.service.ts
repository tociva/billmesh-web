import { Injectable, signal } from '@angular/core';
import type { BrowserSession } from './auth.model';

@Injectable({ providedIn: 'root' })
export class BrowserSessionStateService {
  private readonly sessionValue = signal<BrowserSession | null>(null);

  readonly session = this.sessionValue.asReadonly();

  clear(): void {
    this.sessionValue.set(null);
  }

  csrfToken(): string | null {
    return this.sessionValue()?.csrfToken ?? null;
  }

  set(session: BrowserSession): void {
    this.sessionValue.set(session);
  }
}
