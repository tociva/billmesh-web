import { Component, inject } from '@angular/core';
import { AuthStore } from '@billmesh/auth';
import { WorkspaceShellComponent } from '@billmesh/ui';
import { BillingCheckoutComponent } from '../billing/billing-checkout.component';
import { CreditPackCheckoutComponent } from '../billing/credit-pack-checkout.component';

@Component({
  selector: 'billmesh-console-workspace',
  imports: [
    BillingCheckoutComponent,
    CreditPackCheckoutComponent,
    WorkspaceShellComponent,
  ],
  template: `
    <billmesh-workspace-shell
      title="Console"
      subtitle="Customer billing and subscription management"
      [userName]="authStore.currentUser()?.name ?? 'Billmesh user'"
      (logout)="logout()"
    >
      <billmesh-billing-checkout />
      <billmesh-credit-pack-checkout />
    </billmesh-workspace-shell>
  `,
})
export class WorkspaceComponent {
  protected readonly authStore = inject(AuthStore);

  protected logout(): void {
    void this.authStore.logout();
  }
}
