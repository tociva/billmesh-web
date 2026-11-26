import { TestBed } from '@angular/core/testing';
import { BillingApiService } from './billing-api.service';
import { BillingCheckoutComponent } from './billing-checkout.component';
import type {
  BillingSnapshot,
  RazorpayCheckoutResult,
  SubscriptionTransition,
} from './billing.models';
import {
  CHECKOUT_POLL_DELAYS,
  CHECKOUT_SLEEP,
  CheckoutFlowService,
} from './checkout-flow.service';

const pendingSnapshot: BillingSnapshot = {
  revision: 8,
  subscription: null,
  pending_transition: { id: 'transition-e2e', status: 'requires_payment' },
};

const settledSnapshot: BillingSnapshot = {
  revision: 9,
  subscription: { status: 'active', effective_plan: { name: 'Growth' } },
  pending_transition: null,
};

const pendingTransition: SubscriptionTransition = {
  id: 'transition-e2e',
  plan_name: 'Growth',
  status: 'requires_payment',
  payment_id: 'payment-e2e',
  snapshot_url: '/v1/billing-snapshot',
  checkout: {
    provider: 'razorpay',
    presentation: 'modal',
    checkout_url: null,
    expires_at: null,
    success_url: null,
    cancel_url: null,
    client_config: {
      public_key: 'rzp_test_browser_fixture',
      order_id: 'order_server_e2e',
      amount_minor: 129900,
      currency: 'INR',
    },
  },
};

describe('Razorpay checkout journey', () => {
  afterEach(() => {
    delete (window as Window & { Razorpay?: unknown }).Razorpay;
  });

  it('grants visible paid state only after server confirmation and snapshot refresh', async () => {
    let checkoutOptions: Record<string, unknown> | null = null;
    (window as Window & { Razorpay?: unknown }).Razorpay = class {
      constructor(options: Record<string, unknown>) {
        checkoutOptions = options;
      }
      on(): void {}
      open(): void {}
    };

    const api = {
      getSnapshot: vi
        .fn()
        .mockResolvedValueOnce(pendingSnapshot)
        .mockResolvedValue(settledSnapshot),
      getTransition: vi
        .fn()
        .mockResolvedValueOnce(pendingTransition)
        .mockResolvedValue({ ...pendingTransition, status: 'completed' }),
      confirmCheckout: vi.fn().mockResolvedValue({ status: 'captured' }),
    };
    await TestBed.configureTestingModule({
      imports: [BillingCheckoutComponent],
      providers: [
        CheckoutFlowService,
        { provide: BillingApiService, useValue: api },
        { provide: CHECKOUT_POLL_DELAYS, useValue: [0] },
        {
          provide: CHECKOUT_SLEEP,
          useValue: vi.fn().mockResolvedValue(undefined),
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BillingCheckoutComponent);
    const flow = TestBed.inject(CheckoutFlowService);
    fixture.detectChanges();
    await vi.waitFor(() => expect(flow.state()).toBe('ready'));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    expect(button.textContent).toContain('Pay securely with Razorpay');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Payment confirmed',
    );
    button.click();
    await vi.waitFor(() => expect(checkoutOptions).not.toBeNull());

    expect(checkoutOptions).toMatchObject({
      key: 'rzp_test_browser_fixture',
      order_id: 'order_server_e2e',
      amount: 129900,
      currency: 'INR',
    });
    const result: RazorpayCheckoutResult = {
      razorpay_payment_id: 'pay_provider_e2e',
      razorpay_order_id: 'order_server_e2e',
      razorpay_signature: 'a'.repeat(64),
    };
    const options = checkoutOptions as unknown as {
      handler: (value: RazorpayCheckoutResult) => void;
    };
    options.handler(result);

    await vi.waitFor(() => expect(flow.state()).toBe('completed'));
    fixture.detectChanges();
    expect(api.confirmCheckout).toHaveBeenCalledOnce();
    expect(api.confirmCheckout).toHaveBeenCalledWith('payment-e2e', result);
    expect(flow.snapshot()).toEqual(settledSnapshot);
    expect(fixture.nativeElement.textContent).toContain('Payment confirmed');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
