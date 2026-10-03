import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type {
  BillingPolicy,
  BillingPolicyMetadata,
  EntitlementSchema,
  Product,
} from '@billmesh/domain';
import {
  TngButtonComponent,
  TngCardComponent,
  TngInputAngularFormsAdapter,
  TngInputComponent,
} from '@tailng-ui/components';
import { catalogueMessage, catalogueReturnUrl } from '../catalogue.helpers';
import { EntitlementSchemaEditorComponent } from '../entitlement-schema-editor/entitlement-schema-editor.component';

@Component({
  selector: 'billmesh-product-form',
  imports: [
    ReactiveFormsModule,
    TngButtonComponent,
    TngCardComponent,
    TngInputAngularFormsAdapter,
    TngInputComponent,
    EntitlementSchemaEditorComponent,
  ],
  templateUrl: './product-form.component.html',
  styleUrl: '../catalogue.shared.css',
})
export class ProductFormComponent {
  @ViewChild(EntitlementSchemaEditorComponent)
  private schemaEditor?: EntitlementSchemaEditorComponent;
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
  protected readonly policyMetadata = signal<BillingPolicyMetadata | null>(
    null,
  );
  protected readonly emptySchema: EntitlementSchema = { fields: [] };
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
    policy: this.formBuilder.nonNullable.group({
      customerScope: ['identity'],
      freeAllowance: [
        1,
        [Validators.required, Validators.min(0), Validators.max(1_000_000)],
      ],
      ownershipChange: ['retain'],
      ownershipTransfer: ['unsupported'],
      ineligibleOwnerAction: ['require_paid_checkout'],
      allowWithoutSubscription: [true],
      initialPlan: ['explicit_transition'],
      onboardingIneligibleAction: ['require_paid_checkout'],
      deletionRetention: ['retain'],
      catalogueAccess: ['application_token'],
      catalogueRequired: [false],
      presentationFields: ['description, price, entitlements, availability'],
      trialEnabled: [false],
      trialDays: [
        0,
        [Validators.required, Validators.min(0), Validators.max(3650)],
      ],
      trialConversion: ['expire'],
      paidToPaid: ['checkout'],
      cancellationDefault: ['period_end'],
      allowImmediateCancel: [true],
      immediateCancelRefund: ['none'],
      allowCancellationWithdraw: [false],
      reactivation: ['new_transition'],
      overLimit: ['block_new'],
      renewal: ['provider_event'],
      gracePeriodDays: [
        3,
        [Validators.required, Validators.min(0), Validators.max(365)],
      ],
      dunning: ['grace_period'],
      expiration: ['cancel'],
      refundEntitlements: ['revoke'],
      chargebackEntitlements: ['revoke'],
      freshSeconds: [
        300,
        [Validators.required, Validators.min(0), Validators.max(2_592_000)],
      ],
      degradedSeconds: [
        0,
        [Validators.required, Validators.min(0), Validators.max(2_592_000)],
      ],
      failClosedOperations: [
        'subscription_change, credit_purchase, limit_increase',
      ],
      refreshSeconds: [
        60,
        [Validators.required, Validators.min(1), Validators.max(2_592_000)],
      ],
      reconciliationSeconds: [
        300,
        [Validators.required, Validators.min(1), Validators.max(2_592_000)],
      ],
      redirectOrigins: [''],
      checkoutPresentation: ['provider_hosted'],
      recurringMandate: [false],
      confirmation: ['webhook'],
    }),
  });

  constructor() {
    this.loading.set(true);
    this.catalogue.getProductPolicyMetadata().subscribe({
      next: (metadata) => {
        this.policyMetadata.set(metadata);
        this.setPolicy(metadata.defaults);
        if (this.id) this.loadProduct(this.id);
        else this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(catalogueMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || !this.schemaEditor?.valid) {
      this.form.markAllAsTouched();
      this.schemaEditor?.markAllAsTouched();
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
          entitlement_schema: this.schemaEditor.value(),
          billing_policy: this.billingPolicy(),
        })
      : this.catalogue.createProduct({
          slug: value.slug.trim(),
          name: value.name.trim(),
          description: value.description.trim(),
          entitlement_schema: this.schemaEditor.value(),
          billing_policy: this.billingPolicy(),
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

  protected canSave(): boolean {
    return (
      !this.saving() &&
      this.form.valid &&
      Boolean(this.schemaEditor?.valid) &&
      !this.policyValidationError()
    );
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
        this.setPolicy(product.billing_policy);
        this.form.controls.slug.disable();
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(catalogueMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected options(path: string): readonly string[] {
    return this.policyMetadata()?.options[path] ?? [];
  }

  protected policyValidationError(): string {
    const value = this.form.controls.policy.getRawValue();
    if (value.trialEnabled !== value.trialDays > 0) {
      return 'Trial days must be positive only when trials are enabled.';
    }
    if (value.dunning === 'grace_period' && value.gracePeriodDays === 0) {
      return 'Grace-period dunning requires a positive grace period.';
    }
    if (
      value.cancellationDefault === 'immediate' &&
      !value.allowImmediateCancel
    ) {
      return 'Immediate cancellation cannot be the default while it is disabled.';
    }
    if (
      value.recurringMandate &&
      value.paidToPaid !== 'mandate_proration' &&
      value.trialConversion !== 'automatic_mandate'
    ) {
      return 'Recurring mandates require mandate proration or automatic trial conversion.';
    }
    if (
      (value.paidToPaid === 'mandate_proration' ||
        value.trialConversion === 'automatic_mandate') &&
      !value.recurringMandate
    ) {
      return 'Mandate-based behavior requires recurring mandates.';
    }
    if (
      value.degradedSeconds > 0 &&
      value.degradedSeconds < value.freshSeconds
    ) {
      return 'Degraded-mode age cannot be shorter than fresh snapshot age.';
    }
    const origins = this.lines(value.redirectOrigins);
    if (new Set(origins).size !== origins.length) {
      return 'Checkout redirect origins must be unique.';
    }
    for (const origin of origins) {
      try {
        const parsed = new URL(origin);
        if (
          (parsed.protocol !== 'https:' &&
            !(
              parsed.protocol === 'http:' &&
              (parsed.hostname === 'localhost' ||
                parsed.hostname === '127.0.0.1')
            )) ||
          parsed.pathname !== '/' ||
          parsed.search ||
          parsed.hash ||
          parsed.username ||
          parsed.password
        ) {
          return `Checkout redirect origin ${origin} is invalid.`;
        }
      } catch {
        return `Checkout redirect origin ${origin} is invalid.`;
      }
    }
    return '';
  }

  private billingPolicy(): BillingPolicy {
    const value = this.form.controls.policy.getRawValue();
    return {
      schema_version: 1,
      customer: {
        scope: value.customerScope as BillingPolicy['customer']['scope'],
        free_allowance: value.freeAllowance,
        ownership_change:
          value.ownershipChange as BillingPolicy['customer']['ownership_change'],
        ownership_transfer:
          value.ownershipTransfer as BillingPolicy['customer']['ownership_transfer'],
        ineligible_owner_action:
          value.ineligibleOwnerAction as BillingPolicy['customer']['ineligible_owner_action'],
      },
      onboarding: {
        allow_without_subscription: value.allowWithoutSubscription,
        initial_plan:
          value.initialPlan as BillingPolicy['onboarding']['initial_plan'],
        ineligible_action:
          value.onboardingIneligibleAction as BillingPolicy['onboarding']['ineligible_action'],
        deletion_retention:
          value.deletionRetention as BillingPolicy['onboarding']['deletion_retention'],
      },
      catalogue: {
        access: value.catalogueAccess as BillingPolicy['catalogue']['access'],
        required_before_account: value.catalogueRequired,
        presentation_fields: this.csv(value.presentationFields),
        trial_enabled: value.trialEnabled,
        trial_days: value.trialDays,
        trial_conversion:
          value.trialConversion as BillingPolicy['catalogue']['trial_conversion'],
      },
      lifecycle: {
        free_to_paid: 'immediate_after_capture',
        paid_to_paid:
          value.paidToPaid as BillingPolicy['lifecycle']['paid_to_paid'],
        downgrade: 'period_end',
        cancellation_default:
          value.cancellationDefault as BillingPolicy['lifecycle']['cancellation_default'],
        allow_immediate_cancel: value.allowImmediateCancel,
        immediate_cancel_refund:
          value.immediateCancelRefund as BillingPolicy['lifecycle']['immediate_cancel_refund'],
        allow_cancellation_withdraw: value.allowCancellationWithdraw,
        reactivation:
          value.reactivation as BillingPolicy['lifecycle']['reactivation'],
        over_limit: value.overLimit as BillingPolicy['lifecycle']['over_limit'],
        renewal: value.renewal as BillingPolicy['lifecycle']['renewal'],
        grace_period_days: value.gracePeriodDays,
        dunning: value.dunning as BillingPolicy['lifecycle']['dunning'],
        expiration:
          value.expiration as BillingPolicy['lifecycle']['expiration'],
        refund_entitlements:
          value.refundEntitlements as BillingPolicy['lifecycle']['refund_entitlements'],
        chargeback_entitlements:
          value.chargebackEntitlements as BillingPolicy['lifecycle']['chargeback_entitlements'],
      },
      projection: {
        fresh_seconds: value.freshSeconds,
        degraded_seconds: value.degradedSeconds,
        fail_closed_operations: this.csv(value.failClosedOperations),
        refresh_seconds: value.refreshSeconds,
        reconciliation_seconds: value.reconciliationSeconds,
      },
      checkout: {
        allowed_redirect_origins: this.lines(value.redirectOrigins),
        presentation:
          value.checkoutPresentation as BillingPolicy['checkout']['presentation'],
        recurring_mandate: value.recurringMandate,
        confirmation:
          value.confirmation as BillingPolicy['checkout']['confirmation'],
      },
    };
  }

  private setPolicy(policy: BillingPolicy): void {
    this.form.controls.policy.reset({
      customerScope: policy.customer.scope,
      freeAllowance: policy.customer.free_allowance,
      ownershipChange: policy.customer.ownership_change,
      ownershipTransfer: policy.customer.ownership_transfer,
      ineligibleOwnerAction: policy.customer.ineligible_owner_action,
      allowWithoutSubscription: policy.onboarding.allow_without_subscription,
      initialPlan: policy.onboarding.initial_plan,
      onboardingIneligibleAction: policy.onboarding.ineligible_action,
      deletionRetention: policy.onboarding.deletion_retention,
      catalogueAccess: policy.catalogue.access,
      catalogueRequired: policy.catalogue.required_before_account,
      presentationFields: policy.catalogue.presentation_fields.join(', '),
      trialEnabled: policy.catalogue.trial_enabled,
      trialDays: policy.catalogue.trial_days,
      trialConversion: policy.catalogue.trial_conversion,
      paidToPaid: policy.lifecycle.paid_to_paid,
      cancellationDefault: policy.lifecycle.cancellation_default,
      allowImmediateCancel: policy.lifecycle.allow_immediate_cancel,
      immediateCancelRefund: policy.lifecycle.immediate_cancel_refund,
      allowCancellationWithdraw: policy.lifecycle.allow_cancellation_withdraw,
      reactivation: policy.lifecycle.reactivation,
      overLimit: policy.lifecycle.over_limit,
      renewal: policy.lifecycle.renewal,
      gracePeriodDays: policy.lifecycle.grace_period_days,
      dunning: policy.lifecycle.dunning,
      expiration: policy.lifecycle.expiration,
      refundEntitlements: policy.lifecycle.refund_entitlements,
      chargebackEntitlements: policy.lifecycle.chargeback_entitlements,
      freshSeconds: policy.projection.fresh_seconds,
      degradedSeconds: policy.projection.degraded_seconds,
      failClosedOperations: policy.projection.fail_closed_operations.join(', '),
      refreshSeconds: policy.projection.refresh_seconds,
      reconciliationSeconds: policy.projection.reconciliation_seconds,
      redirectOrigins: policy.checkout.allowed_redirect_origins.join('\n'),
      checkoutPresentation: policy.checkout.presentation,
      recurringMandate: policy.checkout.recurring_mandate,
      confirmation: policy.checkout.confirmation,
    });
  }

  private csv(value: string): string[] {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private lines(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map((entry) => entry.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }

  private returnUrl(): string {
    return catalogueReturnUrl(
      this.route.snapshot.queryParamMap.get('burl'),
      '/app/catalogue',
    );
  }
}
