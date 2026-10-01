import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Product } from '@billmesh/domain';
import {
  TngButtonComponent,
  TngCardComponent,
  TngInputAngularFormsAdapter,
  TngInputComponent,
} from '@tailng-ui/components';
import { catalogueMessage, catalogueReturnUrl } from '../catalogue.helpers';

@Component({
  selector: 'billmesh-product-form',
  imports: [
    ReactiveFormsModule,
    TngButtonComponent,
    TngCardComponent,
    TngInputAngularFormsAdapter,
    TngInputComponent,
  ],
  templateUrl: './product-form.component.html',
  styleUrl: '../catalogue.shared.css',
})
export class ProductFormComponent {
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly editMode = this.id !== null;
  protected readonly loading = signal(this.editMode);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly product = signal<Product | null>(null);
  protected readonly title = computed(() =>
    this.editMode ? 'Edit product' : 'Create product',
  );
  protected readonly form = this.formBuilder.nonNullable.group({
    slug: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(63),
        Validators.pattern(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
      ],
    ],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(2000)]],
  });

  constructor() {
    if (this.id) this.loadProduct(this.id);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const request = this.id
      ? this.catalogue.updateProduct(this.id, {
          version: this.product()!.version,
          name: value.name.trim(),
          description: value.description.trim(),
        })
      : this.catalogue.createProduct({
          slug: value.slug.trim(),
          name: value.name.trim(),
          description: value.description.trim(),
        });
    request.subscribe({
      next: (product) => {
        this.saving.set(false);
        void this.router.navigate(['/app/catalogue', product.id], {
          queryParams: { burl: this.returnUrl() },
        });
      },
      error: (error: unknown) => {
        this.error.set(catalogueMessage(error));
        this.saving.set(false);
      },
    });
  }

  protected back(): void {
    void this.router.navigateByUrl(
      this.editMode && this.id
        ? `/app/catalogue/${encodeURIComponent(this.id)}?burl=${encodeURIComponent(this.returnUrl())}`
        : this.returnUrl(),
    );
  }

  private loadProduct(id: string): void {
    this.catalogue.getProduct(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.form.reset({
          slug: product.slug,
          name: product.name,
          description: product.description,
        });
        this.form.controls.slug.disable();
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
