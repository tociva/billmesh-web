import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'billmesh-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {}
