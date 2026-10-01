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
  template: `
    <main id="overview" tabindex="-1">
      <section class="welcome" aria-labelledby="welcome-title">
        <div>
          <p class="eyebrow">Admin workspace</p>
          <h2 id="welcome-title">{{ greeting() }}, {{ firstName() }}.</h2>
          <p>
            Manage the billing catalogue and keep customer operations moving
            from one secure workspace.
          </p>
        </div>
        <div class="welcome-badge" aria-label="Workspace status">
          <span class="pulse" aria-hidden="true"></span>
          <span>
            <small>Workspace status</small>
            <strong>Ready for operations</strong>
          </span>
        </div>
      </section>

      <section class="summary-grid" aria-label="Access summary">
        <article>
          <span class="summary-icon summary-icon--green" aria-hidden="true"
            >✓</span
          >
          <div>
            <small>Session</small>
            <strong>Authenticated</strong>
            <span>Server-managed BFF session</span>
          </div>
        </article>
        <article>
          <span class="summary-icon summary-icon--violet" aria-hidden="true"
            >A</span
          >
          <div>
            <small>Access level</small>
            <strong>{{ roleLabel() }}</strong>
            <span>Permission-scoped access</span>
          </div>
        </article>
        <article>
          <span class="summary-icon summary-icon--blue" aria-hidden="true"
            >#</span
          >
          <div>
            <small>Granted permissions</small>
            <strong>{{ permissionCount() }}</strong>
            <span>Active for this session</span>
          </div>
        </article>
      </section>

      <section class="section-block" aria-labelledby="areas-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Administration</p>
            <h2 id="areas-title">Billing operations</h2>
            <p>Core areas available to the Billmesh operations team.</p>
          </div>
          <tng-tag tone="neutral">{{ adminAreas.length }} areas</tng-tag>
        </div>

        <div class="area-grid">
          @for (area of adminAreas; track area.id) {
            <article class="area-card" [id]="area.id">
              <span
                [class]="'area-monogram area-monogram--' + area.tone"
                aria-hidden="true"
              >
                {{ area.shortLabel }}
              </span>
              <div>
                <h3>{{ area.label }}</h3>
                <p>{{ area.description }}</p>
              </div>
              <span class="area-status">
                <span aria-hidden="true"></span>
                Secured
              </span>
            </article>
          }
        </div>
      </section>

      <section class="detail-grid">
        <article class="access-panel" id="security">
          <div class="section-heading section-heading--compact">
            <div>
              <p class="eyebrow">Security & access</p>
              <h2>Your admin session</h2>
            </div>
            <span class="verified-badge">Verified</span>
          </div>

          <dl>
            <div>
              <dt>Signed in as</dt>
              <dd>
                {{ authStore.currentUser()?.email ?? 'Billmesh administrator' }}
              </dd>
            </div>
            <div>
              <dt>Authorization</dt>
              <dd>{{ roleLabel() }}</dd>
            </div>
            <div>
              <dt>Session type</dt>
              <dd>Opaque browser session</dd>
            </div>
          </dl>
        </article>

        <article class="permissions-panel">
          <div class="section-heading section-heading--compact">
            <div>
              <p class="eyebrow">Authorization</p>
              <h2>Active permissions</h2>
            </div>
          </div>

          @if (authStore.permissions().length) {
            <div class="permission-list" aria-label="Granted permissions">
              @for (permission of authStore.permissions(); track permission) {
                <code>{{ permission }}</code>
              }
            </div>
          } @else {
            <p class="empty-state">
              No explicit permissions were returned for this session.
            </p>
          }
        </article>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      color: var(--tng-semantic-foreground-primary);
    }

    * {
      box-sizing: border-box;
    }

    .workspace-shell {
      --header-height: 4.75rem;
      --sidebar-width: 17.5rem;
      min-height: 100dvh;
      background:
        radial-gradient(
          circle at 72% -10%,
          color-mix(in srgb, var(--tng-semantic-accent-brand) 9%, transparent),
          transparent 27rem
        ),
        var(--tng-semantic-background-canvas);
    }

    .workspace-header {
      position: fixed;
      inset: 0 0 auto;
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
    .session-copy {
      display: grid;
      min-width: 0;
    }

    .brand-copy strong {
      font-size: 1rem;
      letter-spacing: -0.02em;
    }

    .brand-copy small,
    .session-copy small {
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

    .page-context nav strong {
      color: var(--tng-semantic-foreground-secondary);
      font-weight: 650;
    }

    .session-menu {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
    }

    .session-state {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-right: 0.5rem;
      color: var(--tng-semantic-foreground-secondary);
      font-size: 0.76rem;
      font-weight: 650;
    }

    .status-dot,
    .area-status span {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
      background: var(--tng-semantic-accent-success);
      box-shadow: 0 0 0 0.22rem
        color-mix(in srgb, var(--tng-semantic-accent-success) 14%, transparent);
    }

    .avatar {
      display: grid;
      flex: 0 0 auto;
      width: 2.25rem;
      height: 2.25rem;
      place-items: center;
      border: 1px solid
        color-mix(in srgb, var(--tng-semantic-accent-brand) 30%, transparent);
      border-radius: 0.65rem;
      background: color-mix(
        in srgb,
        var(--tng-semantic-accent-brand) 14%,
        var(--tng-semantic-background-surface)
      );
      color: var(--tng-semantic-accent-brand);
      font-size: 0.76rem;
      font-weight: 800;
    }

    .session-copy {
      width: min(10rem, 14vw);
    }

    .session-copy strong,
    .session-copy small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-copy strong {
      font-size: 0.82rem;
    }

    .workspace-body {
      display: grid;
      grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
      min-height: 100dvh;
      padding-top: var(--header-height);
    }

    .workspace-sidebar {
      position: fixed;
      inset: var(--header-height) auto 0 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: var(--sidebar-width);
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
      margin: 1.1rem 0.6rem 0.35rem;
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.65rem;
      font-weight: 750;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .nav-label:first-child {
      margin-top: 0;
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

    main {
      width: min(100%, 82rem);
      margin: 0 auto;
      padding: clamp(1.5rem, 3vw, 2.75rem);
      scroll-behavior: smooth;
    }

    .welcome {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: 1.5rem;
    }

    .eyebrow {
      margin: 0 0 0.35rem;
      color: var(--tng-semantic-accent-brand);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .welcome h2,
    .section-heading h2 {
      margin: 0;
      letter-spacing: -0.04em;
    }

    .welcome h2 {
      font-size: clamp(1.9rem, 4vw, 3rem);
    }

    .welcome > div > p:last-child,
    .section-heading > div > p:last-child {
      margin: 0.5rem 0 0;
      color: var(--tng-semantic-foreground-secondary);
      line-height: 1.6;
    }

    .welcome-badge {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 13rem;
      padding: 0.7rem 0.85rem;
      border: 1px solid var(--tng-semantic-border-subtle);
      border-radius: 0.75rem;
      background: color-mix(
        in srgb,
        var(--tng-semantic-background-surface) 82%,
        transparent
      );
    }

    .pulse {
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 50%;
      background: var(--tng-semantic-accent-success);
      box-shadow: 0 0 0 0.32rem
        color-mix(in srgb, var(--tng-semantic-accent-success) 14%, transparent);
    }

    .welcome-badge > span:last-child {
      display: grid;
      gap: 0.12rem;
    }

    .welcome-badge small {
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .welcome-badge strong {
      font-size: 0.79rem;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.85rem;
      margin-bottom: 2.2rem;
    }

    .summary-grid article {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      min-width: 0;
      padding: 1rem;
      border: 1px solid var(--tng-semantic-border-subtle);
      border-radius: 0.8rem;
      background: color-mix(
        in srgb,
        var(--tng-semantic-background-surface) 92%,
        transparent
      );
      box-shadow: 0 0.75rem 2rem
        color-mix(
          in srgb,
          var(--tng-semantic-foreground-primary) 3%,
          transparent
        );
    }

    .summary-icon {
      display: grid;
      flex: 0 0 auto;
      width: 2.55rem;
      height: 2.55rem;
      place-items: center;
      border-radius: 0.7rem;
      font-size: 0.85rem;
      font-weight: 850;
    }

    .summary-icon--green,
    .area-monogram--green {
      background: color-mix(
        in srgb,
        var(--tng-semantic-accent-success) 14%,
        transparent
      );
      color: var(--tng-semantic-accent-success);
    }

    .summary-icon--violet,
    .area-monogram--violet {
      background: color-mix(
        in srgb,
        var(--tng-semantic-accent-brand) 14%,
        transparent
      );
      color: var(--tng-semantic-accent-brand);
    }

    .summary-icon--blue,
    .area-monogram--blue {
      background: color-mix(in srgb, #3281e8 14%, transparent);
      color: #3281e8;
    }

    .area-monogram--orange {
      background: color-mix(in srgb, #e27a24 14%, transparent);
      color: #e27a24;
    }

    .summary-grid article > div {
      display: grid;
      min-width: 0;
    }

    .summary-grid small {
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .summary-grid strong {
      margin: 0.16rem 0;
      overflow: hidden;
      font-size: 1rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .summary-grid article > div > span {
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.72rem;
    }

    .section-block {
      display: grid;
      gap: 1rem;
      margin-bottom: 2.2rem;
    }

    .section-heading {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
    }

    .section-heading h2 {
      font-size: 1.2rem;
    }

    .section-heading > div > p:last-child {
      font-size: 0.82rem;
    }

    .area-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .area-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.9rem;
      min-width: 0;
      padding: 1rem;
      border: 1px solid var(--tng-semantic-border-subtle);
      border-radius: 0.8rem;
      background: var(--tng-semantic-background-surface);
      scroll-margin-top: calc(var(--header-height) + 1rem);
      transition:
        border-color 150ms ease,
        transform 150ms ease;
    }

    .area-card:hover,
    .area-card:target {
      border-color: color-mix(
        in srgb,
        var(--tng-semantic-accent-brand) 40%,
        transparent
      );
      transform: translateY(-2px);
    }

    .area-monogram {
      display: grid;
      width: 2.75rem;
      height: 2.75rem;
      place-items: center;
      border-radius: 0.72rem;
      font-size: 0.68rem;
      font-weight: 850;
      letter-spacing: 0.04em;
    }

    .area-card h3,
    .area-card p {
      margin: 0;
    }

    .area-card h3 {
      margin-bottom: 0.25rem;
      font-size: 0.9rem;
    }

    .area-card p {
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.75rem;
      line-height: 1.45;
    }

    .area-status {
      display: inline-flex;
      align-items: center;
      gap: 0.38rem;
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.66rem;
      font-weight: 650;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 0.85rem;
    }

    .access-panel,
    .permissions-panel {
      padding: 1rem;
      border: 1px solid var(--tng-semantic-border-subtle);
      border-radius: 0.8rem;
      background: var(--tng-semantic-background-surface);
    }

    .section-heading--compact {
      align-items: center;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--tng-semantic-border-subtle);
    }

    .section-heading--compact .eyebrow {
      margin-bottom: 0.22rem;
    }

    .verified-badge {
      padding: 0.28rem 0.5rem;
      border-radius: 999px;
      background: color-mix(
        in srgb,
        var(--tng-semantic-accent-success) 12%,
        transparent
      );
      color: var(--tng-semantic-accent-success);
      font-size: 0.67rem;
      font-weight: 750;
    }

    dl {
      display: grid;
      gap: 0;
      margin: 0;
    }

    dl div {
      display: grid;
      grid-template-columns: 8.5rem minmax(0, 1fr);
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--tng-semantic-border-subtle);
    }

    dl div:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }

    dt {
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.75rem;
    }

    dd {
      margin: 0;
      overflow-wrap: anywhere;
      font-size: 0.78rem;
      font-weight: 650;
    }

    .permission-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      padding-top: 0.85rem;
    }

    .permission-list code {
      padding: 0.34rem 0.48rem;
      border: 1px solid
        color-mix(in srgb, var(--tng-semantic-accent-brand) 22%, transparent);
      border-radius: 0.42rem;
      background: color-mix(
        in srgb,
        var(--tng-semantic-accent-brand) 8%,
        transparent
      );
      color: var(--tng-semantic-foreground-secondary);
      font-size: 0.68rem;
    }

    .empty-state {
      margin: 0;
      padding-top: 0.85rem;
      color: var(--tng-semantic-foreground-muted);
      font-size: 0.78rem;
    }

    @media (max-width: 68rem) {
      .workspace-shell {
        --sidebar-width: 14.5rem;
      }

      .session-state,
      .session-copy {
        display: none;
      }

      .area-grid,
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 48rem) {
      .workspace-header {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .page-context,
      .workspace-sidebar {
        display: none;
      }

      .workspace-body {
        grid-template-columns: 1fr;
      }

      main {
        grid-column: 1;
        padding: 1.25rem 1rem 2rem;
      }

      .welcome {
        align-items: stretch;
        flex-direction: column;
        gap: 1rem;
      }

      .welcome-badge {
        min-width: 0;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .session-menu .avatar {
        display: none;
      }
    }

    @media (max-width: 34rem) {
      .brand-copy small {
        display: none;
      }

      .area-card {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .area-status {
        grid-column: 2;
      }

      dl div {
        grid-template-columns: 1fr;
        gap: 0.2rem;
      }
    }
  `,
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

  protected readonly permissionCount = computed(
    () => this.authStore.permissions().length,
  );

  protected readonly roleLabel = computed(() =>
    this.authStore.can('billing:admin') ? 'Administrator' : 'Billing operator',
  );

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });
}
