import { TestBed } from '@angular/core/testing';
import { BillingApiService } from './billing-api.service';
import type {
  CreditPack,
  PaymentOrder,
  RazorpayCheckoutResult,
} from './billing.models';
import {
  CREDIT_PACK_CONFIRMATION_DELAYS,
  CREDIT_PACK_IDEMPOTENCY_KEY,
  CREDIT_PACK_SLEEP,
  CreditPackCheckoutFlowService,
} from './credit-pack-checkout-flow.service';
import type { CheckoutCallbacks } from './razorpay-checkout.service';
import { RazorpayCheckoutService } from './razorpay-checkout.service';

const pack: CreditPack = {
  id: 'pack-1',
  name: 'Starter credits',
  credits: 500,
  price_minor: 9900,
  currency: 'INR',
  validity_days: 30,
};
const order: PaymentOrder = {
  payment_id: 'payment-1',
  credit_pack_id: pack.id,
  credits: pack.credits,
  checkout: {
    provider: 'razorpay',
    presentation: 'modal',
    checkout_url: null,
    client_config: {
      public_key: 'rzp_test_public',
      order_id: 'order-server-1',
      amount_minor: pack.price_minor,
      currency: pack.currency,
    },
    expires_at: null,
    success_url: null,
    cancel_url: null,
  },
};
const result: RazorpayCheckoutResult = {
  razorpay_payment_id: 'pay-provider-1',
  razorpay_order_id: 'order-server-1',
  razorpay_signature: 'a'.repeat(64),
};

describe('CreditPackCheckoutFlowService', () => {
  let service: CreditPackCheckoutFlowService;
  let callbacks: CheckoutCallbacks | null;
  let api: {
    listCreditPacks: ReturnType<typeof vi.fn>;
    createCreditPackOrder: ReturnType<typeof vi.fn>;
    confirmCheckout: ReturnType<typeof vi.fn>;
  };
  let checkout: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    callbacks = null;
    api = {
      listCreditPacks: vi.fn().mockResolvedValue([pack]),
      createCreditPackOrder: vi.fn().mockResolvedValue(order),
      confirmCheckout: vi.fn().mockResolvedValue({ status: 'captured' }),
    };
    checkout = {
      open: vi
        .fn()
        .mockImplementation(
          async (_order: PaymentOrder, value: CheckoutCallbacks) => {
            callbacks = value;
          },
        ),
    };
    TestBed.configureTestingModule({
      providers: [
        CreditPackCheckoutFlowService,
        { provide: BillingApiService, useValue: api },
        { provide: RazorpayCheckoutService, useValue: checkout },
        {
          provide: CREDIT_PACK_IDEMPOTENCY_KEY,
          useValue: () => 'checkout-attempt-1',
        },
        { provide: CREDIT_PACK_CONFIRMATION_DELAYS, useValue: [0, 0] },
        {
          provide: CREDIT_PACK_SLEEP,
          useValue: vi.fn().mockResolvedValue(undefined),
        },
      ],
    });
    service = TestBed.inject(CreditPackCheckoutFlowService);
  });

  it('loads server-owned credit-pack price and availability', async () => {
    await service.initialize();

    expect(service.state()).toBe('ready');
    expect(service.packs()).toEqual([pack]);
  });

  it('creates one idempotent order and blocks duplicate purchase clicks', async () => {
    await service.initialize();
    let release: (() => void) | undefined;
    api.createCreditPackOrder.mockImplementation(
      () =>
        new Promise<PaymentOrder>(
          (resolve) => (release = () => resolve(order)),
        ),
    );

    const first = service.purchase(pack);
    const second = service.purchase(pack);
    expect(api.createCreditPackOrder).toHaveBeenCalledOnce();
    expect(api.createCreditPackOrder).toHaveBeenCalledWith(
      pack.id,
      'checkout-attempt-1',
    );
    release?.();
    await Promise.all([first, second]);
    expect(checkout.open).toHaveBeenCalledOnce();
  });

  it('reuses the same provider order after dismissal and grants no credits', async () => {
    await service.initialize();
    const button = document.createElement('button');
    const focus = vi.spyOn(button, 'focus');
    await service.purchase(pack, button);

    callbacks?.dismiss();
    expect(service.state()).toBe('cancelled');
    expect(api.confirmCheckout).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalledOnce();

    await service.retry(pack, button);
    expect(api.createCreditPackOrder).toHaveBeenCalledOnce();
    expect(checkout.open).toHaveBeenCalledTimes(2);
  });

  it('confirms a successful result once before showing credits available', async () => {
    await service.initialize();
    await service.purchase(pack);

    callbacks?.success(result);
    callbacks?.success(result);
    expect(service.state()).toBe('processing');
    await vi.waitFor(() => expect(service.state()).toBe('completed'));

    expect(api.confirmCheckout).toHaveBeenCalledOnce();
    expect(api.confirmCheckout).toHaveBeenCalledWith(order.payment_id, result);
    expect(service.message()).toContain('credits are available');
  });

  it('keeps credits unchanged for provider failure and processing status', async () => {
    await service.initialize();
    await service.purchase(pack);
    callbacks?.failure('Payment declined');
    expect(service.state()).toBe('failed');
    expect(service.message()).toContain('No credits have been granted');
    expect(api.confirmCheckout).not.toHaveBeenCalled();

    await service.retry(pack);
    api.confirmCheckout.mockResolvedValue({ status: 'processing' });
    callbacks?.success(result);
    await vi.waitFor(() =>
      expect(api.confirmCheckout).toHaveBeenCalledTimes(3),
    );
    expect(service.state()).toBe('processing');
    expect(service.message()).toContain('Credits remain unchanged');
  });

  it('polls an authorized payment until capture becomes authoritative', async () => {
    api.confirmCheckout
      .mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce({ status: 'captured' });
    await service.initialize();
    await service.purchase(pack);

    callbacks?.success(result);
    await vi.waitFor(() => expect(service.state()).toBe('completed'));

    expect(api.confirmCheckout).toHaveBeenCalledTimes(2);
    expect(service.message()).toContain('credits are available');
  });

  it('ignores a late success callback after checkout is dismissed', async () => {
    await service.initialize();
    await service.purchase(pack);

    callbacks?.dismiss();
    callbacks?.success(result);

    expect(service.state()).toBe('cancelled');
    expect(api.confirmCheckout).not.toHaveBeenCalled();
  });
});
