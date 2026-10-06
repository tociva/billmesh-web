import { Component } from '@angular/core';
import { ProductConfigurationComponent } from '../product-configuration/product-configuration.component';

@Component({
  selector: 'billmesh-product-create',
  imports: [ProductConfigurationComponent],
  template: '<billmesh-product-configuration />',
})
export class ProductCreateComponent {}
