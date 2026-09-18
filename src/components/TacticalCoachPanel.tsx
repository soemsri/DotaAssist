import React from "react";
import { TacticalCoachState } from "../types/meta";
import { GSIPayload } from "../types/gsi";
import { MinimapScanResult } from "../services/minimapScanner";
import { audioService } from "../services/audioService";
import {
  ShieldAlert,
  Zap,
  Package,
  Coins,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  Sparkles,
  Clock,
  Crosshair,
  ShieldCheck,
  Scroll,
  GitBranch,
  Layers,
} from "lucide-react";

interface Props {
  coachState: TacticalCoachState;
  payload: GSIPayload | null;
  isConnected: boolean;
  minimapResult: MinimapScanResult | null;
}

export const TacticalCoachPanel: React.FC<Props> = ({
  coachState,
  payload,
  isConnected,
  minimapResult,
}) => {
  const { dangerLevel, dangerReasons, powerSpike, threats, buyback, neutralSlot, tpScroll, macroPhase } = coachState;
  const heroName = payload?.hero?.name
    ? payload.hero.name.replace(/^npc_dota_hero_/, "").replace(/_/g, " ")
    : "Your Hero";
  const heroLevel = payload?.hero?.level ?? 1;

  const [selectedNeutralTier, setSelectedNeutralTier] = React.useState<number>(
    neutralSlot.tierUnlocked > 0 ? neutralSlot.tierUnlocked : 1,
  );

  React.useEffect(() => {
    if (neutralSlot.tierUnlocked > 0) {
      setSelectedNeutralTier(neutralSlot.tierUnlocked);
    }
  }, [neutralSlot.tierUnlocked]);

  const isThai = audioService.getSettings().voiceLanguage === "th-TH";
  const tierRecs =
    neutralSlot.allTierRecommendations?.[selectedNeutralTier] ||
    (selectedNeutralTier === (neutralSlot.tierUnlocked || 1)
      ? neutralSlot.recommendations
      : []) ||
    [];

  const getDangerBadge = () => {
    switch (dangerLevel) {
      case "danger":
        return {
          bg: "bg-rose-950/80 border-rose-500 text-rose-200",
          text: "HIGH DANGER",
          subtext: "Multiple enemies MIA & low health! Fall back to tower immediately.",
          icon: <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />,
          color: "text-rose-400",
        };
      case "caution":
        return {
          bg: "bg-amber-950/70 border-amber-500/80 text-amber-200",
          text: "CAUTION ADVISED",
          subtext: "Enemies missing from minimap or vulnerable position.",
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          color: "text-amber-400",
        };
      default:
        return {
          bg: "bg-emerald-950/40 border-emerald-500/40 text-emerald-200",
          text: "SAFE POSITION",
          subtext: "Allied vision secure. Farm and trade safely.",
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          color: "text-emerald-400",
        };
    }
  };

  const dangerBadge = getDangerBadge();

  return (
    <div className="space-y-5">
      {/* 1. Tactical Danger & Lane Status Banner */}
      <div className={`p-4 rounded-2xl border shadow-xl backdrop-blur transition-all ${dangerBadge.bg}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              {dangerBadge.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded bg-slate-900 font-mono">
                  {dangerBadge.text}
                </span>
                <span className="text-xs text-slate-300 font-semibold">{dangerBadge.subtext}</span>
              </div>
              {dangerReasons.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {dangerReasons.map((r, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-700 font-medium"
                    >
                      • {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => audioService.playOverextendDangerAlert(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition shrink-0"
            title="Test Danger Voice Alert"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Alert</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <span className="text-slate-400">Minimap enemy scan</span>
        <span
          className={
            minimapResult?.scanned
              ? minimapResult.all_missing
                ? "text-rose-300 font-bold"
                : "text-emerald-300"
              : "text-slate-500"
          }
        >
          {minimapResult?.scanned
            ? `${minimapResult.enemies_visible_count}/5 visible${minimapResult.all_missing ? " · ALL MISSING" : ""}`
            : minimapResult?.message ?? "Waiting for native in-game scan"}
        </span>
      </div>

      {/* 2 Grid Columns: Power Spikes & Inventory/Economy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pillar 2: Power Spike & Combo Advisor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Power Spike &amp; Combo Guide
                </h3>
              </div>
              {powerSpike && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold font-mono">
                  Lvl {powerSpike.level}
                </span>
              )}
            </div>

            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <div className="text-xs font-semibold text-slate-300">
                    Active Hero: <span className="text-amber-400 font-bold capitalize">{heroName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {powerSpike?.spikeName ?? "Level up to unlock ultimate spikes"}
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded text-[11px] font-bold font-mono ${
                    powerSpike?.isUnlocked
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {powerSpike?.isUnlocked ? "ULTIMATE READY" : "PRE-LVL 6"}
                </div>
              </div>

              {/* Combo Tip Box */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Execution &amp; Combo Sequence:</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {powerSpike?.comboTip ?? "Stay tuned for hero power spikes."}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex justify-end">
            <button
              onClick={() =>
                audioService.playPowerSpikeAlert(
                  powerSpike?.level ?? 6,
                  heroName,
                  powerSpike?.comboTip ?? "Ultimate ready",
                  true
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Announce Power Spike</span>
            </button>
          </div>
        </div>

        {/* Pillar 4: Smart Inventory & Economy Coach */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Smart Inventory &amp; Buyback
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Game Economy</span>
            </div>

            <div className="mt-3 space-y-3">
              {/* Neutral Item Status & Advisor */}
              <div
                className={`p-3.5 rounded-xl border transition ${
                  neutralSlot.alertActive
                    ? "bg-purple-950/50 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)] animate-pulse"
                    : "bg-slate-950 border-slate-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className={`w-4 h-4 ${neutralSlot.alertActive ? "text-purple-400" : "text-slate-400"}`} />
                    <span className="text-xs font-bold text-slate-200">
                      Neutral Slot: {neutralSlot.tierUnlocked > 0 ? `Tier ${neutralSlot.tierUnlocked}` : "Locked (< 7m)"}
                    </span>
                    {neutralSlot.heroRole && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-900/50 text-purple-300 border border-purple-700/50 font-medium">
                        {neutralSlot.heroRole}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono self-start sm:self-auto ${
                      neutralSlot.isSlotEmpty
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {neutralSlot.isSlotEmpty ? "EMPTY!" : "EQUIPPED"}
                  </span>
                </div>

                <div className="text-xs text-slate-300 mt-1.5">
                  {neutralSlot.isSlotEmpty ? (
                    <span className="text-purple-300 font-semibold">
                      ⚠️ Slot is empty! Visit base or use courier to pick your Tier {neutralSlot.tierUnlocked || 1} token.
                    </span>
                  ) : (
                    <span>
                      Equipped: <strong className="text-emerald-400 capitalize">{neutralSlot.equippedItemName}</strong>
                    </span>
                  )}
                </div>

                {/* Tier Selection Pills */}
                <div className="mt-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{isThai ? "คำแนะนำไอเทมป่าตาม Tier" : "Neutral Creep Items Advisor"}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isThai ? "แนะนำเลือกตามลำดับ S > A > B" : "Pick highest tier available from token"}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((tierNum) => {
                      const isUnlocked = neutralSlot.tierUnlocked >= tierNum;
                      const isSelected = selectedNeutralTier === tierNum;
                      const tierMinutes = [7, 17, 27, 37, 60][tierNum - 1];

                      return (
                        <button
                          key={tierNum}
                          onClick={() => setSelectedNeutralTier(tierNum)}
                          className={`py-1.5 px-2 rounded-lg text-center transition flex flex-col items-center justify-center border text-[11px] ${
                            isSelected
                              ? "bg-purple-900/60 border-purple-500 text-purple-200 shadow-md shadow-purple-900/40 font-bold"
                              : isUnlocked
                              ? "bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                              : "bg-slate-950/60 border-slate-800 text-slate-500 hover:bg-slate-900/50"
                          }`}
                        >
                          <span className="text-xs font-mono font-bold">Tier {tierNum}</span>
                          <span className="text-[9px] opacity-75">{tierMinutes}m</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Recommendation Item Cards */}
                  <div className="mt-3 space-y-2">
                    {tierRecs.length === 0 ? (
                      <div className="text-center py-3 text-xs text-slate-500 bg-slate-900/40 rounded-lg">
                        {isThai ? "ไม่มีข้อมูลสำหรับ Tier นี้" : "No recommendations available for this tier"}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {tierRecs.map((item) => {
                          const isS = item.tierRank === "S";
                          const isA = item.tierRank === "A";

                          return (
                            <div
                              key={item.key}
                              className={`p-2.5 rounded-lg border flex flex-col justify-between transition ${
                                isS
                                  ? "bg-purple-950/40 border-purple-500/60 shadow-sm shadow-purple-900/20"
                                  : isA
                                  ? "bg-emerald-950/30 border-emerald-500/40"
                                  : "bg-slate-900/50 border-slate-800"
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
                                  <span className="text-[10px] font-mono font-semibold text-amber-400/90 shrink-0">
                                    {item.score} pts
                                  </span>
                                </div>

                                <div className="text-[10px] font-mono text-emerald-400/90 font-medium mb-1">
                                  {item.statsSummary}
                                </div>

                                <div className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                                  {isThai ? item.reasonTh : item.reasonEn}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Town Portal Scroll Status */}
              <div
                className={`p-3 rounded-xl border transition ${
                  tpScroll?.alertActive
                    ? "bg-amber-950/50 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse"
                    : "bg-slate-950 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scroll className={`w-4 h-4 ${tpScroll?.alertActive ? "text-amber-400" : "text-slate-400"}`} />
                    <span className="text-xs font-bold text-slate-200">
                      Town Portal Scroll
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      tpScroll?.alertActive
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : tpScroll?.isTravelBoots
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {tpScroll?.alertActive
                      ? "NO TP SCROLL!"
                      : tpScroll?.isTravelBoots
                      ? "BOOTS OF TRAVEL"
                      : `${tpScroll?.charges ?? 0} CHARGES`}
                  </span>
                </div>

                <div className="text-xs text-slate-300 mt-1">
                  {tpScroll?.alertActive ? (
                    <span className="text-amber-300 font-semibold">
                      ⚠️ No TP scroll in inventory! Buy one from the shop or deliver via courier to join teamfights or escape.
                    </span>
                  ) : tpScroll?.isTravelBoots ? (
                    <span className="text-amber-300">
                      Equipped Boots of Travel (Unlimited Teleports).
                    </span>
                  ) : (
                    <span>
                      Ready: <strong className="text-emerald-400">{tpScroll?.charges ?? 0} scrolls available</strong>
                      {tpScroll?.cooldownRemaining ? ` (Cooldown: ${Math.ceil(tpScroll.cooldownRemaining)}s)` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Buyback Economy Status */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">Buyback Status (Post 20m)</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      buyback.state === "ready"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : buyback.state === "cooldown"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : buyback.state === "deficit"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {buyback.state === "ready"
                      ? "READY"
                      : buyback.state === "deficit"
                      ? `DEFICIT -${buyback.deficit}g`
                      : buyback.state === "cooldown"
                      ? `CD (${buyback.cooldownRemaining}s)`
                      : "EARLY GAME"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
                  <span>Current Gold: <strong className="text-amber-400">{buyback.currentGold}g</strong></span>
                  <span>Cost: <strong className="text-slate-200">{buyback.buybackCost}g</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => audioService.playNoTpScrollAlert(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test TP Alert</span>
            </button>
            <button
              onClick={() => {
                const topItems = tierRecs.slice(0, 2).map((r) => r.displayName).join(', ');
                audioService.playNeutralSlotReminder(selectedNeutralTier, heroName, topItems, true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold border border-slate-700 transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Neutral Advice (T{selectedNeutralTier})</span>
            </button>
            <button
              onClick={() => audioService.playBuybackWarning(buyback.deficit || 450, true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold border border-slate-700 transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Buyback Alert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pillar 3: Adaptive Counter-Items Advisor */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Enemy Threats &amp; Adaptive Counter-Items
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {threats.length > 0 ? `${threats.length} Threats Detected` : "Awaiting Draft Picks"}
          </span>
        </div>

        {threats.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
            {isConnected
              ? "Drafting or no enemy threats detected yet. Counter items will populate as enemy heroes are revealed."
              : "Connect Dota 2 to analyze enemy team composition and counter builds."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {threats.map((threat, idx) => (
              <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">{threat.threatName}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    {threat.enemyHeroes.join(", ")}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {threat.recommendedCounters.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between transition ${
                        item.isEquipped
                          ? "bg-emerald-950/30 border-emerald-700/50 text-emerald-200"
                          : "bg-slate-900/80 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="min-w-0 mr-2">
                        <div className="font-bold flex items-center gap-1.5">
                          {item.isEquipped && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          <span className="truncate">{item.displayName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{item.reason}</div>
                      </div>

                      <div className="text-right shrink-0">
                        {item.isEquipped ? (
                          <span className="text-[10px] font-bold text-emerald-400 font-mono">OWNED</span>
                        ) : (
                          <span className="text-[11px] font-mono font-bold text-amber-400">{item.cost}g</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Skill Build & Level-up Roadmap (Levels 1–25) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              {isThai ? "ผังลำดับการอัพสกิลแบบไดนามิก (Skill Build 1–25)" : "Dynamic Skill Build Roadmap (Levels 1–25)"}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {coachState.skillBuildAnalysis?.unspentPoints && coachState.skillBuildAnalysis.unspentPoints > 0 ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold font-mono animate-pulse flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>
                  {isThai
                    ? `มีแต้มสกิลคงเหลือ: ${coachState.skillBuildAnalysis.unspentPoints} แต้ม`
                    : `${coachState.skillBuildAnalysis.unspentPoints} Skill Point Available`}
                </span>
              </span>
            ) : null}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold font-mono">
              {heroName}
            </span>
          </div>
        </div>

        {!coachState.skillBuildAnalysis || coachState.skillBuildAnalysis.progression.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
            {isConnected
              ? (isThai ? "กำลังโหลดข้อมูลลำดับสกิลของฮีโร่..." : "Loading skill build data for hero...")
              : (isThai ? "เชื่อมต่อ Dota 2 เพื่อเปิดใช้งานการวิเคราะห์ลำดับสกิล" : "Connect Dota 2 to analyze optimal skill builds for your hero.")}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Ability Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {coachState.skillBuildAnalysis.abilities.map((ab) => {
                const curLvl = coachState.skillBuildAnalysis?.learnedLevelsBySlot[ab.slot] || 0;
                const maxLvl = ab.slot === "R" ? 3 : 4;
                const slotColor =
                  ab.slot === "Q"
                    ? "border-sky-500/40 bg-sky-950/30 text-sky-300"
                    : ab.slot === "W"
                    ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                    : ab.slot === "E"
                    ? "border-purple-500/40 bg-purple-950/30 text-purple-300"
                    : "border-rose-500/40 bg-rose-950/30 text-rose-300";

                return (
                  <div
                    key={ab.slot}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${slotColor}`}
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs px-1.5 py-0.5 rounded bg-slate-900/80 font-mono">
                          [{ab.slot}]
                        </span>
                        <span className="font-bold text-xs truncate text-white">
                          {ab.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-black shrink-0 px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-200">
                      {curLvl}/{maxLvl}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current Level-Up Recommendation Callout if points available */}
            {coachState.skillBuildAnalysis.currentRecommendation && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                        {isThai ? "แนะนำให้อัพตอนนี้:" : "RECOMMENDED NEXT:"}
                      </span>
                      <span className="font-bold text-xs text-white bg-amber-900/80 px-2 py-0.5 rounded font-mono">
                        [{coachState.skillBuildAnalysis.currentRecommendation.slot}] {coachState.skillBuildAnalysis.currentRecommendation.skillName}
                        {coachState.skillBuildAnalysis.currentRecommendation.targetLevel ? ` (Lvl ${coachState.skillBuildAnalysis.currentRecommendation.targetLevel})` : ""}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-200/90 mt-0.5">
                      💡 {isThai ? coachState.skillBuildAnalysis.currentRecommendation.reasonTh : coachState.skillBuildAnalysis.currentRecommendation.reasonEn}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-mono font-bold shrink-0">
                  {isThai ? `เลเวล ${heroLevel}` : `Level ${heroLevel}`}
                </span>
              </div>
            )}

            {/* 1-25 Skill Progression Grid */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span>{isThai ? "ผังลำดับสกิล 1–25 เลเวล (Progression Steps):" : "1–25 Skill Progression Steps:"}</span>
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    {isThai ? "อัพแล้ว" : "Learned"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    {isThai ? "แนะนำจุดนี้" : "Target"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                    {isThai ? "อนาคต" : "Upcoming"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-13 lg:grid-cols-25 gap-1.5">
                {coachState.skillBuildAnalysis.progression.map((step) => {
                  const isLearned = heroLevel >= step.level && (!coachState.skillBuildAnalysis?.unspentPoints || step.level < heroLevel);
                  const isCurrentTarget = heroLevel === step.level;
                  const isTalent = step.isTalent || step.slot === "Talent";
                  const isStats = step.slot === "Stats";

                  let slotBadgeClass = "bg-slate-800 text-slate-300 border-slate-700";
                  if (step.slot === "Q") slotBadgeClass = "bg-sky-950 text-sky-300 border-sky-600/50";
                  else if (step.slot === "W") slotBadgeClass = "bg-emerald-950 text-emerald-300 border-emerald-600/50";
                  else if (step.slot === "E") slotBadgeClass = "bg-purple-950 text-purple-300 border-purple-600/50";
                  else if (step.slot === "R") slotBadgeClass = "bg-rose-950 text-rose-300 border-rose-600/70 font-black";
                  else if (isTalent) slotBadgeClass = "bg-amber-950 text-amber-300 border-amber-600/60 font-black";

                  return (
                    <div
                      key={step.level}
                      className={`p-1.5 rounded-lg border flex flex-col items-center justify-between text-center min-w-[36px] transition relative ${
                        isCurrentTarget
                          ? "border-amber-400 bg-amber-950/50 shadow-[0_0_8px_rgba(245,158,11,0.3)] ring-1 ring-amber-400"
                          : isLearned
                          ? "border-slate-700 bg-slate-950/80 text-slate-300"
                          : "border-slate-800 bg-slate-950/40 opacity-70 hover:opacity-100"
                      }`}
                      title={`Lvl ${step.level}: [${step.slot}] ${step.skillName}${step.targetLevel ? ` (Rank ${step.targetLevel})` : ""}`}
                    >
                      <span className={`text-[9px] font-mono font-bold ${isCurrentTarget ? "text-amber-400 font-black" : "text-slate-400"}`}>
                        {step.level}
                      </span>
                      <span className={`px-1 py-0.5 my-1 rounded text-[10px] font-mono font-bold border ${slotBadgeClass}`}>
                        {isTalent ? "⭐" : isStats ? "+2" : step.slot}
                      </span>
                      <span className="text-[8px] font-mono text-slate-400 truncate max-w-full">
                        {isTalent ? "Talent" : isStats ? "Stats" : step.targetLevel ? `L${step.targetLevel}` : ""}
                      </span>
                      {isLearned && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 text-slate-950 text-[7px] font-black flex items-center justify-center">
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pillar 6: Adaptive Talent Tree Guide */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              {isThai ? "ผังต้นไม้ทักษะพิเศษแบบปรับตัว (Talent Tree)" : "Adaptive Talent Tree Guide"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold font-mono">
              {isThai ? `ฮีโร่เลเวล ${heroLevel}` : `Hero Lvl ${heroLevel}`}
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              {isThai ? "แนะนำตามภัยคุกคามศัตรู" : "Threat-Adaptive"}
            </span>
          </div>
        </div>

        {!coachState.talentAnalysis || coachState.talentAnalysis.tiers.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
            {isConnected
              ? (isThai ? "กำลังรอข้อมูลฮีโร่และดราฟต์ศัตรู..." : "Awaiting hero data and enemy draft to calculate talent recommendations.")
              : (isThai ? "เชื่อมต่อ Dota 2 เพื่อเปิดใช้งานการวิเคราะห์ทักษะพิเศษ" : "Connect Dota 2 to analyze optimal talents for your hero.")}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Show tiers from 25 down to 10 */}
            {[...coachState.talentAnalysis.tiers]
              .sort((a, b) => b.level - a.level)
              .map((tier) => {
                const isUnlocked = heroLevel >= tier.level;
                const isLeftRec = tier.recommended === "left";
                const isRightRec = tier.recommended === "right";
                const leftText = isThai ? tier.left.th : tier.left.en;
                const rightText = isThai ? tier.right.th : tier.right.en;
                const reasonText = isThai ? tier.reasonTh : tier.reasonEn;
                const recChoiceText = isLeftRec ? leftText : rightText;

                return (
                  <div
                    key={tier.level}
                    className={`p-3 rounded-xl border transition ${
                      isUnlocked
                        ? "bg-slate-950/80 border-slate-700/80 shadow-md"
                        : "bg-slate-950/40 border-slate-800/60 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs font-mono border ${
                            isUnlocked
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                              : "bg-slate-900 text-slate-400 border-slate-700"
                          }`}
                        >
                          {tier.level}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          {isThai ? `เลเวล ${tier.level}` : `Level ${tier.level} Milestone`}
                        </span>
                        {isUnlocked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-semibold">
                            UNLOCKED
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          audioService.playTalentAlert(
                            tier.level,
                            tier.recommended,
                            recChoiceText,
                            reasonText,
                            true
                          )
                        }
                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold border border-slate-800 transition"
                        title={isThai ? `ทดสอบเสียงเตือนเลเวล ${tier.level}` : `Preview Level ${tier.level} Voice Advice`}
                      >
                        <Volume2 className="w-3 h-3" />
                        <span className="hidden sm:inline">{isThai ? "ฟังเสียงแนะนำ" : "Voice Advice"}</span>
                      </button>
                    </div>

                    {/* Left vs Right Branches */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {/* Left Option */}
                      <div
                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition ${
                          isLeftRec
                            ? "bg-emerald-950/40 border-emerald-500/70 shadow-sm shadow-emerald-900/30 text-emerald-200"
                            : "bg-slate-900/60 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs truncate text-slate-100">
                              {leftText}
                            </span>
                            {isLeftRec && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-slate-950 font-black text-[9px] font-mono flex items-center gap-0.5 shrink-0 shadow">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>{isThai ? "แนะนำ" : "RECOMMENDED"}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        {isLeftRec && (
                          <div className="text-[11px] text-emerald-300/90 mt-1 font-medium bg-emerald-950/60 p-1.5 rounded border border-emerald-800/40">
                            💡 {reasonText}
                          </div>
                        )}
                      </div>

                      {/* Right Option */}
                      <div
                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition ${
                          isRightRec
                            ? "bg-emerald-950/40 border-emerald-500/70 shadow-sm shadow-emerald-900/30 text-emerald-200"
                            : "bg-slate-900/60 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs truncate text-slate-100">
                              {rightText}
                            </span>
                            {isRightRec && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-slate-950 font-black text-[9px] font-mono flex items-center gap-0.5 shrink-0 shadow">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>{isThai ? "แนะนำ" : "RECOMMENDED"}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        {isRightRec && (
                          <div className="text-[11px] text-emerald-300/90 mt-1 font-medium bg-emerald-950/60 p-1.5 rounded border border-emerald-800/40">
                            💡 {reasonText}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Pillar 5: Macro Strategy & Game Phase Advisor */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Macro Strategy &amp; Phase Objectives
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold font-mono">
              {macroPhase.timeRange}
            </span>
            <span className="text-xs text-slate-300 font-bold">{macroPhase.phaseTitle}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Key Objectives for Current Phase</span>
            </div>
            <ul className="space-y-1.5 mt-2">
              {macroPhase.keyObjectives.map((obj, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-amber-950/30 to-slate-950 p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Coach Strategic Advice:</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                "{macroPhase.coachAdvice}"
              </p>
            </div>
            <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-800/80 font-mono">
              Dynamic Strategy Engine
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
