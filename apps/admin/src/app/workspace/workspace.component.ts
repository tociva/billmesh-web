import { Component, inject } from '@angular/core';
import { AuthStore } from '@billmesh/auth';
import { WorkspaceShellComponent } from '@billmesh/ui';

@Component({
  selector: 'billmesh-admin-workspace',
  imports: [WorkspaceShellComponent],
  template: `
    <billmesh-workspace-shell
      title="Admin"
      subtitle="Internal billing operations and catalogue management"
      [userName]="authStore.currentUser()?.name ?? 'Billmesh administrator'"
      (logout)="logout()"
    >
      <p>
        Administrative features will be added here behind explicit Billmesh
        permission checks.
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
