import { TestBed } from '@angular/core/testing';
import { BillingApiService } from './billing-api.service';
import type {
  BillingSnapshot,
  RazorpayCheckoutResult,
  SubscriptionTransition,
  TransitionStatus,
} from './billing.models';
import {
  CHECKOUT_POLL_DELAYS,
  CHECKOUT_SLEEP,
  CheckoutFlowService,
} from './checkout-flow.service';
import type { CheckoutCallbacks } from './razorpay-checkout.service';
import { RazorpayCheckoutService } from './razorpay-checkout.service';

const pendingSnapshot: BillingSnapshot = {
  revision: 4,
  subscription: null,
  pending_transition: { id: 'transition-1', status: 'requires_payment' },
};
const settledSnapshot: BillingSnapshot = {
  revision: 5,
  subscription: { status: 'active', effective_plan: { name: 'Growth' } },
  pending_transition: null,
};
const pendingTransition: SubscriptionTransition = {
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
    success_url: null,
    cancel_url: null,
    client_config: {
      public_key: 'rzp_test_public',
      order_id: 'order_server',
      amount_minor: 129900,
      currency: 'INR',
    },
  },
};
const checkoutResult: RazorpayCheckoutResult = {
  razorpay_payment_id: 'pay_1',
  razorpay_order_id: 'order_server',
  razorpay_signature: 'a'.repeat(64),
};

describe('CheckoutFlowService', () => {
  let service: CheckoutFlowService;
  let api: {
    getSnapshot: ReturnType<typeof vi.fn>;
    getTransition: ReturnType<typeof vi.fn>;
    confirmCheckout: ReturnType<typeof vi.fn>;
  };
  let gateway: { open: ReturnType<typeof vi.fn> };
  let callbacks: CheckoutCallbacks | null;

  beforeEach(() => {
    callbacks = null;
    api = {
      getSnapshot: vi.fn().mockResolvedValue(pendingSnapshot),
      getTransition: vi.fn().mockResolvedValue(pendingTransition),
      confirmCheckout: vi.fn().mockResolvedValue({ status: 'captured' }),
    };
    gateway = {
      open: vi
        .fn()
        .mockImplementation(
          async (
            _transition: SubscriptionTransition,
            value: CheckoutCallbacks,
          ) => {
            callbacks = value;
          },
        ),
    };
    TestBed.configureTestingModule({
      providers: [
        CheckoutFlowService,
        { provide: BillingApiService, useValue: api },
        { provide: RazorpayCheckoutService, useValue: gateway },
        { provide: CHECKOUT_POLL_DELAYS, useValue: [0, 0] },
        {
          provide: CHECKOUT_SLEEP,
          useValue: vi.fn().mockResolvedValue(undefined),
        },
      ],
    });
    service = TestBed.inject(CheckoutFlowService);
  });

  it('recovers an abandoned pending checkout from the authoritative snapshot', async () => {
    await service.initialize();

    expect(service.state()).toBe('ready');
    expect(service.transition()?.id).toBe('transition-1');
    expect(api.getSnapshot).toHaveBeenCalledOnce();
    expect(api.getTransition).toHaveBeenCalledWith('transition-1');
  });

  it('does not let redirect or query state enable paid access', async () => {
    window.history.replaceState({}, '', '/app?paid=true&status=completed');
    await service.initialize();

    expect(service.snapshot()).toEqual(pendingSnapshot);
    expect(service.state()).toBe('ready');
  });

  it('moves immediately to processing, confirms once, and refreshes the snapshot', async () => {
    api.getSnapshot
      .mockResolvedValueOnce(pendingSnapshot)
      .mockResolvedValue(settledSnapshot);
    api.getTransition
      .mockResolvedValueOnce(pendingTransition)
      .mockResolvedValueOnce({ ...pendingTransition, status: 'completed' });
    await service.initialize();
    await service.pay();

    callbacks?.success(checkoutResult);
    callbacks?.success(checkoutResult);
    expect(service.state()).toBe('processing');
    await vi.waitFor(() => expect(service.state()).toBe('completed'));

    expect(api.confirmCheckout).toHaveBeenCalledOnce();
    expect(api.confirmCheckout).toHaveBeenCalledWith(
      'payment-1',
      checkoutResult,
    );
    expect(service.snapshot()).toEqual(settledSnapshot);
  });

  it('blocks duplicate clicks while checkout is opening', async () => {
    await service.initialize();
    let release: (() => void) | undefined;
    gateway.open.mockImplementation(
      () => new Promise<void>((resolve) => (release = resolve)),
    );

    const first = service.pay();
    const second = service.pay();
    expect(gateway.open).toHaveBeenCalledOnce();
    release?.();
    await Promise.all([first, second]);
  });

  it('handles failure and dismissal without granting access and restores focus', async () => {
    await service.initialize();
    const button = document.createElement('button');
    const focus = vi.spyOn(button, 'focus');
    await service.pay(button);

    callbacks?.failure('Card declined');
    expect(service.state()).toBe('failed');
    expect(service.message()).toBe('Card declined');
    expect(focus).toHaveBeenCalledOnce();

    await service.retry();
    await service.pay(button);
    callbacks?.dismiss();
    expect(service.state()).toBe('cancelled');
    expect(api.confirmCheckout).not.toHaveBeenCalled();
  });

  it('offers recovery when the network is offline', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    api.getSnapshot.mockRejectedValue(new Error('Network unavailable'));

    await service.initialize();

    expect(service.state()).toBe('offline');
    expect(service.message()).toContain('offline');
  });

  it('bounds provider polling when processing remains non-terminal', async () => {
    const processing = { ...pendingTransition, status: 'processing' as const };
    api.getTransition.mockResolvedValue(processing);

    await service.initialize();

    expect(service.state()).toBe('processing');
    expect(api.getTransition).toHaveBeenCalledTimes(3);
    expect(service.message()).toContain('taking longer than expected');
  });

  it.each([
    ['completed', 'completed'],
    ['failed', 'failed'],
    ['expired', 'expired'],
    ['cancelled', 'cancelled'],
  ] satisfies [TransitionStatus, string][])(
    'maps terminal transition %s to view state %s',
    async (terminal, expected) => {
      api.getTransition
        .mockResolvedValueOnce({ ...pendingTransition, status: 'processing' })
        .mockResolvedValueOnce({ ...pendingTransition, status: terminal });

      await service.initialize();

      expect(service.state()).toBe(expected);
      expect(api.getSnapshot).toHaveBeenCalledTimes(2);
    },
  );
});
