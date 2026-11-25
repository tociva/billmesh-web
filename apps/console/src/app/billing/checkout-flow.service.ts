import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { BillingApiService } from './billing-api.service';
import type {
  BillingSnapshot,
  RazorpayCheckoutResult,
  SubscriptionTransition,
  TransitionStatus,
} from './billing.models';
import { RazorpayCheckoutService } from './razorpay-checkout.service';

export type CheckoutViewState =
  | 'loading'
  | 'ready'
  | 'opening'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'offline';

export const CHECKOUT_POLL_DELAYS = new InjectionToken<readonly number[]>(
  'CHECKOUT_POLL_DELAYS',
  { factory: () => [250, 500, 1000, 2000, 4000] },
);

export const CHECKOUT_SLEEP = new InjectionToken<
  (milliseconds: number) => Promise<void>
>('CHECKOUT_SLEEP', {
  factory: () => (milliseconds) =>
    new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds)),
});

@Injectable({ providedIn: 'root' })
export class CheckoutFlowService {
  private readonly api = inject(BillingApiService);
  private readonly checkout = inject(RazorpayCheckoutService);
  private readonly document = inject(DOCUMENT);
  private readonly pollDelays = inject(CHECKOUT_POLL_DELAYS);
  private readonly sleep = inject(CHECKOUT_SLEEP);
  private initialized = false;
  private handlingResult = false;
  private focusTarget: HTMLElement | null = null;

  readonly state = signal<CheckoutViewState>('loading');
  readonly message = signal('Loading your authoritative billing status…');
  readonly snapshot = signal<BillingSnapshot | null>(null);
  readonly transition = signal<SubscriptionTransition | null>(null);

  async initialize(force = false): Promise<void> {
    if (this.initialized && !force) {
      return;
    }
    this.initialized = true;
    this.state.set('loading');
    this.message.set('Loading your authoritative billing status…');
    try {
      await this.refreshAuthoritativeState();
      const transition = this.transition();
      if (!transition) {
        this.state.set('completed');
        this.message.set('Your billing status is up to date.');
      } else if (transition.status === 'requires_payment') {
        this.state.set('ready');
        this.message.set('Secure checkout is ready.');
      } else {
        this.state.set('processing');
        this.message.set('Your payment is processing. Checking its status…');
        await this.pollTransition(transition.id);
      }
    } catch (error) {
      this.setRequestError(error);
    }
  }

  async pay(trigger?: HTMLElement): Promise<void> {
    const transition = this.transition();
    if (
      !transition ||
      transition.status !== 'requires_payment' ||
      this.state() === 'opening' ||
      this.state() === 'processing'
    ) {
      return;
    }

    this.focusTarget = trigger ?? null;
    this.handlingResult = false;
    this.state.set('opening');
    this.message.set('Opening secure Razorpay Checkout…');
    try {
      await this.checkout.open(transition, {
        success: (result) => void this.handleSuccess(transition, result),
        dismiss: () => this.handleDismiss(),
        failure: (message) => this.handleFailure(message),
      });
    } catch (error) {
      this.setRequestError(error);
      this.restoreFocus();
    }
  }

  async retry(): Promise<void> {
    this.initialized = false;
    await this.initialize(true);
  }

  private async handleSuccess(
    transition: SubscriptionTransition,
    result: RazorpayCheckoutResult,
  ): Promise<void> {
    if (this.handlingResult || !transition.payment_id) {
      return;
    }
    this.handlingResult = true;
    this.state.set('processing');
    this.message.set('Payment received. Waiting for server confirmation…');
    try {
      await this.api.confirmCheckout(transition.payment_id, result);
      await this.refreshSnapshot();
      await this.pollTransition(transition.id);
    } catch (error) {
      this.setRequestError(error);
      this.restoreFocus();
    }
  }

  private handleDismiss(): void {
    if (this.handlingResult) {
      return;
    }
    this.state.set('cancelled');
    this.message.set('Checkout was closed. No paid access has been granted.');
    this.restoreFocus();
  }

  private handleFailure(message: string): void {
    if (this.handlingResult) {
      return;
    }
    this.state.set('failed');
    this.message.set(message);
    this.restoreFocus();
  }

  private async pollTransition(id: string): Promise<void> {
    for (const delay of this.pollDelays) {
      const transition = await this.api.getTransition(id);
      this.transition.set(transition);
      if (this.applyTerminalState(transition.status)) {
        await this.refreshSnapshot();
        this.restoreFocus();
        return;
      }
      this.state.set('processing');
      await this.sleep(delay);
    }
    this.state.set('processing');
    this.message.set(
      'Confirmation is taking longer than expected. Your billing status will remain unchanged until the server confirms it.',
    );
  }

  private applyTerminalState(status: TransitionStatus): boolean {
    if (status === 'completed') {
      this.state.set('completed');
      this.message.set('Payment confirmed. Your billing status is updated.');
      return true;
    }
    if (status === 'failed' || status === 'cancelled') {
      this.state.set(status === 'failed' ? 'failed' : 'cancelled');
      this.message.set(
        'The transition did not complete. You can safely retry.',
      );
      return true;
    }
    if (status === 'expired') {
      this.state.set('expired');
      this.message.set(
        'This checkout expired. Start a fresh checkout to continue.',
      );
      return true;
    }
    return false;
  }

  private async refreshAuthoritativeState(): Promise<void> {
    const snapshot = await this.refreshSnapshot();
    if (!snapshot.pending_transition) {
      this.transition.set(null);
      return;
    }
    this.transition.set(
      await this.api.getTransition(snapshot.pending_transition.id),
    );
  }

  private async refreshSnapshot(): Promise<BillingSnapshot> {
    const snapshot = await this.api.getSnapshot();
    this.snapshot.set(snapshot);
    return snapshot;
  }

  private setRequestError(error: unknown): void {
    if (this.document.defaultView?.navigator.onLine === false) {
      this.state.set('offline');
      this.message.set(
        'You appear to be offline. Reconnect, then retry to check the authoritative billing status.',
      );
      return;
    }
    this.state.set('failed');
    this.message.set(
      error instanceof Error
        ? error.message
        : 'Checkout could not be completed.',
    );
  }

  private restoreFocus(): void {
    this.focusTarget?.focus();
  }
}
