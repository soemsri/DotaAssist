import { openDotaCache } from '../services/openDotaCache';
import { OpenDotaStatus } from './OpenDotaStatus';
import React, { useEffect, useState, useSyncExternalStore } from "react";
import { apiService } from "../services/apiService";
import { PopularItem, HeroMetaInfo } from "../types/meta";
import { Package, Coins, HelpCircle } from "lucide-react";

interface Props {
  heroName?: string;
  currentGold?: number;
}

export const ItemGuide: React.FC<Props> = ({ heroName, currentGold }) => {
  const [refresh, setRefresh] = useState(0);
  const [manualHeroId, setManualHeroId] = useState<number | null>(null);
  const [allHeroes, setAllHeroes] = useState<HeroMetaInfo[]>(
    apiService.getAllHeroes(),
  );
  const [items, setItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    apiService.initData().then(() => setAllHeroes(apiService.getAllHeroes()));
  }, []);

  const activeHero = heroName
    ? apiService.getHeroByName(heroName)
    : manualHeroId
      ? apiService.getHeroById(manualHeroId)
      : undefined;

  useEffect(() => {
    let cancelled = false;

    if (!activeHero) {
      setItems([]);
      setLoading(false);
      setLoadError(false);
      return;
    }

    setItems([]);
    setLoading(true);
    setLoadError(false);
    apiService
      .getPopularItemsForHero(activeHero.id)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((error) => {
        console.warn(
          `[OpenDota] Item popularity unavailable for hero ${activeHero.id}:`,
          error,
        );
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeHero?.id, refresh]);

  const cachedHeroId = activeHero?.id;
  const cacheState = useSyncExternalStore(openDotaCache.subscribe, () => openDotaCache.status(`heroes/${cachedHeroId}/itemPopularity`));
  useEffect(() => {
    if (!cachedHeroId || (cacheState?.state !== 'fresh' && cacheState?.state !== 'stale')) return;
    let cancelled = false;
    void apiService.getPopularItemsForHero(cachedHeroId, true).then(data => { if (!cancelled) { setItems(data); setLoadError(false); setLoading(false); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [cachedHeroId, cacheState]);

  const getTierBadge = (tier: PopularItem["tier"]) => {
    switch (tier) {
      case "early":
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-semibold uppercase">Early</span>;
      case "core":
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-semibold uppercase">Core</span>;
      case "luxury":
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 font-semibold uppercase">Late</span>;
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            {activeHero
              ? `OpenDota Popular Items: ${activeHero.localized_name}`
              : "OpenDota Popular Item Builds"}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {!heroName && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Hero:</span>
              <select
                value={manualHeroId ?? ""}
                onChange={(event) =>
                  setManualHeroId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Choose Hero --</option>
                {allHeroes.map((hero) => (
                  <option key={hero.id} value={hero.id}>
                    {hero.localized_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="text-xs text-slate-400 flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Wallet:{" "}
              <strong className="text-amber-300 font-mono">
                {currentGold === undefined ? "Unavailable" : `${currentGold}g`}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {activeHero && <OpenDotaStatus resource={`heroes/${activeHero.id}/itemPopularity`} onRefresh={() => setRefresh(n => n + 1)} />}

      {!activeHero ? (
        <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-lg p-5 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <HelpCircle className="w-6 h-6 text-slate-500" />
          <p>No active hero detected from Dota 2 GSI.</p>
          <p className="text-slate-500 text-[11px]">
            Pick a hero in Dota 2 or choose one above to request its current OpenDota item-popularity data.
          </p>
        </div>
      ) : loading ? (
        <div className="py-6 text-center text-xs text-slate-500 animate-pulse">
          Querying OpenDota item popularity...
        </div>
      ) : loadError ? (
        <div className="py-5 text-center text-xs text-rose-300/80">
          OpenDota item data is unavailable. No replacement recommendations are shown.
        </div>
      ) : items.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-500">
          OpenDota returned no item-popularity records for this hero.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {items.map((item) => {
            const hasPrice = item.cost !== null;
            const hasWallet = currentGold !== undefined;
            const goldNeeded =
              hasPrice && hasWallet ? Math.max(0, item.cost! - currentGold) : null;
            const canAfford = goldNeeded === 0;

            return (
              <div
                key={`${item.tier}-${item.name}`}
                className="p-3 rounded-lg border flex flex-col justify-between transition bg-slate-950/60 border-slate-800 hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">
                        {item.displayName}
                      </span>
                      {getTierBadge(item.tier)}
                    </div>
                    <div className="text-xs font-mono font-semibold text-amber-400">
                      {item.cost === null ? "Price unavailable" : `${item.cost}g`}
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 mb-1.5">
                    {item.reason}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Wallet status:</span>
                  {goldNeeded === null ? (
                    <span className="text-slate-500">Unavailable</span>
                  ) : canAfford ? (
                    <span className="text-emerald-400 font-bold">Affordable</span>
                  ) : (
                    <span className="text-slate-400 font-mono">
                      Need <span className="text-amber-300 font-semibold">{goldNeeded}g</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
