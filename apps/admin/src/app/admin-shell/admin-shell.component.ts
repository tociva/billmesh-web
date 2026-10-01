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
  template: `
    <div class="admin-shell">
      <header class="workspace-header">
        <a class="brand" routerLink="/app" aria-label="Billmesh Admin home">
          <span class="brand-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span class="brand-copy">
            <strong>Billmesh</strong>
            <small>Admin</small>
          </span>
        </a>

        <div class="page-context">
          <h1>{{ currentPageTitle() }}</h1>
          <nav aria-label="Breadcrumb">
            <a routerLink="/app">Home</a>
            <span aria-hidden="true">/</span>
            <strong>{{ currentPageTitle() }}</strong>
          </nav>
        </div>

        <div class="header-actions">
          <span class="session-state">
            <span class="status-dot" aria-hidden="true"></span>
            Secure session
          </span>

          <div class="profile-menu">
            <button
              class="profile-trigger"
              type="button"
              id="admin-profile-menu-trigger"
              aria-label="Open admin account menu"
              [tngMenuTriggerFor]="adminProfileMenu"
            >
              <tng-avatar [fallback]="displayName()" size="md" />
              <span class="profile-copy">
                <strong>{{ displayName() }}</strong>
                <small>{{ roleLabel() }}</small>
              </span>
            </button>

            <tng-menu
              #adminProfileMenu="tngMenu"
              ariaLabel="Admin account options"
              (tngMenuSelect)="onProfileMenuSelect($event)"
            >
              <div tngMenuGroupLabel>Session</div>
              <button type="button" tngMenuItem tngMenuItemValue="settings">
                Settings
              </button>
              <button type="button" tngMenuItem tngMenuItemValue="sign-out">
                Sign out
              </button>
            </tng-menu>
          </div>
        </div>
      </header>

      <div class="workspace-body">
        <aside class="workspace-sidebar" aria-label="Admin navigation">
          <nav>
            <p class="nav-label">Workspace</p>
            @for (item of navItems; track item.path) {
              <a
                class="nav-item"
                [class.nav-item--active]="isRouteActive(item.path)"
                [attr.aria-current]="isRouteActive(item.path) ? 'page' : null"
                [routerLink]="item.path"
              >
                <span class="nav-icon" aria-hidden="true">
                  {{ item.shortLabel }}
                </span>
                <span>
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.description }}</small>
                </span>
              </a>
            }
          </nav>

          <div class="sidebar-footer">
            <span class="sidebar-footer-mark" aria-hidden="true">B</span>
            <p>
              <strong>Protected by Billmesh BFF</strong>
              <span>Credentials stay on the server.</span>
            </p>
          </div>
        </aside>

        <div class="route-content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100dvh;
      overflow: hidden;
      color: var(--tng-semantic-foreground-primary);
    }

    * {
      box-sizing: border-box;
    }

    .admin-shell {
      --header-height: 4.75rem;
      --sidebar-width: 17.5rem;
      display: grid;
      grid-template-rows: minmax(var(--header-height), auto) minmax(0, 1fr);
      height: 100dvh;
      background: var(--tng-semantic-background-canvas);
    }

    .workspace-header {
      position: relative;
      z-index: 20;
      display: grid;
      grid-template-columns: var(--sidebar-width) minmax(12rem, 1fr) auto;
      align-items: center;
      min-height: var(--header-height);
      padding: 0 1.15rem;
      border-bottom: 1px solid
        color-mix(in srgb, var(--tng-semantic-border-subtle) 78%, transparent);
      background: color-mix(
        in srgb,
        var(--tng-semantic-background-canvas) 88%,
        transparent
      );
      backdrop-filter: blur(18px);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      color: inherit;
      text-decoration: none;
    }

    .brand-mark {
      display: inline-flex;
      align-items: flex-end;
      justify-content: center;
      gap: 0.18rem;
      width: 2.35rem;
      height: 2.35rem;
      padding: 0.55rem;
      border-radius: 0.72rem;
      background: var(--tng-semantic-accent-brand);
      box-shadow: 0 0.5rem 1.5rem
        color-mix(in srgb, var(--tng-semantic-accent-brand) 24%, transparent);
    }

    .brand-mark span {
      display: block;
      width: 0.24rem;
      border-radius: 999px;
      background: var(--tng-semantic-foreground-inverse);
    }

    .brand-mark span:nth-child(1) {
      height: 0.55rem;
    }

    .brand-mark span:nth-child(2) {
      height: 0.95rem;
    }

    .brand-mark span:nth-child(3) {
      height: 1.25rem;
    }

    .brand-copy,
    .profile-copy {
      display: grid;
      min-width: 0;
    }

    .brand-copy strong {
      font-size: 1rem;
      letter-spacing: -0.02em;
    }

    .brand-copy small,
    .profile-copy small {
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.72rem;
    }

    .page-context {
      display: grid;
      gap: 0.18rem;
      padding-inline: 1rem;
    }

    .page-context h1 {
      margin: 0;
      font-size: 1.3rem;
      letter-spacing: -0.035em;
    }

    .page-context nav {
      display: flex;
      gap: 0.4rem;
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.72rem;
    }

    .page-context nav a {
      color: inherit;
      text-decoration: none;
    }

    .page-context nav a:hover {
      color: var(--tng-semantic-accent-brand);
    }

    .page-context nav strong {
      color: var(--tng-semantic-foreground-secondary);
      font-weight: 650;
    }

    .header-actions,
    .profile-trigger {
      display: flex;
      align-items: center;
    }

    .header-actions {
      gap: 0.8rem;
      min-width: 0;
    }

    .session-state {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--tng-semantic-foreground-secondary);
      font-size: 0.76rem;
      font-weight: 650;
    }

    .status-dot {
      width: 0.48rem;
      height: 0.48rem;
      border-radius: 50%;
      background: var(--tng-semantic-accent-success);
      box-shadow: 0 0 0 0.22rem
        color-mix(in srgb, var(--tng-semantic-accent-success) 13%, transparent);
    }

    .profile-menu {
      position: relative;
      min-width: 0;
    }

    .profile-trigger {
      gap: 0.65rem;
      max-width: 14rem;
      padding: 0.3rem 0.5rem 0.3rem 0.3rem;
      border: 1px solid transparent;
      border-radius: 0.85rem;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font: inherit;
      transition:
        background-color 140ms ease,
        border-color 140ms ease,
        box-shadow 140ms ease;
    }

    .profile-trigger:hover,
    .profile-trigger[aria-expanded='true'] {
      border-color: var(--tng-semantic-border-subtle);
      background: var(--tng-semantic-background-surface);
    }

    .profile-trigger:focus-visible {
      border-color: var(--tng-semantic-accent-brand);
      box-shadow: 0 0 0 3px
        color-mix(in srgb, var(--tng-semantic-accent-brand) 24%, transparent);
      outline: none;
    }

    .profile-copy {
      max-width: 10rem;
      text-align: left;
    }

    .profile-copy strong,
    .profile-copy small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .profile-copy strong {
      font-size: 0.82rem;
    }

    .workspace-body {
      display: grid;
      grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
      min-height: 0;
      overflow: hidden;
    }

    .workspace-sidebar {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 0;
      padding: 1.4rem 0.85rem 1rem;
      border-right: 1px solid
        color-mix(in srgb, var(--tng-semantic-border-subtle) 76%, transparent);
      background: color-mix(
        in srgb,
        var(--tng-semantic-background-canvas) 94%,
        var(--tng-semantic-background-surface)
      );
      overflow-y: auto;
    }

    .workspace-sidebar nav {
      display: grid;
      gap: 0.35rem;
    }

    .nav-label {
      margin: 0 0.6rem 0.35rem;
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.65rem;
      font-weight: 750;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .nav-item {
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      align-items: center;
      gap: 0.65rem;
      min-height: 3.25rem;
      padding: 0.55rem 0.65rem;
      border: 1px solid transparent;
      border-radius: 0.7rem;
      color: var(--tng-semantic-foreground-secondary);
      text-decoration: none;
      transition:
        background-color 150ms ease,
        border-color 150ms ease,
        color 150ms ease,
        transform 150ms ease;
    }

    .nav-item:hover,
    .nav-item:focus-visible {
      border-color: color-mix(
        in srgb,
        var(--tng-semantic-accent-brand) 22%,
        transparent
      );
      background: color-mix(
        in srgb,
        var(--tng-semantic-accent-brand) 8%,
        transparent
      );
      color: var(--tng-semantic-foreground-primary);
      outline: none;
      transform: translateX(2px);
    }

    .nav-item--active {
      border-color: color-mix(
        in srgb,
        var(--tng-semantic-accent-brand) 26%,
        transparent
      );
      background: color-mix(
        in srgb,
        var(--tng-semantic-accent-brand) 12%,
        transparent
      );
      color: var(--tng-semantic-accent-brand);
    }

    .nav-icon {
      display: grid;
      width: 2rem;
      height: 2rem;
      place-items: center;
      border: 1px solid var(--tng-semantic-border-subtle);
      border-radius: 0.5rem;
      background: var(--tng-semantic-background-surface);
      font-size: 0.6rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .nav-item > span:last-child {
      display: grid;
      gap: 0.12rem;
      min-width: 0;
    }

    .nav-item strong {
      font-size: 0.82rem;
    }

    .nav-item small {
      overflow: hidden;
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.69rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-footer {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-top: 2rem;
      padding: 0.8rem;
      border: 1px solid var(--tng-semantic-border-subtle);
      border-radius: 0.75rem;
      background: var(--tng-semantic-background-surface);
    }

    .sidebar-footer-mark {
      display: grid;
      flex: 0 0 auto;
      width: 1.9rem;
      height: 1.9rem;
      place-items: center;
      border-radius: 50%;
      background: color-mix(
        in srgb,
        var(--tng-semantic-accent-success) 15%,
        transparent
      );
      color: var(--tng-semantic-accent-success);
      font-size: 0.72rem;
      font-weight: 850;
    }

    .sidebar-footer p {
      display: grid;
      gap: 0.12rem;
      margin: 0;
    }

    .sidebar-footer strong {
      font-size: 0.72rem;
    }

    .sidebar-footer span:last-child {
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.66rem;
      line-height: 1.35;
    }

    .route-content {
      min-width: 0;
      min-height: 0;
      overflow: auto;
      background:
        radial-gradient(
          circle at 72% -10%,
          color-mix(in srgb, var(--tng-semantic-accent-brand) 9%, transparent),
          transparent 27rem
        ),
        var(--tng-semantic-background-canvas);
    }

    @media (max-width: 52rem) {
      :host,
      .admin-shell {
        height: auto;
        min-height: 100dvh;
        overflow: visible;
      }

      .admin-shell {
        --sidebar-width: 100%;
        grid-template-rows: auto auto;
      }

      .workspace-header {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }

      .brand-copy,
      .session-state,
      .profile-copy {
        display: none;
      }

      .workspace-body {
        grid-template-columns: 1fr;
        overflow: visible;
      }

      .workspace-sidebar {
        padding: 0.65rem 1rem;
        border-right: 0;
        border-bottom: 1px solid var(--tng-semantic-border-subtle);
        overflow: visible;
      }

      .workspace-sidebar nav {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .nav-label,
      .sidebar-footer {
        display: none;
      }

      .route-content {
        overflow: visible;
      }
    }

    @media (max-width: 34rem) {
      .workspace-header {
        grid-template-columns: auto minmax(0, 1fr) auto;
        padding: 0 0.65rem;
      }

      .page-context {
        padding-inline: 0.65rem;
      }

      .page-context nav {
        display: none;
      }

      .workspace-sidebar nav {
        grid-template-columns: 1fr;
      }
    }
  `,
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
