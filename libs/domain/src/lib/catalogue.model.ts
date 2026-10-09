export type EntitlementFieldType =
  'boolean' | 'integer' | 'number' | 'string' | 'select' | 'object' | 'array';

export interface EntitlementOption {
  readonly label: string;
  readonly value: string;
}

export interface EntitlementField {
  readonly key?: string;
  readonly label?: string;
  readonly description?: string;
  readonly type: EntitlementFieldType;
  readonly required?: boolean;
  readonly nullable?: boolean;
  readonly default?: unknown;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly min_length?: number;
  readonly max_length?: number;
  readonly min_items?: number;
  readonly max_items?: number;
  readonly options?: readonly EntitlementOption[];
  readonly fields?: readonly EntitlementField[];
  readonly items?: EntitlementField;
}

export interface EntitlementSchema {
  readonly fields: readonly EntitlementField[];
}

export interface BillingPolicy {
  readonly schema_version: 1;
  readonly customer: {
    readonly scope: 'identity' | 'organization' | 'external_customer';
    readonly free_allowance: number;
    readonly ownership_change: 'retain' | 'reevaluate';
    readonly ownership_transfer:
      'unsupported' | 'retain' | 'preauthorized_recheck';
    readonly ineligible_owner_action: 'reject' | 'require_paid_checkout';
  };
  readonly onboarding: {
    readonly allow_without_subscription: boolean;
    readonly initial_plan: 'automatic_default' | 'explicit_transition';
    readonly ineligible_action:
      'reject' | 'restricted' | 'require_paid_checkout';
    readonly deletion_retention: 'retain' | 'anonymize';
  };
  readonly catalogue: {
    readonly access: 'public' | 'application_token';
    readonly required_before_account: boolean;
    readonly presentation_fields: readonly string[];
    readonly trial_enabled: boolean;
    readonly trial_days: number;
    readonly trial_conversion:
      'expire' | 'require_checkout' | 'automatic_mandate';
  };
  readonly lifecycle: {
    readonly free_to_paid: 'immediate_after_capture';
    readonly paid_to_paid: 'checkout' | 'mandate_proration' | 'period_end';
    readonly downgrade: 'period_end';
    readonly cancellation_default: 'period_end' | 'immediate';
    readonly allow_immediate_cancel: boolean;
    readonly immediate_cancel_refund: 'none' | 'prorated' | 'full';
    readonly allow_cancellation_withdraw: boolean;
    readonly reactivation: 'resume' | 'new_transition';
    readonly over_limit: 'block_new' | 'grace_period' | 'reject_transition';
    readonly renewal: 'provider_event' | 'manual';
    readonly grace_period_days: number;
    readonly dunning: 'none' | 'grace_period';
    readonly expiration: 'cancel' | 'downgrade_to_default';
    readonly refund_entitlements: 'retain' | 'revoke';
    readonly chargeback_entitlements: 'retain' | 'revoke';
  };
  readonly projection: {
    readonly fresh_seconds: number;
    readonly degraded_seconds: number;
    readonly fail_closed_operations: readonly string[];
    readonly refresh_seconds: number;
    readonly reconciliation_seconds: number;
  };
  readonly checkout: {
    readonly allowed_redirect_origins: readonly string[];
    readonly presentation: 'inline' | 'modal' | 'provider_hosted';
    readonly recurring_mandate: boolean;
    readonly confirmation: 'webhook' | 'poll_and_webhook';
  };
}

export interface BillingPolicyMetadata {
  readonly schema_version: number;
  readonly defaults: BillingPolicy;
  readonly options: Readonly<Record<string, readonly string[]>>;
  readonly constraints: Readonly<Record<string, unknown>>;
}

export const DEFAULT_BILLING_POLICY: BillingPolicy = {
  schema_version: 1,
  customer: {
    scope: 'identity',
    free_allowance: 1,
    ownership_change: 'retain',
    ownership_transfer: 'unsupported',
    ineligible_owner_action: 'require_paid_checkout',
  },
  onboarding: {
    allow_without_subscription: true,
    initial_plan: 'explicit_transition',
    ineligible_action: 'require_paid_checkout',
    deletion_retention: 'retain',
  },
  catalogue: {
    access: 'application_token',
    required_before_account: false,
    presentation_fields: [
      'description',
      'price',
      'entitlements',
      'availability',
    ],
    trial_enabled: false,
    trial_days: 0,
    trial_conversion: 'expire',
  },
  lifecycle: {
    free_to_paid: 'immediate_after_capture',
    paid_to_paid: 'checkout',
    downgrade: 'period_end',
    cancellation_default: 'period_end',
    allow_immediate_cancel: true,
    immediate_cancel_refund: 'none',
    allow_cancellation_withdraw: false,
    reactivation: 'new_transition',
    over_limit: 'block_new',
    renewal: 'provider_event',
    grace_period_days: 3,
    dunning: 'grace_period',
    expiration: 'cancel',
    refund_entitlements: 'revoke',
    chargeback_entitlements: 'revoke',
  },
  projection: {
    fresh_seconds: 300,
    degraded_seconds: 0,
    fail_closed_operations: [
      'subscription_change',
      'credit_purchase',
      'limit_increase',
    ],
    refresh_seconds: 60,
    reconciliation_seconds: 300,
  },
  checkout: {
    allowed_redirect_origins: [],
    presentation: 'provider_hosted',
    recurring_mandate: false,
    confirmation: 'webhook',
  },
};

