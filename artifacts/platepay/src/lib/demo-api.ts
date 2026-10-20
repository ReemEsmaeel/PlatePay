import type { PaymentRequest, Transaction } from '@workspace/api-client-react';

export type DemoRole = 'driver' | 'merchant';
export interface DemoState {
  role: DemoRole;
  plateNumber: string;
  balanceFils: number;
  driverName: string;
  merchantName: string;
  location: { latitude: number; longitude: number };
  requests: PaymentRequest[];
  histories: { driver: Transaction[]; merchant: Transaction[] };
}

export class DemoApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const url = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/demo${path}`;

async function call<T>(path: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown): Promise<T> {
  const res = await fetch(url(path), {
    method,
    credentials: 'include',
    headers: method === 'GET' ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json', 'x-platepay-request': '1' },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
      ? (data as { error: string }).error : `Request failed (${res.status})`;
    throw new DemoApiError(message, res.status);
  }
  return data as T;
}

/** Returns null when unauthenticated (401). Throws DemoApiError 404 for normal accounts. */
export async function getDemo(): Promise<DemoState | null> {
  try { return await call<DemoState>('', 'GET'); }
  catch (e) { if (e instanceof DemoApiError && e.status === 401) return null; throw e; }
}
export const startDemo = () => call<DemoState>('/start', 'POST', {});
export const switchDemo = (role: DemoRole) => call<DemoState>('/switch', 'POST', { role });
export const setDemoPlate = (plateNumber: string) => call<DemoState>('/plate', 'PATCH', { plateNumber });
export const endDemo = () => call<unknown>('/end', 'POST', {});
