import React, { useState } from 'react';
import { TimingEventAlert, PopularItem } from '../types/meta';
import { GSIPayload } from '../types/gsi';
import { Bell, Minimize2, Maximize2, Package, X, Settings } from 'lucide-react';
import { timingEngine } from '../services/timingEngine';

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
  const [opacity, setOpacity] = useState(85); // percentage

  const clockTime = payload?.map?.clock_time ?? 0;
  const formattedTime = isConnected ? timingEngine.formatTime(clockTime) : '--:--';
  const mostUrgentAlert = alerts[0];
  const popularItem = items.find((item) => item.tier === 'core') ?? items[0];

  return (
    <div
      className="fixed top-4 right-4 z-50 transition-all duration-200"
      style={{ opacity: opacity / 100 }}
    >
      {collapsed ? (
        /* Collapsed minimal badge */
        <button
          data-tauri-drag-region
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur text-xs hover:border-amber-400 transition cursor-move"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="font-mono font-bold text-amber-400">{formattedTime}</span>
          {mostUrgentAlert && (
            <span className="text-slate-300">
              {mostUrgentAlert.title} ({mostUrgentAlert.secondsRemaining}s)
            </span>
          )}
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </button>
      ) : (
        /* Full Compact Overlay Widget */
        <div className="w-80 bg-slate-950/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur p-3 text-slate-100">
          {/* Header */}
          <div data-tauri-drag-region className="flex items-center justify-between pb-2 border-b border-slate-800 cursor-move">
            <div data-tauri-drag-region className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-black tracking-wider uppercase text-amber-400">
                DotaAssist HUD
              </span>
              <span className="font-mono text-xs font-bold text-slate-300">
                {formattedTime}
              </span>
            </div>

            <div className="flex items-center gap-1">
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
                title="Close overlay"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Timers list */}
          <div className="mt-2.5 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Bell className="w-3 h-3 text-amber-400" />
              <span>Upcoming Objectives</span>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-2 text-[11px] text-slate-500">
                {isConnected ? 'No active objectives' : 'Waiting for Dota 2 GSI'}
              </div>
            ) : (
              alerts.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs border ${
                    a.urgent
                      ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 animate-pulse'
                      : 'bg-slate-900/80 border-slate-800 text-slate-200'
                  }`}
                >
                  <span className="font-medium truncate mr-2">{a.title}</span>
                  <span
                    className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                      a.urgent ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'
                    }`}
                  >
                    {a.secondsRemaining > 0 ? `${a.secondsRemaining}s` : 'NOW'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Popular item from the current OpenDota response */}
          {popularItem && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80">
              <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 mb-1">
                <Package className="w-3 h-3" />
                <span>OpenDota Popular Item</span>
              </div>
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-2 text-xs">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>{popularItem.displayName}</span>
                  <span className="text-amber-400 font-mono">
                    {popularItem.cost === null ? 'Price unavailable' : `${popularItem.cost}g`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {popularItem.reason}
                </div>
              </div>
            </div>
          )}

          {/* Opacity slider */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>HUD Opacity</span>
            <input
              type="range"
              min="30"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="font-mono">{opacity}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
