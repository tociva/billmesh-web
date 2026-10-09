import {
  DEFAULT_BILLING_POLICY,
  type Plan,
  type Product,
} from '@billmesh/domain';
import {
  buildCatalogueTransfer,
  catalogueTransferPlanCount,
  parseCatalogueTransfer,
} from './catalogue-transfer';

const product: Product = {
  id: 'product-1',
  slug: 'invoice-api',
  name: 'Invoice API',
  description: 'Invoice automation',
  entitlement_schema: { fields: [] },
  entitlement_schema_version: 1,
  billing_policy: DEFAULT_BILLING_POLICY,
  billing_policy_version: 1,
  active: true,
  version: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

const plan: Plan = {
  id: 'plan-1',
  product_id: product.id,
  product: product.slug,
  slug: 'professional',
  plan_family_id: 'professional',
  name: 'Professional',
  description: 'For growing teams',
  price_minor: 9900,
  currency: 'INR',
  included_credits: 100,
  entitlements: {},
  billing_interval: 'monthly',
  billing_model: 'paid',
  selectable: true,
  default_for_product: true,
  checkout_enabled: true,
  effective_from: '2026-01-01T00:00:00Z',
  effective_to: null,
  active: true,
  version: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

describe('catalogue JSON transfer', () => {
  it('exports portable product and plan details without server identity fields', () => {
    const transfer = buildCatalogueTransfer(
      [{ product, plans: [plan] }],
      new Date('2026-10-06T00:00:00Z'),
    );

    expect(transfer.schema_version).toBe(2);
    expect(transfer.exported_at).toBe('2026-10-06T00:00:00.000Z');
    expect(catalogueTransferPlanCount(transfer)).toBe(1);
    expect(transfer.products[0]?.credit_packs).toEqual([]);
    expect(transfer.products[0]).toMatchObject({
      slug: 'invoice-api',
      active: true,
      plans: [
        {
          slug: 'professional',
          description: 'For growing teams',
          billing_model: 'paid',
          default_for_product: true,
        },
      ],
    });
    expect(transfer.products[0]).not.toHaveProperty('id');
    expect(transfer.products[0]).not.toHaveProperty('version');
    expect(transfer.products[0]).not.toHaveProperty('created_at');
    expect(transfer.products[0]?.plans[0]).not.toHaveProperty('id');
    expect(transfer.products[0]?.plans[0]).not.toHaveProperty('version');
    expect(transfer.products[0]?.plans[0]).not.toHaveProperty('created_at');
  });

  it('parses an exported catalogue for re-import', () => {
    const exported = buildCatalogueTransfer([{ product, plans: [plan] }]);
    const parsed = parseCatalogueTransfer(JSON.stringify(exported));

    expect(parsed).toEqual(exported);
  });

  it('normalizes schema v1 files without credit packs', () => {
    const exported = buildCatalogueTransfer([{ product, plans: [plan] }]);
    const legacy = {
      ...exported,
      schema_version: 1,
      products: exported.products.map((item) =>
        Object.fromEntries(
          Object.entries(item).filter(([key]) => key !== 'credit_packs'),
        ),
      ),
    };

    const parsed = parseCatalogueTransfer(JSON.stringify(legacy));

    expect(parsed.schema_version).toBe(1);
    expect(parsed.products[0]?.credit_packs).toEqual([]);
  });

  it('rejects malformed files and duplicate slugs before import starts', () => {
    expect(() => parseCatalogueTransfer('{')).toThrow(
      'The selected file is not valid JSON.',
    );

    const exported = buildCatalogueTransfer([
      { product, plans: [plan] },
      { product, plans: [] },
    ]);
    expect(() => parseCatalogueTransfer(JSON.stringify(exported))).toThrow(
      'Duplicate product slug "invoice-api"',
    );
  });

  it('rejects an archived product that contains active plans', () => {
    const exported = buildCatalogueTransfer([
      { product: { ...product, active: false }, plans: [plan] },
    ]);
    expect(() => parseCatalogueTransfer(JSON.stringify(exported))).toThrow(
      'Archived product "invoice-api" contains an active plan.',
    );
  });
});
