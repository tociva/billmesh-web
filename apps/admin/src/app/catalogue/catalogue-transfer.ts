import type {
  BillingPolicy,
  CatalogueTransfer,
  CatalogueTransferCreditPack,
  CatalogueTransferDelegationConfiguration,
  CatalogueTransferPlan,
  CatalogueTransferProduct,
  EntitlementSchema,
  Plan,
  Product,
} from '@billmesh/domain';

export type {
  CatalogueTransfer,
  CatalogueTransferCreditPack,
  CatalogueTransferDelegationConfiguration,
  CatalogueTransferPlan,
  CatalogueTransferProduct,
} from '@billmesh/domain';

export const CATALOGUE_TRANSFER_SCHEMA_VERSION = 3 as const;

export interface CatalogueProductWithPlans {
  readonly product: Product;
  readonly plans: readonly Plan[];
  readonly creditPacks?: readonly CatalogueTransferCreditPack[];
  readonly delegatedAccess?: readonly CatalogueTransferDelegationConfiguration[];
}

export function buildCatalogueTransfer(
  records: readonly CatalogueProductWithPlans[],
  exportedAt = new Date(),
): CatalogueTransfer {
  return {
    schema_version: CATALOGUE_TRANSFER_SCHEMA_VERSION,
    exported_at: exportedAt.toISOString(),
    products: records.map(
      ({ product, plans, creditPacks = [], delegatedAccess = [] }) => ({
        slug: product.slug,
        name: product.name,
        description: product.description,
        entitlement_schema: product.entitlement_schema,
        billing_policy: product.billing_policy,
        active: product.active,
        credit_packs: creditPacks,
        delegated_access: delegatedAccess,
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
      }),
    ),
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
  if (
    root['schema_version'] !== 1 &&
    root['schema_version'] !== 2 &&
    root['schema_version'] !== CATALOGUE_TRANSFER_SCHEMA_VERSION
  ) {
    throw new Error(
      `Unsupported catalogue schema version. Expected 1, 2, or ${CATALOGUE_TRANSFER_SCHEMA_VERSION}.`,
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
      root['schema_version'] === CATALOGUE_TRANSFER_SCHEMA_VERSION &&
      !Array.isArray(product['credit_packs'])
    ) {
      throw new Error(`${path}.credit_packs must be an array.`);
    }
    if (
      product['credit_packs'] !== undefined &&
      !Array.isArray(product['credit_packs'])
    ) {
      throw new Error(`${path}.credit_packs must be an array.`);
    }
    if (
      root['schema_version'] === CATALOGUE_TRANSFER_SCHEMA_VERSION &&
      !Array.isArray(product['delegated_access'])
    ) {
      throw new Error(`${path}.delegated_access must be an array.`);
    }
    if (
      product['delegated_access'] !== undefined &&
      !Array.isArray(product['delegated_access'])
    ) {
      throw new Error(`${path}.delegated_access must be an array.`);
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

    const delegationEnvironments = new Set<string>();
    const delegatedAccess = (product['delegated_access'] ?? []).map(
      (configurationValue, configurationIndex) => {
        const configurationPath = `${path}.delegated_access[${configurationIndex}]`;
        const configuration = record(configurationValue, configurationPath);
        const environment = requiredString(
          configuration,
          'environment',
          configurationPath,
        );
        if (!/^[a-z][a-z0-9-]{0,62}$/.test(environment)) {
          throw new Error(
            `${configurationPath}.environment must be a lowercase, hyphenated identifier.`,
          );
        }
        if (delegationEnvironments.has(environment)) {
          throw new Error(
            `Duplicate delegated-access environment "${environment}" for product "${slug}".`,
          );
        }
        delegationEnvironments.add(environment);

        const enabled = booleanValue(
          configuration,
          'enabled',
          configurationPath,
        );
        if (!active && enabled) {
          throw new Error(
            `${configurationPath} cannot be enabled for an archived product.`,
          );
        }
        const authorizerClientId = requiredString(
          configuration,
          'authorizer_client_id',
          configurationPath,
        );
        if (!Array.isArray(configuration['actors'])) {
          throw new Error(`${configurationPath}.actors must be an array.`);
        }
        const actorClientIds = new Set<string>();
        const actors = configuration['actors'].map((actorValue, actorIndex) => {
          const actorPath = `${configurationPath}.actors[${actorIndex}]`;
          const actor = record(actorValue, actorPath);
          const clientId = requiredString(actor, 'client_id', actorPath);
          if (clientId === authorizerClientId) {
            throw new Error(
              `${actorPath}.client_id cannot match the authorizer client ID.`,
            );
          }
          if (actorClientIds.has(clientId)) {
            throw new Error(
              `Duplicate actor client ID "${clientId}" in ${configurationPath}.`,
            );
          }
          actorClientIds.add(clientId);
          const profile = requiredString(actor, 'profile', actorPath);
          const actorType = requiredString(actor, 'actor_type', actorPath);
          if (
            (profile === 'billing' &&
              actorType !== 'user' &&
              actorType !== 'service') ||
            ((profile === 'catalogue' || profile === 'runtime') &&
              actorType !== 'service') ||
            (profile !== 'catalogue' &&
              profile !== 'billing' &&
              profile !== 'runtime')
          ) {
            throw new Error(`${actorPath} has an invalid profile/actor type.`);
          }
          return {
            client_id: clientId,
            profile: profile as 'catalogue' | 'billing' | 'runtime',
            actor_type: actorType as 'user' | 'service',
            enabled: booleanValue(actor, 'enabled', actorPath),
          };
        });
        if (enabled && !actors.some((actor) => actor.enabled)) {
          throw new Error(
            `${configurationPath} requires at least one enabled actor.`,
          );
        }
        return {
          environment,
          enabled,
          authorizer_client_id: authorizerClientId,
          actors,
        } satisfies CatalogueTransferDelegationConfiguration;
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
      delegated_access: delegatedAccess,
    } satisfies CatalogueTransferProduct;
  });

  return {
    schema_version: root['schema_version'] as 1 | 2 | 3,
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

export function catalogueTransferDelegatedAccessCount(
  transfer: CatalogueTransfer,
): number {
  return transfer.products.reduce(
    (total, product) => total + product.delegated_access.length,
    0,
  );
}

export function catalogueTransferActorCount(
  transfer: CatalogueTransfer,
): number {
  return transfer.products.reduce(
    (productTotal, product) =>
      productTotal +
      product.delegated_access.reduce(
        (configurationTotal, configuration) =>
          configurationTotal + configuration.actors.length,
        0,
      ),
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
