import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormControl,
} from '@angular/forms';
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
  TngCheckboxAngularFormsAdapter,
  TngCheckboxComponent,
  TngInputAngularFormsAdapter,
  TngInputComponent,
  TngSelectComponent,
  TngStepperComponent,
  TngTextareaComponent,
  TngTooltipComponent,
} from '@tailng-ui/components';
import { catalogueMessage, catalogueReturnUrl } from '../../catalogue.helpers';
import { ProductEntitlementsComponent } from '../product-entitlements/product-entitlements.component';

type PolicyOption = Readonly<{
  value: string;
  label: string;
  description: string;
}>;

const POLICY_OPTION_COPY: Readonly<
  Record<string, Readonly<{ label: string; description: string }>>
> = {
  identity: {
    label: 'Individual customer',
    description: 'Apply billing separately to each signed-in identity.',
  },
  organization: {
    label: 'Organization',
    description: 'Apply billing to the customer organization as a whole.',
  },
  external_customer: {
    label: 'External customer',
    description:
      'Use a customer identity supplied by the integrating application.',
  },
  retain: {
    label: 'Keep unchanged',
    description: 'Preserve the current owner, access, or entitlement state.',
  },
  reevaluate: {
    label: 'Re-evaluate eligibility',
    description: 'Check eligibility again when ownership changes.',
  },
  unsupported: {
    label: 'Do not allow transfers',
    description: 'Reject ownership transfers for this product.',
  },
  preauthorized_recheck: {
    label: 'Recheck pre-authorized transfer',
    description: 'Allow only pre-authorized transfers that pass a fresh check.',
  },
  reject: {
    label: 'Reject the request',
    description: 'Refuse the operation when the customer is not eligible.',
  },
  require_paid_checkout: {
    label: 'Require paid checkout',
    description: 'Send the customer through paid checkout before continuing.',
  },
  automatic_default: {
    label: 'Assign the default plan automatically',
    description: 'Create the subscription using the configured default plan.',
  },
  explicit_transition: {
    label: 'Require an explicit plan selection',
    description:
      'Wait for the application to request a specific plan transition.',
  },
  restricted: {
    label: 'Create restricted access',
    description:
      'Create the customer with limited access instead of rejecting them.',
  },
  anonymize: {
    label: 'Anonymize billing data',
    description:
      'Remove identifying customer data when the account is deleted.',
  },
  public: {
    label: 'Public access',
    description: 'Allow catalogue access without an application token.',
  },
  application_token: {
    label: 'Application token required',
    description:
      'Require an authorized application token to read the catalogue.',
  },
  expire: {
    label: 'End access when the trial expires',
    description:
      'Do not automatically convert the trial to a paid subscription.',
  },
  require_checkout: {
    label: 'Require checkout to continue',
    description:
      'Ask the customer to complete checkout at the end of the trial.',
  },
  automatic_mandate: {
    label: 'Convert using the saved mandate',
    description:
      'Charge the saved recurring mandate and convert automatically.',
  },
  checkout: {
    label: 'Require checkout',
    description: 'Use checkout for changes between paid plans.',
  },
  mandate_proration: {
    label: 'Prorate using the saved mandate',
    description: 'Apply the paid-plan change and charge the prorated amount.',
  },
  period_end: {
    label: 'At the end of the billing period',
    description: 'Schedule the change for the current billing period end.',
  },
  immediate: {
    label: 'Immediately',
    description: 'Apply the change immediately instead of scheduling it.',
  },
  none: {
    label: 'No automatic refund',
    description: 'Do not issue an automatic refund.',
  },
  prorated: {
    label: 'Prorated refund',
    description: 'Refund the unused portion of the billing period.',
  },
  full: {
    label: 'Full refund',
    description: 'Refund the full eligible charge.',
  },
  resume: {
    label: 'Resume the existing subscription',
    description: 'Restore the existing subscription when possible.',
  },
  new_transition: {
    label: 'Start a new plan transition',
    description: 'Use a new transition to reactivate the subscription.',
  },
  block_new: {
    label: 'Block new usage',
    description: 'Keep current access but prevent additional metered usage.',
  },
  grace_period: {
    label: 'Allow a grace period',
    description: 'Keep access temporarily for the configured grace period.',
  },
  reject_transition: {
    label: 'Reject the plan change',
    description:
      'Prevent the transition while current usage exceeds the new limit.',
  },
  provider_event: {
    label: 'Renew from payment-provider events',
    description:
      'Treat verified payment-provider events as the renewal authority.',
  },
  manual: {
    label: 'Renew manually',
    description: 'Require an explicit renewal action from the application.',
  },
  cancel: {
    label: 'Cancel the subscription',
    description: 'Cancel access when the subscription expires.',
  },
  downgrade_to_default: {
    label: 'Move to the default plan',
    description: 'Downgrade the customer to the configured default plan.',
  },
  revoke: {
    label: 'Revoke access',
    description: 'Remove the related product entitlements.',
  },
  inline: {
    label: 'Embedded checkout',
    description: 'Render checkout inside the integrating application.',
  },
  modal: {
    label: 'Checkout dialog',
    description: 'Open checkout in a dialog over the application.',
  },
  provider_hosted: {
    label: 'Payment-provider page',
    description:
      'Redirect the customer to a page hosted by the payment provider.',
  },
  webhook: {
    label: 'Confirm by webhook',
    description: 'Wait for a verified webhook before confirming payment.',
  },
  poll_and_webhook: {
    label: 'Poll and confirm by webhook',
    description:
      'Poll for progress while retaining the webhook as final authority.',
  },
};

