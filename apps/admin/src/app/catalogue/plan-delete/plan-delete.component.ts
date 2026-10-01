import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Plan } from '@billmesh/domain';
import {
  TngButtonComponent,
  TngCardComponent,
  TngCheckboxComponent,
} from '@tailng-ui/components';
import { catalogueMessage, catalogueReturnUrl } from '../catalogue.helpers';

@Component({
  selector: 'billmesh-plan-delete',
  imports: [TngButtonComponent, TngCardComponent, TngCheckboxComponent],
  templateUrl: './plan-delete.component.html',
  styleUrl: '../catalogue.shared.css',
})
export class PlanDeleteComponent {
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly productId = this.route.snapshot.paramMap.get('productId')!;
  private readonly planId = this.route.snapshot.paramMap.get('planId')!;
  protected readonly plan = signal<Plan | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly confirmed = signal(false);
  protected readonly error = signal('');

  constructor() {
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

  protected archive(): void {
    const plan = this.plan();
    if (!plan || !this.confirmed()) return;
    this.saving.set(true);
    this.catalogue
      .updatePlan(plan.id, { version: plan.version, active: false })
      .subscribe({
        next: () => void this.router.navigateByUrl(this.returnUrl()),
        error: (error: unknown) => {
          this.error.set(catalogueMessage(error));
          this.saving.set(false);
        },
      });
  }

  protected back(): void {
    void this.router.navigateByUrl(this.returnUrl());
  }

  private returnUrl(): string {
    return catalogueReturnUrl(
      this.route.snapshot.queryParamMap.get('burl'),
      `/app/catalogue/${encodeURIComponent(this.productId)}`,
    );
  }
}
