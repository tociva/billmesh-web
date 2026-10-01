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
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
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
