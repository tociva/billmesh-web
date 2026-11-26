import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { BillingApiService } from './billing-api.service';
import type {
  CreditPack,
  PaymentOrder,
  RazorpayCheckoutResult,
} from './billing.models';
import { RazorpayCheckoutService } from './razorpay-checkout.service';

export type CreditPackCheckoutState =
  | 'loading'
  | 'ready'
  | 'opening'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export const CREDIT_PACK_IDEMPOTENCY_KEY = new InjectionToken<() => string>(
  'CREDIT_PACK_IDEMPOTENCY_KEY',
  { factory: () => () => globalThis.crypto.randomUUID() },
);

export const CREDIT_PACK_CONFIRMATION_DELAYS = new InjectionToken<
  readonly number[]
>('CREDIT_PACK_CONFIRMATION_DELAYS', {
  factory: () => [500, 1000, 2000, 4000],
});

export const CREDIT_PACK_SLEEP = new InjectionToken<
  (milliseconds: number) => Promise<void>
>('CREDIT_PACK_SLEEP', {
  factory: () => (milliseconds) =>
    new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds)),
});

@Injectable({ providedIn: 'root' })
export class CreditPackCheckoutFlowService {
  private readonly api = inject(BillingApiService);
  private readonly checkout = inject(RazorpayCheckoutService);
  private readonly document = inject(DOCUMENT);
  private readonly createIdempotencyKey = inject(CREDIT_PACK_IDEMPOTENCY_KEY);
  private readonly confirmationDelays = inject(CREDIT_PACK_CONFIRMATION_DELAYS);
  private readonly sleep = inject(CREDIT_PACK_SLEEP);
  private readonly orders = new Map<string, PaymentOrder>();
  private readonly idempotencyKeys = new Map<string, string>();
  private handlingResult = false;
  private focusTarget: HTMLElement | null = null;

  readonly state = signal<CreditPackCheckoutState>('loading');
  readonly message = signal('Loading available credit packs…');
  readonly packs = signal<readonly CreditPack[]>([]);
  readonly selectedPackId = signal<string | null>(null);

  async initialize(): Promise<void> {
    this.state.set('loading');
    this.message.set('Loading available credit packs…');
    try {
      this.packs.set(await this.api.listCreditPacks());
      this.state.set('ready');
      this.message.set(
        this.packs().length > 0
          ? 'Choose a credit pack.'
          : 'No credit packs are currently available.',
      );
    } catch (error) {
      this.setError(error);
    }
  }

  async purchase(pack: CreditPack, trigger?: HTMLElement): Promise<void> {
    if (['loading', 'opening', 'processing'].includes(this.state())) {
      return;
    }
    this.focusTarget = trigger ?? null;
    this.selectedPackId.set(pack.id);
    this.handlingResult = false;
    this.state.set('opening');
    this.message.set('Opening secure Razorpay Checkout…');
    try {
      const order = await this.orderFor(pack.id);
      await this.checkout.open(order, {
        success: (result) => void this.handleSuccess(order, result),
        dismiss: () => this.handleDismiss(),
        failure: (message) => this.handleFailure(message),
      });
    } catch (error) {
      this.setError(error);
      this.restoreFocus();
    }
  }

  async retry(pack: CreditPack, trigger?: HTMLElement): Promise<void> {
    await this.purchase(pack, trigger);
  }

  private async orderFor(creditPackId: string): Promise<PaymentOrder> {
    const existing = this.orders.get(creditPackId);
    if (existing) {
      return existing;
    }
    const key =
      this.idempotencyKeys.get(creditPackId) ?? this.createIdempotencyKey();
    this.idempotencyKeys.set(creditPackId, key);
    const order = await this.api.createCreditPackOrder(creditPackId, key);
    this.orders.set(creditPackId, order);
    return order;
  }

  private async handleSuccess(
    order: PaymentOrder,
    result: RazorpayCheckoutResult,
  ): Promise<void> {
    if (this.handlingResult) {
      return;
    }
    this.handlingResult = true;
    this.state.set('processing');
    this.message.set('Payment received. Waiting for server confirmation…');
    try {
      if (await this.confirmUntilCaptured(order.payment_id, result)) {
        this.orders.delete(order.credit_pack_id);
        this.idempotencyKeys.delete(order.credit_pack_id);
        this.state.set('completed');
        this.message.set('Payment confirmed. Your credits are available.');
      } else {
        this.state.set('processing');
        this.message.set(
          'Payment is processing. Credits remain unchanged until capture is confirmed.',
        );
      }
    } catch (error) {
      this.setError(error);
      this.restoreFocus();
    }
  }

  private handleDismiss(): void {
    if (this.handlingResult) {
      return;
    }
    this.handlingResult = true;
    this.state.set('cancelled');
    this.message.set('Checkout was closed. No credits have been granted.');
    this.restoreFocus();
  }

  private handleFailure(message: string): void {
    if (this.handlingResult) {
      return;
    }
    this.handlingResult = true;
    this.state.set('failed');
    this.message.set(`${message} No credits have been granted.`);
    this.restoreFocus();
  }

  private async confirmUntilCaptured(
    paymentId: string,
    result: RazorpayCheckoutResult,
  ): Promise<boolean> {
    const first = await this.api.confirmCheckout(paymentId, result);
    if (first.status === 'captured') {
      return true;
    }
    for (const delay of this.confirmationDelays) {
      await this.sleep(delay);
      const confirmation = await this.api.confirmCheckout(paymentId, result);
      if (confirmation.status === 'captured') {
        return true;
      }
    }
    return false;
  }

  private setError(error: unknown): void {
    this.state.set('failed');
    this.message.set(
      this.document.defaultView?.navigator.onLine === false
        ? 'You appear to be offline. Reconnect, then retry.'
        : error instanceof Error
          ? error.message
          : 'Credit-pack checkout could not be completed.',
    );
  }

  private restoreFocus(): void {
    this.focusTarget?.focus();
  }
}
