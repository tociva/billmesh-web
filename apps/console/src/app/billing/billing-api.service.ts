import { Injectable, inject } from '@angular/core';
import { BillmeshApiClient } from '@billmesh/api-client';
import { firstValueFrom } from 'rxjs';
import type {
  BillingSnapshot,
  CheckoutConfirmationResult,
  RazorpayCheckoutResult,
  SubscriptionTransition,
} from './billing.models';

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly api = inject(BillmeshApiClient);

  getSnapshot(): Promise<BillingSnapshot> {
    return firstValueFrom(this.api.get<BillingSnapshot>('/billing-snapshot'));
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
