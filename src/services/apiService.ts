import { HeroCounter, HeroMetaInfo, RecommendedItem } from '../types/meta';

// Pre-seeded offline hero meta cache for instant loading & network failover
const FALLBACK_HEROES: HeroMetaInfo[] = [
  { id: 1, name: 'npc_dota_hero_antimage', localized_name: 'Anti-Mage', primary_attr: 'agi', attack_type: 'Melee', roles: ['Carry', 'Escape'], winRate: 51.4, pickRate: 14.2 },
  { id: 2, name: 'npc_dota_hero_axe', localized_name: 'Axe', primary_attr: 'str', attack_type: 'Melee', roles: ['Initiator', 'Durable', 'Disabler'], winRate: 52.8, pickRate: 16.5 },
  { id: 8, name: 'npc_dota_hero_juggernaut', localized_name: 'Juggernaut', primary_attr: 'agi', attack_type: 'Melee', roles: ['Carry', 'Pusher'], winRate: 50.9, pickRate: 18.1 },
  { id: 14, name: 'npc_dota_hero_pudge', localized_name: 'Pudge', primary_attr: 'str', attack_type: 'Melee', roles: ['Disabler', 'Initiator', 'Durable'], winRate: 50.3, pickRate: 27.8 },
  { id: 22, name: 'npc_dota_hero_zeus', localized_name: 'Zeus', primary_attr: 'int', attack_type: 'Ranged', roles: ['Nuker', 'Carry'], winRate: 53.1, pickRate: 12.4 },
  { id: 26, name: 'npc_dota_hero_lion', localized_name: 'Lion', primary_attr: 'int', attack_type: 'Ranged', roles: ['Support', 'Disabler', 'Nuker'], winRate: 48.9, pickRate: 22.0 },
  { id: 44, name: 'npc_dota_hero_phantom_assassin', localized_name: 'Phantom Assassin', primary_attr: 'agi', attack_type: 'Melee', roles: ['Carry', 'Escape'], winRate: 51.7, pickRate: 20.3 },
  { id: 74, name: 'npc_dota_hero_invoker', localized_name: 'Invoker', primary_attr: 'all', attack_type: 'Ranged', roles: ['Carry', 'Nuker', 'Disabler'], winRate: 49.5, pickRate: 15.6 },
  { id: 86, name: 'npc_dota_hero_rubick', localized_name: 'Rubick', primary_attr: 'int', attack_type: 'Ranged', roles: ['Support', 'Disabler', 'Nuker'], winRate: 49.2, pickRate: 17.5 },
  { id: 104, name: 'npc_dota_hero_legion_commander', localized_name: 'Legion Commander', primary_attr: 'str', attack_type: 'Melee', roles: ['Carry', 'Disabler', 'Initiator'], winRate: 52.1, pickRate: 15.9 },
  { id: 114, name: 'npc_dota_hero_monkey_king', localized_name: 'Monkey King', primary_attr: 'agi', attack_type: 'Melee', roles: ['Carry', 'Escape', 'Disabler'], winRate: 49.8, pickRate: 11.2 },
  { id: 129, name: 'npc_dota_hero_mars', localized_name: 'Mars', primary_attr: 'str', attack_type: 'Melee', roles: ['Initiator', 'Durable', 'Disabler'], winRate: 50.6, pickRate: 12.8 },
  { id: 138, name: 'npc_dota_hero_muerta', localized_name: 'Muerta', primary_attr: 'int', attack_type: 'Ranged', roles: ['Carry', 'Nuker', 'Disabler'], winRate: 50.1, pickRate: 8.5 },
  { id: 145, name: 'npc_dota_hero_ringmaster', localized_name: 'Ringmaster', primary_attr: 'int', attack_type: 'Ranged', roles: ['Support', 'Disabler', 'Nuker'], winRate: 52.4, pickRate: 14.8 }
];

export class OpenDotaStratzService {
  private heroCache: Map<number, HeroMetaInfo> = new Map();
  private nameToIdMap: Map<string, number> = new Map();
  private matchupsCache: Map<number, HeroCounter[]> = new Map();

  constructor() {
    this.seedFallback();
  }

  private seedFallback() {
    FALLBACK_HEROES.forEach((hero) => {
      this.heroCache.set(hero.id, hero);
      this.nameToIdMap.set(hero.name.toLowerCase(), hero.id);
      this.nameToIdMap.set(hero.localized_name.toLowerCase(), hero.id);
      // Stripped name (e.g. 'pudge' from 'npc_dota_hero_pudge')
      const short = hero.name.replace('npc_dota_hero_', '').toLowerCase();
      this.nameToIdMap.set(short, hero.id);
    });
  }

