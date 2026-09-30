import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  AuthService,
  BrowserSessionStateService,
  browserSessionInterceptor,
  type BrowserSession,
} from '@billmesh/auth';
import { AppConfigStore, type AppConfig } from '@billmesh/config';

const config: AppConfig = {
  apiBaseUrl: 'https://api-local.billme.sh/api/v1',
  auth: {
    bffBaseUrl: 'https://api-local.billme.sh/api/v1/auth/console',
  },
};

const session: BrowserSession = {
  authenticated: true,
  context: {
    application: 'daybook',
    environment: 'development',
    organization_id: 'org-1',
  },
  csrfToken: 'csrf-value',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  permissions: ['billing:read'],
  user: {
    email: 'person@example.test',
    name: 'Billmesh Person',
    subject: 'user-1',
  },
};

describe('BFF browser contract', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let sessionState: BrowserSessionStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([browserSessionInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AppConfigStore,
          useValue: { config: () => config },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    sessionState = TestBed.inject(BrowserSessionStateService);
    sessionState.set(session);
  });

  afterEach(() => requests.verify());

  it('uses the opaque session cookie and CSRF projection for unsafe API calls', () => {
    http.post('https://api-local.billme.sh/api/v1/accounts', {}).subscribe();

    const request = requests.expectOne(
      'https://api-local.billme.sh/api/v1/accounts',
    );
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('csrf-value');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not expose session material to an unrelated origin', () => {
    http.post('https://files.example.test/upload', {}).subscribe();

    const request = requests.expectOne('https://files.example.test/upload');
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.headers.has('X-CSRF-Token')).toBe(false);
    request.flush({});
  });

  it('clears the in-memory session projection after an unauthorized response', () => {
    http
      .get('https://api-local.billme.sh/api/v1/accounts/current')
      .subscribe({ error: () => undefined });

    requests
      .expectOne('https://api-local.billme.sh/api/v1/accounts/current')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(sessionState.session()).toBeNull();
  });

  it('rejects external and protocol-relative return paths', () => {
    const service = TestBed.inject(AuthService);

    expect(service.safeReturnPath('//evil.example/path')).toBe('/app');
    expect(service.safeReturnPath('https://evil.example/path')).toBe('/app');
    expect(service.safeReturnPath('/application')).toBe('/app');
    expect(service.safeReturnPath('/app?tab=usage')).toBe('/app?tab=usage');
  });
});
