import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
  TngCardComponent,
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
  catalogueReturnUrl,
  formatPlanPrice,
  nonNegativeInteger,
  pageSize,
} from '../catalogue.helpers';

type PlanStatus = 'all' | 'active' | 'inactive';
type PlanSort =
  'slug' | 'name' | 'price' | 'status' | 'created_at' | 'updated_at';

@Component({
  selector: 'billmesh-product-view',
  imports: [
    DatePipe,
    FilterPopoverComponent,
    TngButtonComponent,
    TngCardComponent,
    TngIcon,
    TngPaginator,
    TngTable,
    TngTableCellTpl,
  ],
  templateUrl: './product-view.component.html',
  styleUrl: '../catalogue.shared.css',
})
export class ProductViewComponent {
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly id = this.route.snapshot.paramMap.get('id')!;
  private planRequest?: Subscription;

  protected readonly product = signal<Product | null>(null);
  protected readonly plans = signal<readonly Plan[]>([]);
  protected readonly planTotal = signal(0);
  protected readonly loadingProduct = signal(true);
  protected readonly loadingPlans = signal(true);
  protected readonly error = signal('');
  protected readonly planQuery = signal('');
  protected readonly planStatus = signal<PlanStatus>('all');
  protected readonly planPageIndex = signal(0);
  protected readonly planPageSize = signal(10);
  protected readonly planSort = signal<PlanSort>('price');
  protected readonly planDirection = signal<'asc' | 'desc'>('asc');

  protected readonly planColumns: readonly TngTableColumn<Plan>[] = [
    { id: 'name', label: 'Name', sortable: true, width: '15rem' },
    { id: 'slug', label: 'Slug', sortable: true, width: '13rem' },
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
  protected readonly planFilterFields: readonly FilterPopoverField[] = [
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
  protected readonly planFilterValue = computed<FilterPopoverValue>(() => ({
    ...(this.planQuery() ? { query: this.planQuery() } : {}),
    ...(this.planStatus() !== 'all' ? { status: this.planStatus() } : {}),
  }));

  constructor() {
    this.loadProduct();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const status = params.get('pstatus');
      this.planQuery.set(params.get('pquery')?.trim() ?? '');
      this.planStatus.set(
        status === 'active' || status === 'inactive' ? status : 'all',
      );
      this.planPageIndex.set(nonNegativeInteger(params.get('ppage')));
      this.planPageSize.set(pageSize(params.get('psize'), [10, 25, 50], 10));
      this.planSort.set(this.readPlanSort(params.get('psort')));
      this.planDirection.set(
        params.get('pdirection') === 'desc' ? 'desc' : 'asc',
      );
      this.loadPlans();
    });
  }

  protected loadProduct(): void {
    this.loadingProduct.set(true);
    this.catalogue.getProduct(this.id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loadingProduct.set(false);
      },
      error: (error: unknown) => {
        this.error.set(catalogueMessage(error));
        this.loadingProduct.set(false);
      },
    });
  }

  protected loadPlans(): void {
    this.loadingPlans.set(true);
    this.planRequest?.unsubscribe();
    this.planRequest = this.catalogue
      .listPlans(this.id, {
        status: this.planStatus(),
        query: this.planQuery(),
        limit: this.planPageSize(),
        offset: this.planPageIndex() * this.planPageSize(),
        sort: this.planSort(),
        direction: this.planDirection(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.plans.set(page.items);
          this.planTotal.set(page.total);
          this.loadingPlans.set(false);
        },
        error: (error: unknown) => {
          this.error.set(catalogueMessage(error));
          this.loadingPlans.set(false);
        },
      });
  }

  protected applyPlanFilters(value: FilterPopoverValue): void {
    void this.updateQuery({
      pquery: value['query'] || null,
      pstatus: value['status'] || null,
      ppage: null,
    });
  }

  protected changePlanPage(event: TngPaginationChangeEvent): void {
    void this.updateQuery({
      ppage: event.pageIndex || null,
      psize: event.pageSize === 10 ? null : event.pageSize,
    });
  }

  protected changePlanSort(event: TngTableSortChange): void {
    void this.updateQuery({
      psort:
        event.activeColumnId && event.direction ? event.activeColumnId : null,
      pdirection: event.direction === 'desc' ? 'desc' : null,
      ppage: null,
    });
  }

  protected back(): void {
    void this.router.navigateByUrl(this.returnUrl());
  }

  protected editProduct(): void {
    void this.router.navigate(['/app/catalogue', this.id, 'edit'], {
      queryParams: { burl: this.returnUrl() },
    });
  }

  protected archiveProduct(): void {
    void this.router.navigate(['/app/catalogue', this.id, 'delete'], {
      queryParams: { burl: this.returnUrl() },
    });
  }

  protected reactivateProduct(): void {
    const product = this.product();
    if (!product) return;
    this.catalogue
      .updateProduct(product.id, { version: product.version, active: true })
      .subscribe({
        next: (updated) => this.product.set(updated),
        error: (error: unknown) => this.error.set(catalogueMessage(error)),
      });
  }

  protected createPlan(): void {
    void this.router.navigate(['/app/catalogue', this.id, 'plans', 'create'], {
      queryParams: { burl: this.router.url },
    });
  }

  protected viewPlan(plan: Plan): void {
    void this.router.navigate(['/app/catalogue', this.id, 'plans', plan.id], {
      queryParams: { burl: this.router.url },
    });
  }

  protected editPlan(plan: Plan): void {
    void this.router.navigate(
      ['/app/catalogue', this.id, 'plans', plan.id, 'edit'],
      {
        queryParams: { burl: this.router.url },
      },
    );
  }

  protected archivePlan(plan: Plan): void {
    void this.router.navigate(
      ['/app/catalogue', this.id, 'plans', plan.id, 'delete'],
      {
        queryParams: { burl: this.router.url },
      },
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

  private returnUrl(): string {
    return catalogueReturnUrl(
      this.route.snapshot.queryParamMap.get('burl'),
      '/app/catalogue',
    );
  }

  private readPlanSort(value: string | null): PlanSort {
    return value === 'slug' ||
      value === 'name' ||
      value === 'status' ||
      value === 'created_at' ||
      value === 'updated_at'
      ? value
      : 'price';
  }
}
