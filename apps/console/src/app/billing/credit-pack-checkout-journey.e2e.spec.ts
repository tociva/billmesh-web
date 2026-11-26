import { TestBed } from '@angular/core/testing';
import { BillingApiService } from './billing-api.service';
import type {
  CreditPack,
  PaymentOrder,
  RazorpayCheckoutResult,
} from './billing.models';
import { CreditPackCheckoutComponent } from './credit-pack-checkout.component';
import {
  CREDIT_PACK_IDEMPOTENCY_KEY,
  CreditPackCheckoutFlowService,
} from './credit-pack-checkout-flow.service';

describe('Razorpay credit-pack checkout journey', () => {
  afterEach(() => {
    delete (window as Window & { Razorpay?: unknown }).Razorpay;
  });

  it('uses server order values and exposes success only after confirmation', async () => {
    const pack: CreditPack = {
      id: 'pack-e2e',
      name: 'Journey credits',
      credits: 750,
      price_minor: 14900,
      currency: 'INR',
      validity_days: null,
    };
    const order: PaymentOrder = {
      payment_id: 'payment-e2e',
      credit_pack_id: pack.id,
      credits: pack.credits,
      checkout: {
        provider: 'razorpay',
        presentation: 'modal',
        checkout_url: null,
        client_config: {
          public_key: 'rzp_test_credit_pack',
          order_id: 'order-credit-pack-e2e',
          amount_minor: 14900,
          currency: 'INR',
        },
        expires_at: null,
        success_url: null,
        cancel_url: null,
      },
    };
    let options: Record<string, unknown> | null = null;
    (window as Window & { Razorpay?: unknown }).Razorpay = class {
      constructor(value: Record<string, unknown>) {
        options = value;
      }
      on(): void {}
      open(): void {}
    };
    const api = {
      listCreditPacks: vi.fn().mockResolvedValue([pack]),
      createCreditPackOrder: vi.fn().mockResolvedValue(order),
      confirmCheckout: vi.fn().mockResolvedValue({ status: 'captured' }),
    };
    await TestBed.configureTestingModule({
      imports: [CreditPackCheckoutComponent],
      providers: [
        CreditPackCheckoutFlowService,
        { provide: BillingApiService, useValue: api },
        {
          provide: CREDIT_PACK_IDEMPOTENCY_KEY,
          useValue: () => 'credit-pack-e2e-attempt',
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CreditPackCheckoutComponent);
    const flow = TestBed.inject(CreditPackCheckoutFlowService);
    fixture.detectChanges();
    await vi.waitFor(() => expect(flow.state()).toBe('ready'));
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    await vi.waitFor(() => expect(options).not.toBeNull());

    expect(api.createCreditPackOrder).toHaveBeenCalledWith(
      pack.id,
      'credit-pack-e2e-attempt',
    );
    expect(options).toMatchObject({
      key: 'rzp_test_credit_pack',
      order_id: 'order-credit-pack-e2e',
      amount: 14900,
      currency: 'INR',
    });
    expect(fixture.nativeElement.textContent).not.toContain(
      'credits are available',
    );

    const result: RazorpayCheckoutResult = {
      razorpay_payment_id: 'pay-credit-pack-e2e',
      razorpay_order_id: 'order-credit-pack-e2e',
      razorpay_signature: 'b'.repeat(64),
    };
    const checkoutOptions = options as unknown as {
      handler: (value: RazorpayCheckoutResult) => void;
    };
    checkoutOptions.handler(result);
    await vi.waitFor(() => expect(flow.state()).toBe('completed'));
    fixture.detectChanges();

    expect(api.confirmCheckout).toHaveBeenCalledWith(order.payment_id, result);
    expect(fixture.nativeElement.textContent).toContain(
      'credits are available',
    );
  });
});
