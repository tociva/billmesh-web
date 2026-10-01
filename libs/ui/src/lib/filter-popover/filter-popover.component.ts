import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  TngButtonComponent,
  TngInputComponent,
  TngPopoverComponent,
  TngSelectComponent,
} from '@tailng-ui/components';

export interface FilterPopoverOption {
  readonly label: string;
  readonly value: string;
}

export interface FilterPopoverField {
  readonly id: string;
  readonly label: string;
  readonly type: 'text' | 'enum';
  readonly placeholder?: string;
  readonly options?: readonly FilterPopoverOption[];
}

export type FilterPopoverValue = Readonly<Record<string, string>>;

@Component({
  selector: 'billmesh-filter-popover',
  imports: [
    TngButtonComponent,
    TngInputComponent,
    TngPopoverComponent,
    TngSelectComponent,
  ],
  templateUrl: './filter-popover.component.html',
  styleUrl: './filter-popover.component.css',
})
export class FilterPopoverComponent {
  readonly ariaLabel = input('Filters');
  readonly fields = input<readonly FilterPopoverField[]>([]);
  readonly title = input('Filter');
  readonly value = input<FilterPopoverValue>({});

  readonly filterApply = output<FilterPopoverValue>();

  protected readonly open = signal(false);
  protected readonly draft = signal<Record<string, string>>({});
  protected readonly activeFilterCount = computed(
    () =>
      Object.values(this.value()).filter((value) => value.trim() !== '').length,
  );
  protected readonly triggerLabel = computed(() => {
    const count = this.activeFilterCount();
    return count > 0 ? `${this.ariaLabel()} (${count})` : this.ariaLabel();
  });
  protected readonly getOptionLabel = (option: FilterPopoverOption): string =>
    option.label;
  protected readonly getOptionValue = (option: FilterPopoverOption): string =>
    option.value;
  protected readonly trackOption = (
    _index: number,
    option: FilterPopoverOption,
  ): string => option.value;

  constructor() {
    effect(() => this.draft.set({ ...this.value() }));
  }

  protected fieldValue(id: string): string {
    return this.draft()[id] ?? '';
  }

  protected updateField(id: string, value: unknown): void {
    this.draft.update((current) => ({
      ...current,
      [id]: typeof value === 'string' ? value : '',
    }));
  }

  protected apply(event: Event): void {
    event.preventDefault();
    const next = Object.fromEntries(
      Object.entries(this.draft()).filter(([, value]) => value.trim() !== ''),
    );
    this.filterApply.emit(next);
    this.open.set(false);
  }

  protected clear(): void {
    this.draft.set({});
    this.filterApply.emit({});
    this.open.set(false);
  }
}
