import React from 'react';
import { apiService } from '../services/apiService';
import { RecommendedItem } from '../types/meta';
import { Package, ShieldAlert, Coins } from 'lucide-react';

interface Props {
  heroName?: string;
  enemyHeroNames?: string[];
  currentGold?: number;
}

export const ItemGuide: React.FC<Props> = ({
  heroName = 'npc_dota_hero_antimage',
  enemyHeroNames = ['phantom_assassin', 'zeus', 'lion'],
  currentGold = 0,
}) => {
  const items: RecommendedItem[] = apiService.getRecommendedItems(heroName, enemyHeroNames);

  const getTierBadge = (tier: RecommendedItem['tier']) => {
    switch (tier) {
      case 'early':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-semibold uppercase">Early</span>;
      case 'core':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-semibold uppercase">Core</span>;
      case 'situational':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 font-semibold uppercase">Situational</span>;
      case 'luxury':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 font-semibold uppercase">Late/Luxury</span>;
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Dynamic Item Build & Situational Counters
          </h3>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>Wallet: {currentGold}g</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {items.map((item, idx) => {
          const goldNeeded = Math.max(0, item.cost - currentGold);
          const canAfford = goldNeeded === 0;

          return (
            <div
              key={`${item.name}-${idx}`}
              className={`p-3 rounded-lg border flex flex-col justify-between transition ${
                item.counterAgainst
                  ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/80'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
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
                    {item.cost}g
                  </div>
                </div>

                <div className="text-xs text-slate-300 mb-1.5">
                  {item.reason}
                </div>

                {item.counterAgainst && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 font-medium">
                    <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Counters: {item.counterAgainst}</span>
                  </div>
                )}
              </div>

              {/* Gold remaining indicator */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target status:</span>
                {canAfford ? (
                  <span className="text-emerald-400 font-bold">Ready to Buy!</span>
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
    </div>
  );
};
