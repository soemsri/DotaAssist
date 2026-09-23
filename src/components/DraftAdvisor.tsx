import { openDotaCache } from '../services/openDotaCache';
import { OpenDotaStatus } from './OpenDotaStatus';
import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { GSIDraft, GSIPlayer } from "../types/gsi";
import { apiService } from "../services/apiService";
import { getEnemyPickClasses, getAllyPickClasses } from "../services/draftService";
import { audioService } from "../services/audioService";
import { HeroCounter, HeroMetaInfo, ProHeroItemBuild } from "../types/meta";
import { TrendingUp, Crosshair, Sparkles, AlertCircle, Package, Volume2, UserCheck } from "lucide-react";

interface Props {
  draft?: GSIDraft;
  playerTeam?: GSIPlayer['team_name'];
  localPlayerHero?: string;
}

export const DraftAdvisor: React.FC<Props> = ({ draft, playerTeam, localPlayerHero }) => {
  const [refresh, setRefresh] = useState(0);
  const [allHeroes, setAllHeroes] = useState<HeroMetaInfo[]>([]);
  const [selectedEnemyHeroId, setSelectedEnemyHeroId] = useState<number | null>(null);
  const [selectedMyHeroId, setSelectedMyHeroId] = useState<number | null>(null);
  const [myProBuild, setMyProBuild] = useState<ProHeroItemBuild | null>(null);
  const [counters, setCounters] = useState<HeroCounter[]>([]);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [counterError, setCounterError] = useState(false);
  const lastAnnouncedHeroRef = React.useRef<number | null>(null);


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

  // Resolve the opposing side and ally side from the local player's actual GSI team.
  const enemyPickClasses = getEnemyPickClasses(draft, playerTeam);
  const allyPickClasses = getAllyPickClasses(draft, playerTeam);

  const firstEnemyPick = enemyPickClasses[0];
  const autoDetectedEnemyHeroId = allHeroes.find((hero) => hero.name === firstEnemyPick)?.id;

  // Auto-sync enemy hero when GSI draft detects enemy picks
  useEffect(() => {
    if (autoDetectedEnemyHeroId) {
      setSelectedEnemyHeroId(autoDetectedEnemyHeroId);
    }
  }, [autoDetectedEnemyHeroId]);

  // Auto-sync My Hero from localPlayerHero or ally draft picks
  useEffect(() => {
    if (localPlayerHero) {
      const hero = apiService.getHeroByName(localPlayerHero);
      if (hero) {
        setSelectedMyHeroId(hero.id);
        return;
      }
    }
    if (allyPickClasses.length > 0 && !selectedMyHeroId) {
      const firstAlly = allHeroes.find((h) => h.name === allyPickClasses[0]);
      if (firstAlly) setSelectedMyHeroId(firstAlly.id);
    }
  }, [localPlayerHero, allyPickClasses, allHeroes]);

  // Fetch pro build when My Hero is selected
  useEffect(() => {
    if (!selectedMyHeroId) {
      setMyProBuild(null);
      return;
    }
    const heroInfo = apiService.getHeroById(selectedMyHeroId);
    if (!heroInfo) {
      setMyProBuild(null);
      return;
    }
    const build = apiService.getProItemBuildForHero(heroInfo.name);
    setMyProBuild(build);

    // Voice announcement when a hero is first selected/locked in
    if (build && lastAnnouncedHeroRef.current !== selectedMyHeroId) {
      lastAnnouncedHeroRef.current = selectedMyHeroId;
      if (build.starting.length > 0) {
        audioService.playItemAdvice(
          heroInfo.localized_name,
          'starting',
          build.starting,
          false
        );
      }
    }
  }, [selectedMyHeroId]);


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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">My Pick / Hero:</span>
          <select
            value={selectedMyHeroId || ""}
            onChange={(e) => setSelectedMyHeroId(e.target.value ? Number(e.target.value) : null)}
            className="bg-slate-900 border border-slate-700 text-amber-300 font-semibold rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-amber-500"
          >
            <option value="">-- Choose My Hero --</option>
            {allHeroes.map((hero) => (
              <option key={`my-${hero.id}`} value={hero.id}>
                {hero.localized_name}
              </option>
            ))}
          </select>
        </div>

        {myProBuild && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Pro Build:</span>
            <span className="text-amber-400 font-bold">{myProBuild.proPlayer}</span>
            <span className="text-slate-400 text-[11px]">({myProBuild.team})</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
              {myProBuild.role}
            </span>
            <button
              onClick={() => {
                if (myProBuild.starting.length > 0) {
                  audioService.playItemAdvice(myProBuild.heroName, 'starting', myProBuild.starting, true);
                }
              }}
              className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-medium border border-amber-500/40 transition"
              title="Speak starting items advice"
            >
              <Volume2 className="w-3 h-3" />
              <span>Voice</span>
            </button>
          </div>
        )}
      </div>

      {/* Pro Item Build Display for My Selected Hero */}
      {myProBuild && (
        <div className="mb-5 p-3.5 rounded-xl bg-gradient-to-br from-amber-950/20 to-slate-950 border border-amber-500/40 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                Pro Player Item Build: {myProBuild.heroName} ({myProBuild.proPlayer} - {myProBuild.team})
              </h4>
            </div>
            <span className="text-[10px] text-amber-400 font-mono font-medium">Patch Pro Meta</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Starting Items */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wide flex items-center justify-between">
                <span>Starting Items</span>
                <span className="text-[9px] px-1 py-0.2 bg-amber-950 text-amber-300 rounded border border-amber-500/30">0:00</span>
              </div>
              <div className="space-y-1">
                {myProBuild.starting.map((item, idx) => (
                  <div key={`start-${idx}-${item.name}`} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-900/60 last:border-0">
                    <span className="text-slate-200 truncate">{item.displayName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{item.cost ? `${item.cost}g` : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Early Game */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
              <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wide flex items-center justify-between">
                <span>Early Game</span>
                <span className="text-[9px] px-1 py-0.2 bg-sky-950 text-sky-300 rounded border border-sky-500/30">~10m</span>
              </div>
              <div className="space-y-1">
                {myProBuild.early.map((item, idx) => (
                  <div key={`early-${idx}-${item.name}`} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-900/60 last:border-0">
                    <span className="text-slate-200 truncate">{item.displayName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{item.cost ? `${item.cost}g` : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Core Items */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide flex items-center justify-between">
                <span>Core Progression</span>
                <span className="text-[9px] px-1 py-0.2 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/30">Core</span>
              </div>
              <div className="space-y-1">
                {myProBuild.core.map((item, idx) => (
                  <div key={`core-${idx}-${item.name}`} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-900/60 last:border-0">
                    <span className="text-slate-100 font-semibold truncate">{item.displayName}</span>
                    <span className="text-[10px] font-mono text-emerald-400">{item.cost ? `${item.cost}g` : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Luxury / Situational */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
              <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wide flex items-center justify-between">
                <span>Luxury &amp; Situational</span>
                <span className="text-[9px] px-1 py-0.2 bg-purple-950 text-purple-300 rounded border border-purple-500/30">Late</span>
              </div>
              <div className="space-y-1">
                {[...myProBuild.luxury.slice(0, 3), ...myProBuild.situational.slice(0, 2)].map((item, idx) => (
                  <div key={`lux-${idx}-${item.name}`} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-900/60 last:border-0">
                    <span className="text-slate-200 truncate">{item.displayName}</span>
                    <span className="text-[10px] font-mono text-purple-300">{item.cost ? `${item.cost}g` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero selection dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Enemy Counter-Pick Analysis
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Target Enemy:</span>
          <select
            value={selectedEnemyHeroId || ""}
            onChange={(e) => setSelectedEnemyHeroId(e.target.value ? Number(e.target.value) : null)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">-- Select Enemy Hero to Counter --</option>
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
