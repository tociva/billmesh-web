import { TestBed } from '@angular/core/testing';
import {
  AuthService,
  AuthStore,
  BrowserSessionStateService,
  type BrowserSession,
} from '@billmesh/auth';
import { AppConfigStore } from '@billmesh/config';

describe('Admin session authorization contract', () => {
  it('treats a verified session as authenticated without custom permissions', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {},
        },
        {
          provide: AppConfigStore,
          useValue: {},
        },
      ],
    });

    const sessionState = TestBed.inject(BrowserSessionStateService);
    const authStore = TestBed.inject(AuthStore);
    const adminSession: BrowserSession = {
      authenticated: true,
      context: {
        application: 'daybook',
        environment: 'development',
        organization_id: 'org-1',
      },
      csrfToken: 'csrf-value',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        email: 'admin@example.test',
        name: 'Admin User',
        subject: 'user-1',
      },
    };

    sessionState.set(adminSession);

    expect(authStore.isAuthenticated()).toBe(true);
    expect(authStore.permissions()).toEqual([]);
  });
});
