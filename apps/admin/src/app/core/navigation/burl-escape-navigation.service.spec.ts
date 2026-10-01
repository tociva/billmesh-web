import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { DefaultUrlSerializer, Router } from '@angular/router';
import { BurlEscapeNavigationService } from './burl-escape-navigation.service';

describe('BurlEscapeNavigationService', () => {
  const serializer = new DefaultUrlSerializer();
  const navigateByUrl = vi.fn().mockResolvedValue(true);
  let currentUrl: string;
  let document: Document;

  beforeEach(() => {
    currentUrl = '/app/catalogue';
    navigateByUrl.mockClear();

    TestBed.configureTestingModule({
      providers: [
        BurlEscapeNavigationService,
        {
          provide: Router,
          useValue: {
            get url(): string {
              return currentUrl;
            },
            navigateByUrl,
            parseUrl: (url: string) => serializer.parse(url),
          },
        },
      ],
    });

    document = TestBed.inject(DOCUMENT);
    TestBed.inject(BurlEscapeNavigationService);
  });

  afterEach(() => {
    document
      .querySelectorAll(
        '.tng-dialog-backdrop, [tngDialogBackdrop], [data-slot="popover-panel"]',
      )
      .forEach((element) => element.remove());
  });

  it('navigates to the current burl on Escape', () => {
    currentUrl =
      '/app/catalogue/product-1?burl=%2Fapp%2Fcatalogue%3Fpage%3D2%23products';
    const event = escapeEvent();

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(navigateByUrl).toHaveBeenCalledOnce();
    expect(navigateByUrl).toHaveBeenCalledWith(
      '/app/catalogue?page=2#products',
    );
  });

  it('pops nested burl values one level at a time', () => {
    const productUrl =
      '/app/catalogue/product-1?burl=%2Fapp%2Fcatalogue%3Fpage%3D2';
    currentUrl = `/app/catalogue/product-1/edit?burl=${encodeURIComponent(productUrl)}`;

    document.dispatchEvent(escapeEvent());

    expect(navigateByUrl).toHaveBeenLastCalledWith(productUrl);

    currentUrl = productUrl;
    document.dispatchEvent(escapeEvent());

    expect(navigateByUrl).toHaveBeenCalledTimes(2);
    expect(navigateByUrl).toHaveBeenLastCalledWith('/app/catalogue?page=2');
  });

  it('leaves Escape unhandled when there is no burl', () => {
    const event = escapeEvent();

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('ignores keys other than Escape', () => {
    currentUrl = '/app/catalogue/product-1?burl=%2Fapp%2Fcatalogue';
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not navigate when Escape was already handled', () => {
    currentUrl = '/app/catalogue/product-1?burl=%2Fapp%2Fcatalogue';
    const event = escapeEvent();
    event.preventDefault();

    document.dispatchEvent(event);

    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it.each([
    '<div class="tng-dialog-backdrop"></div>',
    '<div tngDialogBackdrop></div>',
    '<div data-slot="popover-panel" data-state="open"></div>',
  ])('lets an open overlay handle Escape for %s', (markup) => {
    currentUrl = '/app/catalogue/product-1?burl=%2Fapp%2Fcatalogue';
    document.body.insertAdjacentHTML('beforeend', markup);
    const event = escapeEvent();

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});

function escapeEvent(): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  });
}
