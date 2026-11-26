import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CreditPack } from './billing.models';
import { CreditPackCheckoutComponent } from './credit-pack-checkout.component';
import { CreditPackCheckoutFlowService } from './credit-pack-checkout-flow.service';

describe('CreditPackCheckoutComponent', () => {
  const pack: CreditPack = {
    id: 'pack-1',
    name: 'Starter credits',
    credits: 500,
    price_minor: 9900,
    currency: 'INR',
    validity_days: 30,
  };
  const flow = {
    state: signal<'ready' | 'processing' | 'failed'>('ready'),
    message: signal('Choose a credit pack.'),
    packs: signal<readonly CreditPack[]>([pack]),
    selectedPackId: signal<string | null>(null),
    initialize: vi.fn().mockResolvedValue(undefined),
    purchase: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    flow.state.set('ready');
    flow.selectedPackId.set(null);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [CreditPackCheckoutComponent],
      providers: [{ provide: CreditPackCheckoutFlowService, useValue: flow }],
    }).compileComponents();
  });

  it('renders server-owned pack details and a keyboard-native purchase button', () => {
    const fixture = TestBed.createComponent(CreditPackCheckoutComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('button');

    expect(element.textContent).toContain('Starter credits');
    expect(element.textContent).toContain('500 credits');
    expect(element.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(button?.type).toBe('button');
    button?.click();
    expect(flow.purchase).toHaveBeenCalledWith(pack, button);
  });

  it('disables purchase while confirmation is pending', () => {
    flow.state.set('processing');
    const fixture = TestBed.createComponent(CreditPackCheckoutComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLButtonElement>('button')?.disabled).toBe(
      true,
    );
    expect(element.textContent).not.toContain('credits are available');
  });
});
