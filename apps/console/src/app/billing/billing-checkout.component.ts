import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import type { OnInit } from '@angular/core';
import { CheckoutFlowService } from './checkout-flow.service';

@Component({
  selector: 'billmesh-billing-checkout',
  imports: [CurrencyPipe],
  templateUrl: './billing-checkout.component.html',
  styleUrl: './billing-checkout.component.css',
})
export class BillingCheckoutComponent implements OnInit {
  protected readonly flow = inject(CheckoutFlowService);
  protected readonly busy = computed(() =>
    ['loading', 'opening', 'processing'].includes(this.flow.state()),
  );
  protected readonly canPay = computed(
    () => this.flow.state() === 'ready' || this.flow.state() === 'cancelled',
  );
  protected readonly canRetry = computed(() =>
    ['failed', 'offline'].includes(this.flow.state()),
  );
  protected readonly amount = computed(
    () => this.flow.transition()?.checkout?.client_config?.amount_minor ?? 0,
  );
  protected readonly currency = computed(
    () => this.flow.transition()?.checkout?.client_config?.currency ?? 'INR',
  );

  ngOnInit(): void {
    void this.flow.initialize();
  }

  protected pay(button: HTMLButtonElement): void {
    void this.flow.pay(button);
  }

  protected retry(): void {
    void this.flow.retry();
  }
}
