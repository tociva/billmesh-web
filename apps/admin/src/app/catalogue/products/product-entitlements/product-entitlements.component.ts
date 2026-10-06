import { NgTemplateOutlet } from '@angular/common';
import { Component, Input, type OnChanges } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormControl,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import type {
  EntitlementField,
  EntitlementFieldType,
  EntitlementSchema,
} from '@billmesh/domain';
import {
  TngButtonComponent,
  TngCheckboxAngularFormsAdapter,
  TngCheckboxComponent,
  TngInputAngularFormsAdapter,
  TngInputComponent,
  TngSelectComponent,
} from '@tailng-ui/components';

@Component({
  selector: 'billmesh-product-entitlements',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    TngButtonComponent,
    TngCheckboxAngularFormsAdapter,
    TngCheckboxComponent,
    TngInputAngularFormsAdapter,
    TngInputComponent,
    TngSelectComponent,
  ],
  templateUrl: './product-entitlements.component.html',
  styleUrl: '../../catalogue.shared.css',
})
export class ProductEntitlementsComponent implements OnChanges {
  @Input() schema: EntitlementSchema = { fields: [] };

  protected fields = new UntypedFormArray([]);
  protected readonly types: readonly {
    value: EntitlementFieldType;
    label: string;
  }[] = [
    { value: 'boolean', label: 'Boolean' },
    { value: 'integer', label: 'Whole number' },
    { value: 'number', label: 'Number' },
    { value: 'string', label: 'Text' },
    { value: 'select', label: 'Choice' },
    { value: 'object', label: 'Field group' },
    { value: 'array', label: 'Repeatable list' },
  ];
  protected readonly booleanOptions = [
    { value: true, label: 'Enabled' },
    { value: false, label: 'Disabled' },
  ] as const;

  ngOnChanges(): void {
    this.fields = new UntypedFormArray(
      this.schema.fields.map((field) => this.createField(field, false)),
    );
  }

  get valid(): boolean {
    return (
      this.fields.valid &&
      this.keysAreUnique(this.fields) &&
      this.fields.controls.every((field) =>
        this.fieldIsValid(this.asGroup(field)),
      )
    );
  }

  markAllAsTouched(): void {
    this.fields.markAllAsTouched();
  }

  value(): EntitlementSchema {
    return {
      fields: this.fields.controls.map((control) =>
        this.serializeField(control as UntypedFormGroup, false),
      ),
    };
  }

  protected asGroup(value: unknown): UntypedFormGroup {
    return value as UntypedFormGroup;
  }

  protected asArray(value: unknown): UntypedFormArray {
    return value as UntypedFormArray;
  }

  protected control(group: UntypedFormGroup, name: string): UntypedFormControl {
    return group.controls[name] as UntypedFormControl;
  }

  protected fieldType(group: UntypedFormGroup): EntitlementFieldType {
    return this.control(group, 'type').value as EntitlementFieldType;
  }

  protected addField(target: UntypedFormArray = this.fields): void {
    target.push(this.createField(undefined, false));
  }

  protected removeField(target: UntypedFormArray, index: number): void {
    target.removeAt(index);
  }

  protected moveField(
    target: UntypedFormArray,
    index: number,
    direction: -1 | 1,
  ): void {
    const destination = index + direction;
    if (destination < 0 || destination >= target.length) return;
    const control = target.at(index);
    target.removeAt(index);
    target.insert(destination, control);
  }

  protected addOption(group: UntypedFormGroup): void {
    this.options(group).push(this.createOption());
  }

  protected removeOption(group: UntypedFormGroup, index: number): void {
    this.options(group).removeAt(index);
  }

  protected options(group: UntypedFormGroup): UntypedFormArray {
    return group.controls['options'] as UntypedFormArray;
  }

