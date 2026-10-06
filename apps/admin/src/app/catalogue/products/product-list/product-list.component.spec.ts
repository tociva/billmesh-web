import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import { DEFAULT_BILLING_POLICY, type Product } from '@billmesh/domain';
import { of } from 'rxjs';
import { ProductListComponent } from './product-list.component';

const product: Product = {
  id: 'product-1',
  slug: 'invoice-api',
  name: '<script>Invoice API</script>',
  description: '<img src=x onerror=alert(1)>',
  entitlement_schema: { fields: [] },
  entitlement_schema_version: 1,
  billing_policy: DEFAULT_BILLING_POLICY,
  billing_policy_version: 1,
  active: true,
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  const service = {
    listProducts: vi.fn(),
    updateProduct: vi.fn(() => of({ ...product, active: true })),
  };

  beforeEach(async () => {
    service.listProducts.mockClear();
    service.updateProduct.mockClear();
    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        provideRouter([]),
        { provide: CatalogueAdminService, useValue: service },
      ],
    }).compileComponents();
  });

  function render(products: readonly Product[] = [product]): void {
    service.listProducts.mockReturnValue(
      of({ items: products, total: products.length, limit: 25, offset: 0 }),
    );
    fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();
  }

  it('loads the first product page from the server', () => {
    render();
    expect(service.listProducts).toHaveBeenCalledWith({
      status: 'all',
      query: '',
      limit: 25,
      offset: 0,
      sort: 'slug',
      direction: 'asc',
    });
    expect(fixture.nativeElement.textContent).toContain(
      '<script>Invoice API</script>',
    );
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('uses the shared filter popover and TailNG paginator', () => {
    render();
    expect(
      fixture.nativeElement.querySelector('billmesh-filter-popover'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tng-paginator')).not.toBeNull();
  });

  it('shows a create action inside the table container when empty', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    render([]);

    const emptyState = fixture.nativeElement.querySelector(
      'tng-card .empty-state',
    ) as HTMLElement | null;
    expect(emptyState?.textContent).toContain('Create your first product');
    expect(emptyState?.textContent).toContain('Create product');
    expect(fixture.nativeElement.querySelector('tng-paginator')).toBeNull();

    const createButton = emptyState?.querySelector(
      'tng-button',
    ) as HTMLElement | null;
    createButton?.click();
    expect(navigate).toHaveBeenCalledWith(['/app/catalogue/create'], {
      queryParams: { burl: '/' },
    });
  });
});
