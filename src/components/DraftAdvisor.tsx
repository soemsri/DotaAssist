import { openDotaCache } from '../services/openDotaCache';
import { OpenDotaStatus } from './OpenDotaStatus';
import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { GSIDraft, GSIPlayer } from "../types/gsi";
import { apiService } from "../services/apiService";
import { getEnemyPickClasses } from "../services/draftService";
import { HeroCounter, HeroMetaInfo } from "../types/meta";
import { TrendingUp, Crosshair, Sparkles, AlertCircle } from "lucide-react";

interface Props {
  draft?: GSIDraft;
  playerTeam?: GSIPlayer['team_name'];
}

export const DraftAdvisor: React.FC<Props> = ({ draft, playerTeam }) => {
  const [refresh, setRefresh] = useState(0);
  const [allHeroes, setAllHeroes] = useState<HeroMetaInfo[]>([]);
  const [selectedEnemyHeroId, setSelectedEnemyHeroId] = useState<number | null>(null);
  const [counters, setCounters] = useState<HeroCounter[]>([]);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [counterError, setCounterError] = useState(false);

  useEffect(() => {
    setAllHeroes(apiService.getAllHeroes());
    apiService.initData().then(() => {
      setAllHeroes(apiService.getAllHeroes());
    });
  }, []);

  const getHeroStatsStatus = useCallback(() => openDotaCache.status('heroStats'), []);
  const heroStatsState = useSyncExternalStore(openDotaCache.subscribe, getHeroStatsStatus);
  useEffect(() => {
    if (heroStatsState && heroStatsState.state !== 'loading') setAllHeroes(apiService.getAllHeroes());
  }, [heroStatsState]);

  // Resolve the opposing side from the local player's actual GSI team.
  const enemyPickClasses = getEnemyPickClasses(draft, playerTeam);

  const firstEnemyPick = enemyPickClasses[0];
  const autoDetectedEnemyHeroId = allHeroes.find((hero) => hero.name === firstEnemyPick)?.id;

  // Auto-sync enemy hero when GSI draft detects enemy picks
  useEffect(() => {
    if (autoDetectedEnemyHeroId) {
      setSelectedEnemyHeroId(autoDetectedEnemyHeroId);
    }
  }, [autoDetectedEnemyHeroId]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedEnemyHeroId) {
      setCounters([]);
      setLoadingCounters(false);
      setCounterError(false);
      return;
    }

    setCounters([]);
    setLoadingCounters(true);
    setCounterError(false);
    apiService
      .getCountersForHero(selectedEnemyHeroId)
      .then((data) => {
        if (!cancelled) setCounters(data);
      })
      .catch((error) => {
        console.warn(
          `[OpenDota] Matchups unavailable for hero ${selectedEnemyHeroId}:`,
          error,
        );
        if (!cancelled) setCounterError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingCounters(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEnemyHeroId, refresh]);

  const cachedHeroId = selectedEnemyHeroId;
  const getMatchupsStatus = useCallback(() => openDotaCache.status(`heroes/${cachedHeroId}/matchups`), [cachedHeroId]);
  const cacheState = useSyncExternalStore(openDotaCache.subscribe, getMatchupsStatus);
  useEffect(() => {
    if (!cachedHeroId || (cacheState?.state !== 'fresh' && cacheState?.state !== 'stale')) return;
    let cancelled = false;
    void apiService.getCountersForHero(cachedHeroId, true).then(data => { if (!cancelled) { setCounters(data); setCounterError(false); setLoadingCounters(false); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [cachedHeroId, cacheState]);

  const selectedHeroInfo = selectedEnemyHeroId
    ? apiService.getHeroById(selectedEnemyHeroId)
    : null;

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Draft & Counter-Pick Assistant
          </h3>
        </div>

        {/* Hero selection dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Target Hero:</span>
          <select
            value={selectedEnemyHeroId || ""}
            onChange={(e) => setSelectedEnemyHeroId(e.target.value ? Number(e.target.value) : null)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">-- Select Hero to Analyze --</option>
            {allHeroes.map((hero) => (
              <option key={hero.id} value={hero.id}>
                {hero.localized_name}
                {hero.winRate !== undefined ? ` (${hero.winRate}% WR)` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <OpenDotaStatus resource="heroStats" onRefresh={() => { void apiService.initData().then(() => setAllHeroes(apiService.getAllHeroes())); }} />
      {selectedEnemyHeroId && <OpenDotaStatus resource={`heroes/${selectedEnemyHeroId}/matchups`} onRefresh={() => setRefresh(n => n + 1)} />}
      {/* Target enemy badge info */}
      {selectedHeroInfo ? (
        <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Target Matchups:</span>
            <span className="text-xs font-bold text-slate-100">
              {selectedHeroInfo.localized_name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
              {selectedHeroInfo.primary_attr}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            OpenDota ranked win rate:{" "}
            {selectedHeroInfo.winRate !== undefined ? (
              <span className="text-emerald-400 font-semibold">
                {selectedHeroInfo.winRate}%
                {selectedHeroInfo.statMatches
                  ? ` (${selectedHeroInfo.statMatches.toLocaleString()} picks)`
                  : ""}
              </span>
            ) : (
              <span className="text-slate-500">Unavailable</span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-lg p-3 text-xs text-slate-400 flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Select a hero from the dropdown above or wait for Dota 2 draft to lock in enemy picks.</span>
        </div>
      )}

      {/* Recommended Counter Heroes Grid */}
      {selectedEnemyHeroId && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>OpenDota Matchup Records</span>
          </div>

          {loadingCounters ? (
            <div className="py-6 text-center text-xs text-slate-500 animate-pulse">
              Querying live OpenDota matchup database...
            </div>
          ) : counterError ? (
            <div className="py-4 text-center text-xs text-rose-300/80">
              OpenDota matchup data is unavailable. No replacement values are shown.
            </div>
          ) : counters.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500">
              No matchup records available for this hero.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {counters.map((c) => (
                <div
                  key={c.heroId}
                  className="bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-lg p-2.5 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      {c.heroName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Sample: {c.sampleMatches.toLocaleString()} matches
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {c.edgeOverEven > 0
                        ? `+${c.edgeOverEven}%`
                        : `${c.edgeOverEven}%`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Win vs target: {c.winRateAgainst}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