  protected selectOptions(
    group: UntypedFormGroup,
  ): readonly { value: string; label: string }[] {
    return this.options(group).controls.map((option) => {
      const optionGroup = this.asGroup(option);
      const value = String(this.control(optionGroup, 'value').value ?? '');
      return {
        value,
        label: String(this.control(optionGroup, 'label').value ?? '') || value,
      };
    });
  }

  protected updateControl(control: UntypedFormControl, value: unknown): void {
    control.setValue(value);
    control.markAsDirty();
  }

  protected nestedFields(group: UntypedFormGroup): UntypedFormArray {
    return group.controls['fields'] as UntypedFormArray;
  }

  protected item(group: UntypedFormGroup): UntypedFormGroup {
    if (!group.controls['items']) {
      group.addControl('items', this.createField(undefined, true));
    }
    return group.controls['items'] as UntypedFormGroup;
  }

  protected onTypeChange(group: UntypedFormGroup): void {
    if (
      this.fieldType(group) === 'select' &&
      this.options(group).length === 0
    ) {
      this.addOption(group);
    }
    if (this.fieldType(group) === 'array' && !group.controls['items']) {
      group.addControl('items', this.createField(undefined, true));
    }
  }

  protected duplicateKeys(target: UntypedFormArray): boolean {
    return !this.keysAreUnique(target);
  }

  protected fieldCount(target: UntypedFormArray): number {
    return target.length;
  }

  private createField(
    field: EntitlementField | undefined,
    item: boolean,
  ): UntypedFormGroup {
    const type = field?.type ?? 'boolean';
    const defaultPresent =
      field !== undefined &&
      Object.prototype.hasOwnProperty.call(field, 'default');
    const group = new UntypedFormGroup({
      key: new UntypedFormControl(
        field?.key ?? '',
        item
          ? []
          : [Validators.required, Validators.pattern(/^[a-z][a-z0-9_]{0,62}$/)],
      ),
      label: new UntypedFormControl(
        field?.label ?? '',
        item ? [] : [Validators.required, Validators.maxLength(120)],
      ),
      description: new UntypedFormControl(field?.description ?? '', [
        Validators.maxLength(500),
      ]),
      type: new UntypedFormControl(type, Validators.required),
      required: new UntypedFormControl(field?.required ?? false),
      nullable: new UntypedFormControl(field?.nullable ?? false),
      defaultEnabled: new UntypedFormControl(defaultPresent),
      defaultValue: new UntypedFormControl(this.defaultEditorValue(field)),
      minimum: new UntypedFormControl(field?.minimum ?? null),
      maximum: new UntypedFormControl(field?.maximum ?? null),
      minLength: new UntypedFormControl(field?.min_length ?? null),
      maxLength: new UntypedFormControl(field?.max_length ?? null),
      minItems: new UntypedFormControl(field?.min_items ?? null),
      maxItems: new UntypedFormControl(field?.max_items ?? null),
      options: new UntypedFormArray(
        (field?.options ?? []).map((option) => this.createOption(option)),
      ),
      fields: new UntypedFormArray(
        (field?.fields ?? []).map((child) => this.createField(child, false)),
      ),
    });
    if (type === 'array') {
      group.addControl('items', this.createField(field?.items, true));
    }
    return group;
  }

  private createOption(option?: {
    label: string;
    value: string;
  }): UntypedFormGroup {
    return new UntypedFormGroup({
      label: new UntypedFormControl(option?.label ?? '', Validators.required),
      value: new UntypedFormControl(option?.value ?? '', Validators.required),
    });
  }

  private defaultEditorValue(field?: EntitlementField): unknown {
    if (!field || !Object.prototype.hasOwnProperty.call(field, 'default'))
      return '';
    return field.default;
  }

