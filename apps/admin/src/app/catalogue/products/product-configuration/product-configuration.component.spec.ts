import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import {
  DEFAULT_BILLING_POLICY,
  type BillingPolicyMetadata,
  type Product,
} from '@billmesh/domain';
import { of } from 'rxjs';
import { ProductConfigurationComponent } from './product-configuration.component';

const metadata: BillingPolicyMetadata = {
  schema_version: 1,
  defaults: DEFAULT_BILLING_POLICY,
  constraints: {},
  options: {
    'customer.scope': ['identity', 'organization', 'external_customer'],
    'customer.ownership_change': ['retain', 'reevaluate'],
    'customer.ownership_transfer': [
      'unsupported',
      'retain',
      'preauthorized_recheck',
    ],
    'customer.ineligible_owner_action': ['reject', 'require_paid_checkout'],
    'onboarding.initial_plan': ['automatic_default', 'explicit_transition'],
    'onboarding.ineligible_action': [
      'reject',
      'restricted',
      'require_paid_checkout',
    ],
    'onboarding.deletion_retention': ['retain', 'anonymize'],
    'catalogue.access': ['public', 'application_token'],
    'catalogue.trial_conversion': [
      'expire',
      'require_checkout',
      'automatic_mandate',
    ],
    'lifecycle.paid_to_paid': ['checkout', 'mandate_proration', 'period_end'],
    'lifecycle.cancellation_default': ['period_end', 'immediate'],
    'lifecycle.immediate_cancel_refund': ['none', 'prorated', 'full'],
    'lifecycle.reactivation': ['resume', 'new_transition'],
    'lifecycle.over_limit': ['block_new', 'grace_period', 'reject_transition'],
    'lifecycle.renewal': ['provider_event', 'manual'],
    'lifecycle.dunning': ['none', 'grace_period'],
    'lifecycle.expiration': ['cancel', 'downgrade_to_default'],
    'lifecycle.refund_entitlements': ['retain', 'revoke'],
    'lifecycle.chargeback_entitlements': ['retain', 'revoke'],
    'checkout.presentation': ['inline', 'modal', 'provider_hosted'],
    'checkout.confirmation': ['webhook', 'poll_and_webhook'],
  },
};

const product: Product = {
  id: 'product-1',
  slug: 'invoice-api',
  name: 'Invoice API',
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

describe('ProductConfigurationComponent billing policy', () => {
  let fixture: ComponentFixture<ProductConfigurationComponent>;
  const service = {
    getProductPolicyMetadata: vi.fn(() => of(metadata)),
    createProduct: vi.fn(() => of(product)),
    updateProduct: vi.fn(() => of(product)),
    getProduct: vi.fn(() => of(product)),
  };

  beforeEach(async () => {
    Object.values(service).forEach((mock) => mock.mockClear());
    await TestBed.configureTestingModule({
      imports: [ProductConfigurationComponent],
      providers: [
        provideRouter([]),
        { provide: CatalogueAdminService, useValue: service },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ProductConfigurationComponent);
    fixture.detectChanges();
  });

  it('loads server defaults and submits a complete typed billing policy', () => {
    const setInput = (selector: string, value: string) => {
      const input = fixture.nativeElement.querySelector(
        selector,
      ) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    setInput('[aria-label="Product slug"]', 'invoice-api');
    setInput('[aria-label="Product name"]', 'Invoice API');
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(service.getProductPolicyMetadata).toHaveBeenCalledOnce();
    expect(service.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'invoice-api',
        billing_policy: DEFAULT_BILLING_POLICY,
      }),
    );
  });

  it('shows human-readable policy choices with contextual help', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Require an explicit plan selection');
    expect(text).toContain('Payment-provider page');
    expect(text).not.toContain('explicit_transition');
    expect(text).not.toContain('provider_hosted');

    const helpTrigger = fixture.nativeElement.querySelector(
      'button[aria-label="Help for initial plan"]',
    ) as HTMLButtonElement | null;
    expect(helpTrigger).not.toBeNull();
    expect(helpTrigger?.parentElement?.textContent).toContain(
      'Controls how a new customer receives their first plan.',
    );
    expect(helpTrigger?.parentElement?.textContent).toContain(
      'Wait for the application to request a specific plan transition.',
    );
  });
});
