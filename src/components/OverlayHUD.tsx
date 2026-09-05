import React, { useState } from 'react';
import { TimingEventAlert, PopularItem } from '../types/meta';
import { GSIPayload } from '../types/gsi';
import { Bell, Minimize2, Maximize2, Package, X, Settings, Volume2, VolumeX, ShieldAlert, Sparkles, Flame, Droplets } from 'lucide-react';
import { timingEngine } from '../services/timingEngine';
import { audioService } from '../services/audioService';

interface Props {
  payload: GSIPayload | null;
  isConnected: boolean;
  alerts: TimingEventAlert[];
  items: PopularItem[];
  onOpenSettings: () => void;
  onExitOverlay: () => void;
}

export const OverlayHUD: React.FC<Props> = ({
  payload,
  isConnected,
  alerts,
  items,
  onOpenSettings,
  onExitOverlay,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [opacity, setOpacity] = useState(90);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const clockTime = payload?.map?.clock_time ?? 0;
  const formattedTime = isConnected ? timingEngine.formatTime(clockTime) : '--:--';
  const mostUrgentAlert = alerts[0];
  const popularItem = items.find((item) => item.tier === 'core') ?? items[0];
  const roshanState = timingEngine.getRoshanState();
  const tormentorState = timingEngine.getTormentorState();

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioService.setSfxEnabled(next);
    audioService.setVoiceEnabled(next);
  };

  const handleRecordRoshan = () => {
    timingEngine.recordRoshanDeath(clockTime);
  };

  const handleRecordTormentor = () => {
    timingEngine.recordTormentorDeath(clockTime);
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
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col justify-start items-center p-2 select-none"
      style={{ opacity: opacity / 100 }}
    >
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
                title="Collapse to pill"
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

          {/* Quick objective death buttons. GSI can update Roshan automatically;
              these controls remain useful when optional fields are unavailable. */}
          <div className="grid grid-cols-2 gap-1.5 px-1">
            {!roshanState.isDead ? (
              <button
                onClick={handleRecordRoshan}
                className="w-full py-1 px-2.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Mark Roshan Slain (5m Aegis)</span>
              </button>
            ) : (
              <div className="w-full flex items-center justify-between bg-rose-950/40 border border-rose-800/80 rounded-lg px-2 py-1 text-[11px]">
                <span className="text-rose-300 font-semibold">Roshan Dead</span>
                <button
                  onClick={() => timingEngine.resetRoshan()}
                  className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                >
                  Reset
                </button>
              </div>
            )}

            {!tormentorState.isDead ? (
              <button
                onClick={handleRecordTormentor}
                className="py-1 px-2 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-700/80 text-blue-200 text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
              >
                <Flame className="w-3 h-3 text-blue-400" />
                <span>Tormentor Slain</span>
              </button>
            ) : (
              <div className="flex items-center justify-between bg-blue-950/40 border border-blue-800/80 rounded-lg px-2 py-1 text-[10px]">
                <span className="text-blue-300 font-semibold">Tormentor Dead</span>
                <button
                  onClick={() => timingEngine.resetTormentor()}
                  className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

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
