import type {
  BillingPolicy,
  CatalogueTransfer,
  CatalogueTransferCreditPack,
  CatalogueTransferPlan,
  CatalogueTransferProduct,
  EntitlementSchema,
  Plan,
  Product,
} from '@billmesh/domain';

export type {
  CatalogueTransfer,
  CatalogueTransferCreditPack,
  CatalogueTransferPlan,
  CatalogueTransferProduct,
} from '@billmesh/domain';

export const CATALOGUE_TRANSFER_SCHEMA_VERSION = 2 as const;

export interface CatalogueProductWithPlans {
  readonly product: Product;
  readonly plans: readonly Plan[];
  readonly creditPacks?: readonly CatalogueTransferCreditPack[];
}

export function buildCatalogueTransfer(
  records: readonly CatalogueProductWithPlans[],
  exportedAt = new Date(),
): CatalogueTransfer {
  return {
    schema_version: CATALOGUE_TRANSFER_SCHEMA_VERSION,
    exported_at: exportedAt.toISOString(),
    products: records.map(({ product, plans, creditPacks = [] }) => ({
      slug: product.slug,
      name: product.name,
      description: product.description,
      entitlement_schema: product.entitlement_schema,
      billing_policy: product.billing_policy,
      active: product.active,
      credit_packs: creditPacks,
      plans: plans.map((plan) => {
        const selectable = plan.selectable ?? true;
        return {
          slug: plan.slug,
          plan_family_id: plan.plan_family_id,
          name: plan.name,
          description: plan.description ?? '',
          price_minor: plan.price_minor,
          currency: plan.currency,
          included_credits: plan.included_credits,
          entitlements: plan.entitlements,
          billing_interval: plan.billing_interval,
          billing_model:
            plan.billing_model ?? (plan.price_minor === 0 ? 'free' : 'paid'),
          selectable,
          default_for_product: plan.default_for_product ?? false,
          checkout_enabled:
            plan.checkout_enabled ?? (plan.active && selectable),
          ...(plan.effective_from
            ? { effective_from: plan.effective_from }
            : {}),
          ...(plan.effective_to !== undefined
            ? { effective_to: plan.effective_to }
            : {}),
          active: plan.active,
        };
      }),
    })),
  };
}

