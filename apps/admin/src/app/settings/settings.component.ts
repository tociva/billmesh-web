import { Component, computed, inject } from '@angular/core';
import {
  TngButtonToggleComponent,
  TngButtonToggleGroupComponent,
  TngCardComponent,
  TngCardContentComponent,
  TngCardDescriptionComponent,
  TngCardHeaderComponent,
  TngCardTitleComponent,
  TngFormFieldComponent,
  TngLabelComponent,
  TngSelectComponent,
} from '@tailng-ui/components';
import {
  ADMIN_THEME_OPTIONS,
  AdminThemeService,
  type AdminThemeName,
  type AdminThemeOption,
} from '../core/theme/admin-theme.service';

@Component({
  selector: 'billmesh-admin-settings',
  imports: [
    TngButtonToggleComponent,
    TngButtonToggleGroupComponent,
    TngCardComponent,
    TngCardContentComponent,
    TngCardDescriptionComponent,
    TngCardHeaderComponent,
    TngCardTitleComponent,
    TngFormFieldComponent,
    TngLabelComponent,
    TngSelectComponent,
  ],
  template: `
    <main class="settings-page">
      <header>
        <p>Preferences</p>
        <h2>Settings</h2>
        <p>Choose the appearance of the Billmesh Admin workspace.</p>
      </header>

      <tng-card variant="outline" padding="lg">
        <tng-card-header>
          <tng-card-title>Appearance</tng-card-title>
          <tng-card-description>
            Changes apply immediately and are saved for this browser.
          </tng-card-description>
        </tng-card-header>

        <tng-card-content>
          <div class="appearance-controls">
            <tng-form-field labelPosition="above">
              <tng-label>Color mode</tng-label>
              <tng-button-toggle-group
                ariaLabel="Color mode"
                type="single"
                [value]="themeService.colorMode()"
                (valueChange)="changeColorMode($event)"
              >
                <tng-button-toggle value="light">Light</tng-button-toggle>
                <tng-button-toggle value="dark">Dark</tng-button-toggle>
              </tng-button-toggle-group>
            </tng-form-field>

            <tng-form-field labelPosition="above">
              <tng-label forId="admin-theme-select">Theme</tng-label>
              <tng-select
                id="admin-theme-select"
                placeholder="Select a theme"
                [options]="themeOptions"
                [getOptionLabel]="getThemeLabel"
                [getOptionValue]="getThemeValue"
                [trackBy]="trackThemeBy"
                [value]="themeService.themeName()"
                (valueChange)="changeTheme($event)"
              />
            </tng-form-field>

            <p>{{ selectedThemeDescription() }}</p>
          </div>
        </tng-card-content>
      </tng-card>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .settings-page {
      display: grid;
      gap: 1.25rem;
      width: min(48rem, 100%);
      margin: 0 auto;
      padding: clamp(1rem, 3vw, 2rem);
    }

    header h2,
    header p,
    .appearance-controls p {
      margin: 0;
    }

    header,
    .appearance-controls {
      display: grid;
      gap: 1rem;
    }
  `,
})
export class SettingsComponent {
  protected readonly themeService = inject(AdminThemeService);
  protected readonly themeOptions = ADMIN_THEME_OPTIONS;

  protected readonly selectedThemeDescription = computed(
    () =>
      this.themeOptions.find(
        (option) => option.value === this.themeService.themeName(),
      )?.description ?? '',
  );

  protected readonly getThemeLabel = (option: AdminThemeOption): string =>
    option.label;
  protected readonly getThemeValue = (
    option: AdminThemeOption,
  ): AdminThemeName => option.value;
  protected readonly trackThemeBy = (
    _index: number,
    option: AdminThemeOption,
  ): AdminThemeName => option.value;

  protected changeColorMode(value: unknown): void {
    if (value === 'light' || value === 'dark') {
      this.themeService.setColorMode(value);
    }
  }

  protected changeTheme(value: unknown): void {
    const themeName = this.themeOptions.find(
      (option) => option.value === value,
    )?.value;

    if (themeName) {
      this.themeService.setThemeName(themeName);
    }
  }
}
