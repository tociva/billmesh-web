import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminThemeService } from './core/theme/admin-theme.service';

@Component({
  selector: 'billmesh-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  constructor() {
    inject(AdminThemeService);
  }
}
