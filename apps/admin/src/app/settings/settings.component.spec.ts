import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { AdminThemeService } from '../core/theme/admin-theme.service';
import { SettingsComponent } from './settings.component';

type SettingsInstance = {
  changeColorMode: (value: unknown) => void;
  changeTheme: (value: unknown) => void;
};

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  const setColorMode = vi.fn();
  const setThemeName = vi.fn();

  beforeEach(async () => {
    setColorMode.mockReset();
    setThemeName.mockReset();

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        {
          provide: AdminThemeService,
          useValue: {
            colorMode: signal('light'),
            setColorMode,
            setThemeName,
            themeName: signal('slate'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
  });

  it('uses Tailng controls for color mode and theme selection', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Appearance');
    expect(compiled.textContent).toContain('Light');
    expect(compiled.textContent).toContain('Dark');
    expect(compiled.querySelector('tng-button-toggle-group')).not.toBeNull();
    expect(compiled.querySelector('tng-select')).not.toBeNull();
  });

  it('forwards valid appearance selections to the theme service', () => {
    const component = fixture.componentInstance as unknown as SettingsInstance;

    component.changeColorMode('dark');
    component.changeTheme('atlas');

    expect(setColorMode).toHaveBeenCalledWith('dark');
    expect(setThemeName).toHaveBeenCalledWith('atlas');
  });
});
