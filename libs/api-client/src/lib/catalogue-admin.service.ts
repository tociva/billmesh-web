import { Injectable, inject } from '@angular/core';
import type {
  Plan,
  PlanCreate,
  PlanUpdate,
  Product,
  ProductCreate,
  ProductUpdate,
} from '@billmesh/domain';
import type { Observable } from 'rxjs';
import { BillmeshApiClient } from './billmesh-api.client';

export interface ProductFilters {
  readonly status?: 'all' | 'active' | 'archived';
  readonly query?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface PlanFilters {
  readonly status?: 'all' | 'active' | 'inactive';
  readonly limit?: number;
  readonly offset?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogueAdminService {
  private readonly api = inject(BillmeshApiClient);

  listProducts(filters: ProductFilters = {}): Observable<readonly Product[]> {
    return this.api.get<readonly Product[]>(
      `/admin/products${this.query({ status: filters.status, query: filters.query, limit: filters.limit, offset: filters.offset })}`,
    );
  }

  getProduct(id: string): Observable<Product> {
    return this.api.get<Product>(`/admin/products/${encodeURIComponent(id)}`);
  }

  createProduct(input: ProductCreate): Observable<Product> {
    return this.api.post<Product, ProductCreate>('/admin/products', input);
  }

  updateProduct(id: string, input: ProductUpdate): Observable<Product> {
    return this.api.patch<Product, ProductUpdate>(
      `/admin/products/${encodeURIComponent(id)}`,
      input,
    );
  }

  listPlans(
    productId: string,
    filters: PlanFilters = {},
  ): Observable<readonly Plan[]> {
    return this.api.get<readonly Plan[]>(
      `/admin/products/${encodeURIComponent(productId)}/plans${this.query({ status: filters.status, limit: filters.limit, offset: filters.offset })}`,
    );
  }

  getPlan(id: string): Observable<Plan> {
    return this.api.get<Plan>(`/admin/plans/${encodeURIComponent(id)}`);
  }

  createPlan(productId: string, input: PlanCreate): Observable<Plan> {
    return this.api.post<Plan, PlanCreate>(
      `/admin/products/${encodeURIComponent(productId)}/plans`,
      input,
    );
  }

  updatePlan(id: string, input: PlanUpdate): Observable<Plan> {
    return this.api.patch<Plan, PlanUpdate>(
      `/admin/plans/${encodeURIComponent(id)}`,
      input,
    );
  }

  private query(
    values: Readonly<Record<string, string | number | undefined>>,
  ): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }
    const encoded = params.toString();
    return encoded ? `?${encoded}` : '';
  }
}