const POLICY_FIELD_HELP: Readonly<Record<string, string>> = {
  'customer.scope': 'Defines what owns subscriptions and usage.',
  'customer.ownership_change':
    'Controls what happens when the billing owner changes.',
  'customer.ownership_transfer':
    'Controls whether billing ownership can be transferred.',
  'customer.ineligible_owner_action':
    'Controls what happens when a new owner is not eligible.',
  'onboarding.initial_plan':
    'Controls how a new customer receives their first plan.',
  'onboarding.ineligible_action':
    'Controls onboarding when the customer is not eligible.',
  'onboarding.deletion_retention':
    'Controls billing data retained after account deletion.',
  'catalogue.access': 'Controls who can read the product catalogue.',
  'catalogue.trial_conversion': 'Controls what happens when a trial ends.',
  'lifecycle.paid_to_paid': 'Controls changes from one paid plan to another.',
  'lifecycle.cancellation_default':
    'Sets the default time at which cancellation takes effect.',
  'lifecycle.immediate_cancel_refund':
    'Sets the refund applied to immediate cancellation.',
  'lifecycle.reactivation':
    'Controls how a cancelled subscription is restored.',
  'lifecycle.over_limit':
    'Controls a downgrade when usage exceeds the destination plan.',
  'lifecycle.renewal': 'Defines what event authorizes subscription renewal.',
  'lifecycle.dunning': 'Controls access while payment recovery is in progress.',
  'lifecycle.expiration': 'Controls what happens when a subscription expires.',
  'lifecycle.refund_entitlements': 'Controls product access after a refund.',
  'lifecycle.chargeback_entitlements':
    'Controls product access after a chargeback.',
  'checkout.presentation': 'Controls where the customer completes checkout.',
  'checkout.confirmation':
    'Controls how Billmesh confirms checkout completion.',
};

const POLICY_PATH_OPTION_COPY: Readonly<
  Record<string, Readonly<{ label: string; description: string }>>
> = {
  'customer.ownership_change:retain': {
    label: 'Keep existing eligibility',
    description: 'Keep the current eligibility result when ownership changes.',
  },
  'customer.ownership_transfer:retain': {
    label: 'Transfer without rechecking',
    description:
      'Transfer billing ownership without running another eligibility check.',
  },
  'onboarding.deletion_retention:retain': {
    label: 'Retain billing history',
    description:
      'Keep the billing history after the customer account is deleted.',
  },
  'lifecycle.dunning:none': {
    label: 'No recovery grace period',
    description: 'Do not extend access while attempting to recover payment.',
  },
  'lifecycle.refund_entitlements:retain': {
    label: 'Keep access',
    description: 'Keep product access after a refund.',
  },
  'lifecycle.chargeback_entitlements:retain': {
    label: 'Keep access',
    description: 'Keep product access after a chargeback.',
  },
};

