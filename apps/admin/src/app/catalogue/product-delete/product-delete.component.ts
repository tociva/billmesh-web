import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Product } from '@billmesh/domain';
import {
  TngButtonComponent,
  TngCardComponent,
  TngCheckboxComponent,
} from '@tailng-ui/components';
import { catalogueMessage, catalogueReturnUrl } from '../catalogue.helpers';

@Component({
  selector: 'billmesh-product-delete',
  imports: [TngButtonComponent, TngCardComponent, TngCheckboxComponent],
  templateUrl: './product-delete.component.html',
  styleUrl: '../catalogue.shared.css',
})
export class ProductDeleteComponent {
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly id = this.route.snapshot.paramMap.get('id');

  protected readonly product = signal<Product | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly confirmed = signal(false);
  protected readonly error = signal('');

  constructor() {
    if (this.id) this.load();
  }

  protected archive(): void {
    const product = this.product();
    if (!product || !this.confirmed()) return;
    this.saving.set(true);
    this.catalogue
      .updateProduct(product.id, { version: product.version, active: false })
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

  private load(): void {
    this.catalogue.getProduct(this.id!).subscribe({
      next: (product) => {
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
      '/app/catalogue',
    );
  }
}
