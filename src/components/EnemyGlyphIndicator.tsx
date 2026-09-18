import React, { useSyncExternalStore } from 'react';
import { enemyGlyphService } from '../services/enemyGlyphService';
import { Shield, Zap, Clock, CheckCircle2 } from 'lucide-react';

export const EnemyGlyphIndicator: React.FC = () => {
  const glyph = useSyncExternalStore(
    enemyGlyphService.subscribe,
    enemyGlyphService.getSnapshot
  );

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (glyph.isActive) {
    return (
      <div className="w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px] bg-sky-950/70 border-sky-400/80 text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.4)] animate-pulse transition-all">
        <div className="flex items-center gap-1.5 font-bold">
          <Zap className="w-3.5 h-3.5 text-sky-300 shrink-0 animate-bounce" />
          <span className="truncate">Enemy Glyph: INVULNERABLE</span>
        </div>
        <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 border border-sky-300 shadow">
          {glyph.activeRemainingSeconds}s ACTIVE
        </span>
      </div>
    );
  }

  if (!glyph.isReady) {
    return (
      <div className="w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px] bg-slate-900/80 border-slate-700/80 text-slate-300 transition-all">
        <div className="flex items-center gap-1.5 font-semibold">
          <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Enemy Glyph: Cooldown</span>
        </div>
        <div className="flex items-center gap-1 font-mono font-bold text-[10px] text-amber-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{formatTime(glyph.cooldownRemainingSeconds)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px] bg-emerald-950/40 border-emerald-500/50 text-emerald-200 transition-all">
      <div className="flex items-center gap-1.5 font-semibold">
        <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="truncate">Enemy Glyph: Ready</span>
      </div>
      <div className="flex items-center gap-1 font-mono font-bold text-[10px] text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span>READY 🟢</span>
      </div>
    </div>
  );
};
