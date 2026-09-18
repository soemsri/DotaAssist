import { TIMING_RULES } from '../data/timingRules';
export interface DataStatus {
  state: 'loading' | 'fresh' | 'stale' | 'unavailable';
  fetchedAt?: string;
  storageError?: boolean;
}
interface Entry { patch: string; fetchedAt: string; data: unknown }
export function browserStorage() { try { return typeof window === 'undefined' ? undefined : window.localStorage; } catch { return undefined; } }
export class OpenDotaCache {
  private entries = new Map<string, Entry>();
  private statuses = new Map<string, DataStatus>();
  private requests = new Map<string, Promise<unknown>>();
  private listeners = new Set<() => void>();
  constructor(private storage = browserStorage(), private patch = TIMING_RULES.patch as string,
    private request: typeof fetch = (...args) => fetch(...args)) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  status = (key: string) => this.statuses.get(key);
  private update(key: string, status: DataStatus) {
    this.statuses.set(key, status); this.listeners.forEach(listener => listener());
  }
  peek<T>(key: string, valid: (data: unknown) => data is T): Promise<T> {
    const entry = this.entries.get(key);
    return entry?.patch === this.patch && valid(entry.data) ? Promise.resolve(entry.data) : Promise.reject(new Error('No matching cached response'));
  }
  load<T>(key: string, valid: (data: unknown) => data is T): Promise<T> {
    const pending = this.requests.get(key);
    if (pending) return pending as Promise<T>;
    const promise = this.fetchData(key, valid).finally(() => this.requests.delete(key));
    this.requests.set(key, promise);
    return promise;
  }
  private async fetchData<T>(key: string, valid: (data: unknown) => data is T): Promise<T> {
    let cached = this.entries.get(key);
    if (!cached) {
      try { cached = JSON.parse(this.storage?.getItem(`dotaassist.opendota.v1:${key}`) ?? 'null') ?? undefined; } catch { /* Ignore corrupt or unavailable storage. */ }
    }
    if (cached && (cached.patch !== this.patch || !Number.isFinite(Date.parse(cached.fetchedAt)) || !valid(cached.data))) cached = undefined;
    this.update(key, { state: 'loading', fetchedAt: cached?.fetchedAt });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.request(`https://api.opendota.com/api/${key}`, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`OpenDota HTTP ${response.status}`);
      const data: unknown = await response.json();
      if (!valid(data)) throw new Error('Invalid OpenDota response');
      const entry = { patch: this.patch, fetchedAt: new Date().toISOString(), data };
      this.entries.set(key, entry);
      let storageError = false;
      try {
        if (!this.storage) throw new Error('Storage unavailable');
        this.storage.setItem(`dotaassist.opendota.v1:${key}`, JSON.stringify(entry));
      } catch { storageError = true; }
      this.update(key, { state: 'fresh', fetchedAt: entry.fetchedAt, storageError });
      return data;
    } catch (error) {
      if (cached) {
        this.entries.set(key, cached);
        this.update(key, { state: 'stale', fetchedAt: cached.fetchedAt });
        return cached.data as T;
      }
      this.update(key, { state: 'unavailable' });
      throw error;
    } finally { clearTimeout(timeout); }
  }
}
export const openDotaCache = new OpenDotaCache();
