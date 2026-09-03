import React from 'react';
import { GSIPayload } from '../types/gsi';
import { Coins, Sun, Moon } from 'lucide-react';
import { timingEngine } from '../services/timingEngine';

interface Props {
  payload: GSIPayload | null;
  isConnected: boolean;
  isSimulating: boolean;
  onToggleSimulation: () => void;
}

export const GSIStatusBadge: React.FC<Props> = ({
  payload,
  isConnected,
  isSimulating,
  onToggleSimulation,
}) => {
  const map = payload?.map;
  const player = payload?.player;
  const hero = payload?.hero;

  const clockTime = map?.clock_time ?? 0;
  const formattedTime = timingEngine.formatTime(clockTime);
  const isDay = map?.daytime ?? true;

  const heroNameClean = hero?.name ? hero.name.replace('npc_dota_hero_', '').replace(/_/g, ' ') : 'Hero Not Selected';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        {/* Connection Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isConnected ? (isSimulating ? 'GSI (Simulated)' : 'GSI Connected') : 'GSI Offline'}
          </span>
        </div>

        {/* Mode switcher button */}
        <button
          onClick={onToggleSimulation}
          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
        >
          {isSimulating ? 'Stop Demo Feed' : 'Run Demo Feed'}
        </button>
      </div>

      {/* Clock & Day/Night */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 rounded-lg border border-slate-800 text-amber-400 font-mono font-bold text-sm">
          {isDay ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          <span>{formattedTime}</span>
        </div>

        {/* Hero & Stats if available */}
        {hero && (
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold capitalize text-slate-200">
              {heroNameClean} <span className="text-xs text-amber-400">Lvl {hero.level}</span>
            </div>

            {/* HP Bar */}
            <div className="w-24 bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 flex items-center">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${hero.health_percent}%` }}
              />
            </div>

            {/* Mana Bar */}
            <div className="w-20 bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 flex items-center">
              <div
                className="bg-sky-500 h-full transition-all duration-300"
                style={{ width: `${hero.mana_percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Gold & Net Worth */}
        {player && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-amber-400 font-medium">
              <Coins className="w-3.5 h-3.5" />
              <span>{player.gold}g</span>
            </div>
            <div className="text-slate-400">
              NW: <span className="text-slate-200 font-semibold">{player.net_worth}g</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
