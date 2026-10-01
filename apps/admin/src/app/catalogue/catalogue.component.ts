import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogueAdminService } from '@billmesh/api-client';
import type { Product } from '@billmesh/domain';
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
  nonNegativeInteger,
  pageSize,
} from './catalogue.helpers';

type ProductStatus = 'all' | 'active' | 'archived';
type ProductSort = 'slug' | 'name' | 'status' | 'created_at' | 'updated_at';

@Component({
  selector: 'billmesh-admin-catalogue',
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
  templateUrl: './catalogue.component.html',
  styleUrl: './catalogue.shared.css',
})
export class CatalogueComponent {
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private productRequest?: Subscription;

  protected readonly products = signal<readonly Product[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly query = signal('');
  protected readonly status = signal<ProductStatus>('all');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<ProductSort>('slug');
  protected readonly direction = signal<'asc' | 'desc'>('asc');

  protected readonly columns: readonly TngTableColumn<Product>[] = [
    { id: 'name', label: 'Name', sortable: true, width: '18rem' },
    { id: 'slug', label: 'Slug', sortable: true, width: '15rem' },
    { id: 'description', label: 'Description', truncate: true },
    { id: 'status', label: 'Status', sortable: true, width: '8rem' },
    { id: 'updated_at', label: 'Updated', sortable: true, width: '12rem' },
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
      placeholder: 'Name, slug, or description',
    },
    {
      id: 'status',
      label: 'Status',
      type: 'enum',
      placeholder: 'All statuses',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ],
    },
  ];
  protected readonly filterValue = computed<FilterPopoverValue>(() => ({
    ...(this.query() ? { query: this.query() } : {}),
    ...(this.status() !== 'all' ? { status: this.status() } : {}),
  }));

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const status = params.get('status');
      this.query.set(params.get('query')?.trim() ?? '');
      this.status.set(
        status === 'active' || status === 'archived' ? status : 'all',
      );
      this.pageIndex.set(nonNegativeInteger(params.get('page')));
      this.pageSize.set(pageSize(params.get('size'), [10, 25, 50, 100], 25));
      this.sort.set(this.readSort(params.get('sort')));
      this.direction.set(params.get('direction') === 'desc' ? 'desc' : 'asc');
      this.loadProducts();
    });
  }

  protected loadProducts(): void {
    this.loading.set(true);
    this.error.set('');
    this.productRequest?.unsubscribe();
    this.productRequest = this.catalogue
      .listProducts({
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
          this.products.set(page.items);
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
      query: value['query'] || null,
      status: value['status'] || null,
      page: null,
    });
  }

  protected changePage(event: TngPaginationChangeEvent): void {
    void this.updateQuery({
      page: event.pageIndex || null,
      size: event.pageSize === 25 ? null : event.pageSize,
    });
  }

  protected changeSort(event: TngTableSortChange): void {
    void this.updateQuery({
      sort:
        event.activeColumnId && event.direction ? event.activeColumnId : null,
      direction: event.direction === 'desc' ? 'desc' : null,
      page: null,
    });
  }

  protected createProduct(): void {
    void this.router.navigate(['/app/catalogue/create'], {
      queryParams: { burl: this.router.url },
    });
  }

  protected viewProduct(product: Product): void {
    void this.router.navigate(['/app/catalogue', product.id], {
      queryParams: { burl: this.router.url },
    });
  }

  protected editProduct(product: Product): void {
    void this.router.navigate(['/app/catalogue', product.id, 'edit'], {
      queryParams: { burl: this.router.url },
    });
  }

  protected archiveProduct(product: Product): void {
    void this.router.navigate(['/app/catalogue', product.id, 'delete'], {
      queryParams: { burl: this.router.url },
    });
  }

  protected reactivateProduct(product: Product): void {
    this.catalogue
      .updateProduct(product.id, { version: product.version, active: true })
      .subscribe({
        next: () => this.loadProducts(),
        error: (error: unknown) => this.error.set(catalogueMessage(error)),
      });
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

  private readSort(value: string | null): ProductSort {
    return value === 'name' ||
      value === 'status' ||
      value === 'created_at' ||
      value === 'updated_at'
      ? value
      : 'slug';
  }
}
