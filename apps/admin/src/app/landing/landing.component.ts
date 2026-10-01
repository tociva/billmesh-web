import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, AuthStore } from '@billmesh/auth';
import { AuthNoticeCardComponent, type AuthNotice } from '@billmesh/ui';

const DEFAULT_LANDING_PATH = '/app';

@Component({
  selector: 'billmesh-admin-landing',
  imports: [AuthNoticeCardComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly notice = computed<AuthNotice>(() => {
    if (this.authStore.isLoading() || !this.authStore.sessionChecked()) {
      return {
        message: 'Checking your secure admin browser session.',
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
        actionLabel: 'Open admin',
        message: `Signed in as ${this.authStore.currentUser()?.email ?? 'an IdNest admin'}.`,
        pending: false,
        title: 'Admin session ready',
        tone: 'success',
      };
    }

    return {
      actionLabel: 'Continue with IdNest',
      message: 'Sign in through the Admin BFF. Tokens remain on the server.',
      pending: false,
      title: 'Restricted access',
      tone: 'warning',
    };
  });

  constructor() {
    queueMicrotask(() => void this.initialize());
  }

  protected handleAction(): void {
    if (this.authStore.error()) {
      void this.authStore.initialize(true);
    } else if (this.authStore.isAuthenticated()) {
      void this.router.navigateByUrl(this.landingPath());
    } else {
      this.authStore.login();
    }
  }

  private async initialize(): Promise<void> {
    await this.authStore.initialize();

    if (!this.authStore.isAuthenticated()) {
      return;
    }

    await this.router.navigateByUrl(this.landingPath(), { replaceUrl: true });
  }

  private landingPath(): string {
    const queryParams = this.route.snapshot.queryParamMap;
    const configuredBackUrl =
      queryParams.get('backurl') ??
      queryParams.get('backUrl') ??
      queryParams.get('returnTo') ??
      DEFAULT_LANDING_PATH;

    return this.authService.safeReturnPath(configuredBackUrl);
  }
}