export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly entitlement_schema: EntitlementSchema;
  readonly entitlement_schema_version: number;
  readonly billing_policy: BillingPolicy;
  readonly billing_policy_version: number;
  readonly active: boolean;
  readonly version: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Plan {
  readonly id: string;
  readonly product_id: string;
  readonly product: string;
  readonly slug: string;
  readonly plan_family_id: string;
  readonly name: string;
  readonly description?: string;
  readonly price_minor: number;
  readonly currency: string;
  readonly included_credits: number;
  readonly entitlements: Readonly<Record<string, unknown>>;
  readonly billing_interval: 'monthly' | 'annual';
  readonly billing_model?: 'free' | 'paid';
  readonly selectable?: boolean;
  readonly default_for_product?: boolean;
  readonly checkout_enabled?: boolean;
  readonly effective_from?: string;
  readonly effective_to?: string | null;
  readonly active: boolean;
  readonly version: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ProductCreate {
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
  readonly entitlement_schema?: EntitlementSchema;
  readonly billing_policy?: BillingPolicy;
}

export interface ProductUpdate {
  readonly version: number;
  readonly name?: string;
  readonly description?: string;
  readonly entitlement_schema?: EntitlementSchema;
  readonly billing_policy?: BillingPolicy;
  readonly active?: boolean;
}

export interface PlanCreate {
  readonly slug: string;
  readonly plan_family_id?: string;
  readonly name: string;
  readonly description?: string;
  readonly price_minor: number;
  readonly currency: string;
  readonly included_credits: number;
  readonly entitlements: Readonly<Record<string, unknown>>;
  readonly entitlement_schema_version?: number;
  readonly billing_interval: 'monthly' | 'annual';
  readonly billing_model?: 'free' | 'paid';
  readonly active?: boolean;
  readonly selectable?: boolean;
  readonly default_for_product?: boolean;
  readonly checkout_enabled?: boolean;
  readonly effective_from?: string;
  readonly effective_to?: string | null;
}

export interface PlanUpdate {
  readonly version: number;
  readonly plan_family_id?: string;
  readonly name?: string;
  readonly price_minor?: number;
  readonly currency?: string;
  readonly included_credits?: number;
  readonly entitlements?: Readonly<Record<string, unknown>>;
  readonly entitlement_schema_version?: number;
  readonly billing_interval?: 'monthly' | 'annual';
  readonly active?: boolean;
}

export interface CatalogueTransferCreditPack {
  readonly slug: string;
  readonly name: string;
  readonly credits: number;
  readonly price_minor: number;
  readonly currency: string;
  readonly validity_days: number | null;
  readonly active: boolean;
}

export interface CatalogueTransferPlan {
  readonly slug: string;
  readonly plan_family_id: string;
  readonly name: string;
  readonly description: string;
  readonly price_minor: number;
  readonly currency: string;
  readonly included_credits: number;
  readonly entitlements: Readonly<Record<string, unknown>>;
  readonly billing_interval: 'monthly' | 'annual';
  readonly billing_model: 'free' | 'paid';
  readonly selectable: boolean;
  readonly default_for_product: boolean;
  readonly checkout_enabled: boolean;
  readonly effective_from?: string;
  readonly effective_to?: string | null;
  readonly active: boolean;
}

export interface CatalogueTransferProduct {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly entitlement_schema: EntitlementSchema;
  readonly billing_policy: BillingPolicy;
  readonly active: boolean;
  readonly plans: readonly CatalogueTransferPlan[];
  readonly credit_packs: readonly CatalogueTransferCreditPack[];
}

export interface CatalogueTransfer {
  readonly schema_version: 1 | 2;
  readonly exported_at: string;
  readonly products: readonly CatalogueTransferProduct[];
}

export interface CatalogueTransferIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface CatalogueTransferValidation {
  readonly valid: boolean;
  readonly schema_version: number;
  readonly products: number;
  readonly plans: number;
  readonly credit_packs: number;
  readonly issues: readonly CatalogueTransferIssue[];
}

export interface CatalogueTransferImportResult {
  readonly schema_version: 2;
  readonly products: number;
  readonly plans: number;
  readonly credit_packs: number;
}

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}
