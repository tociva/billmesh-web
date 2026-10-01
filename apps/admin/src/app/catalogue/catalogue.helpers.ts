import { HttpErrorResponse } from '@angular/common/http';
import type { Plan } from '@billmesh/domain';

export function catalogueMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'The catalogue request failed. Please try again.';
  }
  const serverMessage =
    typeof error.error?.error === 'string' ? error.error.error : '';
  if (error.status === 401)
    return 'Your admin session has expired. Sign in again.';
  if (error.status === 403)
    return 'You do not have permission to manage the catalogue.';
  if (error.status === 404)
    return 'The selected catalogue record no longer exists.';
  if (error.status === 409)
    return (
      serverMessage ||
      'This record changed or already exists. Reload and try again.'
    );
  if (error.status === 429)
    return 'Too many changes were submitted. Wait briefly and try again.';
  return serverMessage || 'The catalogue request failed. Please try again.';
}

export function catalogueReturnUrl(
  value: string | null,
  fallback: string,
): string {
  return value?.startsWith('/app/catalogue') ? value : fallback;
}

export function formatPlanPrice(plan: Plan): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: plan.currency,
  }).format(plan.price_minor / 100);
}

export function parseMinorUnits(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function pageSize(
  value: string | null,
  allowed: readonly number[],
  fallback: number,
): number {
  const parsed = Number(value);
  return allowed.includes(parsed) ? parsed : fallback;
}

export function nonNegativeInteger(value: string | null, fallback = 0): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
