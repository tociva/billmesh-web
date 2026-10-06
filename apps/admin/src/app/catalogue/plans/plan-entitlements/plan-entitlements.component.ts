import { NgTemplateOutlet } from '@angular/common';
import { Component, Input, type OnChanges } from '@angular/core';
import {
  type AbstractControl,
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormControl,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import type { EntitlementField, EntitlementSchema } from '@billmesh/domain';
import { TngButtonComponent } from '@tailng-ui/components';

@Component({
  selector: 'billmesh-plan-entitlements',
  imports: [NgTemplateOutlet, ReactiveFormsModule, TngButtonComponent],
  templateUrl: './plan-entitlements.component.html',
  styleUrl: '../../catalogue.shared.css',
})
export class PlanEntitlementsComponent implements OnChanges {
  @Input({ required: true }) schema: EntitlementSchema = { fields: [] };
  @Input() entitlements: Readonly<Record<string, unknown>> = {};

  protected form = new UntypedFormGroup({});

  ngOnChanges(): void {
    const controls: Record<
      string,
      UntypedFormControl | UntypedFormGroup | UntypedFormArray
    > = {};
    for (const field of this.schema.fields) {
      if (!field.key) continue;
      controls[field.key] = this.buildControl(
        field,
        this.entitlements[field.key],
      );
    }
    this.form = new UntypedFormGroup(controls);
  }

  get valid(): boolean {
    return this.form.valid;
  }

  protected legacyEntries(): readonly [string, unknown][] {
    return this.schema.fields.length === 0
      ? Object.entries(this.entitlements)
      : [];
  }

  protected displayValue(value: unknown): string {
    if (value === null) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    if (Array.isArray(value))
      return value.map((item) => this.displayValue(item)).join(', ');
    if (this.isObject(value)) {
      return Object.entries(value)
        .map(([key, item]) => `${key}: ${this.displayValue(item)}`)
        .join('; ');
    }
    return String(value);
  }

  markAllAsTouched(): void {
    this.form.markAllAsTouched();
  }

  value(): Readonly<Record<string, unknown>> {
    const definedKeys = new Set(
      this.schema.fields.map((field) => field.key).filter(Boolean),
    );
    const result: Record<string, unknown> = Object.fromEntries(
      Object.entries(this.entitlements).filter(
        ([key]) => !definedKeys.has(key),
      ),
    );
    for (const field of this.schema.fields) {
      if (!field.key) continue;
      const control = this.form.controls[field.key];
      const value = this.serialize(field, control);
      if (value !== undefined) result[field.key] = value;
    }
    return result;
  }

  protected asGroup(control: unknown): UntypedFormGroup {
    return control as UntypedFormGroup;
  }

  protected asArray(control: unknown): UntypedFormArray {
    return control as UntypedFormArray;
  }

  protected asControl(control: unknown): UntypedFormControl {
    return control as UntypedFormControl;
  }

  protected child(group: UntypedFormGroup, key: string | undefined): unknown {
    return key ? group.controls[key] : undefined;
  }

  protected addArrayItem(field: EntitlementField, control: unknown): void {
    if (!field.items) return;
    this.asArray(control).push(this.buildControl(field.items, undefined));
  }

  protected removeArrayItem(control: unknown, index: number): void {
    this.asArray(control).removeAt(index);
  }

  protected inputId(path: string, field: EntitlementField): string {
    return `entitlement-${path}-${field.key || 'item'}`.replace(
      /[^a-zA-Z0-9_-]/g,
      '-',
    );
  }

  private buildControl(
    field: EntitlementField,
    supplied: unknown,
  ): UntypedFormControl | UntypedFormGroup | UntypedFormArray {
    const value = supplied === undefined ? this.defaultValue(field) : supplied;
    if (field.type === 'object') {
      const object = this.isObject(value) ? value : {};
      const controls: Record<
        string,
        UntypedFormControl | UntypedFormGroup | UntypedFormArray
      > = {};
      for (const child of field.fields ?? []) {
        if (child.key)
          controls[child.key] = this.buildControl(child, object[child.key]);
      }
      return new UntypedFormGroup(controls);
    }
    if (field.type === 'array') {
      const values = Array.isArray(value) ? value : [];
      return new UntypedFormArray(
        values.map((item) => this.buildControl(field.items!, item)),
        this.arrayValidators(field),
      );
    }

    const validators = [];
    if (field.required && field.type !== 'boolean')
      validators.push(Validators.required);
    if (
      (field.type === 'integer' || field.type === 'number') &&
      field.minimum !== undefined
    )
      validators.push(Validators.min(field.minimum));
    if (
      (field.type === 'integer' || field.type === 'number') &&
      field.maximum !== undefined
    )
      validators.push(Validators.max(field.maximum));
    if (field.type === 'integer')
      validators.push(Validators.pattern(/^-?\d+$/));
    if (
      (field.type === 'string' || field.type === 'select') &&
      field.min_length !== undefined
    )
      validators.push(Validators.minLength(field.min_length));
    if (
      (field.type === 'string' || field.type === 'select') &&
      field.max_length !== undefined
    )
      validators.push(Validators.maxLength(field.max_length));
    return new UntypedFormControl(value, validators);
  }

  private arrayValidators(field: EntitlementField) {
    const validators = [];
    if (field.required) validators.push(Validators.required);
    if (field.min_items !== undefined)
      validators.push(Validators.minLength(field.min_items));
    if (field.max_items !== undefined)
      validators.push(Validators.maxLength(field.max_items));
    return validators;
  }

  private defaultValue(field: EntitlementField): unknown {
    if (Object.prototype.hasOwnProperty.call(field, 'default')) {
      return structuredClone(field.default);
    }
    switch (field.type) {
      case 'boolean':
        return false;
      case 'integer':
      case 'number':
        return null;
      case 'object':
        return {};
      case 'array':
        return [];
      default:
        return '';
    }
  }

  private serialize(
    field: EntitlementField,
    control: AbstractControl,
  ): unknown {
    if (field.type === 'object') {
      const group = this.asGroup(control);
      const result: Record<string, unknown> = {};
      for (const child of field.fields ?? []) {
        if (!child.key) continue;
        const value = this.serialize(child, group.controls[child.key]);
        if (value !== undefined) result[child.key] = value;
      }
      return result;
    }
    if (field.type === 'array') {
      return this.asArray(control).controls.map((item) =>
        this.serialize(field.items!, item),
      );
    }
    const value = this.asControl(control).value;
    if ((value === '' || value === null) && !field.required) {
      return field.nullable && value === null ? null : undefined;
    }
    return value;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
