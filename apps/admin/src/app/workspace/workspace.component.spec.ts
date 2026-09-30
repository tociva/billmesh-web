import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { AuthStore } from '@billmesh/auth';
import { WorkspaceComponent } from './workspace.component';

describe('WorkspaceComponent', () => {
  let fixture: ComponentFixture<WorkspaceComponent>;
  const logout = vi.fn();

  beforeEach(async () => {
    logout.mockReset();

    await TestBed.configureTestingModule({
      imports: [WorkspaceComponent],
      providers: [
        {
          provide: AuthStore,
          useValue: {
            can: (permission: string) => permission === 'billing:admin',
            currentUser: signal({
              email: 'operator@billme.sh',
              name: 'Avery Operator',
              subject: 'user-1',
            }),
            logout,
            permissions: signal([
              'billing:read',
              'billing:write',
              'billing:admin',
            ]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
  });

  it('renders a useful authenticated admin home', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Avery');
    expect(text).toContain('Billing operations');
    expect(text).toContain('Accounts & subscriptions');
    expect(text).toContain('Credits & wallets');
    expect(text).toContain('3');
    expect(text).toContain('Administrator');
  });

  it('signs out from the workspace header', () => {
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((item) =>
      (item as HTMLElement).textContent?.includes('Sign out'),
    ) as HTMLButtonElement | undefined;

    expect(button).toBeTruthy();
    button?.click();

    expect(logout).toHaveBeenCalledOnce();
  });
});
