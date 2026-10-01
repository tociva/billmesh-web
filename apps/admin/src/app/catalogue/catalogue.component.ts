import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ViewChild,
  inject,
  signal,
  type ElementRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Plan, Product } from '@billmesh/domain';

type EditorMode = 'create' | 'edit' | null;

@Component({
  selector: 'billmesh-admin-catalogue',
  imports: [ReactiveFormsModule],
  templateUrl: './catalogue.component.html',
  styleUrl: './catalogue.component.css',
})
export class CatalogueComponent {
  @ViewChild('editorDialog') private editorDialog?: ElementRef<HTMLElement>;

  private readonly catalogue = inject(CatalogueAdminService);
  private readonly formBuilder = inject(FormBuilder);
  private returnFocus: HTMLElement | null = null;

  protected readonly pageSize = 25;
  protected readonly products = signal<readonly Product[]>([]);
  protected readonly plans = signal<readonly Plan[]>([]);
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly selectedPlan = signal<Plan | null>(null);
  protected readonly loadingProducts = signal(false);
  protected readonly loadingPlans = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly editorError = signal('');
  protected readonly search = signal('');
  protected readonly status = signal<'all' | 'active' | 'archived'>('all');
  protected readonly planStatus = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly offset = signal(0);
  protected readonly productMode = signal<EditorMode>(null);
  protected readonly planMode = signal<EditorMode>(null);

