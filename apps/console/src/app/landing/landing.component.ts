import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@billmesh/auth';
import { AuthNoticeCardComponent, type AuthNotice } from '@billmesh/ui';

@Component({
  selector: 'billmesh-console-landing',
  imports: [AuthNoticeCardComponent],
  template: `
    <main>
      <div class="brand">
        <span>Billmesh</span>
        <h1>Billing infrastructure, clearly managed.</h1>
        <p>
          Review subscriptions, entitlements, invoices, and usage through one
          secure console.
        </p>
      </div>
      <billmesh-auth-notice-card
        [notice]="notice()"
        (action)="handleAction()"
      />
    </main>
  `,
  styles: `
    :host {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 1.5rem;
      background:
        radial-gradient(
          circle at top left,
          color-mix(in srgb, var(--tng-semantic-accent-brand) 18%, transparent),
          transparent 36rem
        ),
        var(--tng-semantic-background-canvas);
    }

    main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(20rem, 34rem);
      align-items: center;
      gap: clamp(2rem, 8vw, 8rem);
      width: min(72rem, 100%);
    }

    .brand span {
      color: var(--tng-semantic-accent-brand);
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 14ch;
      margin-block: 0.75rem 1rem;
      font-size: clamp(2.5rem, 7vw, 5rem);
      line-height: 0.98;
    }

    p {
      max-width: 48rem;
      color: var(--tng-semantic-foreground-secondary);
      font-size: 1.1rem;
      line-height: 1.6;
    }

    @media (max-width: 52rem) {
      main {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class LandingComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly notice = computed<AuthNotice>(() => {
    if (this.authStore.isLoading() || !this.authStore.sessionChecked()) {
      return {
        message: 'Checking your secure browser session.',
        pending: true,
        title: 'Connecting to Billmesh',
        tone: 'info',
      };
    }

    if (this.authStore.error()) {
      return {
        actionLabel: 'Try again',
        message: this.authStore.error() ?? 'Unable to check your session.',
        pending: false,
        title: 'Authentication unavailable',
        tone: 'danger',
      };
    }

    if (this.authStore.isAuthenticated()) {
      return {
        actionLabel: 'Open console',
        message: `Signed in as ${this.authStore.currentUser()?.email ?? 'an IdNest user'}.`,
        pending: false,
        title: 'Session ready',
        tone: 'success',
      };
    }

    return {
      actionLabel: 'Continue with IdNest',
      message: 'Sign in through the Billmesh BFF. Tokens remain on the server.',
      pending: false,
      title: 'Secure sign-in',
      tone: 'info',
    };
  });

  constructor() {
    queueMicrotask(() => void this.authStore.initialize());
  }

  protected handleAction(): void {
    if (this.authStore.error()) {
      void this.authStore.initialize(true);
    } else if (this.authStore.isAuthenticated()) {
      void this.router.navigateByUrl('/app');
    } else {
      this.authStore.login();
    }
  }
}
