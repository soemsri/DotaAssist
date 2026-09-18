import { useSyncExternalStore } from 'react';
import { openDotaCache } from '../services/openDotaCache';
export function OpenDotaStatus({ resource, onRefresh }: { resource: string; onRefresh: () => void }) {
  const status = useSyncExternalStore(openDotaCache.subscribe, () => openDotaCache.status(resource));
  return <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 my-2" role="status">
    <span className={status?.state === 'stale' ? 'text-amber-300' : ''}>
      {status?.state === 'stale' ? 'Stale saved data — refresh failed.' : status?.state === 'fresh' ? 'OpenDota data.' : status?.state === 'loading' ? 'Refreshing OpenDota…' : 'OpenDota data unavailable.'}
      {status?.fetchedAt && <> Fetched <time dateTime={status.fetchedAt}>{new Date(status.fetchedAt).toLocaleString()}</time>.</>}
      {status?.storageError && ' Could not save for future sessions.'}
    </span>
    <button className="rounded bg-slate-700 px-2 py-1 text-slate-100 disabled:opacity-40" disabled={status?.state === 'loading'} onClick={onRefresh}>Refresh</button>
  </div>;
}
