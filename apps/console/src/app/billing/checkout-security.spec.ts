import {
  RAZORPAY_CHECKOUT_CSP_ORIGINS,
  RAZORPAY_CHECKOUT_SCRIPT_URL,
} from './razorpay-checkout.service';

describe('Razorpay browser security contract', () => {
  it('allows only the explicit Standard Checkout origins', () => {
    expect(RAZORPAY_CHECKOUT_CSP_ORIGINS).toEqual([
      'https://checkout.razorpay.com',
      'https://api.razorpay.com',
      'https://cdn.razorpay.com',
    ]);
    expect(RAZORPAY_CHECKOUT_CSP_ORIGINS).not.toContain('*');
    expect(RAZORPAY_CHECKOUT_SCRIPT_URL).toBe(
      `${RAZORPAY_CHECKOUT_CSP_ORIGINS[0]}/v1/checkout.js`,
    );
  });

  it('contains no browser-side Razorpay secret setting', () => {
    const publicContract = JSON.stringify({
      script: RAZORPAY_CHECKOUT_SCRIPT_URL,
      origins: RAZORPAY_CHECKOUT_CSP_ORIGINS,
    });

    expect(publicContract).not.toContain('KEY_SECRET');
    expect(publicContract).not.toContain('WEBHOOK_SECRET');
    expect(publicContract).not.toContain('key_secret');
  });
});