export function parseCatalogueTransfer(text: string): CatalogueTransfer {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  const root = record(value, 'The catalogue file');
  if (root['schema_version'] !== 1 && root['schema_version'] !== 2) {
    throw new Error(
      `Unsupported catalogue schema version. Expected 1 or ${CATALOGUE_TRANSFER_SCHEMA_VERSION}.`,
    );
  }
  if (!Array.isArray(root['products'])) {
    throw new Error('The catalogue file must contain a products array.');
  }

  const productSlugs = new Set<string>();
  const products = root['products'].map((item, index) => {
    const path = `products[${index}]`;
    const product = record(item, path);
    const slug = requiredString(product, 'slug', path);
    if (productSlugs.has(slug)) {
      throw new Error(
        `Duplicate product slug "${slug}" in the catalogue file.`,
      );
    }
    productSlugs.add(slug);

    const entitlementSchema = record(
      product['entitlement_schema'],
      `${path}.entitlement_schema`,
    );
    if (!Array.isArray(entitlementSchema['fields'])) {
      throw new Error(`${path}.entitlement_schema.fields must be an array.`);
    }
    const billingPolicy = record(
      product['billing_policy'],
      `${path}.billing_policy`,
    );
    if (!Array.isArray(product['plans'])) {
      throw new Error(`${path}.plans must be an array.`);
    }
    if (
      product['credit_packs'] !== undefined &&
      !Array.isArray(product['credit_packs'])
    ) {
      throw new Error(`${path}.credit_packs must be an array.`);
    }

    const planSlugs = new Set<string>();
    let defaultPlanCount = 0;
    const plans = product['plans'].map((planValue, planIndex) => {
      const planPath = `${path}.plans[${planIndex}]`;
      const plan = record(planValue, planPath);
      const planSlug = requiredString(plan, 'slug', planPath);
      if (planSlugs.has(planSlug)) {
        throw new Error(
          `Duplicate plan slug "${planSlug}" for product "${slug}".`,
        );
      }
      planSlugs.add(planSlug);

      const priceMinor = nonNegativeInteger(plan, 'price_minor', planPath);
      const active = booleanValue(plan, 'active', planPath);
      const selectable = booleanValue(plan, 'selectable', planPath);
      const defaultForProduct = booleanValue(
        plan,
        'default_for_product',
        planPath,
      );
      const checkoutEnabled = booleanValue(plan, 'checkout_enabled', planPath);
      if (defaultForProduct) defaultPlanCount += 1;
      if (defaultForProduct && (!active || !selectable)) {
        throw new Error(`${planPath} has an invalid default plan state.`);
      }
      if (checkoutEnabled && (!active || !selectable)) {
        throw new Error(`${planPath} has an invalid checkout state.`);
      }

      const billingInterval = requiredString(
        plan,
        'billing_interval',
        planPath,
      );
      if (billingInterval !== 'monthly' && billingInterval !== 'annual') {
        throw new Error(
          `${planPath}.billing_interval must be "monthly" or "annual".`,
        );
      }
      const billingModel = requiredString(plan, 'billing_model', planPath);
      if (billingModel !== 'free' && billingModel !== 'paid') {
        throw new Error(`${planPath}.billing_model must be "free" or "paid".`);
      }
      if (
        (billingModel === 'free' && priceMinor !== 0) ||
        (billingModel === 'paid' && priceMinor === 0)
      ) {
        throw new Error(`${planPath} has an invalid billing model and price.`);
      }

      return {
        slug: planSlug,
        plan_family_id: requiredString(plan, 'plan_family_id', planPath),
        name: requiredString(plan, 'name', planPath),
        description: optionalString(plan, 'description', planPath) ?? '',
        price_minor: priceMinor,
        currency: requiredString(plan, 'currency', planPath),
        included_credits: nonNegativeInteger(
          plan,
          'included_credits',
          planPath,
        ),
        entitlements: record(plan['entitlements'], `${planPath}.entitlements`),
        billing_interval: billingInterval,
        billing_model: billingModel,
        selectable,
        default_for_product: defaultForProduct,
        checkout_enabled: checkoutEnabled,
        ...(optionalString(plan, 'effective_from', planPath)
          ? { effective_from: String(plan['effective_from']) }
          : {}),
        ...(plan['effective_to'] === null
          ? { effective_to: null }
          : optionalString(plan, 'effective_to', planPath)
            ? { effective_to: String(plan['effective_to']) }
            : {}),
        active,
      } satisfies CatalogueTransferPlan;
    });
    if (defaultPlanCount > 1) {
      throw new Error(`Product "${slug}" contains more than one default plan.`);
    }

    const active = booleanValue(product, 'active', path);
    if (!active && plans.some((plan) => plan.active)) {
      throw new Error(`Archived product "${slug}" contains an active plan.`);
    }

    const creditPackSlugs = new Set<string>();
    const creditPacks = (product['credit_packs'] ?? []).map(
      (packValue, packIndex) => {
        const packPath = `${path}.credit_packs[${packIndex}]`;
        const pack = record(packValue, packPath);
        const packSlug = requiredString(pack, 'slug', packPath);
        if (creditPackSlugs.has(packSlug)) {
          throw new Error(
            `Duplicate credit pack slug "${packSlug}" for product "${slug}".`,
          );
        }
        creditPackSlugs.add(packSlug);
        const validityDays = pack['validity_days'];
        if (
          validityDays !== null &&
          (typeof validityDays !== 'number' ||
            !Number.isInteger(validityDays) ||
            validityDays <= 0)
        ) {
          throw new Error(
            `${packPath}.validity_days must be null or a positive integer.`,
          );
        }
        return {
          slug: packSlug,
          name: requiredString(pack, 'name', packPath),
          credits: positiveInteger(pack, 'credits', packPath),
          price_minor: nonNegativeInteger(pack, 'price_minor', packPath),
          currency: requiredString(pack, 'currency', packPath),
          validity_days: validityDays,
          active: booleanValue(pack, 'active', packPath),
        } satisfies CatalogueTransferCreditPack;
      },
    );

    return {
      slug,
      name: requiredString(product, 'name', path),
      description: optionalString(product, 'description', path) ?? '',
      entitlement_schema: entitlementSchema as unknown as EntitlementSchema,
      billing_policy: billingPolicy as unknown as BillingPolicy,
      active,
      plans,
      credit_packs: creditPacks,
    } satisfies CatalogueTransferProduct;
  });

  return {
    schema_version: root['schema_version'] as 1 | 2,
    exported_at:
      optionalString(root, 'exported_at', 'The catalogue file') ??
      new Date(0).toISOString(),
    products,
  };
}

export function catalogueTransferPlanCount(
  transfer: CatalogueTransfer,
): number {
  return transfer.products.reduce(
    (total, product) => total + product.plans.length,
    0,
  );
}

export function catalogueTransferCreditPackCount(
  transfer: CatalogueTransfer,
): number {
  return transfer.products.reduce(
    (total, product) => total + product.credit_packs.length,
    0,
  );
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requiredString(
  value: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const result = optionalString(value, key, path);
  if (!result) throw new Error(`${path}.${key} is required.`);
  return result;
}

function optionalString(
  value: Record<string, unknown>,
  key: string,
  path: string,
): string | undefined {
  const result = value[key];
  if (result === undefined) return undefined;
  if (typeof result !== 'string') {
    throw new Error(`${path}.${key} must be a string.`);
  }
  return result.trim();
}

function booleanValue(
  value: Record<string, unknown>,
  key: string,
  path: string,
): boolean {
  const result = value[key];
  if (typeof result !== 'boolean') {
    throw new Error(`${path}.${key} must be a boolean.`);
  }
  return result;
}

function nonNegativeInteger(
  value: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const result = value[key];
  if (!Number.isSafeInteger(result) || Number(result) < 0) {
    throw new Error(`${path}.${key} must be a non-negative integer.`);
  }
  return Number(result);
}

function positiveInteger(
  value: Record<string, unknown>,
  key: string,
  path: string,
): number {
  const result = nonNegativeInteger(value, key, path);
  if (result === 0) {
    throw new Error(`${path}.${key} must be a positive integer.`);
  }
  return result;
}