  public async initData(): Promise<void> {
    try {
      const res = await fetch('https://api.opendota.com/api/heroStats');
      if (!res.ok) throw new Error(`OpenDota API error: ${res.statusText}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach((item: { id: number; name: string; localized_name: string; primary_attr: 'str'|'agi'|'int'|'all'; attack_type: 'Melee'|'Ranged'; roles: string[]; pro_win?: number; pro_pick?: number; turbo_wins?: number; turbo_picks?: number }) => {
          const totalMatches = (item.pro_pick || 0) + (item.turbo_picks || 100);
          const totalWins = (item.pro_win || 0) + (item.turbo_wins || 50);
          const winRate = Number(((totalWins / Math.max(1, totalMatches)) * 100).toFixed(1));

          const heroInfo: HeroMetaInfo = {
            id: item.id,
            name: item.name,
            localized_name: item.localized_name,
            primary_attr: item.primary_attr,
            attack_type: item.attack_type,
            roles: item.roles,
            winRate: isNaN(winRate) ? 50.0 : winRate,
            pickRate: 10.0,
          };
          this.heroCache.set(item.id, heroInfo);
          this.nameToIdMap.set(item.name.toLowerCase(), item.id);
          this.nameToIdMap.set(item.localized_name.toLowerCase(), item.id);
          const short = item.name.replace('npc_dota_hero_', '').toLowerCase();
          this.nameToIdMap.set(short, item.id);
        });
      }
    } catch {
      // Fallback is already loaded
    }
  }

  public getAllHeroes(): HeroMetaInfo[] {
    return Array.from(this.heroCache.values());
  }

  public getHeroById(id: number): HeroMetaInfo | undefined {
    return this.heroCache.get(id);
  }

  public getHeroByName(name: string): HeroMetaInfo | undefined {
    const clean = name.toLowerCase().trim();
    const id = this.nameToIdMap.get(clean);
    if (id) return this.heroCache.get(id);

    // Partial search
    for (const [key, valId] of this.nameToIdMap.entries()) {
      if (clean.includes(key) || key.includes(clean)) {
        return this.heroCache.get(valId);
      }
    }
    return undefined;
  }

  public async getCountersForHero(heroId: number): Promise<HeroCounter[]> {
    if (this.matchupsCache.has(heroId)) {
      return this.matchupsCache.get(heroId)!;
    }

    try {
      const res = await fetch(`https://api.opendota.com/api/heroes/${heroId}/matchups`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sort by games played and win rate against
          const counters: HeroCounter[] = data
            .filter((m: { games_played: number }) => m.games_played > 20)
            .map((m: { hero_id: number; games_played: number; wins: number }) => {
              const enemy = this.getHeroById(m.hero_id);
              const winRate = (m.wins / m.games_played) * 100;
              // Advantage: if target hero won only 42% of matches vs this hero, this hero has +8% advantage
              const advantage = Number((50 - winRate).toFixed(1));
              return {
                heroId: m.hero_id,
                heroName: enemy?.localized_name || `Hero #${m.hero_id}`,
                heroSlug: enemy?.name || '',
                advantage,
                winRateAgainst: Number(winRate.toFixed(1)),
                sampleMatches: m.games_played,
              };
            })
            .sort((a, b) => b.advantage - a.advantage)
            .slice(0, 5);

          this.matchupsCache.set(heroId, counters);
          return counters;
        }
      }
    } catch {
      // Return synthetic counter heuristic if offline
    }

