import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { EntitlementField, Product } from '@billmesh/domain';
import {
  TngButtonComponent,
  TngCardComponent,
  TngTable,
  TngTableCellTpl,
  type TngTableColumn,
} from '@tailng-ui/components';
import { catalogueMessage, catalogueReturnUrl } from '../../catalogue.helpers';
import { PlanListComponent } from '../../plans/plan-list/plan-list.component';

@Component({
  selector: 'billmesh-product-details',
  imports: [
    DatePipe,
    PlanListComponent,
    TngButtonComponent,
    TngCardComponent,
    TngTable,
    TngTableCellTpl,
  ],
  templateUrl: './product-details.component.html',
  styleUrl: '../../catalogue.shared.css',
})
export class ProductDetailsComponent {
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productId = this.route.snapshot.paramMap.get('productId')!;

  protected readonly product = signal<Product | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly entitlementColumns: readonly TngTableColumn<EntitlementField>[] =
    [
      { id: 'label', label: 'Entitlement', width: '16rem' },
      { id: 'key', label: 'Key', width: '13rem' },
      { id: 'type', label: 'Type', width: '8rem' },
      { id: 'required', label: 'Requirement', width: '8rem' },
      { id: 'default', label: 'Default', width: '10rem' },
      { id: 'constraints', label: 'Constraints' },
    ];

  constructor() {
    this.loadProduct();
  }

  protected loadProduct(): void {
    this.loading.set(true);
    this.catalogue.getProduct(this.productId).subscribe({
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

  protected back(): void {
    void this.router.navigateByUrl(this.returnUrl());
  }

  protected editProduct(): void {
    void this.router.navigate(['/app/catalogue', this.productId, 'edit'], {
      queryParams: { burl: this.returnUrl() },
    });
  }

  protected archiveProduct(): void {
    void this.router.navigate(['/app/catalogue', this.productId, 'delete'], {
      queryParams: { burl: this.returnUrl() },
    });
  }

  protected reactivateProduct(): void {
    const product = this.product();
    if (!product) return;
    this.catalogue
      .updateProduct(product.id, { version: product.version, active: true })
      .subscribe({
        next: (updated) => this.product.set(updated),
        error: (error: unknown) => this.error.set(catalogueMessage(error)),
      });
  }

  protected entitlementDefault(field: EntitlementField): string {
    if (field.default === undefined) return '—';
    if (typeof field.default === 'string')
      return field.default || 'Empty string';
    return JSON.stringify(field.default);
  }

  protected entitlementConstraints(field: EntitlementField): string {
    const constraints: string[] = [];
    if (field.nullable) constraints.push('nullable');
    if (field.minimum !== undefined) constraints.push(`min ${field.minimum}`);
    if (field.maximum !== undefined) constraints.push(`max ${field.maximum}`);
    if (field.min_length !== undefined)
      constraints.push(`min length ${field.min_length}`);
    if (field.max_length !== undefined)
      constraints.push(`max length ${field.max_length}`);
    if (field.min_items !== undefined)
      constraints.push(`min items ${field.min_items}`);
    if (field.max_items !== undefined)
      constraints.push(`max items ${field.max_items}`);
    if (field.options?.length)
      constraints.push(`${field.options.length} options`);
    if (field.fields?.length)
      constraints.push(`${field.fields.length} nested fields`);
    if (field.items) constraints.push(`items: ${field.items.type}`);
    return constraints.join(' · ') || '—';
  }

  private returnUrl(): string {
    return catalogueReturnUrl(
      this.route.snapshot.queryParamMap.get('burl'),
      '/app/catalogue',
    );
  }
}
