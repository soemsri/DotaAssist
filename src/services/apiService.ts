import rawHeroes from "../data/dotaHeroes.json";
import rawItems from "../data/dotaItems.json";
import { HeroCounter, HeroMetaInfo, PopularItem } from "../types/meta";

interface DotaItemRecord {
  id: number;
  key: string;
  displayName: string;
  cost: number | null;
  img?: string;
}

interface OpenDotaHeroStats {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: "str" | "agi" | "int" | "all";
  attack_type: "Melee" | "Ranged";
  roles: string[];
  [key: string]: unknown;
}

interface OpenDotaMatchup {
  hero_id: number;
  games_played: number;
  wins: number;
}

interface OpenDotaItemPopularity {
  start_game_items?: Record<string, number>;
  early_game_items?: Record<string, number>;
  mid_game_items?: Record<string, number>;
  late_game_items?: Record<string, number>;
}

const ITEMS_MAP = rawItems as unknown as Record<string, DotaItemRecord>;
const RANK_BRACKETS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function getRankedTotals(item: OpenDotaHeroStats): { wins: number; picks: number } | null {
  let wins = 0;
  let picks = 0;

  for (const bracket of RANK_BRACKETS) {
    const bracketWins = item[`${bracket}_win`];
    const bracketPicks = item[`${bracket}_pick`];
    if (isFiniteNonNegative(bracketWins)) wins += bracketWins;
    if (isFiniteNonNegative(bracketPicks)) picks += bracketPicks;
  }

  return picks > 0 && wins <= picks ? { wins, picks } : null;
}

export class OpenDotaService {
  private heroCache: Map<number, HeroMetaInfo> = new Map();
  private nameToIdMap: Map<string, number> = new Map();
  private matchupsCache: Map<number, HeroCounter[]> = new Map();
  private popularItemsCache: Map<number, PopularItem[]> = new Map();
  private heroStatsRequest: Promise<boolean> | null = null;

  constructor() {
    this.loadHeroCatalog();
  }

  /**
   * The bundled catalog contains identity and role metadata only. Runtime
   * statistics are populated exclusively by successful OpenDota responses.
   */
  private loadHeroCatalog() {
    const heroes = rawHeroes as HeroMetaInfo[];
    heroes.forEach((hero) => this.storeHero(hero));
  }

  private storeHero(hero: HeroMetaInfo) {
    this.heroCache.set(hero.id, hero);
    this.nameToIdMap.set(hero.name.toLowerCase(), hero.id);
    this.nameToIdMap.set(hero.localized_name.toLowerCase(), hero.id);
    this.nameToIdMap.set(
      hero.name.replace("npc_dota_hero_", "").toLowerCase(),
      hero.id,
    );
  }

  /** Fetch current hero metadata and ranked win statistics from OpenDota. */
  public async initData(): Promise<boolean> {
    if (!this.heroStatsRequest) {
      this.heroStatsRequest = this.fetchHeroStats().finally(() => {
        this.heroStatsRequest = null;
      });
    }

    return this.heroStatsRequest;
  }

