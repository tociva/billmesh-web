import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Plan, Product } from '@billmesh/domain';
import { of, Subject, throwError } from 'rxjs';
import { CatalogueComponent } from './catalogue.component';

const product: Product = {
  id: 'product-1',
  slug: 'invoice-api',
  name: '<script>Invoice API</script>',
  description: '<img src=x onerror=alert(1)>',
  active: true,
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const plan: Plan = {
  id: 'plan-1',
  product_id: product.id,
  product: product.slug,
  slug: 'professional',
  name: 'Professional',
  price_minor: 99900,
  currency: 'INR',
  included_credits: 1000,
  entitlements: { reports: true, users: 10 },
  billing_interval: 'monthly',
  active: true,
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('CatalogueComponent', () => {
  let fixture: ComponentFixture<CatalogueComponent>;
  const service = {
    listProducts: vi.fn(() => of([product])),
    getProduct: vi.fn(() => of(product)),
    createProduct: vi.fn(() => of(product)),
    updateProduct: vi.fn(() => of({ ...product, active: false, version: 2 })),
    listPlans: vi.fn(() => of([plan])),
    getPlan: vi.fn(() => of(plan)),
    createPlan: vi.fn(() => of(plan)),
    updatePlan: vi.fn(() => of({ ...plan, active: false, version: 2 })),
  };

  beforeEach(async () => {
    Object.values(service).forEach((mock) => mock.mockClear());
    await TestBed.configureTestingModule({
      imports: [CatalogueComponent],
      providers: [
        provideRouter([]),
        { provide: CatalogueAdminService, useValue: service },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CatalogueComponent);
    fixture.detectChanges();
  });

  it('ADMUI-004 renders the Product list and empty-safe server text', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('<script>Invoice API</script>');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(service.listProducts).toHaveBeenCalledWith({
      status: 'all',
      query: '',
      limit: 25,
      offset: 0,
    });
  });

  it('ADMUI-004 renders loading and empty Product states', () => {
    const pending = new Subject<Product[]>();
    service.listProducts.mockReturnValueOnce(pending);
    fixture.destroy();
    fixture = TestBed.createComponent(CatalogueComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading products');

    pending.next([]);
    pending.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No products match these filters',
    );
  });

  it('ADMUI-004 renders a recoverable Product load error', () => {
    service.listProducts.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            statusText: 'Unavailable',
          }),
      ),
    );
    fixture.destroy();
    fixture = TestBed.createComponent(CatalogueComponent);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'catalogue request failed',
    );
  });

  it('ADMUI-005 applies search and lifecycle filters', () => {
    const search = fixture.nativeElement.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    search.value = 'invoice';
    search.dispatchEvent(new Event('input'));
    const status = fixture.nativeElement.querySelector(
      '.toolbar select',
    ) as HTMLSelectElement;
    status.value = 'archived';
    status.dispatchEvent(new Event('change'));
    const apply = Array.from(
      fixture.nativeElement.querySelectorAll('.toolbar button'),
    )[0] as HTMLButtonElement;
    apply.click();
    fixture.detectChanges();

    expect(service.listProducts).toHaveBeenLastCalledWith({
      status: 'archived',
      query: 'invoice',
      limit: 25,
      offset: 0,
    });

    const next = Array.from(
      fixture.nativeElement.querySelectorAll('.pagination button'),
    )[1] as HTMLButtonElement;
    next.disabled = false;
    next.click();
    expect(service.listProducts).toHaveBeenLastCalledWith({
      status: 'archived',
      query: 'invoice',
      limit: 25,
      offset: 25,
    });
  });

  it('ADMUI-006 opens a validated Product create form', () => {
    const create = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Create product')) as
      HTMLButtonElement | undefined;
    create?.click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector(
      '[role="dialog"]',
    ) as HTMLElement;
    expect(dialog.textContent).toContain('Create product');
    const submit = dialog.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('ADMUI-007 keeps a duplicate Product conflict recoverable', () => {
    service.createProduct.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
            error: { error: 'resource already exists' },
          }),
      ),
    );
    const create = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Create product')) as
      HTMLButtonElement | undefined;
    create?.click();
    fixture.detectChanges();
    for (const [control, value] of [
      ['slug', 'invoice-api'],
      ['name', 'Invoice API'],
    ]) {
      const input = fixture.nativeElement.querySelector(
        `[formcontrolname="${control}"]`,
      ) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    const submit = fixture.nativeElement.querySelector(
      '.dialog button[type="submit"]',
    ) as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="dialog"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'resource already exists',
    );
  });

  it('ADMUI-007 keeps a stale Product update conflict recoverable', () => {
    service.updateProduct.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
            error: { error: 'product was modified by another request' },
          }),
      ),
    );
    const productButton = fixture.nativeElement.querySelector(
      '.resource-list button',
    ) as HTMLButtonElement;
    productButton.click();
    fixture.detectChanges();
    const edit = Array.from(
      fixture.nativeElement.querySelectorAll('.detail-panel button'),
    ).find((button) => button.textContent?.includes('Edit')) as
      HTMLButtonElement | undefined;
    edit?.click();
    fixture.detectChanges();
    const submit = fixture.nativeElement.querySelector(
      '.dialog button[type="submit"]',
    ) as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="dialog"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'product was modified by another request',
    );
  });

  it('ADMUI-008 confirms before archiving a Product', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const productButton = fixture.nativeElement.querySelector(
      '.resource-list button',
    ) as HTMLButtonElement;
    productButton.click();
    fixture.detectChanges();
    const archive = Array.from(
      fixture.nativeElement.querySelectorAll('.detail-panel button'),
    ).find((button) => button.textContent?.includes('Archive')) as
      HTMLButtonElement | undefined;
    archive?.click();
    expect(confirm).toHaveBeenCalledOnce();
    expect(service.updateProduct).toHaveBeenCalledWith(product.id, {
      version: product.version,
      active: false,
    });
    confirm.mockRestore();
  });

  it('ADMUI-011 loads inactive-capable Plans after Product selection', () => {
    const productButton = fixture.nativeElement.querySelector(
      '.resource-list button',
    ) as HTMLButtonElement;
    productButton.click();
    fixture.detectChanges();
    expect(service.listPlans).toHaveBeenCalledWith(product.id, {
      status: 'all',
      limit: 200,
      offset: 0,
    });
    expect(fixture.nativeElement.textContent).toContain('Professional');
  });

  it('ADMUI-009 and ADMUI-010 validates and converts Plan form values', () => {
    const productButton = fixture.nativeElement.querySelector(
      '.resource-list button',
    ) as HTMLButtonElement;
    productButton.click();
    fixture.detectChanges();
    const createPlan = Array.from(
      fixture.nativeElement.querySelectorAll('.detail-panel button'),
    ).find((button) => button.textContent?.includes('Create plan')) as
      HTMLButtonElement | undefined;
    createPlan?.click();
    fixture.detectChanges();

    const setValue = (control: string, value: string): void => {
      const input = fixture.nativeElement.querySelector(
        `[formcontrolname="${control}"]`,
      ) as HTMLInputElement | HTMLTextAreaElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    setValue('slug', 'team-plan');
    setValue('name', 'Team Plan');
    setValue('price', '12.34');
    setValue('entitlements', '{"reports":true,"users":5}');
    fixture.detectChanges();
    const submit = fixture.nativeElement.querySelector(
      '.dialog button[type="submit"]',
    ) as HTMLButtonElement;
    submit.click();

    expect(service.createPlan).toHaveBeenCalledWith(product.id, {
      slug: 'team-plan',
      name: 'Team Plan',
      price_minor: 1234,
      currency: 'INR',
      included_credits: 0,
      entitlements: { reports: true, users: 5 },
      billing_interval: 'monthly',
      active: true,
    });
  });

  it('ADMUI-014 closes an editor with Escape', () => {
    const create = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Create product')) as
      HTMLButtonElement | undefined;
    create?.click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector(
      '[role="dialog"]',
    ) as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
});
