import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthStore } from '@billmesh/auth';
import { AdminShellComponent } from './admin-shell.component';

type ShellInstance = {
  currentPageTitle: () => string;
  currentUrl: { set: (value: string) => void };
  isRouteActive: (path: string) => boolean;
  onProfileMenuSelect: (event: { value: string }) => void;
};

describe('AdminShellComponent', () => {
  let fixture: ComponentFixture<AdminShellComponent>;
  const logout = vi.fn();

  beforeEach(async () => {
    logout.mockReset();

    await TestBed.configureTestingModule({
      imports: [AdminShellComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            currentUser: signal({
              email: 'operator@billme.sh',
              name: 'Avery Operator',
              subject: 'user-1',
            }),
            logout,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();
  });

  it('keeps the header and left navigation around routed content', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.workspace-header')).not.toBeNull();
    expect(compiled.querySelector('.workspace-sidebar')).not.toBeNull();
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.textContent).toContain('Overview');
    expect(compiled.textContent).toContain('Catalogue');
    expect(compiled.textContent).toContain('Settings');
    expect(compiled.textContent).toContain('Avery Operator');
    expect(compiled.textContent).toContain('Administrator');
  });

  it('links the sidebar credit to Tociva', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const credit =
      compiled.querySelector<HTMLAnchorElement>('.sidebar-footer a');

    expect(compiled.textContent).toContain('Built and maintained by');
    expect(credit?.textContent).toContain('Tociva Private Limited');
    expect(credit?.href).toBe('https://tociva.com/');
    expect(credit?.target).toBe('_blank');
    expect(credit?.rel).toContain('noopener');
  });

  it.each([
    ['/app', 'Overview'],
    ['/app/catalogue', 'Catalogue'],
    ['/app/settings', 'Settings'],
  ])('computes navigation state for %s', (path, title) => {
    const component = fixture.componentInstance as unknown as ShellInstance;

    component.currentUrl.set(path);

    expect(component.currentPageTitle()).toBe(title);
    expect(component.isRouteActive(path)).toBe(true);
  });

  it('signs out only through the profile menu command', () => {
    const component = fixture.componentInstance as unknown as ShellInstance;
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.profile-trigger')).not.toBeNull();
    expect(compiled.textContent).toContain('Sign out');

    component.onProfileMenuSelect({ value: 'sign-out' });

    expect(logout).toHaveBeenCalledOnce();
  });

  it('opens settings from the profile menu command', () => {
    const component = fixture.componentInstance as unknown as ShellInstance;
    const router = TestBed.inject(Router);
    const navigate = vi
      .spyOn(router, 'navigateByUrl')
      .mockResolvedValueOnce(true);

    component.onProfileMenuSelect({ value: 'settings' });

    expect(navigate).toHaveBeenCalledWith('/app/settings');
    expect(logout).not.toHaveBeenCalled();
  });
});
