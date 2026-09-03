import React, { useEffect, useState } from 'react';
import { GSIDraft } from '../types/gsi';
import { apiService } from '../services/apiService';
import { HeroCounter, HeroMetaInfo } from '../types/meta';
import { TrendingUp, Crosshair, Sparkles } from 'lucide-react';

interface Props {
  draft?: GSIDraft;
  currentHeroName?: string;
}

export const DraftAdvisor: React.FC<Props> = ({ draft }) => {
  const [allHeroes, setAllHeroes] = useState<HeroMetaInfo[]>([]);
  const [selectedEnemyHeroId, setSelectedEnemyHeroId] = useState<number | null>(null);
  const [counters, setCounters] = useState<HeroCounter[]>([]);
  const [loadingCounters, setLoadingCounters] = useState(false);

  useEffect(() => {
    apiService.initData().then(() => {
      setAllHeroes(apiService.getAllHeroes());
    });
  }, []);

  // Detect enemy picks from draft if available
  const enemyPickClasses: string[] = [];
  if (draft?.team3) {
    if (draft.team3.pick0_class) enemyPickClasses.push(draft.team3.pick0_class);
    if (draft.team3.pick1_class) enemyPickClasses.push(draft.team3.pick1_class);
    if (draft.team3.pick2_class) enemyPickClasses.push(draft.team3.pick2_class);
    if (draft.team3.pick3_class) enemyPickClasses.push(draft.team3.pick3_class);
    if (draft.team3.pick4_class) enemyPickClasses.push(draft.team3.pick4_class);
  }

  // Auto-select first enemy hero if none selected
  useEffect(() => {
    if (!selectedEnemyHeroId && enemyPickClasses.length > 0) {
      const hero = apiService.getHeroByName(enemyPickClasses[0]);
      if (hero) {
        setSelectedEnemyHeroId(hero.id);
      }
    } else if (!selectedEnemyHeroId && allHeroes.length > 0) {
      // Default to Phantom Assassin for sample counter preview
      setSelectedEnemyHeroId(44);
    }
  }, [draft, allHeroes, selectedEnemyHeroId]);

  useEffect(() => {
    if (selectedEnemyHeroId) {
      setLoadingCounters(true);
      apiService.getCountersForHero(selectedEnemyHeroId).then((data) => {
        setCounters(data);
        setLoadingCounters(false);
      });
    }
  }, [selectedEnemyHeroId]);

  const selectedHeroInfo = selectedEnemyHeroId
    ? apiService.getHeroById(selectedEnemyHeroId)
    : null;

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Draft & Counter-Pick Assistant
          </h3>
        </div>

        {/* Hero selection dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Target Enemy:</span>
          <select
            value={selectedEnemyHeroId || ''}
            onChange={(e) => setSelectedEnemyHeroId(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
          >
            {allHeroes.map((hero) => (
              <option key={hero.id} value={hero.id}>
                {hero.localized_name} ({hero.winRate}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target enemy badge info */}
      {selectedHeroInfo && (
        <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Analyzing Matchups For:</span>
            <span className="text-xs font-bold text-slate-100">
              {selectedHeroInfo.localized_name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
              {selectedHeroInfo.primary_attr}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Overall Win Rate: <span className="text-emerald-400 font-semibold">{selectedHeroInfo.winRate}%</span>
          </div>
        </div>
      )}

      {/* Recommended Counter Heroes Grid */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Top Counter Picks (Statistically Favored)</span>
        </div>

        {loadingCounters ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Calculating counter-pick win rates...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {counters.map((c) => (
              <div
                key={c.heroId}
                className="bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-lg p-2.5 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    {c.heroName}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Sample: {c.sampleMatches.toLocaleString()} matches
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-end gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{c.advantage}%
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Win: {c.winRateAgainst}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
