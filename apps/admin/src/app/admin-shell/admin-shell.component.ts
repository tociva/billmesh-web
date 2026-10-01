import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { AuthStore } from '@billmesh/auth';
import {
  TngAvatarComponent,
  TngMenuComponent,
  TngMenuTriggerFor,
} from '@tailng-ui/components';
import {
  TngMenuGroupLabel,
  TngMenuItem,
  type TngMenuSelectEvent,
} from '@tailng-ui/primitives';
import { filter } from 'rxjs';

interface AdminNavItem {
  readonly description: string;
  readonly label: string;
  readonly path: string;
  readonly shortLabel: string;
}

const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    description: 'Admin home',
    label: 'Overview',
    path: '/app',
    shortLabel: '01',
  },
  {
    description: 'Products, plans, and pricing',
    label: 'Catalogue',
    path: '/app/catalogue',
    shortLabel: '02',
  },
  {
    description: 'Appearance preferences',
    label: 'Settings',
    path: '/app/settings',
    shortLabel: '03',
  },
];

@Component({
  selector: 'billmesh-admin-shell',
  imports: [
    RouterLink,
    RouterOutlet,
    TngAvatarComponent,
    TngMenuComponent,
    TngMenuTriggerFor,
    TngMenuGroupLabel,
    TngMenuItem,
  ],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css',
})
export class AdminShellComponent {
  private readonly router = inject(Router);
  protected readonly authStore = inject(AuthStore);
  private readonly currentUrl = signal(this.router.url);
  protected readonly navItems = ADMIN_NAV_ITEMS;

  protected readonly displayName = computed(
    () =>
      this.authStore.currentUser()?.name?.trim() ||
      this.authStore.currentUser()?.email?.trim() ||
      'Billmesh administrator',
  );

  protected readonly roleLabel = computed(() =>
    this.authStore.can('billing:admin') ? 'Administrator' : 'Billing operator',
  );

  protected readonly currentPageTitle = computed(() => {
    const path = this.currentPath();
    return (
      this.navItems.find(
        (item) =>
          path === item.path ||
          (item.path !== '/app' && path.startsWith(`${item.path}/`)),
      )?.label ?? 'Admin'
    );
  });

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }

  protected isRouteActive(path: string): boolean {
    const currentPath = this.currentPath();
    if (path === '/app') {
      return currentPath === path;
    }

    return currentPath === path || currentPath.startsWith(`${path}/`);
  }

  protected onProfileMenuSelect(event: TngMenuSelectEvent): void {
    const value = String(event.value);
    if (value === 'settings') {
      void this.router.navigateByUrl('/app/settings');
    } else if (value === 'sign-out') {
      void this.authStore.logout();
    }
  }

  private currentPath(): string {
    return this.currentUrl().split(/[?#]/)[0] ?? '/app';
  }
}
