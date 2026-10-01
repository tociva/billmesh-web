import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';

const BLOCKING_OVERLAY_SELECTOR = [
  '.tng-dialog-backdrop',
  '[tngDialogBackdrop]',
  '[data-slot="popover-panel"][data-state="open"]',
].join(', ');

@Injectable({ providedIn: 'root' })
export class BurlEscapeNavigationService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  constructor() {
    fromEvent<KeyboardEvent>(this.document, 'keydown')
      .pipe(
        filter((event) => event.key === 'Escape'),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.onEscape(event));
  }

  private onEscape(event: KeyboardEvent): void {
    if (event.defaultPrevented || this.isBlockingOverlayOpen()) return;

    const backUrl = this.router
      .parseUrl(this.router.url)
      .queryParamMap.get('burl');
    if (!backUrl) return;

    event.preventDefault();
    void this.router.navigateByUrl(backUrl);
  }

  private isBlockingOverlayOpen(): boolean {
    return this.document.querySelector(BLOCKING_OVERLAY_SELECTOR) !== null;
  }
}
