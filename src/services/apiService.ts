import { openDotaCache } from './openDotaCache';
import rawHeroes from "../data/dotaHeroes.json";
import rawItems from "../data/dotaItems.json";
import rawTalents from "../data/dotaTalents.json";
import rawSkillBuilds from "../data/dotaSkillBuilds.json";
import { HeroCounter, HeroMetaInfo, PopularItem, RawTalentTier, HeroSkillInfo, SkillProgressionStep, SituationalSkillRule } from "../types/meta";

export interface RawSkillBuild {
  heroName: string;
  abilities: HeroSkillInfo[];
  progression: SkillProgressionStep[];
  situationalRules?: SituationalSkillRule[];
}

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
  private talentCache: Map<string, RawTalentTier[]> = new Map();
  private skillBuildCache: Map<string, RawSkillBuild> = new Map();
  private heroStatsRequest: Promise<boolean> | null = null;
  private dynamicTalentsLoading: Promise<boolean> | null = null;

  constructor() {
    this.loadHeroCatalog();
    this.loadBundledTalents();
    this.loadBundledSkillBuilds();
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
      const data = await openDotaCache.load('heroStats', (value): value is OpenDotaHeroStats[] =>
        Array.isArray(value) && value.every(item => item && Number.isInteger(item.id) &&
          typeof item.name === 'string' && typeof item.localized_name === 'string' &&
          Array.isArray(item.roles) && item.roles.every((role: unknown) => typeof role === 'string')));
      this.heroCache.clear();
      this.nameToIdMap.clear();
      this.loadHeroCatalog();

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
      this.heroCache.clear();
      this.nameToIdMap.clear();
      this.loadHeroCatalog();
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
  public async getCountersForHero(heroId: number, cachedOnly = false): Promise<HeroCounter[]> {
    const load = cachedOnly ? openDotaCache.peek.bind(openDotaCache) : openDotaCache.load.bind(openDotaCache);
    const data = await load(`heroes/${heroId}/matchups`, (value): value is OpenDotaMatchup[] =>
      Array.isArray(value) && value.every(item => item && Number.isInteger(item.hero_id) &&
        isFiniteNonNegative(item.games_played) && isFiniteNonNegative(item.wins) && item.wins <= item.games_played));

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

    return counters;
  }

  /**
   * Build an item list only from OpenDota's per-hero itemPopularity buckets.
   * The bundled item catalog is used solely to resolve item IDs to names/costs.
   */
  public async getPopularItemsForHero(heroId: number, cachedOnly = false): Promise<PopularItem[]> {
    const load = cachedOnly ? openDotaCache.peek.bind(openDotaCache) : openDotaCache.load.bind(openDotaCache);
    const popularity = await load(`heroes/${heroId}/itemPopularity`, (value): value is OpenDotaItemPopularity => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const record = value as Record<string, unknown>;
      const keys = ['start_game_items', 'early_game_items', 'mid_game_items', 'late_game_items'];
      return keys.some(key => key in record) && keys.every(key => {
        const bucket = record[key];
        return bucket === undefined || (!!bucket && typeof bucket === 'object' && !Array.isArray(bucket) && Object.values(bucket).every(isFiniteNonNegative));
      });
    });
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

    return items;
  }

  public getItemDetails(itemIdOrKey: number | string): DotaItemRecord | undefined {
    if (typeof itemIdOrKey === "number") {
      return ITEMS_MAP[itemIdOrKey.toString()];
    }
    return Object.values(ITEMS_MAP).find((item) => item.key === itemIdOrKey);
  }

  private loadBundledTalents() {
    const talentsMap = rawTalents as unknown as Record<string, RawTalentTier[]>;
    for (const [heroKey, tiers] of Object.entries(talentsMap)) {
      this.talentCache.set(heroKey.toLowerCase(), tiers);
    }
  }

  private loadBundledSkillBuilds() {
    const buildsMap = rawSkillBuilds as unknown as Record<string, RawSkillBuild>;
    for (const [heroKey, build] of Object.entries(buildsMap)) {
      this.skillBuildCache.set(heroKey.toLowerCase(), build);
    }
  }

  /**
   * Returns talent tiers for a hero. Uses in-memory cache / bundled fallback immediately.
   */
  public getHeroTalents(heroNameOrKey: string): RawTalentTier[] | null {
    const cleanKey = heroNameOrKey.replace(/^npc_dota_hero_/, "").toLowerCase();
    return this.talentCache.get(cleanKey) || null;
  }

  /**
   * Returns standard skill build progression for a hero. Uses in-memory cache / bundled fallback immediately.
   */
  public getHeroSkillBuild(heroNameOrKey: string): RawSkillBuild | null {
    const cleanKey = heroNameOrKey.replace(/^npc_dota_hero_/, "").toLowerCase();
    return this.skillBuildCache.get(cleanKey) || null;
  }

  /**
   * Fetches latest abilities/talents dynamically from OpenDota / dotaconstants.
   * If network fails or is offline, gracefully retains the bundled cache.
   */
  public async refreshTalentsFromAPI(): Promise<boolean> {
    if (this.dynamicTalentsLoading) return this.dynamicTalentsLoading;

    this.dynamicTalentsLoading = (async () => {
      try {
        const [haRes, abRes] = await Promise.all([
          fetch("https://raw.githubusercontent.com/odota/dotaconstants/master/build/hero_abilities.json"),
          fetch("https://raw.githubusercontent.com/odota/dotaconstants/master/build/abilities.json"),
        ]);
        if (!haRes.ok || !abRes.ok) return false;

        const heroAbilities = await haRes.json() as Record<string, { talents?: Array<{ name: string; level: number }> }>;
        const abilities = await abRes.json() as Record<string, { dname?: string }>;

        const levelMap: Record<number, 10 | 15 | 20 | 25> = { 1: 10, 2: 15, 3: 20, 4: 25 };

        for (const [heroKey, data] of Object.entries(heroAbilities)) {
          if (!heroKey.startsWith("npc_dota_hero_")) continue;
          const cleanKey = heroKey.replace(/^npc_dota_hero_/, "").toLowerCase();
          const talents = data.talents || [];
          if (talents.length < 8) continue;

          const tiers: RawTalentTier[] = [];
          for (let lvl = 1; lvl <= 4; lvl++) {
            const lvlTalents = talents.filter((t) => t.level === lvl);
            if (lvlTalents.length < 2) continue;

            // In Dota 2 game definitions (npc_heroes.txt) and Valve UI:
            // Index 1 (e.g. Ability11, Ability13...) is the LEFT talent branch
            // Index 0 (e.g. Ability10, Ability12...) is the RIGHT talent branch
            const leftRaw = abilities[lvlTalents[1].name]?.dname || lvlTalents[1].name;
            const rightRaw = abilities[lvlTalents[0].name]?.dname || lvlTalents[0].name;

            const leftEn = leftRaw
              .replace(/\{s:bonus_[a-zA-Z0-9_]+\}/g, "Bonus")
              .replace(/\{s:[a-zA-Z0-9_]+\}/g, "Bonus")
              .trim();
            const rightEn = rightRaw
              .replace(/\{s:bonus_[a-zA-Z0-9_]+\}/g, "Bonus")
              .replace(/\{s:[a-zA-Z0-9_]+\}/g, "Bonus")
              .trim();

            tiers.push({
              level: levelMap[lvl],
              left: { en: leftEn, th: leftEn },
              right: { en: rightEn, th: rightEn },
              defaultPick: "right",
              defaultReasonEn: "Updated talent from live OpenDota database.",
              defaultReasonTh: "ทักษะอัปเดตล่าสุดจากฐานข้อมูลออนไลน์",
            });
          }

          if (tiers.length === 4) {
            this.talentCache.set(cleanKey, tiers);
          }
        }
        return true;
      } catch {
        return false;
      } finally {
        this.dynamicTalentsLoading = null;
      }
    })();

    return this.dynamicTalentsLoading;
  }
}

export const apiService = new OpenDotaService();
