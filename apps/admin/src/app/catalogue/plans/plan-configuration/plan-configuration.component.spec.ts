import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import {
  DEFAULT_BILLING_POLICY,
  type Plan,
  type Product,
} from '@billmesh/domain';
import { of } from 'rxjs';
import { PlanConfigurationComponent } from './plan-configuration.component';

const product: Product = {
  id: 'product-1',
  slug: 'daybook',
  name: 'Daybook',
  description: '',
  entitlement_schema: { fields: [] },
  entitlement_schema_version: 1,
  billing_policy: DEFAULT_BILLING_POLICY,
  billing_policy_version: 1,
  active: true,
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const plan: Plan = {
  id: 'plan-1',
  product_id: product.id,
  product: product.slug,
  slug: 'basic-monthly',
  plan_family_id: 'basic',
  name: 'Basic monthly',
  price_minor: 9900,
  currency: 'INR',
  included_credits: 100,
  entitlements: {},
  billing_interval: 'monthly',
  active: true,
  version: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('PlanConfigurationComponent', () => {
  const service = {
    getProduct: vi.fn(() => of(product)),
    getPlan: vi.fn(() => of(plan)),
    createPlan: vi.fn(() => of(plan)),
    updatePlan: vi.fn(() => of(plan)),
  };

  beforeEach(() => {
    Object.values(service).forEach((mock) => mock.mockClear());
  });

  async function createFixture(
    planId?: string,
  ): Promise<ComponentFixture<PlanConfigurationComponent>> {
    await TestBed.configureTestingModule({
      imports: [PlanConfigurationComponent],
      providers: [
        provideRouter([]),
        { provide: CatalogueAdminService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({
                productId: product.id,
                ...(planId ? { planId } : {}),
              }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PlanConfigurationComponent);
    fixture.detectChanges();
    return fixture;
  }

  function setInput(
    fixture: ComponentFixture<PlanConfigurationComponent>,
    selector: string,
    value: string,
  ): void {
    const input = fixture.nativeElement.querySelector(
      selector,
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('submits the selected plan family when creating an interval variant', async () => {
    const fixture = await createFixture();
    setInput(fixture, '[aria-label="Plan slug"]', 'basic-annual');
    setInput(fixture, '[aria-label="Plan family ID"]', 'basic');
    setInput(fixture, '[aria-label="Plan name"]', 'Basic annual');
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(service.createPlan).toHaveBeenCalledWith(
      product.id,
      expect.objectContaining({
        slug: 'basic-annual',
        plan_family_id: 'basic',
      }),
    );
  });

  it('loads and preserves the plan family when editing', async () => {
    const fixture = await createFixture(plan.id);
    const familyInput = fixture.nativeElement.querySelector(
      '[aria-label="Plan family ID"]',
    ) as HTMLInputElement;
    expect(familyInput.value).toBe('basic');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(service.updatePlan).toHaveBeenCalledWith(
      plan.id,
      expect.objectContaining({
        plan_family_id: 'basic',
        version: plan.version,
      }),
    );
  });

  it('rejects a plan family that does not use the API slug format', async () => {
    const fixture = await createFixture();
    setInput(fixture, '[aria-label="Plan slug"]', 'basic-annual');
    setInput(fixture, '[aria-label="Plan family ID"]', 'Basic Annual');
    setInput(fixture, '[aria-label="Plan name"]', 'Basic annual');
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(service.createPlan).not.toHaveBeenCalled();
  });
});
