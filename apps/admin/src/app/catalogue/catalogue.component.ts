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
  template: `
    <main class="catalogue-shell">
      <header class="page-header">
        <div>
          <p class="eyebrow">Catalogue</p>
          <h1>Products and subscription plans</h1>
          <p>
            Manage customer-visible products, pricing, credits, and
            entitlements.
          </p>
        </div>
        <button type="button" class="primary" (click)="startProductCreate()">
          Create product
        </button>
      </header>

      @if (error()) {
        <div class="notice notice--error" role="alert">
          <span>{{ error() }}</span>
          <button type="button" (click)="loadProducts()">Retry</button>
        </div>
      }

      <section class="toolbar" aria-label="Product filters">
        <label>
          <span>Search products</span>
          <input
            type="search"
            [value]="search()"
            (input)="setSearch($event)"
            (keydown.enter)="applyFilters()"
          />
        </label>
        <label>
          <span>Status</span>
          <select [value]="status()" (change)="setStatus($event)">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button type="button" (click)="applyFilters()">Apply</button>
      </section>

      <div class="catalogue-grid">
        <section class="panel" aria-labelledby="products-title">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Products</p>
              <h2 id="products-title">{{ products().length }} results</h2>
            </div>
          </div>

          @if (loadingProducts()) {
            <p class="state" role="status">Loading products…</p>
          } @else if (!products().length) {
            <p class="state">No products match these filters.</p>
          } @else {
            <ul class="resource-list">
              @for (product of products(); track product.id) {
                <li>
                  <button
                    type="button"
                    [class.selected]="selectedProduct()?.id === product.id"
                    (click)="selectProduct(product)"
                  >
                    <span>
                      <strong>{{ product.name }}</strong>
                      <small>{{ product.slug }}</small>
                    </span>
                    <span
                      [class]="
                        product.active ? 'status active' : 'status archived'
                      "
                    >
                      {{ product.active ? 'Active' : 'Archived' }}
                    </span>
                  </button>
                </li>
              }
            </ul>
          }

          <div class="pagination">
            <button
              type="button"
              [disabled]="offset() === 0"
              (click)="previousPage()"
            >
              Previous
            </button>
            <span>Offset {{ offset() }}</span>
            <button
              type="button"
              [disabled]="products().length < pageSize"
              (click)="nextPage()"
            >
              Next
            </button>
          </div>
        </section>

        <section class="panel detail-panel" aria-live="polite">
          @if (selectedProduct(); as product) {
            <div class="panel-heading">
              <div>
                <p class="eyebrow">Selected product</p>
                <h2>{{ product.name }}</h2>
                <p>{{ product.description || 'No description provided.' }}</p>
              </div>
              <div class="actions">
                <button type="button" (click)="startProductEdit(product)">
                  Edit
                </button>
                <button
                  type="button"
                  class="danger"
                  (click)="toggleProduct(product)"
                >
                  {{ product.active ? 'Archive' : 'Reactivate' }}
                </button>
              </div>
            </div>

            <div class="plans-heading">
              <div>
                <p class="eyebrow">Subscription plans</p>
                <h3>{{ plans().length }} plans</h3>
              </div>
              <div class="actions">
                <label>
                  <span class="visually-hidden">Plan status</span>
                  <select
                    [value]="planStatus()"
                    (change)="setPlanStatus($event)"
                  >
                    <option value="all">All plans</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <button
                  type="button"
                  class="primary"
                  [disabled]="!product.active"
                  [title]="
                    product.active
                      ? ''
                      : 'Reactivate the product before creating an active plan'
                  "
                  (click)="startPlanCreate()"
                >
                  Create plan
                </button>
              </div>
            </div>

            @if (loadingPlans()) {
              <p class="state" role="status">Loading plans…</p>
            } @else if (!plans().length) {
              <p class="state">This product has no matching plans.</p>
            } @else {
              <div class="plan-list">
                @for (plan of plans(); track plan.id) {
                  <article>
                    <div>
                      <strong>{{ plan.name }}</strong>
                      <small
                        >{{ plan.slug }} · {{ plan.billing_interval }}</small
                      >
                    </div>
                    <div class="plan-price">
                      <strong>{{ formatPrice(plan) }}</strong>
                      <small>{{ plan.included_credits }} credits</small>
                    </div>
                    <span
                      [class]="
                        plan.active ? 'status active' : 'status archived'
                      "
                    >
                      {{ plan.active ? 'Active' : 'Inactive' }}
                    </span>
                    <div class="actions">
                      <button type="button" (click)="startPlanEdit(plan)">
                        Edit
                      </button>
                      <button
                        type="button"
                        class="danger"
                        [disabled]="!product.active && !plan.active"
                        (click)="togglePlan(plan)"
                      >
                        {{ plan.active ? 'Archive' : 'Reactivate' }}
                      </button>
                    </div>
                  </article>
                }
              </div>
            }
          } @else {
            <p class="state">Select a product to manage its plans.</p>
          }
        </section>
      </div>

      @if (productMode()) {
        <div class="dialog-backdrop" (click)="closeEditors()">
          <section
            #editorDialog
            class="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
            (click)="$event.stopPropagation()"
            (keydown)="trapDialogFocus($event)"
          >
            <div class="panel-heading">
              <h2 id="product-form-title">
                {{
                  productMode() === 'create' ? 'Create product' : 'Edit product'
                }}
              </h2>
              <button
                type="button"
                aria-label="Close product editor"
                (click)="closeEditors()"
              >
                ×
              </button>
            </div>
            <form [formGroup]="productForm" (ngSubmit)="submitProduct()">
              <label>
                <span>Slug</span>
                <input formControlName="slug" autocomplete="off" />
                @if (
                  productForm.controls.slug.invalid &&
                  productForm.controls.slug.touched
                ) {
                  <small class="field-error"
                    >Use lowercase letters, numbers, and single hyphens.</small
                  >
                }
              </label>
              <label>
                <span>Name</span>
                <input formControlName="name" autocomplete="off" />
              </label>
              <label>
                <span>Description</span>
                <textarea formControlName="description" rows="4"></textarea>
              </label>
              @if (editorError()) {
                <p class="field-error" role="alert">{{ editorError() }}</p>
              }
              <div class="dialog-actions">
                <button type="button" (click)="closeEditors()">Cancel</button>
                <button
                  type="submit"
                  class="primary"
                  [disabled]="saving() || productForm.invalid"
                >
                  {{ saving() ? 'Saving…' : 'Save product' }}
                </button>
              </div>
            </form>
          </section>
        </div>
      }

      @if (planMode()) {
        <div class="dialog-backdrop" (click)="closeEditors()">
          <section
            #editorDialog
            class="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-form-title"
            (click)="$event.stopPropagation()"
            (keydown)="trapDialogFocus($event)"
          >
            <div class="panel-heading">
              <h2 id="plan-form-title">
                {{ planMode() === 'create' ? 'Create plan' : 'Edit plan' }}
              </h2>
              <button
                type="button"
                aria-label="Close plan editor"
                (click)="closeEditors()"
              >
                ×
              </button>
            </div>
            <form [formGroup]="planForm" (ngSubmit)="submitPlan()">
              <div class="form-grid">
                <label>
                  <span>Slug</span>
                  <input formControlName="slug" autocomplete="off" />
                </label>
                <label>
                  <span>Name</span>
                  <input formControlName="name" autocomplete="off" />
                </label>
                <label>
                  <span>Price</span>
                  <input
                    formControlName="price"
                    inputmode="decimal"
                    placeholder="0.00"
                  />
                </label>
                <label>
                  <span>Currency</span>
                  <input formControlName="currency" maxlength="3" />
                </label>
                <label>
                  <span>Billing interval</span>
                  <select formControlName="billingInterval">
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </label>
                <label>
                  <span>Included credits</span>
                  <input
                    formControlName="includedCredits"
                    type="number"
                    min="0"
                    step="1"
                  />
                </label>
              </div>
              <label>
                <span>Entitlements JSON</span>
                <textarea
                  formControlName="entitlements"
                  rows="7"
                  spellcheck="false"
                ></textarea>
              </label>
              @if (editorError()) {
                <p class="field-error" role="alert">{{ editorError() }}</p>
              }
              <div class="dialog-actions">
                <button type="button" (click)="closeEditors()">Cancel</button>
                <button
                  type="submit"
                  class="primary"
                  [disabled]="saving() || planForm.invalid"
                >
                  {{ saving() ? 'Saving…' : 'Save plan' }}
                </button>
              </div>
            </form>
          </section>
        </div>
      }
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: #f5f7fb;
      color: #172033;
    }
    * {
      box-sizing: border-box;
    }
    button,
    input,
    select,
    textarea {
      font: inherit;
    }
    button {
      cursor: pointer;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .catalogue-shell {
      width: min(1440px, 100%);
      margin: 0 auto;
      padding: 2rem;
    }
    .page-header,
    .panel-heading,
    .plans-heading,
    .toolbar,
    .actions,
    .pagination,
    .dialog-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .page-header {
      margin-bottom: 1.5rem;
    }
    h1,
    h2,
    h3,
    p {
      margin-top: 0;
    }
    .eyebrow {
      margin: 0 0 0.35rem;
      color: #6654d9;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    a {
      color: #5145b5;
    }
    button {
      border: 1px solid #ccd2df;
      border-radius: 0.55rem;
      background: white;
      padding: 0.65rem 0.9rem;
      color: inherit;
    }
    button.primary {
      border-color: #6654d9;
      background: #6654d9;
      color: white;
    }
    button.danger {
      color: #a22634;
    }
    .toolbar {
      justify-content: flex-start;
      padding: 1rem;
      margin-bottom: 1rem;
      border: 1px solid #dde2eb;
      border-radius: 0.8rem;
      background: white;
    }
    label {
      display: grid;
      gap: 0.35rem;
      font-size: 0.85rem;
      font-weight: 650;
    }
    input,
    select,
    textarea {
      width: 100%;
      border: 1px solid #cbd2df;
      border-radius: 0.5rem;
      background: white;
      padding: 0.65rem 0.75rem;
      color: inherit;
    }
    input:focus,
    select:focus,
    textarea:focus,
    button:focus-visible {
      outline: 3px solid #c8c2ff;
      outline-offset: 2px;
    }
    .catalogue-grid {
      display: grid;
      grid-template-columns: minmax(280px, 0.75fr) minmax(520px, 1.6fr);
      gap: 1rem;
      align-items: start;
    }
    .panel {
      border: 1px solid #dde2eb;
      border-radius: 0.9rem;
      background: white;
      padding: 1.2rem;
      box-shadow: 0 10px 30px rgb(25 35 55 / 5%);
    }
    .resource-list {
      display: grid;
      gap: 0.5rem;
      padding: 0;
      list-style: none;
    }
    .resource-list button {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-align: left;
    }
    .resource-list button.selected {
      border-color: #6654d9;
      background: #f4f2ff;
    }
    .resource-list span:first-child,
    .plan-list article > div:first-child,
    .plan-price {
      display: grid;
      gap: 0.2rem;
    }
    small {
      color: #667085;
    }
    .status {
      display: inline-flex;
      border-radius: 999px;
      padding: 0.25rem 0.55rem;
      font-size: 0.72rem;
      font-weight: 750;
    }
    .status.active {
      background: #e8f8ef;
      color: #177245;
    }
    .status.archived {
      background: #f0f1f4;
      color: #596274;
    }
    .pagination {
      margin-top: 1rem;
    }
    .plans-heading {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e4e7ee;
    }
    .plan-list {
      display: grid;
      gap: 0.65rem;
      margin-top: 1rem;
    }
    .plan-list article {
      display: grid;
      grid-template-columns: 1.6fr 1fr auto auto;
      gap: 1rem;
      align-items: center;
      border: 1px solid #e0e4ec;
      border-radius: 0.7rem;
      padding: 0.85rem;
    }
    .plan-price {
      text-align: right;
    }
    .state {
      padding: 2rem 1rem;
      color: #667085;
      text-align: center;
    }
    .notice {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      border-radius: 0.7rem;
      padding: 0.8rem 1rem;
    }
    .notice--error {
      background: #fff0f1;
      color: #8b1e2c;
    }
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: center;
      background: rgb(16 24 40 / 45%);
      padding: 1rem;
    }
    .dialog {
      width: min(640px, 100%);
      max-height: calc(100dvh - 2rem);
      overflow: auto;
      border-radius: 0.9rem;
      background: white;
      padding: 1.25rem;
      box-shadow: 0 24px 80px rgb(0 0 0 / 25%);
    }
    form {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .dialog-actions {
      justify-content: flex-end;
    }
    .field-error {
      color: #a22634;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    @media (max-width: 900px) {
      .catalogue-grid {
        grid-template-columns: 1fr;
      }
      .plan-list article {
        grid-template-columns: 1fr;
      }
      .plan-price {
        text-align: left;
      }
    }
    @media (max-width: 620px) {
      .catalogue-shell {
        padding: 1rem;
      }
      .page-header,
      .toolbar,
      .plans-heading {
        align-items: stretch;
        flex-direction: column;
      }
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
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
