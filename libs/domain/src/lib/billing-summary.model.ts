export interface BillingSummary {
  accountName: string;
  planName: string;
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing';
}
