import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  type NavigationBehaviorOptions,
} from '@angular/router';
import { AuthService, AuthStore } from '@billmesh/auth';
import { vi } from 'vitest';
import { LandingComponent } from './landing.component';

describe('Admin LandingComponent', () => {
  const isAuthenticated = signal(false);
  const navigateByUrl =
    vi.fn<
      (url: string, extras?: NavigationBehaviorOptions) => Promise<boolean>
    >();
  const initialize = vi.fn<() => Promise<boolean>>();
  const login = vi.fn();

  async function render(queryParams: Record<string, string> = {}) {
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        {
          provide: AuthStore,
          useValue: {
            currentUser: signal({ email: 'admin@example.com' }),
            error: signal<string | null>(null),
            initialize,
            isAuthenticated,
            isLoading: signal(false),
            login,
            sessionChecked: signal(true),
          },
        },
        {
          provide: AuthService,
          useValue: {
            safeReturnPath(candidate: string): string {
              if (
                !candidate.startsWith('/app') ||
                candidate.startsWith('//') ||
                candidate.includes('\\')
              ) {
                return '/app';
              }
              return candidate;
            },
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(queryParams) },
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    }).compileComponents();

    TestBed.createComponent(LandingComponent).detectChanges();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    isAuthenticated.set(false);
    navigateByUrl.mockReset().mockResolvedValue(true);
    initialize.mockReset().mockResolvedValue(false);
    login.mockReset();
  });

  it('redirects an active session to the admin landing page', async () => {
    isAuthenticated.set(true);
    initialize.mockResolvedValue(true);

    await render();

    expect(navigateByUrl).toHaveBeenCalledWith('/app', { replaceUrl: true });
  });

  it('redirects an active session to a configured safe back URL', async () => {
    isAuthenticated.set(true);
    initialize.mockResolvedValue(true);

    await render({ backurl: '/app/catalogue?status=active' });

    expect(navigateByUrl).toHaveBeenCalledWith('/app/catalogue?status=active', {
      replaceUrl: true,
    });
  });

  it('falls back to the admin landing page for an unsafe back URL', async () => {
    isAuthenticated.set(true);
    initialize.mockResolvedValue(true);

    await render({ backurl: '//evil.example/app' });

    expect(navigateByUrl).toHaveBeenCalledWith('/app', { replaceUrl: true });
  });

  it('keeps an unauthenticated visitor on the sign-in page', async () => {
    await render({ backurl: '/app/catalogue' });

    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
