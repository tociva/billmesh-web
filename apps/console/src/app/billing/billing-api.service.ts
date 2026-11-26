import { Injectable, inject } from '@angular/core';
import { BillmeshApiClient } from '@billmesh/api-client';
import { firstValueFrom } from 'rxjs';
import type {
  BillingSnapshot,
  CheckoutConfirmationResult,
  CreditPack,
  PaymentOrder,
  RazorpayCheckoutResult,
  SubscriptionTransition,
} from './billing.models';

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly api = inject(BillmeshApiClient);

  getSnapshot(): Promise<BillingSnapshot> {
    return firstValueFrom(this.api.get<BillingSnapshot>('/billing-snapshot'));
  }

  listCreditPacks(): Promise<readonly CreditPack[]> {
    return firstValueFrom(this.api.get<readonly CreditPack[]>('/credit-packs'));
  }

  createCreditPackOrder(
    creditPackId: string,
    idempotencyKey: string,
  ): Promise<PaymentOrder> {
    return firstValueFrom(
      this.api.post<PaymentOrder, { credit_pack_id: string }>(
        '/payments/orders',
        { credit_pack_id: creditPackId },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      ),
    );
  }

  getTransition(id: string): Promise<SubscriptionTransition> {
    return firstValueFrom(
      this.api.get<SubscriptionTransition>(
        `/subscription-transitions/${encodeURIComponent(id)}`,
      ),
    );
  }

  confirmCheckout(
    paymentId: string,
    result: RazorpayCheckoutResult,
  ): Promise<CheckoutConfirmationResult> {
    return firstValueFrom(
      this.api.post<CheckoutConfirmationResult, RazorpayCheckoutResult>(
        `/payments/${encodeURIComponent(paymentId)}/confirm`,
        result,
      ),
    );
  }
}
