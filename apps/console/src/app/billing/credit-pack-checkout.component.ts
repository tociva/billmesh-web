import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import type { OnInit } from '@angular/core';
import type { CreditPack } from './billing.models';
import { CreditPackCheckoutFlowService } from './credit-pack-checkout-flow.service';

@Component({
  selector: 'billmesh-credit-pack-checkout',
  imports: [CurrencyPipe],
  templateUrl: './credit-pack-checkout.component.html',
  styleUrl: './credit-pack-checkout.component.css',
})
export class CreditPackCheckoutComponent implements OnInit {
  protected readonly flow = inject(CreditPackCheckoutFlowService);
  protected readonly busy = computed(() =>
    ['loading', 'opening', 'processing'].includes(this.flow.state()),
  );

  ngOnInit(): void {
    void this.flow.initialize();
  }

  protected purchase(pack: CreditPack, button: HTMLButtonElement): void {
    void this.flow.purchase(pack, button);
  }

  protected retry(pack: CreditPack, button: HTMLButtonElement): void {
    void this.flow.retry(pack, button);
  }
}
