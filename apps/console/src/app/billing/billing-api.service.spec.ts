import { TestBed } from '@angular/core/testing';
import { BillmeshApiClient } from '@billmesh/api-client';
import { of } from 'rxjs';
import { BillingApiService } from './billing-api.service';

describe('BillingApiService credit-pack contract', () => {
  it('loads credit packs from the authenticated catalogue route', async () => {
    const packs = [
      {
        id: 'pack-1',
        name: 'Starter credits',
        credits: 500,
        price_minor: 9900,
        currency: 'INR',
        validity_days: 30,
      },
    ];
    const api = { get: vi.fn().mockReturnValue(of(packs)), post: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        BillingApiService,
        { provide: BillmeshApiClient, useValue: api },
      ],
    });

    const result = await TestBed.inject(BillingApiService).listCreditPacks();

    expect(result).toEqual(packs);
    expect(api.get).toHaveBeenCalledWith('/credit-packs');
  });

  it('creates an order with the caller idempotency key and server-owned price', async () => {
    const order = {
      payment_id: 'payment-1',
      credit_pack_id: 'pack-1',
      credits: 500,
      checkout: {
        provider: 'razorpay' as const,
        presentation: 'modal' as const,
        checkout_url: null,
        client_config: {
          public_key: 'rzp_test_public',
          order_id: 'order-1',
          amount_minor: 9900,
          currency: 'INR',
        },
        expires_at: null,
        success_url: null,
        cancel_url: null,
      },
    };
    const api = { get: vi.fn(), post: vi.fn().mockReturnValue(of(order)) };
    TestBed.configureTestingModule({
      providers: [
        BillingApiService,
        { provide: BillmeshApiClient, useValue: api },
      ],
    });

    const result = await TestBed.inject(
      BillingApiService,
    ).createCreditPackOrder('pack-1', 'checkout-attempt-1');

    expect(result).toEqual(order);
    expect(api.post).toHaveBeenCalledWith(
      '/payments/orders',
      { credit_pack_id: 'pack-1' },
      { headers: { 'Idempotency-Key': 'checkout-attempt-1' } },
    );
  });
});