  protected readonly productForm = this.formBuilder.nonNullable.group({
    slug: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
        Validators.maxLength(63),
      ],
    ],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(2000)]],
  });

  protected readonly planForm = this.formBuilder.nonNullable.group({
    slug: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
        Validators.maxLength(63),
      ],
    ],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    price: [
      '0.00',
      [Validators.required, Validators.pattern(/^\d+(?:\.\d{1,2})?$/)],
    ],
    currency: ['INR', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    billingInterval: ['monthly' as 'monthly' | 'annual', Validators.required],
    includedCredits: [
      0,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    entitlements: ['{}', Validators.required],
  });

  constructor() {
    this.loadProducts();
  }

  protected loadProducts(): void {
    this.loadingProducts.set(true);
    this.error.set('');
    this.catalogue
      .listProducts({
        status: this.status(),
        query: this.search().trim(),
        limit: this.pageSize,
        offset: this.offset(),
      })
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.loadingProducts.set(false);
          const selected = this.selectedProduct();
          if (selected) {
            const refreshed = products.find((item) => item.id === selected.id);
            if (refreshed) this.selectProduct(refreshed);
          }
        },
        error: (error: unknown) => {
          this.error.set(this.messageFor(error));
          this.loadingProducts.set(false);
        },
      });
  }

  protected selectProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.selectedPlan.set(null);
    this.loadPlans();
  }

  protected loadPlans(): void {
    const product = this.selectedProduct();
    if (!product) return;
    this.loadingPlans.set(true);
    this.catalogue
      .listPlans(product.id, {
        status: this.planStatus(),
        limit: 200,
        offset: 0,
      })
      .subscribe({
        next: (plans) => {
          this.plans.set(plans);
          this.loadingPlans.set(false);
        },
        error: (error: unknown) => {
          this.error.set(this.messageFor(error));
          this.loadingPlans.set(false);
        },
      });
  }

  protected setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected setStatus(event: Event): void {
    this.status.set(
      (event.target as HTMLSelectElement).value as
        'all' | 'active' | 'archived',
    );
  }

  protected setPlanStatus(event: Event): void {
    this.planStatus.set(
      (event.target as HTMLSelectElement).value as
        'all' | 'active' | 'inactive',
    );
    this.loadPlans();
  }

  protected applyFilters(): void {
    this.offset.set(0);
    this.loadProducts();
  }

  protected previousPage(): void {
    this.offset.update((value) => Math.max(0, value - this.pageSize));
    this.loadProducts();
  }

  protected nextPage(): void {
    this.offset.update((value) => value + this.pageSize);
    this.loadProducts();
  }

  protected startProductCreate(): void {
    this.closeEditors();
    this.rememberFocus();
    this.productForm.controls.slug.enable();
    this.productForm.reset({ slug: '', name: '', description: '' });
    this.productMode.set('create');
    this.focusEditor();
  }

  protected startProductEdit(product: Product): void {
    this.closeEditors();
    this.rememberFocus();
    this.selectedProduct.set(product);
    this.productForm.reset({
      slug: product.slug,
      name: product.name,
      description: product.description,
    });
    this.productForm.controls.slug.disable();
    this.productMode.set('edit');
    this.focusEditor();
  }

  protected submitProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.editorError.set('');
    const value = this.productForm.getRawValue();
    const mode = this.productMode();
    const selected = this.selectedProduct();
    const request =
      mode === 'create'
        ? this.catalogue.createProduct({
            slug: value.slug.trim(),
            name: value.name.trim(),
            description: value.description.trim(),
          })
        : this.catalogue.updateProduct(selected!.id, {
            version: selected!.version,
            name: value.name.trim(),
            description: value.description.trim(),
          });
    request.subscribe({
      next: (product) => {
        this.selectedProduct.set(product);
        this.saving.set(false);
        this.closeEditors();
        this.loadProducts();
      },
      error: (error: unknown) => {
        this.editorError.set(this.messageFor(error));
        this.saving.set(false);
      },
    });
  }

  protected toggleProduct(product: Product): void {
    const action = product.active ? 'archive' : 'reactivate';
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${product.name}? Existing subscriptions will be preserved.`,
      )
    )
      return;
    this.catalogue
      .updateProduct(product.id, {
        version: product.version,
        active: !product.active,
      })
      .subscribe({
        next: (updated) => {
          this.selectedProduct.set(updated);
          this.loadProducts();
        },
        error: (error: unknown) => this.error.set(this.messageFor(error)),
      });
  }

  protected startPlanCreate(): void {
    this.closeEditors();
    this.rememberFocus();
    this.planForm.controls.slug.enable();
    this.planForm.reset({
      slug: '',
      name: '',
      price: '0.00',
      currency: 'INR',
      billingInterval: 'monthly',
      includedCredits: 0,
      entitlements: '{}',
    });
    this.planMode.set('create');
    this.focusEditor();
  }

  protected startPlanEdit(plan: Plan): void {
    this.closeEditors();
    this.rememberFocus();
    this.selectedPlan.set(plan);
    this.planForm.reset({
      slug: plan.slug,
      name: plan.name,
      price: (plan.price_minor / 100).toFixed(2),
      currency: plan.currency,
      billingInterval: plan.billing_interval,
      includedCredits: plan.included_credits,
      entitlements: JSON.stringify(plan.entitlements, null, 2),
    });
    this.planForm.controls.slug.disable();
    this.planMode.set('edit');
    this.focusEditor();
  }

  protected submitPlan(): void {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }
    const product = this.selectedProduct();
    if (!product) return;
    const value = this.planForm.getRawValue();
    let entitlements: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(value.entitlements);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')
        throw new Error('not an object');
      entitlements = parsed as Record<string, unknown>;
    } catch {
      this.editorError.set('Entitlements must be a valid JSON object.');
      return;
    }
    const priceMinor = this.minorUnits(value.price);
    if (priceMinor === null) {
      this.editorError.set('Price must have no more than two decimal places.');
      return;
    }
    this.saving.set(true);
    this.editorError.set('');
    const base = {
      name: value.name.trim(),
      price_minor: priceMinor,
      currency: value.currency,
      included_credits: value.includedCredits,
      entitlements,
      billing_interval: value.billingInterval,
    } as const;
    const selected = this.selectedPlan();
    const request =
      this.planMode() === 'create'
        ? this.catalogue.createPlan(product.id, {
            ...base,
            slug: value.slug.trim(),
            active: true,
          })
        : this.catalogue.updatePlan(selected!.id, {
            ...base,
            version: selected!.version,
          });
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeEditors();
        this.loadPlans();
      },
      error: (error: unknown) => {
        this.editorError.set(this.messageFor(error));
        this.saving.set(false);
      },
    });
  }

  protected togglePlan(plan: Plan): void {
    const action = plan.active ? 'archive' : 'reactivate';
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${plan.name}? Existing subscriptions will be preserved.`,
      )
    )
      return;
    this.catalogue
      .updatePlan(plan.id, { version: plan.version, active: !plan.active })
      .subscribe({
        next: () => this.loadPlans(),
        error: (error: unknown) => this.error.set(this.messageFor(error)),
      });
  }

  protected closeEditors(): void {
    const returnFocus = this.returnFocus;
    this.productMode.set(null);
    this.planMode.set(null);
    this.editorError.set('');
    this.saving.set(false);
    this.returnFocus = null;
    if (returnFocus) setTimeout(() => returnFocus.focus());
  }

  protected trapDialogFocus(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeEditors();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = this.editorDialog?.nativeElement;
    if (!dialog) return;
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ),
    );
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected formatPrice(plan: Plan): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: plan.currency,
    }).format(plan.price_minor / 100);
  }

  private minorUnits(value: string): number | null {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
    const [whole, fraction = ''] = value.split('.');
    const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return Number.isSafeInteger(amount) ? amount : null;
  }

  private rememberFocus(): void {
    this.returnFocus = document.activeElement as HTMLElement | null;
  }

  private focusEditor(): void {
    setTimeout(() => {
      this.editorDialog?.nativeElement
        .querySelector<HTMLElement>(
          'input:not([disabled]), button:not([disabled])',
        )
        ?.focus();
    });
  }

  private messageFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse))
      return 'The catalogue request failed. Please try again.';
    const serverMessage =
      typeof error.error?.error === 'string' ? error.error.error : '';
    if (error.status === 401)
      return 'Your admin session has expired. Sign in again.';
    if (error.status === 403)
      return 'You do not have permission to manage the catalogue.';
    if (error.status === 404)
      return 'The selected catalogue record no longer exists.';
    if (error.status === 409)
      return (
        serverMessage ||
        'This record changed or already exists. Reload and try again.'
      );
    if (error.status === 429)
      return 'Too many changes were submitted. Wait briefly and try again.';
    return serverMessage || 'The catalogue request failed. Please try again.';
  }
}
