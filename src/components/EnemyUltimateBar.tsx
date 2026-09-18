import heroesData from '../data/dotaHeroes.json';
import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { enemyUltimateService, EnemyUltimateSlot } from '../services/enemyUltimateService';
import { Swords, Zap, RotateCcw, ClipboardCheck } from 'lucide-react';
import { timingEngine } from '../services/timingEngine';

interface Props {
  compact?: boolean;
  interactive?: boolean;
}

export const EnemyUltimateBar: React.FC<Props> = ({ compact = false, interactive = true }) => {
  const snapshot = useSyncExternalStore(
    enemyUltimateService.subscribe,
    enemyUltimateService.getSnapshot,
  );

  const [clearing, setClearing] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [level, setLevel] = useState('');
  const [cooldown, setCooldown] = useState('');
  const [error, setError] = useState('');
  const { slots, lastClipboardNotice } = snapshot;
  const editedSlot = slots.find(slot => slot.slot === editing);
  useEffect(() => { setEditing(null); setClearing(null); }, [interactive, slots.map(s => s.heroClass).join(',')]);
  const hasActiveHeroes = slots.some((s) => Boolean(s.heroClass));

  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return 'EST. READY';
    return timingEngine.formatTime(seconds);
  };

  const handleSlotClick = (slot: EnemyUltimateSlot) => {
    if (!slot.heroClass) return;
    if (slot.state === 'cooldown') {
      if (slot.undoActive) {
        enemyUltimateService.undoCast(slot.slot);
      } else {
        // Allow resetting back to ready if user confirms
        enemyUltimateService.undoCast(slot.slot);
      }
    } else {
      enemyUltimateService.recordCast(slot.slot);
    }
  };

  if (!hasActiveHeroes && compact && !interactive) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-1.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400">
          <Swords className="w-3 h-3 text-rose-400" />
          <span>Enemy Ultimates · Estimates</span>
          <span className="text-slate-500 font-normal normal-case text-[9px]">(Alt+1 - Alt+5)</span>
        </div>
        {snapshot.activeCooldownCount > 0 && (
          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-500/40 px-1.5 py-0.2 rounded">
            {snapshot.activeCooldownCount} on CD
          </span>
        )}
      </div>

      {/* Clipboard notice */}
      {lastClipboardNotice && (
        <div className="px-2 py-0.5 bg-emerald-950/70 border border-emerald-500/50 rounded flex items-center justify-between text-[9px] text-emerald-200">
          <div className="flex items-center gap-1 truncate">
            <ClipboardCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">Copied: <strong>{lastClipboardNotice}</strong></span>
          </div>
          <button
            onClick={() => enemyUltimateService.clearClipboardNotice()}
            className="text-slate-400 hover:text-slate-200 ml-1 text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* 5-Slot Grid */}
      <div className="grid grid-cols-5 gap-1">
        {slots.slice(0, 5).map((slot) => {
          const isReady = slot.state === 'ready';
          const isPassive = slot.baseCooldown <= 0 && slot.cooldowns.every((c) => c <= 0);

          return (
            <div key={slot.slot} className="flex flex-col gap-1 min-w-0">
            <button
              onClick={() => handleSlotClick(slot)}
              disabled={!interactive || !slot.heroClass || isPassive}
              className={`relative flex flex-col items-center justify-between p-1 rounded-lg border transition-all duration-200 min-h-[52px] ${
                !slot.heroClass
                  ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-default'
                  : isPassive
                  ? 'bg-slate-900/60 border-slate-700/60 text-slate-400 cursor-default'
                  : isReady
                  ? 'bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/70 text-emerald-200 hover:scale-[1.02] cursor-pointer'
                  : slot.undoActive
                  ? 'bg-amber-950/50 border-amber-500 text-amber-200 animate-pulse cursor-pointer'
                  : 'bg-rose-950/50 hover:bg-rose-900/50 border-rose-500/80 text-rose-200 cursor-pointer'
              }`}
              title={
                !slot.heroClass
                  ? `Slot ${slot.slot}: Waiting for enemy hero draft`
                  : isPassive
                  ? `${slot.heroName}: Passive Ultimate (${slot.abilityName})`
                  : isReady
                  ? `${slot.heroName} - ${slot.abilityName}: Estimated ready. Click or press ${slot.hotkey} to record cast.`
                  : slot.undoActive
                  ? `${slot.heroName} - ${slot.abilityName}: Estimated cooldown active. Click or press ${slot.hotkey} within ${Math.ceil((slot.undoExpiry - Date.now()) / 1000)}s to undo!`
                  : `${slot.heroName} - ${slot.abilityName}: Estimated cooldown active (${slot.remainingSeconds}s remaining). Click to reset.`
              }
            >
              {/* Hotkey Tag */}
              <span className="absolute -top-1 -right-1 text-[8px] font-mono font-black bg-slate-900 text-slate-300 px-1 rounded border border-slate-700">
                {slot.slot}
              </span>

              {/* Hero & Ability Name */}
              <div className="w-full text-center truncate">
                <div className="text-[10px] font-bold truncate leading-tight">
                  {slot.heroName || `Slot ${slot.slot}`}
                </div>
                <div className="text-[8px] text-slate-400 truncate leading-tight">
                  {slot.abilityName}
                </div>
              </div>

              {/* State / Countdown Badge */}
              <div className="mt-1 w-full flex items-center justify-center">
                {!slot.heroClass ? (
                  <span className="text-[8px] text-slate-600 font-mono">--</span>
                ) : isPassive ? (
                  <span className="text-[8px] text-slate-400 font-mono font-semibold">PASSIVE</span>
                ) : isReady ? (
                  <span className="text-[8px] font-mono font-bold text-emerald-300 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5 text-emerald-400" />
                    EST. READY
                  </span>
                ) : slot.undoActive ? (
                  <span className="text-[8px] font-mono font-bold text-amber-300 flex items-center gap-0.5">
                    <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                    UNDO
                  </span>
                ) : (
                  <span className="text-[9px] font-mono font-black text-rose-300">
                    Est. {formatCountdown(slot.remainingSeconds)}
                  </span>
                )}
              </div>
            </button>
            {!slot.heroClass && (
              <select aria-label={`Select hero for enemy slot ${slot.slot}`} disabled={!interactive}
                className="w-full bg-slate-800 text-[10px] p-1 disabled:opacity-40" value=""
                onChange={event => enemyUltimateService.selectHero(slot.slot, event.target.value)}>
                <option value="">Select hero</option>
                {[...heroesData].sort((a, b) => a.localized_name.localeCompare(b.localized_name))
                  .filter(hero => !slots.some(s => s.heroClass === hero.name))
                  .map(hero => <option key={hero.name} value={hero.name}>{hero.localized_name}</option>)}
              </select>
            )}
            {slot.source === 'manual' && (
              <>
                <span className="text-[9px] text-slate-400 text-center">Manual</span>
                <button disabled={!interactive} className="text-[10px] text-slate-300 disabled:opacity-40"
                  aria-label={`Clear selection for ${slot.heroName}`}
                  onClick={() => {
                    if (enemyUltimateService.clearSelection(slot.slot) === 'confirmation-required') setClearing(slot.slot);
                  }}>Clear selection</button>
              </>
            )}
            {slot.heroClass && !isPassive && (
              <button disabled={!interactive} className="text-[10px] text-slate-300 disabled:opacity-40"
                aria-label={`Edit ${slot.heroName} ultimate estimate`}
                onClick={() => {
                  setEditing(slot.slot);
                  setLevel(slot.manualLevel?.toString() ?? '');
                  setCooldown(slot.manualCooldown?.toString() ?? '');
                  setError('');
                }}>Edit</button>
            )}
            </div>
          );
        })}
      </div>
      {interactive && clearing !== null && (
        <div role="alertdialog" aria-label="Confirm clearing enemy selection" className="p-2 rounded border border-amber-500 bg-slate-900 text-xs space-y-2">
          <p>Clear {slots.find(s => s.slot === clearing)?.heroName}? This discards its active timer and manual corrections.</p>
          <div className="flex gap-3">
            <button onClick={() => { enemyUltimateService.clearSelection(clearing, true); setClearing(null); }}>Confirm clear</button>
            <button onClick={() => setClearing(null)}>Cancel</button>
          </div>
        </div>
      )}
      {interactive && editedSlot && (
        <form className="p-2 rounded border border-slate-600 bg-slate-900 text-xs space-y-2"
          onSubmit={event => {
            event.preventDefault();
            if (enemyUltimateService.correctEstimate(editedSlot.slot,
              level ? Number(level) as 1 | 2 | 3 : undefined,
              cooldown.trim() ? Number(cooldown) : undefined)) setEditing(null);
            else setError('Enter a cooldown greater than 0 and at most 3600 seconds.');
          }}>
          <strong>{editedSlot.heroName}: correct estimate</strong>
          <label className="block">Ultimate level
            <select className="ml-2 bg-slate-800" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="">Estimate from match time</option>
              {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block">Cooldown seconds (optional)
            <input className="w-full bg-slate-800 p-1" type="number" min="0.1" max="3600" step="any"
              value={cooldown} placeholder="Use cooldown for selected level"
              onChange={e => setCooldown(e.target.value)} />
          </label>
          <p>Applies from the recorded cast time and to future casts this match. Leave both fields automatic to clear corrections.</p>
          {error && <p role="alert">{error}</p>}
          <div className="flex gap-3"><button type="submit">Apply</button>
            <button type="button" onClick={() => setEditing(null)}>Cancel</button></div>
        </form>
      )}
    </div>
  );
};
