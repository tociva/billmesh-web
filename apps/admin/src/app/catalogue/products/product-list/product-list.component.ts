import { DOCUMENT, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
  TngFileUploadDragState,
  TngFileUploadRejectedEvent,
  TngFileUploadSelectedEvent,
  TngPaginationChangeEvent,
  TngTableSortChange,
} from '@tailng-ui/primitives';
import { TngFileUploadDirective } from '@tailng-ui/primitives';
import { TngIcon } from '@tailng-ui/icons';
import { firstValueFrom, type Subscription } from 'rxjs';
import {
  catalogueMessage,
  nonNegativeInteger,
  pageSize,
} from '../../catalogue.helpers';
import {
  buildCatalogueTransfer,
  catalogueTransferPlanCount,
  parseCatalogueTransfer,
  type CatalogueTransfer,
} from '../../catalogue-transfer';

type ProductStatus = 'all' | 'active' | 'archived';
type ProductSort = 'slug' | 'name' | 'status' | 'created_at' | 'updated_at';

@Component({
  selector: 'billmesh-product-list',
  imports: [
    DatePipe,
    FilterPopoverComponent,
    TngButtonComponent,
    TngCardComponent,
    TngIcon,
    TngFileUploadDirective,
    TngPaginator,
    TngTable,
    TngTableCellTpl,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: '../../catalogue.shared.css',
})
export class ProductListComponent {
  private readonly catalogue = inject(CatalogueAdminService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private productRequest?: Subscription;

  protected readonly products = signal<readonly Product[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly transferError = signal('');
  protected readonly transferSuccess = signal('');
  protected readonly importOpen = signal(false);
  protected readonly uploadDragState = signal<TngFileUploadDragState>('idle');
  protected readonly importing = signal(false);
  protected readonly exporting = signal(false);
  protected readonly selectedImport = signal<{
    readonly fileName: string;
    readonly transfer: CatalogueTransfer;
  } | null>(null);
  protected readonly importMaxSize = 1024 * 1024;
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

  protected toggleImport(): void {
    this.importOpen.update((open) => !open);
    this.transferError.set('');
    this.transferSuccess.set('');
  }

  protected handleDroppedFile(event: TngFileUploadSelectedEvent): void {
    const [file] = event.files;
    if (file) {
      this.importOpen.set(true);
      void this.readImportFile(file);
    }
  }

  protected handleDragState(state: TngFileUploadDragState): void {
    this.uploadDragState.set(state);
  }

  protected handleRejectedFile(event: TngFileUploadRejectedEvent): void {
    this.selectedImport.set(null);
    this.transferSuccess.set('');
    this.transferError.set(
      event.rejected.map((item) => item.message).join(' ') ||
        'Select one JSON file smaller than 1 MB.',
    );
  }

  protected handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const [file] = Array.from(input.files ?? []);
    input.value = '';
    if (file) void this.readImportFile(file);
  }

  protected clearImport(): void {
    this.selectedImport.set(null);
    this.transferError.set('');
  }

  protected importPlanCount(transfer: CatalogueTransfer): number {
    return catalogueTransferPlanCount(transfer);
  }

  protected async exportCatalogue(): Promise<void> {
    this.exporting.set(true);
    this.transferError.set('');
    this.transferSuccess.set('');
    try {
      const products = await this.listAllProducts();
      const records = await Promise.all(
        products.map(async (product) => ({
          product,
          plans: await this.listAllPlans(product.id),
        })),
      );
      const transfer = buildCatalogueTransfer(records);
      this.downloadTransfer(transfer);
      this.transferSuccess.set(
        `Exported ${transfer.products.length} product${transfer.products.length === 1 ? '' : 's'} and ${catalogueTransferPlanCount(transfer)} plan${catalogueTransferPlanCount(transfer) === 1 ? '' : 's'}.`,
      );
    } catch (error: unknown) {
      this.transferError.set(this.transferMessage(error));
    } finally {
      this.exporting.set(false);
    }
  }

  protected async importCatalogue(): Promise<void> {
    const selected = this.selectedImport();
    if (!selected || selected.transfer.products.length === 0) return;

    this.importing.set(true);
    this.transferError.set('');
    this.transferSuccess.set('');
    let createdProducts = 0;
    let createdPlans = 0;
    try {
      const existing = await this.listAllProducts();
      const existingSlugs = new Set(existing.map((product) => product.slug));
      const conflicts = selected.transfer.products
        .map((product) => product.slug)
        .filter((slug) => existingSlugs.has(slug));
      if (conflicts.length) {
        throw new Error(
          `Import stopped because these product slugs already exist: ${conflicts.join(', ')}.`,
        );
      }

      for (const product of selected.transfer.products) {
        const created = await firstValueFrom(
          this.catalogue.createProduct({
            slug: product.slug,
            name: product.name,
            description: product.description,
            entitlement_schema: product.entitlement_schema,
            billing_policy: product.billing_policy,
          }),
        );
        createdProducts += 1;

        for (const plan of product.plans) {
          await firstValueFrom(
            this.catalogue.createPlan(created.id, {
              ...plan,
              entitlement_schema_version: created.entitlement_schema_version,
            }),
          );
          createdPlans += 1;
        }

        if (!product.active) {
          await firstValueFrom(
            this.catalogue.updateProduct(created.id, {
              version: created.version,
              active: false,
            }),
          );
        }
      }

      this.selectedImport.set(null);
      this.importOpen.set(false);
      this.transferSuccess.set(
        `Imported ${createdProducts} product${createdProducts === 1 ? '' : 's'} and ${createdPlans} plan${createdPlans === 1 ? '' : 's'}.`,
      );
      this.loadProducts();
    } catch (error: unknown) {
      const partial =
        createdProducts > 0
          ? ` ${createdProducts} product${createdProducts === 1 ? '' : 's'} and ${createdPlans} plan${createdPlans === 1 ? '' : 's'} were created before the import stopped.`
          : '';
      this.transferError.set(`${this.transferMessage(error)}${partial}`);
      if (createdProducts > 0) this.loadProducts();
    } finally {
      this.importing.set(false);
    }
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

  private async readImportFile(file: File): Promise<void> {
    this.transferError.set('');
    this.transferSuccess.set('');
    this.selectedImport.set(null);
    if (file.size > this.importMaxSize) {
      this.transferError.set(
        'The catalogue JSON file must be smaller than 1 MB.',
      );
      return;
    }
    if (
      !file.name.toLowerCase().endsWith('.json') &&
      file.type !== 'application/json'
    ) {
      this.transferError.set('Select a JSON catalogue file.');
      return;
    }
    try {
      this.selectedImport.set({
        fileName: file.name,
        transfer: parseCatalogueTransfer(await file.text()),
      });
    } catch (error: unknown) {
      this.transferError.set(this.transferMessage(error));
    }
  }

  private async listAllProducts(): Promise<readonly Product[]> {
    const items: Product[] = [];
    let total = 1;
    while (items.length < total) {
      const page = await firstValueFrom(
        this.catalogue.listProducts({
          status: 'all',
          query: '',
          limit: 200,
          offset: items.length,
          sort: 'slug',
          direction: 'asc',
        }),
      );
      items.push(...page.items);
      total = page.total;
      if (page.items.length === 0) break;
    }
    return items;
  }

  private async listAllPlans(productId: string): Promise<readonly Plan[]> {
    const items: Plan[] = [];
    let total = 1;
    while (items.length < total) {
      const page = await firstValueFrom(
        this.catalogue.listPlans(productId, {
          status: 'all',
          query: '',
          limit: 200,
          offset: items.length,
          sort: 'slug',
          direction: 'asc',
        }),
      );
      items.push(...page.items);
      total = page.total;
      if (page.items.length === 0) break;
    }
    return items;
  }

  private downloadTransfer(transfer: CatalogueTransfer): void {
    const json = `${JSON.stringify(transfer, null, 2)}\n`;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = `billmesh-catalogue-${transfer.exported_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private transferMessage(error: unknown): string {
    return error instanceof Error && !(error instanceof HttpErrorResponse)
      ? error.message
      : catalogueMessage(error);
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
