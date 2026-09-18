import { OpenDotaStatus } from './OpenDotaStatus';
import { apiService } from '../services/apiService';
import { AlertProfileControls } from './AlertProfileControls';
import React, { useState, useSyncExternalStore } from 'react';
import { TimingEventAlert, PopularItem } from '../types/meta';
import { GSIPayload } from '../types/gsi';
import { Bell, Minimize2, Maximize2, Package, X, Settings, Volume2, VolumeX, ShieldAlert, Shield, Sparkles, Flame, Droplets, ClipboardCheck, Coins, Layers, Swords } from 'lucide-react';
import { timingEngine } from '../services/timingEngine';
import { audioService } from '../services/audioService';
import { objectiveTracker } from '../services/objectiveTracker';
import { buybackService } from '../services/buybackService';
import { neutralItemService } from '../services/neutralItemService';
import { enemyUltimateService } from '../services/enemyUltimateService';
import { EnemyUltimateBar } from './EnemyUltimateBar';
import { laningBenchmarkService } from '../services/laningBenchmarkService';
import { LaningPaceIndicator } from './LaningPaceIndicator';
import { enemyGlyphService } from '../services/enemyGlyphService';
import { EnemyGlyphIndicator } from './EnemyGlyphIndicator';

interface Props {
  interactive?: boolean;
  payload: GSIPayload | null;
  isConnected: boolean;
  alerts: TimingEventAlert[];
  items: PopularItem[];
  onRefreshItems: () => void;
  onOpenSettings: () => void;
  onExitOverlay: () => void;
}