@Component({
  selector: 'billmesh-product-configuration',
  imports: [
    ReactiveFormsModule,
    TngButtonComponent,
    TngCardComponent,
    TngCheckboxAngularFormsAdapter,
    TngCheckboxComponent,
    TngInputAngularFormsAdapter,
    TngInputComponent,
    TngSelectComponent,
    TngStepperComponent,
    TngTextareaComponent,
    TngTooltipComponent,
    ProductEntitlementsComponent,
  ],
  templateUrl: './product-configuration.component.html',
  styleUrl: '../../catalogue.shared.css',
})
export class ProductConfigurationComponent {
  @ViewChild(ProductEntitlementsComponent)
  private productEntitlements?: ProductEntitlementsComponent;
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly productId = this.route.snapshot.paramMap.get('productId');
  protected readonly editMode = this.productId !== null;
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
        if (this.productId) this.loadProduct(this.productId);
        else this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(catalogueMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || !this.productEntitlements?.valid) {
      this.form.markAllAsTouched();
      this.productEntitlements?.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const request = this.productId
      ? this.catalogue.updateProduct(this.productId, {
          version: this.product()!.version,
          name: value.name.trim(),
          description: value.description.trim(),
          entitlement_schema: this.productEntitlements.value(),
          billing_policy: this.billingPolicy(),
        })
      : this.catalogue.createProduct({
          slug: value.slug.trim(),
          name: value.name.trim(),
          description: value.description.trim(),
          entitlement_schema: this.productEntitlements.value(),
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
      Boolean(this.productEntitlements?.valid) &&
      !this.policyValidationError()
    );
  }

  protected setupSteps() {
    return [
      {
        value: 'details',
        label: 'Product details',
        description: 'Slug, name & description',
        completed:
          this.form.controls.slug.valid &&
          this.form.controls.name.valid &&
          this.form.controls.description.valid,
      },
      {
        value: 'policy',
        label: 'Billing policy',
        description: 'Eligibility, lifecycle & checkout',
        completed:
          this.form.controls.policy.valid && !this.policyValidationError(),
      },
      {
        value: 'entitlements',
        label: 'Entitlements',
        description: 'Product access & limits',
        completed: Boolean(this.productEntitlements?.valid),
      },
    ] as const;
  }

  protected activeSetupStep(): string {
    return (
      this.setupSteps().find((step) => !step.completed)?.value ?? 'entitlements'
    );
  }

  protected updateSelect(control: FormControl<string>, value: unknown): void {
    if (typeof value !== 'string') return;
    control.setValue(value);
    control.markAsDirty();
  }

  protected updateText(
    control: FormControl<string>,
    value: string | null,
  ): void {
    control.setValue(value ?? '');
    control.markAsDirty();
  }

  protected updateNumber(
    control: FormControl<number>,
    value: string | null,
  ): void {
    const parsed = value === null || value.trim() === '' ? NaN : Number(value);
    control.setValue(
      Number.isFinite(parsed) ? parsed : (null as unknown as number),
    );
    control.markAsDirty();
  }

  protected numberInputValue(value: number | null): string {
    return value?.toString() ?? '';
  }

  protected back(): void {
    void this.router.navigateByUrl(
      this.editMode && this.productId
        ? `/app/catalogue/${encodeURIComponent(this.productId)}?burl=${encodeURIComponent(this.returnUrl())}`
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

  protected options(path: string): readonly PolicyOption[] {
    return (this.policyMetadata()?.options[path] ?? []).map((value) => {
      const copy = this.optionCopy(path, value);
      return {
        value,
        label: copy?.label ?? this.humanize(value),
        description:
          copy?.description ?? `Use ${this.humanize(value).toLowerCase()}.`,
      };
    });
  }

  protected policyOptionLabel(value: string, path = ''): string {
    return this.optionCopy(path, value)?.label ?? this.humanize(value);
  }

  protected policyHelp(path: string, value: string): string {
    const field = POLICY_FIELD_HELP[path] ?? 'Controls this billing behavior.';
    const option = this.optionCopy(path, value)?.description;
    return option ? `${field} Current choice: ${option}` : field;
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
      redirectOrigins: (policy.checkout.allowed_redirect_origins ?? []).join(
        '\n',
      ),
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

  private humanize(value: string): string {
    const words = value.replaceAll('_', ' ').trim();
    return words ? `${words[0].toUpperCase()}${words.slice(1)}` : value;
  }

  private optionCopy(
    path: string,
    value: string,
  ): Readonly<{ label: string; description: string }> | undefined {
    return (
      POLICY_PATH_OPTION_COPY[`${path}:${value}`] ?? POLICY_OPTION_COPY[value]
    );
  }

  private returnUrl(): string {
    return catalogueReturnUrl(
      this.route.snapshot.queryParamMap.get('burl'),
      '/app/catalogue',
    );
  }
}
