import { Component, inject } from '@angular/core';
import { AuthStore } from '@billmesh/auth';
import { WorkspaceShellComponent } from '@billmesh/ui';

@Component({
  selector: 'billmesh-console-workspace',
  imports: [WorkspaceShellComponent],
  template: `
    <billmesh-workspace-shell
      title="Console"
      subtitle="Customer billing and subscription management"
      [userName]="authStore.currentUser()?.name ?? 'Billmesh user'"
      (logout)="logout()"
    >
      <p>
        Console feature routes will be added here without exposing IdNest tokens
        to the browser.
      </p>
    </billmesh-workspace-shell>
  `,
})
export class WorkspaceComponent {
  protected readonly authStore = inject(AuthStore);

  protected logout(): void {
    void this.authStore.logout();
  }
}
