import React, { useSyncExternalStore } from 'react';
import { laningBenchmarkService } from '../services/laningBenchmarkService';
import { Target, TrendingUp, TrendingDown, Minus, Award, X } from 'lucide-react';

export const LaningPaceIndicator: React.FC = () => {
  const snapshot = useSyncExternalStore(
    laningBenchmarkService.subscribe,
    laningBenchmarkService.getSnapshot
  );

  // Show only during 0:00 - 15:00 when active
  if (!snapshot.isActive) {
    return null;
  }

  const {
    clockTime,
    currentLastHits,
    expectedCS,
    csDiff,
    currentDenies,
    currentNetWorth,
    paceStatus,
    role,
    report,
    reportDismissed,
  } = snapshot;

  const isLaningPhase = clockTime <= 600;
  const showReport = report && !reportDismissed && clockTime <= 900;

  const getPaceBadge = () => {
    switch (paceStatus) {
      case 'ahead':
        return (
          <span className="flex items-center gap-1 font-mono font-bold text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.5 rounded">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Ahead ({csDiff > 0 ? `+${csDiff}` : csDiff})
          </span>
        );
      case 'behind':
        return (
          <span className="flex items-center gap-1 font-mono font-bold text-[10px] bg-rose-950/80 text-rose-300 border border-rose-500/50 px-1.5 py-0.5 rounded">
            <TrendingDown className="w-3 h-3 text-rose-400" />
            Behind ({csDiff})
          </span>
        );
      case 'on_pace':
      default:
        return (
          <span className="flex items-center gap-1 font-mono font-bold text-[10px] bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            <Minus className="w-3 h-3 text-emerald-400" />
            On Pace ({csDiff >= 0 ? `+${csDiff}` : csDiff})
          </span>
        );
    }
  };

  const getGradeBadge = (grade: 'S' | 'A' | 'B' | 'C') => {
    switch (grade) {
      case 'S':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.4)]';
      case 'A':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
      case 'B':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
      case 'C':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/50';
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      {/* 1. Real-time Laning CS & Pace Banner (0:00 - 10:00) */}
      {isLaningPhase && (
        <div
          className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px] transition-all ${
            paceStatus === 'ahead'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : paceStatus === 'behind'
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              : 'bg-slate-900/80 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold capitalize truncate">{role} CS:</span>
            <span className="font-mono font-bold text-slate-100">
              {currentLastHits}/{expectedCS}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              (DN: {currentDenies} · NW: {currentNetWorth.toLocaleString()}g)
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {getPaceBadge()}
          </div>
        </div>
      )}

      {/* 2. 10-Minute Laning Stage Summary Report Card (10:00 - 15:00 or until dismissed) */}
      {showReport && (
        <div className="bg-slate-900/95 border border-amber-500/60 rounded-xl p-2.5 text-xs text-slate-200 shadow-xl relative animate-fadeIn">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-100 text-[11px] uppercase tracking-wider">
                10-Min Laning Report ({report.role})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-black font-mono text-[11px] px-2 py-0.5 rounded border ${getGradeBadge(
                  report.grade
                )}`}
              >
                Grade {report.grade}
              </span>
              <button
                onClick={() => laningBenchmarkService.dismissReport()}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                title="Dismiss Report"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 py-2 text-center">
            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">Last Hits</div>
              <div className="font-mono font-bold text-amber-300 text-xs mt-0.5">
                {report.finalLastHits} / {report.targetCS}
              </div>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">Denies</div>
              <div className="font-mono font-bold text-slate-200 text-xs mt-0.5">
                {report.finalDenies}
              </div>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">Net Worth</div>
              <div className="font-mono font-bold text-emerald-300 text-xs mt-0.5">
                {report.finalNetWorth.toLocaleString()}g
              </div>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">GPM</div>
              <div className="font-mono font-bold text-sky-300 text-xs mt-0.5">
                {report.finalGpm}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
            <span className="truncate mr-2">{report.summaryText}</span>
            <button
              onClick={() => laningBenchmarkService.dismissReport()}
              className="text-amber-400 hover:text-amber-300 underline font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
