import { TestBed } from '@angular/core/testing';
import type { SubscriptionTransition } from './billing.models';
import type { CheckoutCallbacks } from './razorpay-checkout.service';
import { RazorpayCheckoutService } from './razorpay-checkout.service';

const transition: SubscriptionTransition = {
  id: 'transition-1',
  plan_name: 'Growth',
  status: 'requires_payment',
  payment_id: 'payment-1',
  snapshot_url: '/v1/billing-snapshot',
  checkout: {
    provider: 'razorpay',
    presentation: 'modal',
    checkout_url: null,
    expires_at: null,
    success_url: 'https://ignored.example/success',
    cancel_url: 'https://ignored.example/cancel',
    client_config: {
      public_key: 'rzp_test_public',
      order_id: 'order_server',
      amount_minor: 129900,
      currency: 'INR',
    },
  },
};

const callbacks: CheckoutCallbacks = {
  success: vi.fn(),
  dismiss: vi.fn(),
  failure: vi.fn(),
};

describe('RazorpayCheckoutService', () => {
  let service: RazorpayCheckoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RazorpayCheckoutService);
    document.getElementById('razorpay-checkout-script')?.remove();
    delete (window as Window & { Razorpay?: unknown }).Razorpay;
    vi.clearAllMocks();
  });

  it('loads checkout.js once for concurrent opens', async () => {
    const first = service.open(transition, callbacks);
    const second = service.open(transition, callbacks);
    const scripts = document.querySelectorAll('#razorpay-checkout-script');

    expect(scripts).toHaveLength(1);
    const open = vi.fn();
    (window as Window & { Razorpay?: unknown }).Razorpay = class {
      on(): void {}
      open = open;
    };
    scripts[0]?.dispatchEvent(new Event('load'));
    await Promise.all([first, second]);

    expect(document.querySelectorAll('#razorpay-checkout-script')).toHaveLength(
      1,
    );
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('surfaces script loading failure and permits a later retry', async () => {
    const opening = service.open(transition, callbacks);
    document
      .getElementById('razorpay-checkout-script')
      ?.dispatchEvent(new Event('error'));

    await expect(opening).rejects.toThrow('Unable to load Razorpay Checkout');
    expect(document.getElementById('razorpay-checkout-script')).toBeNull();
  });

  it('maps only server-issued key, order, amount, and currency into payment values', async () => {
    let received: Record<string, unknown> | null = null;
    (window as Window & { Razorpay?: unknown }).Razorpay = class {
      constructor(options: Record<string, unknown>) {
        received = options;
      }
      on(): void {}
      open(): void {}
    };
    const tampered = structuredClone(transition) as SubscriptionTransition & {
      amount?: number;
      key?: string;
      order_id?: string;
    };
    tampered.amount = 1;
    tampered.key = 'attacker-key';
    tampered.order_id = 'attacker-order';

    await service.open(tampered, callbacks);

    expect(received).toMatchObject({
      key: 'rzp_test_public',
      order_id: 'order_server',
      amount: 129900,
      currency: 'INR',
    });
    expect(received).not.toHaveProperty('checkout_url');
    expect(received).not.toHaveProperty('success_url');
    expect(received).not.toHaveProperty('cancel_url');
  });

  it('routes success, failure, and dismissal through explicit callbacks', async () => {
    const captured: {
      options?: Record<string, unknown>;
      failureHandler?: (failure: unknown) => void;
    } = {};
    (window as Window & { Razorpay?: unknown }).Razorpay = class {
      constructor(value: Record<string, unknown>) {
        captured.options = value;
      }
      on(_event: string, handler: (failure: unknown) => void): void {
        captured.failureHandler = handler;
      }
      open(): void {}
    };

    await service.open(transition, callbacks);
    const success = captured.options?.[
      'handler'
    ] as CheckoutCallbacks['success'];
    const modal = captured.options?.['modal'] as { ondismiss: () => void };
    success({
      razorpay_payment_id: 'pay_1',
      razorpay_order_id: 'order_server',
      razorpay_signature: 'a'.repeat(64),
    });
    modal.ondismiss();
    captured.failureHandler?.({ error: { description: 'Card declined' } });

    expect(callbacks.success).toHaveBeenCalledOnce();
    expect(callbacks.dismiss).toHaveBeenCalledOnce();
    expect(callbacks.failure).toHaveBeenCalledWith('Card declined');
  });

  it('rejects checkout modes and incomplete configurations not approved by the server', async () => {
    await expect(
      service.open(
        {
          ...transition,
          checkout: { ...transition.checkout!, presentation: 'inline' },
        },
        callbacks,
      ),
    ).rejects.toThrow('server did not return a usable');
  });
});
