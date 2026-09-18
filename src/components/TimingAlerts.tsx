import React, { useState, useSyncExternalStore } from 'react';
import { TimingEventAlert } from '../types/meta';
import { Bell, ShieldAlert, Sparkles, Flame, Droplets, Volume2, VolumeX, ClipboardCheck, Package, Layers, Swords } from 'lucide-react';
import { timingEngine } from '../services/timingEngine';
import { audioService } from '../services/audioService';
import { objectiveTracker } from '../services/objectiveTracker';

interface Props {
  alerts: TimingEventAlert[];
  clockTime: number;
}

export const TimingAlerts: React.FC<Props> = ({ alerts, clockTime }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const undoState = useSyncExternalStore(objectiveTracker.subscribe, objectiveTracker.getSnapshot);

  const roshanState = timingEngine.getRoshanState();
  const tormentorState = timingEngine.getTormentorState();

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioService.setSfxEnabled(next);
    audioService.setVoiceEnabled(next);
  };

  const handleRecordRoshan = () => {
    objectiveTracker.recordRoshan(clockTime);
  };

  const handleResetRoshan = () => {
    if (undoState.roshanActive) {
      objectiveTracker.undoRoshan();
    } else {
      timingEngine.resetRoshan();
    }
  };

  const handleRecordTormentor = () => {
    objectiveTracker.recordTormentor(clockTime);
  };

  const handleResetTormentor = () => {
    if (undoState.tormentorActive) {
      objectiveTracker.undoTormentor();
    } else {
      timingEngine.resetTormentor();
    }
  };

  const getAlertIcon = (type: TimingEventAlert['type']) => {
    switch (type) {
      case 'rune_wisdom':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'rune_power':
        return <Flame className="w-4 h-4 text-sky-400" />;
      case 'rune_bounty':
        return <div className="w-3.5 h-3.5 rounded-full bg-amber-400 font-black text-[9px] flex items-center justify-center text-slate-950">B</div>;
      case 'roshan':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'tormentor':
        return <Flame className="w-4 h-4 text-blue-400" />;
      case 'lotus':
        return <Droplets className="w-4 h-4 text-emerald-400" />;
      case 'neutral_item':
        return <Package className="w-4 h-4 text-amber-300" />;
      case 'camp_stack':
        return <Layers className="w-4 h-4 text-emerald-400" />;
      case 'enemy_ultimate':
        return <Swords className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Real-Time Timing Alerts
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {/* Manual controls with hotkeys, 10s voice quick-undo, and auto-copy. */}
            {!roshanState.isDead ? (
              <button
                onClick={handleRecordRoshan}
                className="text-xs px-2.5 py-1 rounded bg-rose-900/50 hover:bg-rose-800 text-rose-200 border border-rose-700 transition font-semibold"
                title={`Record Roshan Slain (${undoState.roshanHotkey})`}
              >
                Roshan Killed ({undoState.roshanHotkey})
              </button>
            ) : (
              <button
                onClick={handleResetRoshan}
                className={`text-xs px-2 py-1 rounded border transition font-medium ${
                  undoState.roshanActive
                    ? 'bg-amber-950/60 hover:bg-amber-900 border-amber-500 text-amber-200 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {undoState.roshanActive ? `Undo Roshan (${undoState.roshanRemainingSec}s)` : 'Reset Roshan'}
              </button>
            )}

            {!tormentorState.isDead ? (
              <button
                onClick={handleRecordTormentor}
                className="text-xs px-2.5 py-1 rounded bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700 transition font-semibold"
                title={`Record Tormentor Slain (${undoState.tormentorHotkey})`}
              >
                Tormentor Killed ({undoState.tormentorHotkey})
              </button>
            ) : (
              <button
                onClick={handleResetTormentor}
                className={`text-xs px-2 py-1 rounded border transition font-medium ${
                  undoState.tormentorActive
                    ? 'bg-amber-950/60 hover:bg-amber-900 border-amber-500 text-amber-200 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {undoState.tormentorActive ? `Undo Torm (${undoState.tormentorRemainingSec}s)` : 'Reset Tormentor'}
              </button>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-1.5 rounded-lg border transition ${
              soundEnabled
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={soundEnabled ? 'Mute Voice & Audio' : 'Unmute Voice & Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {undoState.lastClipboardNotice && (
        <div className="mb-3 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/50 rounded-lg flex items-center justify-between text-xs text-emerald-200 animate-fadeIn">
          <div className="flex items-center gap-2 truncate">
            <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Copied to clipboard: <strong>{undoState.lastClipboardNotice}</strong></span>
          </div>
          <button
            onClick={() => objectiveTracker.clearClipboardNotice()}
            className="text-slate-400 hover:text-slate-200 ml-2 text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {alerts.length === 0 ? (
          <div className="col-span-full text-center py-6 text-slate-500 text-xs">
            No active timing alerts. Next objectives will appear prior to spawn.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-2.5 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                alert.urgent
                  ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800 shrink-0">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {alert.title}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {alert.subtitle}
                  </div>
                </div>
              </div>

              {/* Countdown badge */}
              <div
                className={`ml-2 px-2 py-1 rounded text-xs font-mono font-bold shrink-0 ${
                  alert.urgent
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-amber-400'
                }`}
              >
                {alert.secondsRemaining > 0 ? `${alert.secondsRemaining}s` : 'NOW'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
