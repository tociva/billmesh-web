import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogueAdminService } from '@billmesh/api-client';
import {
  BrowserSessionStateService,
  browserSessionInterceptor,
  type BrowserSession,
} from '@billmesh/auth';
import { AppConfigStore, type AppConfig } from '@billmesh/config';

const config: AppConfig = {
  apiBaseUrl: 'https://api-local.billme.sh/api/v1',
  auth: { bffBaseUrl: 'https://api-local.billme.sh/api/v1/auth/admin' },
};

const session: BrowserSession = {
  authenticated: true,
  context: { application: '', environment: '', organization_id: '' },
  csrfToken: 'admin-csrf',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  permissions: ['billing:admin'],
  user: {
    email: 'admin@example.test',
    name: 'Admin User',
    subject: 'admin-1',
  },
};

describe('CatalogueAdminService', () => {
  let catalogue: CatalogueAdminService;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([browserSessionInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AppConfigStore,
          useValue: {
            activeApiBaseUrl: () => config.apiBaseUrl,
            config: () => config,
          },
        },
      ],
    });
    TestBed.inject(BrowserSessionStateService).set(session);
    catalogue = TestBed.inject(CatalogueAdminService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('ADMUI-001 sends Product filters and detail calls', () => {
    catalogue
      .listProducts({
        status: 'archived',
        query: 'invoice api',
        limit: 25,
        offset: 50,
      })
      .subscribe();
    const list = requests.expectOne(
      'https://api-local.billme.sh/api/v1/admin/products?status=archived&query=invoice+api&limit=25&offset=50',
    );
    expect(list.request.method).toBe('GET');
    expect(list.request.withCredentials).toBe(true);
    expect(list.request.headers.has('X-CSRF-Token')).toBe(false);
    list.flush([]);

    catalogue.getProduct('product-1').subscribe();
    requests
      .expectOne('https://api-local.billme.sh/api/v1/admin/products/product-1')
      .flush({});
  });

  it('ADMUI-001 creates and patches Products with CSRF', () => {
    catalogue
      .createProduct({ slug: 'invoice-api', name: 'Invoice API' })
      .subscribe();
    const create = requests.expectOne(
      'https://api-local.billme.sh/api/v1/admin/products',
    );
    expect(create.request.method).toBe('POST');
    expect(create.request.headers.get('X-CSRF-Token')).toBe('admin-csrf');
    expect(create.request.withCredentials).toBe(true);
    create.flush({});

    catalogue
      .updateProduct('product-1', { version: 3, active: false })
      .subscribe();
    const update = requests.expectOne(
      'https://api-local.billme.sh/api/v1/admin/products/product-1',
    );
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ version: 3, active: false });
    expect(update.request.headers.get('X-CSRF-Token')).toBe('admin-csrf');
    update.flush({});
  });

  it('ADMUI-002 sends nested Plan list, create, detail, and update calls', () => {
    catalogue.listPlans('product/unsafe', { status: 'inactive' }).subscribe();
    requests
      .expectOne(
        'https://api-local.billme.sh/api/v1/admin/products/product%2Funsafe/plans?status=inactive',
      )
      .flush([]);

    catalogue
      .createPlan('product-1', {
        slug: 'professional',
        name: 'Professional',
        price_minor: 9900,
        currency: 'INR',
        included_credits: 100,
        entitlements: { reports: true },
        billing_interval: 'monthly',
      })
      .subscribe();
    const create = requests.expectOne(
      'https://api-local.billme.sh/api/v1/admin/products/product-1/plans',
    );
    expect(create.request.method).toBe('POST');
    expect(create.request.headers.get('X-CSRF-Token')).toBe('admin-csrf');
    create.flush({});

    catalogue.getPlan('plan-1').subscribe();
    requests
      .expectOne('https://api-local.billme.sh/api/v1/admin/plans/plan-1')
      .flush({});

    catalogue.updatePlan('plan-1', { version: 2, active: false }).subscribe();
    const update = requests.expectOne(
      'https://api-local.billme.sh/api/v1/admin/plans/plan-1',
    );
    expect(update.request.method).toBe('PATCH');
    expect(update.request.headers.get('X-CSRF-Token')).toBe('admin-csrf');
    update.flush({});
  });
});
