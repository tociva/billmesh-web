import { Component } from '@angular/core';
import { PlanConfigurationComponent } from '../plan-configuration/plan-configuration.component';

@Component({
  selector: 'billmesh-plan-create',
  imports: [PlanConfigurationComponent],
  template: '<billmesh-plan-configuration />',
})
export class PlanCreateComponent {}
