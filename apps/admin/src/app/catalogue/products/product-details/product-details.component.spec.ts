import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import {
  DEFAULT_BILLING_POLICY,
  type Product,
  type ProductDelegationConfiguration,
} from '@billmesh/domain';
import { of } from 'rxjs';
import { ProductDetailsComponent } from './product-details.component';

const product: Product = {
  id: 'product-1',
  slug: 'daybook',
  name: 'Daybook',
  description: 'Billing catalogue',
  entitlement_schema: {
    fields: [
      {
        key: 'branches',
        label: 'Maximum branches',
        description: 'The branch limit for an organization.',
        type: 'integer',
        required: true,
        default: 1,
        minimum: 0,
        maximum: 10,
      },
      {
        key: 'workflow_execution',
        label: 'Workflow execution',
        type: 'boolean',
        required: false,
        default: true,
      },
    ],
  },
  entitlement_schema_version: 1,
  billing_policy: DEFAULT_BILLING_POLICY,
  billing_policy_version: 1,
  active: true,
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const delegatedAccess: readonly ProductDelegationConfiguration[] = [
  {
    product_id: product.id,
    environment: 'development',
    authorizer_client_id: 'daybook-billmesh-authorizer-dev',
    enabled: true,
    version: 1,
    actors: [
      {
        client_id: 'daybook-billmesh-user-dev',
        profile: 'billing',
        actor_type: 'user',
        enabled: true,
      },
      {
        client_id: 'daybook-billmesh-runtime-dev',
        profile: 'runtime',
        actor_type: 'service',
        enabled: false,
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

describe('ProductDetailsComponent', () => {
  let fixture: ComponentFixture<ProductDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetailsComponent],
      providers: [
        {
          provide: CatalogueAdminService,
          useValue: {
            getProduct: vi.fn(() => of(product)),
            listProductDelegatedAccess: vi.fn(() => of(delegatedAccess)),
            listPlans: vi.fn(() =>
              of({ items: [], total: 0, limit: 10, offset: 0 }),
            ),
            updateProduct: vi.fn(() => of(product)),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => 'product-1' },
              queryParamMap: { get: () => null },
            },
            queryParamMap: of({ get: () => null }),
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/app/catalogue/product-1',
            navigate: vi.fn(),
            navigateByUrl: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailsComponent);
    fixture.detectChanges();
  });

  it('renders entitlement schema fields one per tng-table row', () => {
    const table = fixture.nativeElement.querySelector(
      '[aria-labelledby="entitlement-schema-heading"] tng-table',
    ) as HTMLElement | null;
    expect(table).not.toBeNull();
    expect(table?.textContent).toContain('Entitlement');
    expect(table?.textContent).toContain('Maximum branches');
    expect(table?.textContent).toContain('branches');
    expect(table?.textContent).toContain('Required');
    expect(table?.textContent).toContain('min 0 · max 10');
    expect(table?.textContent).toContain('Workflow execution');
    expect(table?.textContent).toContain('Optional');
  });

  it('renders delegated access metadata and actor clients', () => {
    const section = fixture.nativeElement.querySelector(
      '[aria-labelledby="delegated-access-heading"]',
    ) as HTMLElement | null;

    expect(section).not.toBeNull();
    expect(section?.textContent).toContain('Development');
    expect(section?.textContent).toContain('daybook-billmesh-authorizer-dev');
    expect(section?.textContent).toContain('daybook-billmesh-user-dev');
    expect(section?.textContent).toContain('billmesh.billing');
    expect(section?.textContent).toContain('daybook-billmesh-runtime-dev');
    expect(section?.textContent).toContain('Disabled');
  });
});
