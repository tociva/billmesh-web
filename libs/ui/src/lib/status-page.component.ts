import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  TngButtonComponent,
  TngCardComponent,
  TngCardDescriptionComponent,
  TngCardFooterComponent,
  TngCardHeaderComponent,
  TngCardTitleComponent,
} from '@tailng-ui/components';

@Component({
  selector: 'billmesh-status-page',
  imports: [
    TngButtonComponent,
    TngCardComponent,
    TngCardDescriptionComponent,
    TngCardFooterComponent,
    TngCardHeaderComponent,
    TngCardTitleComponent,
  ],
  template: `
    <main>
      <tng-card variant="outline" tone="warning" padding="md">
        <tng-card-header>
          <tng-card-title>{{ title }}</tng-card-title>
          <tng-card-description>{{ message }}</tng-card-description>
        </tng-card-header>
        <tng-card-footer>
          <tng-button
            type="button"
            appearance="solid"
            tone="primary"
            (click)="goHome()"
          >
            Return home
          </tng-button>
        </tng-card-footer>
      </tng-card>
    </main>
  `,
  styles: `
    :host {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 1rem;
      background: var(--tng-semantic-background-canvas);
    }

    main {
      width: min(100%, 34rem);
    }
  `,
})
export class StatusPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly message = String(
    this.route.snapshot.data['message'] ?? 'The requested page is unavailable.',
  );
  protected readonly title = String(
    this.route.snapshot.data['title'] ?? 'Page unavailable',
  );

  protected goHome(): void {
    void this.router.navigateByUrl('/');
  }
}
