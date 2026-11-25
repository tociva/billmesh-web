export type TransitionStatus =
  | 'requires_payment'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface CheckoutClientConfig {
  public_key: string;
  order_id: string;
  amount_minor: number;
  currency: string;
}

export interface Checkout {
  provider: 'razorpay';
  presentation: 'inline' | 'modal' | 'provider_hosted';
  checkout_url: string | null;
  client_config: CheckoutClientConfig | null;
  expires_at: string | null;
  success_url: string | null;
  cancel_url: string | null;
}

export interface SubscriptionTransition {
  id: string;
  plan_name: string;
  status: TransitionStatus;
  payment_id: string | null;
  snapshot_url: string;
  checkout: Checkout | null;
}

export interface BillingSnapshot {
  revision: number;
  subscription: {
    status: string;
    effective_plan: { name: string };
  } | null;
  pending_transition: {
    id: string;
    status: 'requires_payment' | 'processing';
  } | null;
}

export interface RazorpayCheckoutResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface CheckoutConfirmationResult {
  status: 'processing' | 'captured';
  payment_id: string;
  provider_payment_id: string;
  snapshot_url: string;
}
