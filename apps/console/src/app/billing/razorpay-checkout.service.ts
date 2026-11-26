import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import type { CheckoutSubject, RazorpayCheckoutResult } from './billing.models';

const CHECKOUT_SCRIPT_ID = 'razorpay-checkout-script';
export const RAZORPAY_CHECKOUT_SCRIPT_URL =
  'https://checkout.razorpay.com/v1/checkout.js';
export const RAZORPAY_CHECKOUT_CSP_ORIGINS = [
  'https://checkout.razorpay.com',
  'https://api.razorpay.com',
  'https://cdn.razorpay.com',
] as const;

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  handler: (result: RazorpayCheckoutResult) => void;
  modal: { confirm_close: true; ondismiss: () => void };
  retry: { enabled: false };
}

interface RazorpayFailure {
  error?: { description?: string };
}

interface RazorpayInstance {
  on(
    event: 'payment.failed',
    handler: (failure: RazorpayFailure) => void,
  ): void;
  open(): void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

export interface CheckoutCallbacks {
  success: (result: RazorpayCheckoutResult) => void;
  dismiss: () => void;
  failure: (message: string) => void;
}

@Injectable({ providedIn: 'root' })
export class RazorpayCheckoutService {
  private readonly document = inject(DOCUMENT);
  private scriptPromise: Promise<void> | null = null;

  async open(
    transition: CheckoutSubject,
    callbacks: CheckoutCallbacks,
  ): Promise<void> {
    const config = transition.checkout?.client_config;
    if (
      transition.checkout?.provider !== 'razorpay' ||
      transition.checkout.presentation !== 'modal' ||
      !config ||
      !transition.payment_id
    ) {
      throw new Error('The server did not return a usable Razorpay checkout.');
    }

    await this.loadScript();
    const Razorpay = this.window().Razorpay;
    if (!Razorpay) {
      throw new Error('Razorpay Checkout did not become available.');
    }

    // Only these four payment values cross from the server contract into
    // Checkout. Catalogue, URL, and browser state cannot override them.
    const instance = new Razorpay({
      key: config.public_key,
      order_id: config.order_id,
      amount: config.amount_minor,
      currency: config.currency,
      handler: callbacks.success,
      modal: { confirm_close: true, ondismiss: callbacks.dismiss },
      retry: { enabled: false },
    });
    instance.on('payment.failed', (failure) => {
      callbacks.failure(
        failure.error?.description ??
          'Razorpay could not complete the payment.',
      );
    });
    instance.open();
  }

  private loadScript(): Promise<void> {
    if (this.window().Razorpay) {
      return Promise.resolve();
    }
    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = this.document.getElementById(
        CHECKOUT_SCRIPT_ID,
      ) as HTMLScriptElement | null;
      const script = existing ?? this.document.createElement('script');
      const loaded = (): void => resolve();
      const failed = (): void => {
        script.remove();
        this.scriptPromise = null;
        reject(new Error('Unable to load Razorpay Checkout. Please retry.'));
      };

      script.addEventListener('load', loaded, { once: true });
      script.addEventListener('error', failed, { once: true });
      if (!existing) {
        script.id = CHECKOUT_SCRIPT_ID;
        script.src = RAZORPAY_CHECKOUT_SCRIPT_URL;
        script.async = true;
        script.referrerPolicy = 'strict-origin-when-cross-origin';
        this.document.head.append(script);
      }
    });
    return this.scriptPromise;
  }

  private window(): Window & { Razorpay?: RazorpayConstructor } {
    const view = this.document.defaultView;
    if (!view) {
      throw new Error('Razorpay Checkout requires a browser window.');
    }
    return view as Window & { Razorpay?: RazorpayConstructor };
  }
}
