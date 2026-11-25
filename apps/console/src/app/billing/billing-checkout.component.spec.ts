import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SubscriptionTransition } from './billing.models';
import { BillingCheckoutComponent } from './billing-checkout.component';
import { CheckoutFlowService } from './checkout-flow.service';

describe('BillingCheckoutComponent', () => {
  const transition = signal<SubscriptionTransition | null>(null);
  const state = signal<'ready' | 'processing' | 'failed'>('ready');
  const flow = {
    state,
    message: signal('Secure checkout is ready.'),
    transition,
    initialize: vi.fn().mockResolvedValue(undefined),
    pay: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    transition.set(null);
    state.set('ready');
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [BillingCheckoutComponent],
      providers: [{ provide: CheckoutFlowService, useValue: flow }],
    }).compileComponents();
  });

  it('announces state and uses a keyboard-native payment control', () => {
    const fixture = TestBed.createComponent(BillingCheckoutComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const status = element.querySelector<HTMLElement>('[aria-live="polite"]');
    const button = element.querySelector<HTMLButtonElement>('button');

    expect(status?.textContent).toContain('Secure checkout is ready');
    expect(button?.type).toBe('button');
    button?.click();
    expect(flow.pay).toHaveBeenCalledWith(button);
  });

  it('keeps paid state hidden while server processing is pending', () => {
    state.set('processing');
    flow.message.set('Payment received. Waiting for server confirmation…');
    const fixture = TestBed.createComponent(BillingCheckoutComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Waiting for server confirmation');
    expect(element.querySelector('button')).toBeNull();
    expect(element.textContent).not.toContain('Payment confirmed');
  });

  it('includes responsive and reduced-motion protections for small WebViews', () => {
    const definition = (
      BillingCheckoutComponent as unknown as {
        ɵcmp: { styles: string[] };
      }
    ).ɵcmp;
    const styles = definition.styles.join('\n');

    expect(styles).toContain('@media (max-width: 30rem)');
    expect(styles).toContain('button');
    expect(styles).toContain('width: 100%');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
