import type { EntitlementSchema } from '@billmesh/domain';
import { PlanEntitlementsComponent } from './plan-entitlements.component';

describe('PlanEntitlementsComponent', () => {
  const schema: EntitlementSchema = {
    fields: [
      {
        key: 'reports',
        label: 'Reports',
        type: 'boolean',
        required: true,
        default: true,
      },
      {
        key: 'members',
        label: 'Maximum members',
        type: 'integer',
        required: true,
        default: 5,
        minimum: 0,
      },
      {
        key: 'policy',
        label: 'Policy',
        type: 'object',
        fields: [
          {
            key: 'mode',
            label: 'Mode',
            type: 'select',
            required: true,
            default: 'strict',
            options: [{ label: 'Strict', value: 'strict' }],
          },
        ],
      },
    ],
  };

  it('builds typed entitlement values from product defaults', () => {
    const component = new PlanEntitlementsComponent();
    component.schema = schema;
    component.ngOnChanges();

    expect(component.valid).toBe(true);
    expect(component.value()).toEqual({
      reports: true,
      members: 5,
      policy: { mode: 'strict' },
    });
  });

  it('preserves values when editing a plan', () => {
    const component = new PlanEntitlementsComponent();
    component.schema = schema;
    component.entitlements = {
      reports: false,
      members: 12,
      policy: { mode: 'strict' },
    };
    component.ngOnChanges();

    expect(component.value()).toEqual(component.entitlements);
  });
});
