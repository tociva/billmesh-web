import { Component, computed, inject } from '@angular/core';
import { AuthStore } from '@billmesh/auth';
import { TngTagComponent } from '@tailng-ui/components';

interface AdminArea {
  readonly description: string;
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly tone: 'blue' | 'green' | 'orange' | 'violet';
}

const ADMIN_AREAS: readonly AdminArea[] = [
  {
    description:
      'Products, plans, pricing, credit packs, and customer entitlements.',
    id: 'catalogue',
    label: 'Catalogue',
    shortLabel: 'CA',
    tone: 'violet',
  },
  {
    description:
      'Customer accounts, application links, and subscription lifecycle.',
    id: 'accounts',
    label: 'Accounts & subscriptions',
    shortLabel: 'AS',
    tone: 'blue',
  },
  {
    description:
      'Wallet balances, grants, reservations, and audited adjustments.',
    id: 'credits',
    label: 'Credits & wallets',
    shortLabel: 'CW',
    tone: 'green',
  },
  {
    description: 'Payments, invoices, webhook delivery, and replay operations.',
    id: 'payments',
    label: 'Payments & delivery',
    shortLabel: 'PD',
    tone: 'orange',
  },
];

@Component({
  selector: 'billmesh-admin-workspace',
  imports: [TngTagComponent],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css',
})
export class WorkspaceComponent {
  protected readonly authStore = inject(AuthStore);
  protected readonly adminAreas = ADMIN_AREAS;

  protected readonly displayName = computed(
    () =>
      this.authStore.currentUser()?.name?.trim() || 'Billmesh administrator',
  );

  protected readonly firstName = computed(
    () => this.displayName().split(/\s+/)[0] ?? 'Administrator',
  );

  protected readonly roleLabel = 'Administrator';

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });
}
