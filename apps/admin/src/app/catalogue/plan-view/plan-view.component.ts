import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Plan, Product } from '@billmesh/domain';
import { TngButtonComponent, TngCardComponent } from '@tailng-ui/components';
import { forkJoin } from 'rxjs';
import {
  catalogueMessage,
  catalogueReturnUrl,
  formatPlanPrice,
} from '../catalogue.helpers';

@Component({
  selector: 'billmesh-plan-view',
  imports: [DatePipe, TngButtonComponent, TngCardComponent],
  templateUrl: './plan-view.component.html',
  styleUrl: '../catalogue.shared.css',
})
export class PlanViewComponent {
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly productId = this.route.snapshot.paramMap.get('productId')!;
  protected readonly planId = this.route.snapshot.paramMap.get('planId')!;
  protected readonly plan = signal<Plan | null>(null);
  protected readonly product = signal<Product | null>(null);
  protected readonly entitlementRows = computed(() => {
    const plan = this.plan();
    const product = this.product();
    if (!plan || !product) return [];
    const defined = product.entitlement_schema.fields
      .filter((field) => field.key && field.key in plan.entitlements)
      .map((field) => ({
        key: field.key!,
        label: field.label || field.key!,
        value: this.formatEntitlement(plan.entitlements[field.key!]),
      }));
    const known = new Set(defined.map((row) => row.key));
    return [
      ...defined,
      ...Object.entries(plan.entitlements)
        .filter(([key]) => !known.has(key))
        .map(([key, value]) => ({
          key,
          label: key,
          value: this.formatEntitlement(value),
        })),
    ];
  });
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    this.load();
  }

  protected back(): void {
    void this.router.navigateByUrl(this.returnUrl());
  }

  protected edit(): void {
    void this.router.navigate(
      ['/app/catalogue', this.productId, 'plans', this.planId, 'edit'],
      { queryParams: { burl: this.returnUrl() } },
    );
  }

  protected archive(): void {
    void this.router.navigate(
      ['/app/catalogue', this.productId, 'plans', this.planId, 'delete'],
      { queryParams: { burl: this.returnUrl() } },
    );
  }

  protected reactivate(): void {
    const plan = this.plan();
    if (!plan) return;
    this.catalogue
      .updatePlan(plan.id, { version: plan.version, active: true })
      .subscribe({
        next: (updated) => this.plan.set(updated),
        error: (error: unknown) => this.error.set(catalogueMessage(error)),
      });
  }

  protected formatPrice(plan: Plan): string {
    return formatPlanPrice(plan);
  }

  protected formatEntitlement(value: unknown): string {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    if (Array.isArray(value))
      return (
        value.map((item) => this.formatEntitlement(item)).join(', ') || 'None'
      );
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => `${key}: ${this.formatEntitlement(item)}`)
        .join('; ');
    }
    return String(value);
  }

  private load(): void {
    forkJoin({
      plan: this.catalogue.getPlan(this.planId),
      product: this.catalogue.getProduct(this.productId),
    }).subscribe({
      next: ({ plan, product }) => {
        this.plan.set(plan);
        this.product.set(product);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(catalogueMessage(error));
        this.loading.set(false);
      },
    });
  }

  private returnUrl(): string {
    return catalogueReturnUrl(
      this.route.snapshot.queryParamMap.get('burl'),
      `/app/catalogue/${encodeURIComponent(this.productId)}`,
    );
  }
}