export const OverlayHUD: React.FC<Props> = ({
  interactive = true,
  payload,
  isConnected,
  alerts,
  items,
  onRefreshItems,
  onOpenSettings,
  onExitOverlay,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [opacity, setOpacity] = useState(90);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const undoState = useSyncExternalStore(objectiveTracker.subscribe, objectiveTracker.getSnapshot);

  const clockTime = payload?.map?.clock_time ?? 0;
  const formattedTime = isConnected ? timingEngine.formatTime(clockTime) : '--:--';
  const mostUrgentAlert = alerts[0];
  const stackAlert = alerts.find((a) => a.type === 'camp_stack');
  const popularItem = items.find((item) => item.tier === 'core') ?? items[0];
  const roshanState = timingEngine.getRoshanState();
  const tormentorState = timingEngine.getTormentorState();
  const buyback = buybackService.calculateBuyback(payload);
  const neutralStatus = neutralItemService.getNeutralItemStatus(payload, clockTime);
  const ultSnapshot = useSyncExternalStore(enemyUltimateService.subscribe, enemyUltimateService.getSnapshot);
  const laningSnapshot = useSyncExternalStore(laningBenchmarkService.subscribe, laningBenchmarkService.getSnapshot);
  const glyphSnapshot = useSyncExternalStore(enemyGlyphService.subscribe, enemyGlyphService.getSnapshot);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioService.setSfxEnabled(next);
    audioService.setVoiceEnabled(next);
  };

  const handleRecordRoshan = () => {
    objectiveTracker.recordRoshan(clockTime);
  };

  const handleRecordTormentor = () => {
    objectiveTracker.recordTormentor(clockTime);
  };

  const getAlertIcon = (type: TimingEventAlert['type']) => {
    switch (type) {
      case 'rune_wisdom':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 'rune_power':
        return <Flame className="w-3.5 h-3.5 text-sky-400" />;
      case 'rune_bounty':
        return <span className="w-3.5 h-3.5 rounded-full bg-amber-400 font-bold text-[9px] flex items-center justify-center text-slate-950">B</span>;
      case 'roshan':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'tormentor':
        return <Flame className="w-3.5 h-3.5 text-blue-400" />;
      case 'lotus':
        return <Droplets className="w-3.5 h-3.5 text-emerald-400" />;
      case 'neutral_item':
        return <Package className="w-3.5 h-3.5 text-amber-300" />;
      case 'camp_stack':
        return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
      case 'enemy_ultimate':
        return <Swords className="w-3.5 h-3.5 text-rose-400" />;
      case 'enemy_glyph':
        return <Shield className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col justify-start items-center p-2 select-none"
      style={{ opacity: opacity / 100 }}
    >
      <AlertProfileControls />
      {collapsed ? (
        /* Collapsed minimal badge */
        <button
          data-tauri-drag-region
          onClick={() => setCollapsed(false)}
          className="w-full flex items-center justify-between bg-slate-900/95 border border-slate-700/80 px-3 py-2 rounded-2xl shadow-2xl backdrop-blur text-xs hover:border-amber-400 transition cursor-move text-slate-100"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-mono font-black text-amber-400">{formattedTime}</span>
            {isConnected && payload?.hero && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  buyback.cooldown > 0
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                    : buyback.hasBuyback
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                }`}
                title={`Buyback: ${buyback.hasBuyback ? 'Ready' : buyback.cooldown > 0 ? 'Cooldown' : 'Not ready'}`}
              >
                {buyback.cooldown > 0
                  ? `CD ${buyback.cooldown}s`
                  : buyback.hasBuyback
                  ? `+${buyback.surplusGold}g`
                  : `-${buyback.missingGold}g`}
              </span>
            )}
            {isConnected && neutralStatus.unlockedTier > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  neutralStatus.isMissing
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 animate-pulse'
                    : neutralStatus.isOutdated
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
                title={`Neutral Item: ${
                  neutralStatus.isMissing
                    ? `Slot Empty! Tier ${neutralStatus.unlockedTier} Available`
                    : neutralStatus.isOutdated
                    ? `Tier ${neutralStatus.equippedTier} equipped (Tier ${neutralStatus.unlockedTier} available)`
                    : `Tier ${neutralStatus.equippedTier} (${neutralStatus.equippedItemName?.replace(/^item_/, '') || 'Equipped'})`
                }`}
              >
                {neutralStatus.isMissing
                  ? `No T${neutralStatus.unlockedTier}`
                  : neutralStatus.isOutdated
                  ? `T${neutralStatus.equippedTier}→T${neutralStatus.unlockedTier}`
                  : `T${neutralStatus.equippedTier}`}
              </span>
            )}
            {isConnected && stackAlert && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  stackAlert.urgent
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
                title={`Camp Stacking: ${stackAlert.secondsRemaining > 0 ? `${stackAlert.secondsRemaining}s to pull (:53)` : 'Pull NOW (until :55)'}`}
              >
                Stack {stackAlert.secondsRemaining > 0 ? `${stackAlert.secondsRemaining}s` : 'NOW'}
              </span>
            )}
            {isConnected && ultSnapshot.activeCooldownCount > 0 && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40"
                title={`${ultSnapshot.activeCooldownCount} enemy ultimates estimated on cooldown`}
              >
                {ultSnapshot.activeCooldownCount} Est. Ult CD
              </span>
            )}
            {isConnected && laningSnapshot.isActive && laningSnapshot.clockTime <= 600 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  laningSnapshot.paceStatus === 'ahead'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : laningSnapshot.paceStatus === 'behind'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
                title={`${laningSnapshot.role.toUpperCase()} CS: ${laningSnapshot.currentLastHits}/${laningSnapshot.expectedCS} (${laningSnapshot.csDiff >= 0 ? `+${laningSnapshot.csDiff}` : laningSnapshot.csDiff})`}
              >
                CS {laningSnapshot.currentLastHits}/{laningSnapshot.expectedCS}
              </span>
            )}
            {isConnected && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  glyphSnapshot.isActive
                    ? 'bg-sky-950/80 text-sky-200 border border-sky-400 animate-pulse'
                    : !glyphSnapshot.isReady
                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                }`}
                title={`Enemy Glyph: ${
                  glyphSnapshot.isActive
                    ? `INVULNERABLE (${glyphSnapshot.activeRemainingSeconds}s)`
                    : !glyphSnapshot.isReady
                    ? `Cooldown (${timingEngine.formatTime(glyphSnapshot.cooldownRemainingSeconds)})`
                    : 'Ready'
                }`}
              >
                {glyphSnapshot.isActive
                  ? `Glyph ${glyphSnapshot.activeRemainingSeconds}s ⚡`
                  : !glyphSnapshot.isReady
                  ? `Glyph ${timingEngine.formatTime(glyphSnapshot.cooldownRemainingSeconds)}`
                  : 'Glyph Ready'}
              </span>
            )}
          </div>
          {mostUrgentAlert && (
            <span className="text-slate-200 text-[11px] truncate max-w-[160px]">
              {mostUrgentAlert.title} ({mostUrgentAlert.secondsRemaining}s)
            </span>
          )}
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        </button>
      ) : (
        /* Full Compact Overlay Widget */
        <div className="w-full bg-slate-950/95 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur p-3 text-slate-100 flex flex-col gap-2.5">
          {/* Header */}
          <div data-tauri-drag-region className="flex items-center justify-between pb-2 border-b border-slate-800 cursor-move">
            <div data-tauri-drag-region className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-black tracking-wider uppercase text-amber-400">
                DotaAssist HUD
              </span>
              <span className="font-mono text-xs font-bold text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">
                {formattedTime}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleSound}
                className={`p-1 rounded transition ${
                  soundEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-400'
                }`}
                title={soundEnabled ? 'Mute Voice & Audio' : 'Unmute Voice & Audio'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onOpenSettings}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
                title="Minimize HUD"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onExitOverlay}
                className="p-1 text-slate-400 hover:text-rose-400 rounded"
                title="Exit overlay to Strategy Dashboard"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Buyback & Safe-to-Spend Status Banner */}
          {isConnected && payload?.hero && (
            <div
              className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px] ${
                buyback.cooldown > 0
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : buyback.hasBuyback
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <Coins
                  className={`w-3.5 h-3.5 shrink-0 ${
                    buyback.cooldown > 0
                      ? 'text-amber-400'
                      : buyback.hasBuyback
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                />
                <span className="truncate">
                  {buyback.cooldown > 0
                    ? `Buyback Cooldown (${buyback.cooldown}s)`
                    : buyback.hasBuyback
                    ? 'Buyback Ready'
                    : 'No Buyback'}
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono font-bold text-[10px] shrink-0">
                {buyback.cooldown > 0 ? (
                  <span className="text-amber-300">Cost: {buyback.cost}g</span>
                ) : buyback.hasBuyback ? (
                  <span className="text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    +{buyback.surplusGold.toLocaleString()}g safe
                  </span>
                ) : (
                  <span className="text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/30">
                    -{buyback.missingGold.toLocaleString()}g needed
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Neutral Item Status Banner */}
          {isConnected && neutralStatus.unlockedTier > 0 && (
            <div
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${
                neutralStatus.isMissing
                  ? 'bg-rose-950/50 border-rose-500/80 text-rose-200 animate-pulse'
                  : neutralStatus.isOutdated
                  ? 'bg-amber-950/50 border-amber-500/80 text-amber-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold truncate">
                  {neutralStatus.isMissing
                    ? `Neutral Slot Empty (Tier ${neutralStatus.unlockedTier} Unlocked)`
                    : neutralStatus.isOutdated
                    ? `Upgrade Neutral (Tier ${neutralStatus.equippedTier} → Tier ${neutralStatus.unlockedTier})`
                    : `Neutral: ${neutralStatus.equippedItemName?.replace(/^item_/, '').replace(/_/g, ' ') || `Tier ${neutralStatus.equippedTier}`}`}
                </span>
              </div>
              <span
                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  neutralStatus.isMissing
                    ? 'bg-rose-900/80 text-rose-100'
                    : neutralStatus.isOutdated
                    ? 'bg-amber-900/80 text-amber-100'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {neutralStatus.isMissing
                  ? 'EMPTY'
                  : neutralStatus.isOutdated
                  ? `T${neutralStatus.equippedTier} (OLD)`
                  : `TIER ${neutralStatus.equippedTier}`}
              </span>
            </div>
          )}

          {/* Laning Stage CS & Net Worth Benchmark Pace Indicator */}
          <LaningPaceIndicator />

          {/* Enemy Glyph of Fortification Dedicated Status Pill */}
          <EnemyGlyphIndicator />

          {/* Enemy Ultimate Cooldown Tracker (Alt+1 to Alt+5) */}
          <EnemyUltimateBar interactive={interactive} />

          {/* Quick objective death buttons. Supports dedicated global hotkeys, 10s voice quick-undo, and auto-copy. */}
          <div className="grid grid-cols-2 gap-1.5 px-1">
            {!roshanState.isDead ? (
              <button
                onClick={handleRecordRoshan}
                className="w-full py-1.5 px-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-200 text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
                title={`Record Roshan Slain (${undoState.roshanHotkey})`}
              >
                <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">Roshan ({undoState.roshanHotkey})</span>
              </button>
            ) : (
              <div
                className={`w-full flex items-center justify-between border rounded-lg px-2 py-1 text-[10px] ${
                  undoState.roshanActive
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}
              >
                <span className="font-semibold truncate">
                  {undoState.roshanActive ? `Roshan (Undo ${undoState.roshanRemainingSec}s)` : 'Roshan Dead'}
                </span>
                <button
                  onClick={undoState.roshanActive ? () => objectiveTracker.undoRoshan() : () => timingEngine.resetRoshan()}
                  className={`text-[10px] font-bold ml-1 underline ${
                    undoState.roshanActive ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {undoState.roshanActive ? 'Undo' : 'Reset'}
                </button>
              </div>
            )}

            {!tormentorState.isDead ? (
              <button
                onClick={handleRecordTormentor}
                className="w-full py-1.5 px-2 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-700/80 text-blue-200 text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
                title={`Record Tormentor Slain (${undoState.tormentorHotkey})`}
              >
                <Flame className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="truncate">Tormentor ({undoState.tormentorHotkey})</span>
              </button>
            ) : (
              <div
                className={`w-full flex items-center justify-between border rounded-lg px-2 py-1 text-[10px] ${
                  undoState.tormentorActive
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                    : 'bg-blue-950/40 border-blue-800/80 text-blue-300'
                }`}
              >
                <span className="font-semibold truncate">
                  {undoState.tormentorActive ? `Torm (Undo ${undoState.tormentorRemainingSec}s)` : 'Tormentor Dead'}
                </span>
                <button
                  onClick={undoState.tormentorActive ? () => objectiveTracker.undoTormentor() : () => timingEngine.resetTormentor()}
                  className={`text-[10px] font-bold ml-1 underline ${
                    undoState.tormentorActive ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {undoState.tormentorActive ? 'Undo' : 'Reset'}
                </button>
              </div>
            )}
          </div>

          {undoState.lastClipboardNotice && (
            <div className="mx-1 px-2 py-1 bg-emerald-950/60 border border-emerald-500/50 rounded-lg flex items-center justify-between text-[10px] text-emerald-200 animate-fadeIn">
              <div className="flex items-center gap-1.5 truncate">
                <ClipboardCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Copied: {undoState.lastClipboardNotice}</span>
              </div>
              <button
                onClick={() => objectiveTracker.clearClipboardNotice()}
                className="text-slate-400 hover:text-slate-200 ml-1 text-xs"
              >
                &times;
              </button>
            </div>
          )}

          {/* Timers list */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Bell className="w-3 h-3 text-amber-400" />
              <span>Upcoming Objectives</span>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-3 text-[11px] text-slate-400 bg-slate-900/50 rounded-lg border border-slate-800/60">
                {isConnected ? 'No immediate objectives' : 'Waiting for Dota 2 match...'}
              </div>
            ) : (
              alerts.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs border transition-all ${
                    a.urgent
                      ? 'bg-amber-950/60 border-amber-500 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
                      : 'bg-slate-900/90 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <span className="shrink-0">{getAlertIcon(a.type)}</span>
                    <span className="font-semibold text-xs truncate">{a.title}</span>
                  </div>
                  <span
                    className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded shrink-0 ${
                      a.urgent ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-amber-400'
                    }`}
                  >
                    {a.secondsRemaining > 0 ? `${a.secondsRemaining}s` : 'NOW'}
                  </span>
                </div>
              ))
            )}
          </div>

          {payload?.hero?.name && apiService.getHeroByName(payload.hero.name) && <OpenDotaStatus
            resource={`heroes/${apiService.getHeroByName(payload.hero.name)!.id}/itemPopularity`} onRefresh={onRefreshItems} />}
          {/* Popular item from OpenDota */}
          {popularItem && (
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 mb-1">
                <Package className="w-3 h-3" />
                <span>Recommended Item</span>
              </div>
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-2 text-xs">
                <div className="flex justify-between font-bold text-slate-200">
                  <span className="truncate mr-2">{popularItem.displayName}</span>
                  <span className="text-amber-400 font-mono shrink-0">
                    {popularItem.cost === null ? 'N/A' : `${popularItem.cost}g`}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {popularItem.reason}
                </div>
              </div>
            </div>
          )}

          {/* HUD Opacity Slider */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Opacity</span>
            <input
              type="range"
              min="30"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-28 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="font-mono w-6 text-right">{opacity}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
