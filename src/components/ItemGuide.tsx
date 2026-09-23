import { openDotaCache } from '../services/openDotaCache';
import { OpenDotaStatus } from './OpenDotaStatus';
import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { apiService } from "../services/apiService";
import { audioService } from "../services/audioService";
import { PopularItem, HeroMetaInfo } from "../types/meta";
import { Package, Coins, HelpCircle, Volume2, Sparkles, Crown } from "lucide-react";
import { neutralAdvisor, getHeroArchetype } from "../services/neutralAdvisor";

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
  const [itemSection, setItemSection] = useState<"pro" | "shop" | "neutral">("pro");
  const [selectedNeutralTier, setSelectedNeutralTier] = useState<number>(1);


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
  const getCacheStatus = useCallback(() => openDotaCache.status(`heroes/${cachedHeroId}/itemPopularity`), [cachedHeroId]);
  const cacheState = useSyncExternalStore(openDotaCache.subscribe, getCacheStatus);
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

          {activeHero && items.length > 0 && (
            <button
              onClick={() => {
                const core = items.filter((i) => i.tier === "core");
                const early = items.filter((i) => i.tier === "early");
                const targetItems = core.length > 0 ? core : (early.length > 0 ? early : items);
                const phase = core.length > 0 ? "core" : (early.length > 0 ? "early" : "luxury");
                audioService.playItemAdvice(activeHero.localized_name, phase, targetItems, true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
              title="Speak recommended items"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Speak Advice</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
        <button
          onClick={() => setItemSection("pro")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            itemSection === "pro"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Pro Player Builds</span>
        </button>

        <button
          onClick={() => setItemSection("shop")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            itemSection === "shop"
              ? "bg-sky-500/15 text-sky-300 border border-sky-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Package className="w-3.5 h-3.5 text-sky-400" />
          <span>Shop Items (OpenDota)</span>
        </button>

        <button
          onClick={() => setItemSection("neutral")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            itemSection === "neutral"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Neutral Creep Items (Tier 1-5)</span>
        </button>
      </div>


      {itemSection === "shop" && activeHero && (
        <OpenDotaStatus resource={`heroes/${activeHero.id}/itemPopularity`} onRefresh={() => setRefresh(n => n + 1)} />
      )}


      {itemSection === "neutral" ? (
        !activeHero ? (
          <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-lg p-5 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <HelpCircle className="w-6 h-6 text-slate-500" />
            <p>No active hero detected.</p>
            <p className="text-slate-500 text-[11px]">
              Pick a hero in Dota 2 or choose one above to see neutral creep item recommendations.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Hero Role Banner & Audio Actions */}
            {(() => {
              const isThai = audioService.getSettings().voiceLanguage === "th-TH";
              const heroKey = activeHero.name || "hero";
              const archetypeInfo = getHeroArchetype(heroKey);
              const neutralRecs = neutralAdvisor.getRecommendations(heroKey, selectedNeutralTier);

              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{activeHero.localized_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-900/50 text-purple-300 border border-purple-700/50 font-medium">
                        {isThai ? archetypeInfo.roleLabelTh : archetypeInfo.roleLabelEn}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const topItems = neutralRecs.slice(0, 2).map((r) => r.displayName).join(", ");
                        audioService.playNeutralSlotReminder(selectedNeutralTier, activeHero.localized_name, topItems, true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Speak Neutral Advice</span>
                    </button>
                  </div>

                  {/* Tier Selector Pills */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((tierNum) => {
                      const isSelected = selectedNeutralTier === tierNum;
                      const tierMinutes = [7, 17, 27, 37, 60][tierNum - 1];

                      return (
                        <button
                          key={tierNum}
                          onClick={() => setSelectedNeutralTier(tierNum)}
                          className={`py-1.5 px-2 rounded-lg text-center transition flex flex-col items-center justify-center border text-[11px] ${
                            isSelected
                              ? "bg-purple-900/60 border-purple-500 text-purple-200 shadow-md shadow-purple-900/40 font-bold"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900/50"
                          }`}
                        >
                          <span className="text-xs font-mono font-bold">Tier {tierNum}</span>
                          <span className="text-[9px] opacity-75">{tierMinutes}m</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Recommendation Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {neutralRecs.map((item) => {
                      const isS = item.tierRank === "S";
                      const isA = item.tierRank === "A";

                      return (
                        <div
                          key={item.key}
                          className={`p-3 rounded-lg border flex flex-col justify-between transition ${
                            isS
                              ? "bg-purple-950/40 border-purple-500/60 shadow-sm shadow-purple-900/20"
                              : isA
                              ? "bg-emerald-950/30 border-emerald-500/40"
                              : "bg-slate-950/60 border-slate-800"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-black text-[10px] font-mono shrink-0 ${
                                    isS
                                      ? "bg-gradient-to-r from-purple-600 to-amber-500 text-white shadow"
                                      : isA
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-700 text-slate-300"
                                  }`}
                                >
                                  {item.tierRank}-Tier
                                </span>
                                <span className="font-bold text-xs text-slate-100 truncate">
                                  {item.displayName}
                                </span>
                              </div>
                              <span className="text-xs font-mono font-semibold text-amber-400 shrink-0">
                                {item.score} pts
                              </span>
                            </div>

                            <div className="text-[11px] font-mono text-emerald-400 font-medium mb-1">
                              {item.statsSummary}
                            </div>

                            <div className="text-xs text-slate-300 mb-1.5 leading-relaxed">
                              {isThai ? item.reasonTh : item.reasonEn}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )
      ) : itemSection === "pro" ? (
        !activeHero ? (
          <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-lg p-5 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <HelpCircle className="w-6 h-6 text-slate-500" />
            <p>No active hero detected.</p>
            <p className="text-slate-500 text-[11px]">
              Pick a hero in Dota 2 or choose one above to view pro player item builds.
            </p>
          </div>
        ) : (() => {
          const proBuild = apiService.getProItemBuildForHero(activeHero.name);
          if (!proBuild) {
            return (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-950/50 rounded-lg border border-slate-800">
                No pro build template available for {activeHero.localized_name}.
              </div>
            );
          }

          const renderItemRow = (item: { name: string; displayName: string; cost: number | null }) => {
            const hasPrice = item.cost !== null;
            const hasWallet = currentGold !== undefined;
            const goldNeeded = hasPrice && hasWallet ? Math.max(0, item.cost! - currentGold) : null;
            const canAfford = goldNeeded === 0;

            return (
              <div
                key={`pro-${item.name}`}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <span className="text-slate-200 font-medium truncate">{item.displayName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11px] text-amber-400">
                    {item.cost ? `${item.cost}g` : 'Free'}
                  </span>
                  {hasWallet && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                        canAfford ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {canAfford ? 'OK' : `-${goldNeeded}g`}
                    </span>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-4">
              {/* Pro Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-950/30 to-slate-950 border border-amber-500/40">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-100">{proBuild.heroName}</span>
                  <span className="text-amber-400 font-semibold text-xs">
                    ({proBuild.proPlayer} — {proBuild.team})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-900/50 text-amber-300 border border-amber-700/50 font-medium">
                    {proBuild.role}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (proBuild.starting.length > 0) {
                        audioService.playItemAdvice(proBuild.heroName, 'starting', proBuild.starting, true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                    title="Speak starting items advice"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Speak Starting</span>
                  </button>

                  <button
                    onClick={() => {
                      if (proBuild.core.length > 0) {
                        audioService.playItemAdvice(proBuild.heroName, 'core', proBuild.core, true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                    title="Speak core items advice"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Speak Core</span>
                  </button>
                </div>
              </div>

              {/* 4 Build Stages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Starting Items */}
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Starting Items</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-mono">0:00 - Fountain</span>
                  </div>
                  <div className="space-y-1.5">
                    {proBuild.starting.map(renderItemRow)}
                  </div>
                </div>

                {/* 2. Early Game */}
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wide">Early Game</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-mono">Laning Stage</span>
                  </div>
                  <div className="space-y-1.5">
                    {proBuild.early.map(renderItemRow)}
                  </div>
                </div>

                {/* 3. Core Items */}
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Core Progression</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">Power Spikes</span>
                  </div>
                  <div className="space-y-1.5">
                    {proBuild.core.map(renderItemRow)}
                  </div>
                </div>

                {/* 4. Luxury & Situational */}
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">Luxury &amp; Situational</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-mono">Late Game</span>
                  </div>
                  <div className="space-y-1.5">
                    {[...proBuild.luxury, ...proBuild.situational].map(renderItemRow)}
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : !activeHero ? (
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
