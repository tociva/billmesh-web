import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Plan, Product } from '@billmesh/domain';
import {
  TngAutocompleteComponent,
  TngButtonComponent,
  TngCardComponent,
  TngInputAngularFormsAdapter,
  TngInputComponent,
  TngSelectComponent,
} from '@tailng-ui/components';
import { forkJoin } from 'rxjs';
import {
  catalogueMessage,
  catalogueReturnUrl,
  parseMinorUnits,
} from '../../catalogue.helpers';
import { currencyOptions, type CurrencyOption } from '../../currency-options';
import { PlanEntitlementsComponent } from '../plan-entitlements/plan-entitlements.component';

@Component({
  selector: 'billmesh-plan-configuration',
  imports: [
    ReactiveFormsModule,
    TngAutocompleteComponent,
    TngButtonComponent,
    TngCardComponent,
    TngInputAngularFormsAdapter,
    TngInputComponent,
    TngSelectComponent,
    PlanEntitlementsComponent,
  ],
  templateUrl: './plan-configuration.component.html',
  styleUrl: '../../catalogue.shared.css',
})
export class PlanConfigurationComponent {
  @ViewChild(PlanEntitlementsComponent)
  private planEntitlements?: PlanEntitlementsComponent;
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly productId = this.route.snapshot.paramMap.get('productId')!;
  protected readonly planId = this.route.snapshot.paramMap.get('planId');
  protected readonly editMode = this.planId !== null;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly plan = signal<Plan | null>(null);
  protected readonly product = signal<Product | null>(null);
  protected readonly emptyEntitlements: Readonly<Record<string, unknown>> = {};
  protected readonly currencyQuery = signal('');
  protected readonly currencyOptionValue = (currency: CurrencyOption): string =>
    currency.code;
  protected readonly currencyOptionLabel = (currency: CurrencyOption): string =>
    `${currency.name} (${currency.symbol})`;
  protected readonly currencyTrackBy = (
    _index: number,
    currency: CurrencyOption,
  ): string => currency.code;
  protected readonly filteredCurrencies = computed(() => {
    const query = this.currencyQuery();
    if (!query) return currencyOptions;

    return currencyOptions.filter((currency) =>
      `${currency.code} ${currency.name} ${currency.symbol}`
        .toLowerCase()
        .includes(query),
    );
  });
  protected readonly billingIntervalOptions = [
    { label: 'Monthly', value: 'monthly' as const },
    { label: 'Annual', value: 'annual' as const },
  ];
  protected readonly getBillingIntervalLabel = (
    option: (typeof this.billingIntervalOptions)[number],
  ): string => option.label;
  protected readonly getBillingIntervalValue = (
    option: (typeof this.billingIntervalOptions)[number],
  ): 'monthly' | 'annual' => option.value;
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
  });

  constructor() {
    this.load();
  }

  protected setBillingInterval(value: unknown): void {
    if (value === 'monthly' || value === 'annual') {
      this.form.controls.billingInterval.setValue(value);
      this.form.controls.billingInterval.markAsTouched();
    }
  }

  protected selectCurrency(value: unknown): void {
    const currency = typeof value === 'string' ? value : '';
    this.form.controls.currency.setValue(currency);
    this.form.controls.currency.markAsTouched();
  }

  protected onCurrencyQueryChange(value: unknown): void {
    this.currencyQuery.set(
      typeof value === 'string' ? value.trim().toLowerCase() : '',
    );
  }

  protected submit(): void {
    if (this.form.invalid || !this.planEntitlements?.valid) {
      this.form.markAllAsTouched();
      this.planEntitlements?.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const priceMinor = parseMinorUnits(value.price);
    const entitlements = this.planEntitlements.value();
    if (priceMinor === null) {
      this.error.set('Price must use no more than two decimal places.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const commercialPayload = {
      name: value.name.trim(),
      price_minor: priceMinor,
      currency: value.currency.trim().toUpperCase(),
      included_credits: Number(value.includedCredits),
      billing_interval: value.billingInterval,
    } as const;
    const legacyEntitlements =
      this.editMode &&
      this.product()!.entitlement_schema.fields.length === 0 &&
      Object.keys(this.plan()!.entitlements).length > 0;
    const request = this.planId
      ? this.catalogue.updatePlan(
          this.planId,
          legacyEntitlements
            ? { ...commercialPayload, version: this.plan()!.version }
            : {
                ...commercialPayload,
                entitlements,
                entitlement_schema_version:
                  this.product()!.entitlement_schema_version,
                version: this.plan()!.version,
              },
        )
      : this.catalogue.createPlan(this.productId, {
          ...commercialPayload,
          entitlements,
          entitlement_schema_version:
            this.product()!.entitlement_schema_version,
          slug: value.slug.trim(),
          active: true,
        });
    request.subscribe({
      next: (plan) => {
        this.saving.set(false);
        void this.router.navigate(
          ['/app/catalogue', this.productId, 'plans', plan.id],
          { queryParams: { burl: this.returnUrl() } },
        );
      },
      error: (error: unknown) => {
        this.error.set(catalogueMessage(error));
        this.saving.set(false);
      },
    });
  }

  protected canSave(): boolean {
    return (
      !this.saving() && this.form.valid && Boolean(this.planEntitlements?.valid)
    );
  }

  protected back(): void {
    void this.router.navigateByUrl(this.returnUrl());
  }

  private load(): void {
    if (!this.planId) {
      this.catalogue.getProduct(this.productId).subscribe({
        next: (product) => {
          this.product.set(product);
          this.loading.set(false);
        },
        error: (error: unknown) => this.loadFailed(error),
      });
      return;
    }
    forkJoin({
      product: this.catalogue.getProduct(this.productId),
      plan: this.catalogue.getPlan(this.planId),
    }).subscribe({
      next: ({ product, plan }) => {
        this.product.set(product);
        this.plan.set(plan);
        this.form.reset({
          slug: plan.slug,
          name: plan.name,
          price: (plan.price_minor / 100).toFixed(2),
          currency: plan.currency,
          billingInterval: plan.billing_interval,
          includedCredits: plan.included_credits,
        });
        this.form.controls.slug.disable();
        this.loading.set(false);
      },
      error: (error: unknown) => this.loadFailed(error),
    });
  }

  private loadFailed(error: unknown): void {
    this.error.set(catalogueMessage(error));
    this.loading.set(false);
  }

  private returnUrl(): string {
    return catalogueReturnUrl(
      this.route.snapshot.queryParamMap.get('burl'),
      `/app/catalogue/${encodeURIComponent(this.productId)}`,
    );
  }
}
