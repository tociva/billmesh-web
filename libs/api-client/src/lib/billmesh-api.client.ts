import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AppConfigStore } from '@billmesh/config';
import type { Observable } from 'rxjs';

export interface BillmeshRequestOptions {
  headers?: Record<string, string | string[]>;
}

@Injectable({ providedIn: 'root' })
export class BillmeshApiClient {
  private readonly configStore = inject(AppConfigStore);
  private readonly http = inject(HttpClient);

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(this.resolvePath(path));
  }

  post<TResponse, TBody>(
    path: string,
    body: TBody,
    options: BillmeshRequestOptions = {},
  ): Observable<TResponse> {
    return this.http.post<TResponse>(this.resolvePath(path), body, options);
  }

  patch<TResponse, TBody>(path: string, body: TBody): Observable<TResponse> {
    return this.http.patch<TResponse>(this.resolvePath(path), body);
  }

  put<TResponse, TBody>(path: string, body: TBody): Observable<TResponse> {
    return this.http.put<TResponse>(this.resolvePath(path), body);
  }

  private resolvePath(path: string): string {
    const baseUrl = this.configStore.activeApiBaseUrl();
    if (!baseUrl) {
      throw new Error('Billmesh API configuration is not loaded.');
    }

    if (!path.startsWith('/') || path.startsWith('//')) {
      throw new Error('Billmesh API paths must be absolute application paths.');
    }

    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }
}
