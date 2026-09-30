import { Component, input, output } from '@angular/core';
import {
  TngButtonComponent,
  TngCardComponent,
  TngCardContentComponent,
  TngCardDescriptionComponent,
  TngCardHeaderComponent,
  TngCardTitleComponent,
  TngTagComponent,
} from '@tailng-ui/components';

@Component({
  selector: 'billmesh-workspace-shell',
  imports: [
    TngButtonComponent,
    TngCardComponent,
    TngCardContentComponent,
    TngCardDescriptionComponent,
    TngCardHeaderComponent,
    TngCardTitleComponent,
    TngTagComponent,
  ],
  template: `
    <header class="workspace-header">
      <div>
        <p class="workspace-eyebrow">Billmesh</p>
        <h1>{{ title() }}</h1>
        <p>{{ subtitle() }}</p>
      </div>
      <div class="workspace-session">
        <tng-tag tone="success">BFF session</tng-tag>
        <span>{{ userName() }}</span>
        <tng-button
          type="button"
          appearance="outline"
          tone="neutral"
          (click)="logout.emit()"
        >
          Sign out
        </tng-button>
      </div>
    </header>

    <main>
      <tng-card variant="outline" padding="md">
        <tng-card-header>
          <tng-card-title>Workspace ready</tng-card-title>
          <tng-card-description>
            This shell is authenticated through an opaque Billmesh BFF session.
          </tng-card-description>
        </tng-card-header>
        <tng-card-content>
          <ng-content />
        </tng-card-content>
      </tng-card>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: var(--tng-semantic-background-canvas);
      color: var(--tng-semantic-foreground-primary);
    }

    .workspace-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      padding: 2rem clamp(1rem, 4vw, 4rem);
      border-bottom: 1px solid var(--tng-semantic-border-subtle);
      background: var(--tng-semantic-background-surface);
    }

    .workspace-header h1,
    .workspace-header p {
      margin: 0;
    }

    .workspace-header h1 {
      margin-block: 0.25rem;
      font-size: clamp(1.75rem, 4vw, 2.5rem);
    }

    .workspace-eyebrow {
      color: var(--tng-semantic-accent-brand);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .workspace-session {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    main {
      width: min(72rem, calc(100% - 2rem));
      margin: 2rem auto;
    }

    @media (max-width: 48rem) {
      .workspace-header,
      .workspace-session {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class WorkspaceShellComponent {
  readonly logout = output<void>();
  readonly subtitle = input.required<string>();
  readonly title = input.required<string>();
  readonly userName = input.required<string>();
}
