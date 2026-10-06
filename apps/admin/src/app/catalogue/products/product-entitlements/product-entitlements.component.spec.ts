import type { EntitlementSchema } from '@billmesh/domain';
import { ProductEntitlementsComponent } from './product-entitlements.component';

describe('ProductEntitlementsComponent', () => {
  it('round-trips an ordered recursive schema without JSON editing', () => {
    const schema: EntitlementSchema = {
      fields: [
        {
          key: 'regions',
          label: 'Regions',
          description: 'Enabled deployment regions.',
          type: 'array',
          min_items: 1,
          items: { type: 'string' },
        },
        {
          key: 'workflow_execution',
          label: 'Workflow execution',
          type: 'boolean',
          required: true,
          default: true,
        },
      ],
    };
    const component = new ProductEntitlementsComponent();
    component.schema = schema;
    component.ngOnChanges();

    expect(component.valid).toBe(true);
    expect(component.value()).toEqual(schema);
  });
});
