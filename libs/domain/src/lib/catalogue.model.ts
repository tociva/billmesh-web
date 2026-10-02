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

export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly entitlement_schema: EntitlementSchema;
  readonly entitlement_schema_version: number;
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
  readonly name: string;
  readonly price_minor: number;
  readonly currency: string;
  readonly included_credits: number;
  readonly entitlements: Readonly<Record<string, unknown>>;
  readonly billing_interval: 'monthly' | 'annual';
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
}

export interface ProductUpdate {
  readonly version: number;
  readonly name?: string;
  readonly description?: string;
  readonly entitlement_schema?: EntitlementSchema;
  readonly active?: boolean;
}

export interface PlanCreate {
  readonly slug: string;
  readonly name: string;
  readonly price_minor: number;
  readonly currency: string;
  readonly included_credits: number;
  readonly entitlements: Readonly<Record<string, unknown>>;
  readonly entitlement_schema_version?: number;
  readonly billing_interval: 'monthly' | 'annual';
  readonly active?: boolean;
}

export interface PlanUpdate {
  readonly version: number;
  readonly name?: string;
  readonly price_minor?: number;
  readonly currency?: string;
  readonly included_credits?: number;
  readonly entitlements?: Readonly<Record<string, unknown>>;
  readonly entitlement_schema_version?: number;
  readonly billing_interval?: 'monthly' | 'annual';
  readonly active?: boolean;
}

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}