  private async fetchHeroStats(): Promise<boolean> {
    try {
      const res = await fetch("https://api.opendota.com/api/heroStats");
      if (!res.ok) {
        throw new Error(`OpenDota heroStats returned HTTP ${res.status}`);
      }

      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("OpenDota heroStats returned an invalid payload");
      }

      data.forEach((rawItem: unknown) => {
        const item = rawItem as OpenDotaHeroStats;
        if (
          !Number.isInteger(item.id) ||
          typeof item.name !== "string" ||
          typeof item.localized_name !== "string" ||
          !Array.isArray(item.roles)
        ) {
          return;
        }

        const totals = getRankedTotals(item);
        const heroInfo: HeroMetaInfo = {
          id: item.id,
          name: item.name,
          localized_name: item.localized_name,
          primary_attr: item.primary_attr,
          attack_type: item.attack_type,
          roles: item.roles,
          ...(totals
            ? {
                winRate: Number(((totals.wins / totals.picks) * 100).toFixed(1)),
                statMatches: totals.picks,
              }
            : {}),
        };

        this.storeHero(heroInfo);
      });

      return true;
    } catch (error) {
      console.warn("[OpenDota] Hero statistics unavailable:", error);
      return false;
    }
  }

  public getAllHeroes(): HeroMetaInfo[] {
    return Array.from(this.heroCache.values()).sort((a, b) =>
      a.localized_name.localeCompare(b.localized_name),
    );
  }

  public getHeroById(id: number): HeroMetaInfo | undefined {
    return this.heroCache.get(id);
  }

  public getHeroByName(name: string): HeroMetaInfo | undefined {
    if (!name) return undefined;

    const clean = name.toLowerCase().trim();
    const exactId = this.nameToIdMap.get(clean);
    if (exactId !== undefined) return this.heroCache.get(exactId);

    for (const [key, heroId] of this.nameToIdMap.entries()) {
      if (clean.includes(key) || key.includes(clean)) {
        return this.heroCache.get(heroId);
      }
    }
    return undefined;
  }

  /** Fetch counter win rates directly from OpenDota matchup records. */
  public async getCountersForHero(heroId: number): Promise<HeroCounter[]> {
    const cached = this.matchupsCache.get(heroId);
    if (cached) return cached;

    const res = await fetch(`https://api.opendota.com/api/heroes/${heroId}/matchups`);
    if (!res.ok) {
      throw new Error(`OpenDota matchups returned HTTP ${res.status}`);
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("OpenDota matchups returned an invalid payload");
    }

    const counters: HeroCounter[] = (data as OpenDotaMatchup[])
      .filter(
        (matchup) =>
          Number.isInteger(matchup.hero_id) &&
          isFiniteNonNegative(matchup.games_played) &&
          isFiniteNonNegative(matchup.wins) &&
          matchup.games_played > 10 &&
          matchup.wins <= matchup.games_played,
      )
      .map((matchup) => {
        const counterHero = this.getHeroById(matchup.hero_id);
        const counterWinRate =
          ((matchup.games_played - matchup.wins) / matchup.games_played) * 100;

        return {
          heroId: matchup.hero_id,
          heroName: counterHero?.localized_name ?? `Hero #${matchup.hero_id}`,
          heroSlug: counterHero?.name ?? "",
          edgeOverEven: Number((counterWinRate - 50).toFixed(1)),
          winRateAgainst: Number(counterWinRate.toFixed(1)),
          sampleMatches: matchup.games_played,
        };
      })
      .sort((a, b) => b.winRateAgainst - a.winRateAgainst)
      .slice(0, 6);

    this.matchupsCache.set(heroId, counters);
    return counters;
  }

  /**
   * Build an item list only from OpenDota's per-hero itemPopularity buckets.
   * The bundled item catalog is used solely to resolve item IDs to names/costs.
   */
  public async getPopularItemsForHero(heroId: number): Promise<PopularItem[]> {
    const cached = this.popularItemsCache.get(heroId);
    if (cached) return cached;

    const res = await fetch(
      `https://api.opendota.com/api/heroes/${heroId}/itemPopularity`,
    );
    if (!res.ok) {
      throw new Error(`OpenDota itemPopularity returned HTTP ${res.status}`);
    }

    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("OpenDota itemPopularity returned an invalid payload");
    }

    const popularity = data as OpenDotaItemPopularity;
    const phases: Array<{
      bucket: Record<string, number> | undefined;
      tier: PopularItem["tier"];
      label: string;
      limit: number;
    }> = [
      {
        bucket: popularity.start_game_items,
        tier: "early",
        label: "starting-item",
        limit: 2,
      },
      {
        bucket: popularity.early_game_items,
        tier: "early",
        label: "early-game",
        limit: 2,
      },
      {
        bucket: popularity.mid_game_items,
        tier: "core",
        label: "mid-game",
        limit: 3,
      },
      {
        bucket: popularity.late_game_items,
        tier: "luxury",
        label: "late-game",
        limit: 3,
      },
    ];

    const seen = new Set<string>();
    const items: PopularItem[] = [];

    phases.forEach(({ bucket, tier, label, limit }) => {
      if (!bucket || typeof bucket !== "object") return;

      const phaseItems = Object.entries(bucket)
        .filter(([, count]) => isFiniteNonNegative(count) && count > 0)
        .sort(([, countA], [, countB]) => countB - countA)
        .flatMap(([itemId, popularityCount]) => {
          const details = ITEMS_MAP[itemId];
          if (
            !details ||
            !details.key ||
            details.key.startsWith("recipe_") ||
            seen.has(details.key)
          ) {
            return [];
          }

          return [
            {
              name: details.key,
              displayName: details.displayName,
              cost: details.cost,
              tier,
              reason: `OpenDota ${label} popularity: ${popularityCount.toLocaleString()} recorded purchases`,
              popularityCount,
              dataSource: "OpenDota itemPopularity" as const,
            },
          ];
        })
        .slice(0, limit);

      phaseItems.forEach((item) => seen.add(item.name));
      items.push(...phaseItems);
    });

    this.popularItemsCache.set(heroId, items);
    return items;
  }

  public getItemDetails(itemIdOrKey: number | string): DotaItemRecord | undefined {
    if (typeof itemIdOrKey === "number") {
      return ITEMS_MAP[itemIdOrKey.toString()];
    }
    return Object.values(ITEMS_MAP).find((item) => item.key === itemIdOrKey);
  }
}

export const apiService = new OpenDotaService();
