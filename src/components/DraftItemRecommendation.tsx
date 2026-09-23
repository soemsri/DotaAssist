import { openDotaCache } from '../services/openDotaCache';
import { OpenDotaStatus } from './OpenDotaStatus';
import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { apiService } from "../services/apiService";
import { getAlliedPickClasses } from "../services/draftService";
import { RankBracket, HighRankItem, HighRankItemBuild, HeroMetaInfo } from "../types/meta";
import { GSIDraft, GSIPlayer } from "../types/gsi";
import { Crown, TrendingUp, Clock, Package, RefreshCw, AlertCircle, ChevronDown } from "lucide-react";

interface Props {
  draft?: GSIDraft;
  playerTeam?: GSIPlayer['team_name'];
  /** Override hero from GSI when player has already picked */
  selectedHeroName?: string;
}

const RANK_OPTIONS: Array<{ value: RankBracket; label: string; desc: string }> = [
  { value: 'immortal', label: 'Immortal', desc: 'Top 0.1%' },
  { value: 'divine_plus', label: 'Divine+', desc: 'Top 5%' },
  { value: 'ancient_plus', label: 'Ancient+', desc: 'Top 15%' },
  { value: 'all', label: 'All Ranks', desc: 'All brackets' },
];

const TIER_CONFIG: Record<HighRankItem['tier'], { label: string; color: string; bgColor: string; borderColor: string }> = {
  starting: { label: 'Starting', color: 'text-slate-300', bgColor: 'bg-slate-800/60', borderColor: 'border-slate-700' },
  early: { label: 'Early Game', color: 'text-blue-300', bgColor: 'bg-blue-900/30', borderColor: 'border-blue-700/50' },
  core: { label: 'Core Items', color: 'text-emerald-300', bgColor: 'bg-emerald-900/30', borderColor: 'border-emerald-700/50' },
  luxury: { label: 'Late Game', color: 'text-purple-300', bgColor: 'bg-purple-900/30', borderColor: 'border-purple-700/50' },
};

