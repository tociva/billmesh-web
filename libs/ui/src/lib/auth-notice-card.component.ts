import { Component, input, output } from '@angular/core';
import {
  TngButtonComponent,
  TngCardActionsComponent,
  TngCardComponent,
  TngCardContentComponent,
  TngCardDescriptionComponent,
  TngCardFooterComponent,
  TngCardHeaderComponent,
  TngCardTitleComponent,
  TngProgressBarComponent,
} from '@tailng-ui/components';

export interface AuthNotice {
  actionLabel?: string;
  message: string;
  pending: boolean;
  title: string;
  tone: 'danger' | 'info' | 'success' | 'warning';
}

@Component({
  selector: 'billmesh-auth-notice-card',
  imports: [
    TngButtonComponent,
    TngCardActionsComponent,
    TngCardComponent,
    TngCardContentComponent,
    TngCardDescriptionComponent,
    TngCardFooterComponent,
    TngCardHeaderComponent,
    TngCardTitleComponent,
    TngProgressBarComponent,
  ],
  template: `
    <tng-card variant="outline" [tone]="notice().tone" padding="md">
      <tng-card-header>
        <tng-card-title>{{ notice().title }}</tng-card-title>
        <tng-card-description>{{ notice().message }}</tng-card-description>
      </tng-card-header>
      @if (notice().pending) {
        <tng-card-content>
          <tng-progress-bar
            [indeterminate]="true"
            ariaLabel="Checking the Billmesh browser session"
          />
        </tng-card-content>
      }
      @if (notice().actionLabel) {
        <tng-card-footer>
          <tng-card-actions>
            <tng-button
              type="button"
              appearance="solid"
              tone="primary"
              [disabled]="notice().pending"
              (click)="action.emit()"
            >
              {{ notice().actionLabel }}
            </tng-button>
          </tng-card-actions>
        </tng-card-footer>
      }
    </tng-card>
  `,
  styles: `
    :host {
      display: block;
      width: min(100%, 34rem);
    }
  `,
})
export class AuthNoticeCardComponent {
  readonly action = output<void>();
  readonly notice = input.required<AuthNotice>();
}
