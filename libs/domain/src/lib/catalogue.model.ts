export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
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
}

export interface ProductUpdate {
  readonly version: number;
  readonly name?: string;
  readonly description?: string;
  readonly active?: boolean;
}

export interface PlanCreate {
  readonly slug: string;
  readonly name: string;
  readonly price_minor: number;
  readonly currency: string;
  readonly included_credits: number;
  readonly entitlements: Readonly<Record<string, unknown>>;
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
  readonly billing_interval?: 'monthly' | 'annual';
  readonly active?: boolean;
}

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}
