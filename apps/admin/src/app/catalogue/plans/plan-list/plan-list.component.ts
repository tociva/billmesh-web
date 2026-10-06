import {
  Component,
  DestroyRef,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Plan, Product } from '@billmesh/domain';
import {
  FilterPopoverComponent,
  type FilterPopoverField,
  type FilterPopoverValue,
} from '@billmesh/ui';
import {
  TngButtonComponent,
  TngPaginator,
  TngTable,
  TngTableCellTpl,
  type TngTableColumn,
} from '@tailng-ui/components';
import type {
  TngPaginationChangeEvent,
  TngTableSortChange,
} from '@tailng-ui/primitives';
import { TngIcon } from '@tailng-ui/icons';
import type { Subscription } from 'rxjs';
import {
  catalogueMessage,
  formatPlanPrice,
  nonNegativeInteger,
  pageSize,
} from '../../catalogue.helpers';

type PlanStatus = 'all' | 'active' | 'inactive';
type PlanSort =
  'slug' | 'name' | 'price' | 'status' | 'created_at' | 'updated_at';

@Component({
  selector: 'billmesh-plan-list',
  imports: [
    FilterPopoverComponent,
    TngButtonComponent,
    TngIcon,
    TngPaginator,
    TngTable,
    TngTableCellTpl,
  ],
  templateUrl: './plan-list.component.html',
  styleUrl: '../../catalogue.shared.css',
})
export class PlanListComponent {
  @Input({ required: true }) product!: Product;

  private readonly catalogue = inject(CatalogueAdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productId = this.route.snapshot.paramMap.get('productId')!;
  private planRequest?: Subscription;

  protected readonly plans = signal<readonly Plan[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly query = signal('');
  protected readonly status = signal<PlanStatus>('all');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly sort = signal<PlanSort>('price');
  protected readonly direction = signal<'asc' | 'desc'>('asc');

  protected readonly columns: readonly TngTableColumn<Plan>[] = [
    { id: 'name', label: 'Name', sortable: true, width: '15rem' },
    { id: 'slug', label: 'Slug', sortable: true, width: '13rem' },
    { id: 'plan_family_id', label: 'Family', width: '10rem' },
    { id: 'billing_interval', label: 'Interval', width: '8rem' },
    { id: 'price', label: 'Price', sortable: true, width: '10rem' },
    { id: 'included_credits', label: 'Credits', width: '8rem', align: 'end' },
    { id: 'status', label: 'Status', sortable: true, width: '8rem' },
    {
      id: 'actions',
      label: 'Actions',
      align: 'end',
      headerAlign: 'end',
      width: '12rem',
    },
  ];
  protected readonly filterFields: readonly FilterPopoverField[] = [
    {
      id: 'query',
      label: 'Search',
      type: 'text',
      placeholder: 'Name, slug, or currency',
    },
    {
      id: 'status',
      label: 'Status',
      type: 'enum',
      placeholder: 'All statuses',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ];
  protected readonly filterValue = computed<FilterPopoverValue>(() => ({
    ...(this.query() ? { query: this.query() } : {}),
    ...(this.status() !== 'all' ? { status: this.status() } : {}),
  }));

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const status = params.get('pstatus');
      this.query.set(params.get('pquery')?.trim() ?? '');
      this.status.set(
        status === 'active' || status === 'inactive' ? status : 'all',
      );
      this.pageIndex.set(nonNegativeInteger(params.get('ppage')));
      this.pageSize.set(pageSize(params.get('psize'), [10, 25, 50], 10));
      this.sort.set(this.readSort(params.get('psort')));
      this.direction.set(params.get('pdirection') === 'desc' ? 'desc' : 'asc');
      this.loadPlans();
    });
  }

  protected loadPlans(): void {
    this.loading.set(true);
    this.planRequest?.unsubscribe();
    this.planRequest = this.catalogue
      .listPlans(this.productId, {
        status: this.status(),
        query: this.query(),
        limit: this.pageSize(),
        offset: this.pageIndex() * this.pageSize(),
        sort: this.sort(),
        direction: this.direction(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.plans.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(catalogueMessage(error));
          this.loading.set(false);
        },
      });
  }

  protected applyFilters(value: FilterPopoverValue): void {
    void this.updateQuery({
      pquery: value['query'] || null,
      pstatus: value['status'] || null,
      ppage: null,
    });
  }

  protected changePage(event: TngPaginationChangeEvent): void {
    void this.updateQuery({
      ppage: event.pageIndex || null,
      psize: event.pageSize === 10 ? null : event.pageSize,
    });
  }

  protected changeSort(event: TngTableSortChange): void {
    void this.updateQuery({
      psort:
        event.activeColumnId && event.direction ? event.activeColumnId : null,
      pdirection: event.direction === 'desc' ? 'desc' : null,
      ppage: null,
    });
  }

  protected createPlan(): void {
    void this.router.navigate(
      ['/app/catalogue', this.productId, 'plans', 'create'],
      { queryParams: { burl: this.router.url } },
    );
  }

  protected viewPlan(plan: Plan): void {
    void this.router.navigate(
      ['/app/catalogue', this.productId, 'plans', plan.id],
      { queryParams: { burl: this.router.url } },
    );
  }

  protected editPlan(plan: Plan): void {
    void this.router.navigate(
      ['/app/catalogue', this.productId, 'plans', plan.id, 'edit'],
      { queryParams: { burl: this.router.url } },
    );
  }

  protected archivePlan(plan: Plan): void {
    void this.router.navigate(
      ['/app/catalogue', this.productId, 'plans', plan.id, 'delete'],
      { queryParams: { burl: this.router.url } },
    );
  }

  protected reactivatePlan(plan: Plan): void {
    this.catalogue
      .updatePlan(plan.id, { version: plan.version, active: true })
      .subscribe({
        next: () => this.loadPlans(),
        error: (error: unknown) => this.error.set(catalogueMessage(error)),
      });
  }

  protected formatPrice(plan: Plan): string {
    return formatPlanPrice(plan);
  }

  private updateQuery(
    queryParams: Record<string, string | number | null>,
  ): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private readSort(value: string | null): PlanSort {
    return value === 'slug' ||
      value === 'name' ||
      value === 'status' ||
      value === 'created_at' ||
      value === 'updated_at'
      ? value
      : 'price';
  }
}
