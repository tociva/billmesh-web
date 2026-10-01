import { Injectable, effect, signal } from '@angular/core';
import {
  applyTailngTheme,
  atlasDarkThemePreset,
  atlasThemePreset,
  defaultDarkThemePreset,
  defaultThemePreset,
  minimalDarkThemePreset,
  minimalThemePreset,
  nexusDarkThemePreset,
  nexusThemePreset,
  prismDarkThemePreset,
  prismThemePreset,
  slateDarkThemePreset,
  slateThemePreset,
  sterlingDarkThemePreset,
  sterlingThemePreset,
} from '@tailng-ui/theme';

export type AdminColorMode = 'light' | 'dark';
export type AdminThemeName =
  'default' | 'minimal' | 'slate' | 'nexus' | 'prism' | 'atlas' | 'sterling';

export interface AdminThemeOption {
  readonly description: string;
  readonly label: string;
  readonly value: AdminThemeName;
}

export const ADMIN_THEME_OPTIONS: readonly AdminThemeOption[] = [
  {
    value: 'default',
    label: 'Default',
    description: 'Balanced spacing and expressive accents.',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Compact, low-contrast application surfaces.',
  },
  {
    value: 'slate',
    label: 'Slate',
    description: 'Quiet neutrals for operational dashboards.',
  },
  {
    value: 'nexus',
    label: 'Nexus',
    description: 'Modern accents with a little more energy.',
  },
  {
    value: 'prism',
    label: 'Prism',
    description: 'Sharper contrast and brighter accents.',
  },
  {
    value: 'atlas',
    label: 'Atlas',
    description: 'Grounded teal-led operational tones.',
  },
  {
    value: 'sterling',
    label: 'Sterling',
    description: 'Refined contrast for editorial surfaces.',
  },
];

const THEME_STORAGE_KEY = 'billmesh-admin:theme';
const DEFAULT_COLOR_MODE: AdminColorMode = 'light';
const DEFAULT_THEME_NAME: AdminThemeName = 'slate';
const VALID_THEME_NAMES = new Set<AdminThemeName>(
  ADMIN_THEME_OPTIONS.map((option) => option.value),
);

const THEME_PRESETS = {
  default: { light: defaultThemePreset, dark: defaultDarkThemePreset },
  minimal: { light: minimalThemePreset, dark: minimalDarkThemePreset },
  slate: { light: slateThemePreset, dark: slateDarkThemePreset },
  nexus: { light: nexusThemePreset, dark: nexusDarkThemePreset },
  prism: { light: prismThemePreset, dark: prismDarkThemePreset },
  atlas: { light: atlasThemePreset, dark: atlasDarkThemePreset },
  sterling: { light: sterlingThemePreset, dark: sterlingDarkThemePreset },
} as const;

interface PersistedTheme {
  readonly colorMode: AdminColorMode;
  readonly themeName: AdminThemeName;
}

function defaultPreference(): PersistedTheme {
  return {
    colorMode: DEFAULT_COLOR_MODE,
    themeName: DEFAULT_THEME_NAME,
  };
}

function readPreference(): PersistedTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return defaultPreference();

    const parsed = JSON.parse(raw) as Partial<PersistedTheme>;
    return {
      colorMode:
        parsed.colorMode === 'light' || parsed.colorMode === 'dark'
          ? parsed.colorMode
          : DEFAULT_COLOR_MODE,
      themeName:
        typeof parsed.themeName === 'string' &&
        VALID_THEME_NAMES.has(parsed.themeName as AdminThemeName)
          ? (parsed.themeName as AdminThemeName)
          : DEFAULT_THEME_NAME,
    };
  } catch {
    return defaultPreference();
  }
}

function persistPreference(preference: PersistedTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Theme changes still apply when browser storage is unavailable.
  }
}

@Injectable({ providedIn: 'root' })
export class AdminThemeService {
  private readonly initialPreference = readPreference();

  readonly colorMode = signal<AdminColorMode>(this.initialPreference.colorMode);
  readonly themeName = signal<AdminThemeName>(this.initialPreference.themeName);

  constructor() {
    effect(() => {
      const colorMode = this.colorMode();
      const themeName = this.themeName();
      applyTailngTheme(THEME_PRESETS[themeName][colorMode]);

      if (typeof document !== 'undefined') {
        document.documentElement.dataset['theme'] = colorMode;
      }
    });
  }

  setColorMode(colorMode: AdminColorMode): void {
    this.colorMode.set(colorMode);
    persistPreference({ colorMode, themeName: this.themeName() });
  }

  setThemeName(themeName: AdminThemeName): void {
    this.themeName.set(themeName);
    persistPreference({ colorMode: this.colorMode(), themeName });
  }
}
