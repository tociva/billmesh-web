import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import { DEFAULT_BILLING_POLICY, type Product } from '@billmesh/domain';
import { of } from 'rxjs';
import { CatalogueComponent } from './catalogue.component';

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

describe('CatalogueComponent', () => {
  let fixture: ComponentFixture<CatalogueComponent>;
  const service = {
    listProducts: vi.fn(() =>
      of({ items: [product], total: 1, limit: 25, offset: 0 }),
    ),
    updateProduct: vi.fn(() => of({ ...product, active: true })),
  };

  beforeEach(async () => {
    service.listProducts.mockClear();
    service.updateProduct.mockClear();
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

  it('loads the first product page from the server', () => {
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
    expect(
      fixture.nativeElement.querySelector('billmesh-filter-popover'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tng-paginator')).not.toBeNull();
  });
});