    // Dynamic heuristic fallback
    const target = this.getHeroById(heroId);
    const mockCounters: HeroCounter[] = [];
    if (target) {
      if (target.roles.includes('Carry') && target.primary_attr === 'agi') {
        mockCounters.push(
          { heroId: 2, heroName: 'Axe', heroSlug: 'npc_dota_hero_axe', advantage: 4.8, winRateAgainst: 45.2, sampleMatches: 1200 },
          { heroId: 104, heroName: 'Legion Commander', heroSlug: 'npc_dota_hero_legion_commander', advantage: 3.9, winRateAgainst: 46.1, sampleMatches: 980 }
        );
      } else if (target.primary_attr === 'int') {
        mockCounters.push(
          { heroId: 1, heroName: 'Anti-Mage', heroSlug: 'npc_dota_hero_antimage', advantage: 6.2, winRateAgainst: 43.8, sampleMatches: 1540 },
          { heroId: 44, heroName: 'Phantom Assassin', heroSlug: 'npc_dota_hero_phantom_assassin', advantage: 4.1, winRateAgainst: 45.9, sampleMatches: 1100 }
        );
      } else {
        mockCounters.push(
          { heroId: 26, heroName: 'Lion', heroSlug: 'npc_dota_hero_lion', advantage: 3.5, winRateAgainst: 46.5, sampleMatches: 870 },
          { heroId: 22, heroName: 'Zeus', heroSlug: 'npc_dota_hero_zeus', advantage: 2.8, winRateAgainst: 47.2, sampleMatches: 950 }
        );
      }
    }
    return mockCounters;
  }

  public getRecommendedItems(heroName: string, enemyHeroNames: string[] = []): RecommendedItem[] {
    const items: RecommendedItem[] = [];
    const heroClean = heroName.toLowerCase();
    const enemiesStr = enemyHeroNames.join(' ').toLowerCase();

    // Universal core items
    if (heroClean.includes('antimage')) {
      items.push(
        { name: 'bfury', displayName: 'Battle Fury', cost: 4100, tier: 'core', reason: 'Essential flash farming and creep clearance' },
        { name: 'manta', displayName: 'Manta Style', cost: 4600, tier: 'core', reason: 'Purge silences & rapid mana burning with illusions' },
        { name: 'abyssal_blade', displayName: 'Abyssal Blade', cost: 6250, tier: 'luxury', reason: 'Instant BKB-piercing lockdown stun' }
      );
    } else if (heroClean.includes('pudge')) {
      items.push(
        { name: 'blink', displayName: 'Blink Dagger', cost: 2250, tier: 'core', reason: 'Repositioning and instant Dismember' },
        { name: 'aghanims_shard', displayName: "Aghanim's Shard", cost: 1400, tier: 'early', reason: 'Swallow teammates to save them from stuns/burst' },
        { name: 'heart', displayName: 'Heart of Tarrasque', cost: 5100, tier: 'core', reason: 'Massive HP scaling with Flesh Heap stacks' }
      );
    } else if (heroClean.includes('axe')) {
      items.push(
        { name: 'blink', displayName: 'Blink Dagger', cost: 2250, tier: 'core', reason: 'Initiation for multi-hero Berserker Call' },
        { name: 'blade_mail', displayName: 'Blade Mail', cost: 2100, tier: 'core', reason: 'Reflects 100% damage while taunting' },
        { name: 'black_king_bar', displayName: 'Black King Bar', cost: 4050, tier: 'situational', reason: 'Avoid getting kited or disabled during Call' }
      );
    } else {
      items.push(
        { name: 'boots', displayName: 'Power Treads / Phase', cost: 1400, tier: 'early', reason: 'Mobility and stat attributes' },
        { name: 'black_king_bar', displayName: 'Black King Bar', cost: 4050, tier: 'core', reason: 'Debuff immunity in team fights' },
        { name: 'blink', displayName: 'Blink Dagger', cost: 2250, tier: 'core', reason: 'Repositioning and map initiation' }
      );
    }

    // Dynamic situational counter recommendations based on enemy lineup
    if (enemiesStr.includes('phantom_assassin') || enemiesStr.includes('windrunner') || enemiesStr.includes('butterfly')) {
      items.push({
        name: 'monkey_king_bar',
        displayName: 'Monkey King Bar',
        cost: 4975,
        tier: 'situational',
        reason: 'Provides 80% True Strike to pierce enemy Evasion/Blur',
        counterAgainst: 'Phantom Assassin / Butterfly Evasion'
      });
    }

    if (enemiesStr.includes('bristleback') || enemiesStr.includes('morphling') || enemiesStr.includes('necrophos') || enemiesStr.includes('alchemist')) {
      items.push({
        name: 'spirit_vessel',
        displayName: 'Spirit Vessel',
        cost: 2980,
        tier: 'situational',
        reason: 'Reduces enemy healing/HP regen by 45% and deals % current HP damage',
        counterAgainst: 'High Regen / Healer Heroes'
      });
    }

    if (enemiesStr.includes('lion') || enemiesStr.includes('shadow_shaman') || enemiesStr.includes('invoker') || enemiesStr.includes('zeus')) {
      items.push({
        name: 'black_king_bar',
        displayName: 'Black King Bar',
        cost: 4050,
        tier: 'situational',
        reason: 'High magic burst & disable threat detected',
        counterAgainst: 'Heavy Magic / Disablers'
      });
    }

    if (enemiesStr.includes('axe') || enemiesStr.includes('legion_commander') || enemiesStr.includes('faceless_void')) {
      items.push({
        name: 'aeon_disk',
        displayName: 'Aeon Disk',
        cost: 3000,
        tier: 'situational',
        reason: 'Combo-breaker shield triggers when taking lethal burst damage',
        counterAgainst: 'Instant Lock-down Burst'
      });
    }

    return items;
  }
}

export const apiService = new OpenDotaStratzService();