function formatGameTime(seconds: number): string {
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${s.toString().padStart(2, '0')}`;
}

export const DraftItemRecommendation: React.FC<Props> = ({ draft, playerTeam, selectedHeroName }) => {
  const [allHeroes, setAllHeroes] = useState<HeroMetaInfo[]>(apiService.getAllHeroes());
  const [manualHeroId, setManualHeroId] = useState<number | null>(null);
  const [rankBracket, setRankBracket] = useState<RankBracket>('divine_plus');
  const [build, setBuild] = useState<HighRankItemBuild | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    apiService.initData().then(() => setAllHeroes(apiService.getAllHeroes()));
  }, []);

  // Determine active hero: GSI hero > manual dropdown selection > first allied pick
  const gsiHero = selectedHeroName ? apiService.getHeroByName(selectedHeroName) : undefined;
  const alliedPicks = getAlliedPickClasses(draft, playerTeam);
  const firstAlliedHero = alliedPicks[0] ? apiService.getHeroByName(alliedPicks[0]) : undefined;

  const activeHero = gsiHero
    ?? (manualHeroId ? apiService.getHeroById(manualHeroId) : undefined)
    ?? firstAlliedHero;

  // Fetch high-rank items when hero or bracket changes
  useEffect(() => {
    let cancelled = false;
    if (!activeHero) {
      setBuild(null);
      setLoading(false);
      setError(false);
      return;
    }

    setBuild(null);
    setLoading(true);
    setError(false);

    apiService
      .getHighRankItemsForHero(activeHero.id, rankBracket)
      .then((data) => {
        if (!cancelled) setBuild(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeHero?.id, rankBracket, refresh]);

  // Sync cache status for OpenDotaStatus display
  const cacheKey = activeHero ? `explorer/hero-items/${activeHero.id}/${rankBracket}` : '';
  const getCacheStatus = useCallback(() => openDotaCache.status(cacheKey), [cacheKey]);
  useSyncExternalStore(openDotaCache.subscribe, getCacheStatus);

  // Group items by tier for display
  const itemsByTier = build?.items.reduce<Record<string, HighRankItem[]>>((acc, item) => {
    const tier = item.tier;
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(item);
    return acc;
  }, {}) ?? {};

  const tierOrder: HighRankItem['tier'][] = ['starting', 'early', 'core', 'luxury'];

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            High Rank Item Builds
          </h3>
          {build && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
              build.isExplorerData
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {build.rankLabel}
              {build.isExplorerData && build.sampleSize > 0 && ` · ${build.sampleSize} matches`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Rank bracket selector */}
          <div className="relative">
            <select
              value={rankBracket}
              onChange={(e) => setRankBracket(e.target.value as RankBracket)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-amber-500 appearance-none pr-6 cursor-pointer"
            >
              {RANK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.desc})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Hero selector (only when no GSI hero) */}
          {!gsiHero && (
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={manualHeroId ?? ""}
                onChange={(e) => setManualHeroId(e.target.value ? Number(e.target.value) : null)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Select Hero --</option>
                {allHeroes.map((hero) => (
                  <option key={hero.id} value={hero.id}>
                    {hero.localized_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={() => setRefresh(n => n + 1)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-40"
            title="Refresh item data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cache status */}
      {activeHero && cacheKey && (
        <OpenDotaStatus resource={cacheKey} onRefresh={() => setRefresh(n => n + 1)} />
      )}

      {/* Active hero badge */}
      {activeHero ? (
        <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-slate-100">{activeHero.localized_name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
              {activeHero.primary_attr}
            </span>
            {activeHero.roles?.slice(0, 3).map((role) => (
              <span key={role} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400">
                {role}
              </span>
            ))}
          </div>
          {!build?.isExplorerData && build && (
            <span className="text-[10px] text-amber-300/70 italic">
              Fallback: showing all-rank data
            </span>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-400 flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Select a hero or wait for your team's draft picks to see high-rank item recommendations.</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-6 text-center text-xs text-slate-500 animate-pulse">
          Querying OpenDota Explorer for high-rank item builds...
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="py-4 text-center text-xs text-rose-300/80">
          OpenDota item data is unavailable. No replacement recommendations are shown.
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && build && build.items.length === 0 && (
        <div className="py-4 text-center text-xs text-slate-500">
          No item build data available for this hero at the selected rank bracket.
        </div>
      )}

      {/* Item builds by tier */}
      {!loading && !error && build && build.items.length > 0 && (
        <div className="space-y-3">
          {tierOrder.map((tier) => {
            const tierItems = itemsByTier[tier];
            if (!tierItems || tierItems.length === 0) return null;
            const cfg = TIER_CONFIG[tier];

            return (
              <div key={tier}>
                <div className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${cfg.color}`}>
                  <Package className="w-3.5 h-3.5" />
                  <span>{cfg.label}</span>
                  <span className="text-slate-500 font-normal">({tierItems.length} items)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {tierItems.map((item, idx) => (
                    <div
                      key={`${tier}-${item.name}-${idx}`}
                      className={`p-3 rounded-lg border transition hover:brightness-110 ${cfg.bgColor} ${cfg.borderColor}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {item.displayName}
                        </span>
                        <span className="text-xs font-mono font-semibold text-amber-400 shrink-0 ml-2">
                          {item.cost === null ? '?' : `${item.cost}g`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {item.purchaseCount.toLocaleString()} buys
                          {build.sampleSize > 0 && (
                            <span className="text-slate-500 ml-1">
                              ({Math.round((item.purchaseCount / build.sampleSize) * 100)}%)
                            </span>
                          )}
                        </span>

                        {item.winRate !== undefined && (
                          <span className={`flex items-center gap-0.5 font-mono font-semibold ${
                            item.winRate >= 52 ? 'text-emerald-400' :
                            item.winRate >= 48 ? 'text-slate-300' :
                            'text-rose-400'
                          }`}>
                            <TrendingUp className="w-3 h-3" />
                            {item.winRate}%
                          </span>
                        )}
                      </div>

                      {item.avgPurchaseTime !== undefined && (
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Avg buy: {formatGameTime(item.avgPurchaseTime)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
