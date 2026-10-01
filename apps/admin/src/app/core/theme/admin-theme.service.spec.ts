import { TestBed } from '@angular/core/testing';
import { AdminThemeService } from './admin-theme.service';

describe('AdminThemeService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('defaults to the light Slate preset', () => {
    const service = TestBed.inject(AdminThemeService);
    TestBed.flushEffects();

    expect(service.colorMode()).toBe('light');
    expect(service.themeName()).toBe('slate');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('applies and persists color mode and preset changes', () => {
    const service = TestBed.inject(AdminThemeService);

    service.setColorMode('dark');
    service.setThemeName('atlas');
    TestBed.flushEffects();

    expect(service.colorMode()).toBe('dark');
    expect(service.themeName()).toBe('atlas');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(
      JSON.parse(localStorage.getItem('billmesh-admin:theme') ?? '{}'),
    ).toEqual({ colorMode: 'dark', themeName: 'atlas' });
  });

  it('restores a valid saved preference', () => {
    localStorage.setItem(
      'billmesh-admin:theme',
      JSON.stringify({ colorMode: 'dark', themeName: 'prism' }),
    );

    const service = TestBed.inject(AdminThemeService);

    expect(service.colorMode()).toBe('dark');
    expect(service.themeName()).toBe('prism');
  });
});