  private serializeField(
    group: UntypedFormGroup,
    item: boolean,
  ): EntitlementField {
    const raw = group.getRawValue();
    const type = raw.type as EntitlementFieldType;
    const field: Record<string, unknown> = { type };
    if (!item) {
      field['key'] = String(raw.key).trim();
      field['label'] = String(raw.label).trim();
    }
    const description = String(raw.description ?? '').trim();
    if (description) field['description'] = description;
    if (raw.required) field['required'] = true;
    if (raw.nullable) field['nullable'] = true;
    if (raw.defaultEnabled)
      field['default'] = this.parseDefault(type, raw.defaultValue);
    if (type === 'integer' || type === 'number') {
      if (raw.minimum !== null && raw.minimum !== '')
        field['minimum'] = Number(raw.minimum);
      if (raw.maximum !== null && raw.maximum !== '')
        field['maximum'] = Number(raw.maximum);
    }
    if (type === 'string') {
      if (raw.minLength !== null && raw.minLength !== '')
        field['min_length'] = Number(raw.minLength);
      if (raw.maxLength !== null && raw.maxLength !== '')
        field['max_length'] = Number(raw.maxLength);
    }
    if (type === 'select') {
      field['options'] = this.options(group).controls.map((option) => ({
        label: String(this.control(this.asGroup(option), 'label').value).trim(),
        value: String(this.control(this.asGroup(option), 'value').value).trim(),
      }));
    }
    if (type === 'object') {
      field['fields'] = this.nestedFields(group).controls.map((child) =>
        this.serializeField(this.asGroup(child), false),
      );
    }
    if (type === 'array') {
      if (raw.minItems !== null && raw.minItems !== '')
        field['min_items'] = Number(raw.minItems);
      if (raw.maxItems !== null && raw.maxItems !== '')
        field['max_items'] = Number(raw.maxItems);
      field['items'] = this.serializeField(this.item(group), true);
    }
    return field as unknown as EntitlementField;
  }

  private parseDefault(type: EntitlementFieldType, value: unknown): unknown {
    if (value === null) return null;
    if (type === 'boolean') return Boolean(value);
    if (type === 'integer' || type === 'number') return Number(value);
    if (type === 'object') return {};
    if (type === 'array') return [];
    return String(value ?? '');
  }

  private keysAreUnique(target: UntypedFormArray): boolean {
    const keys = target.controls.map((field) =>
      String(this.control(this.asGroup(field), 'key').value).trim(),
    );
    if (new Set(keys.filter(Boolean)).size !== keys.filter(Boolean).length)
      return false;
    return target.controls.every((control) => {
      const group = this.asGroup(control);
      const type = this.fieldType(group);
      return type !== 'object' || this.keysAreUnique(this.nestedFields(group));
    });
  }

  private fieldIsValid(group: UntypedFormGroup): boolean {
    const raw = group.getRawValue();
    const type = this.fieldType(group);
    if (
      (type === 'integer' || type === 'number') &&
      raw.minimum !== null &&
      raw.minimum !== '' &&
      raw.maximum !== null &&
      raw.maximum !== '' &&
      Number(raw.minimum) > Number(raw.maximum)
    ) {
      return false;
    }
    if (type === 'select') {
      const values = this.options(group).controls.map((option) =>
        String(this.control(this.asGroup(option), 'value').value).trim(),
      );
      if (
        values.length === 0 ||
        values.some((value) => !value) ||
        new Set(values).size !== values.length
      ) {
        return false;
      }
      if (raw.defaultEnabled && !values.includes(String(raw.defaultValue))) {
        return false;
      }
    }
    if (type === 'object') {
      return (
        this.keysAreUnique(this.nestedFields(group)) &&
        this.nestedFields(group).controls.every((field) =>
          this.fieldIsValid(this.asGroup(field)),
        )
      );
    }
    if (type === 'array') {
      if (
        raw.minItems !== null &&
        raw.minItems !== '' &&
        raw.maxItems !== null &&
        raw.maxItems !== '' &&
        Number(raw.minItems) > Number(raw.maxItems)
      ) {
        return false;
      }
      return this.fieldIsValid(this.item(group));
    }
    return true;
  }
}
