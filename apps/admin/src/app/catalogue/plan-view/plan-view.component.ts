import { DatePipe, JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Plan } from '@billmesh/domain';
import { TngButtonComponent, TngCardComponent } from '@tailng-ui/components';
import {
  catalogueMessage,
  catalogueReturnUrl,
  formatPlanPrice,
} from '../catalogue.helpers';

@Component({
  selector: 'billmesh-plan-view',
  imports: [DatePipe, JsonPipe, TngButtonComponent, TngCardComponent],
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

  private load(): void {
    this.catalogue.getPlan(this.planId).subscribe({
      next: (plan) => {
        this.plan.set(plan);
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
