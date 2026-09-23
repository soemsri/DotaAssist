import { openDotaCache } from './openDotaCache';
import rawHeroes from "../data/dotaHeroes.json";
import rawItems from "../data/dotaItems.json";
import rawTalents from "../data/dotaTalents.json";
import rawSkillBuilds from "../data/dotaSkillBuilds.json";
import rawProBuilds from "../data/dotaProBuilds.json";
import {
  HeroCounter,
  HeroMetaInfo,
  PopularItem,
  RawTalentTier,
  HeroSkillInfo,
  SkillProgressionStep,
  SituationalSkillRule,
  RankBracket,
  HighRankItem,
  HighRankItemBuild,
  ProHeroItemBuild,
  ProItemEntry,
} from "../types/meta";

export interface RawProBuild {
  heroId: number;
  heroName: string;
  heroSlug: string;
  proPlayer: string;
  team: string;
  role: string;
  starting: string[];
  early: string[];
  core: string[];
  luxury: string[];
  situational: string[];
}


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
  private proBuildCache: Map<string, RawProBuild> = new Map();
  private heroStatsRequest: Promise<boolean> | null = null;
  private dynamicTalentsLoading: Promise<boolean> | null = null;

  constructor() {
    this.loadHeroCatalog();
    this.loadBundledTalents();
    this.loadBundledSkillBuilds();
    this.loadBundledProBuilds();
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

  // ---------------------------------------------------------------------------
  // High-Rank Item Builds via OpenDota Explorer API
  // ---------------------------------------------------------------------------

  private static readonly RANK_BRACKET_CONFIG: Record<RankBracket, { minTier: number; label: string }> = {
    all: { minTier: 0, label: 'All Ranks' },
    ancient_plus: { minTier: 50, label: 'Ancient+' },
    divine_plus: { minTier: 70, label: 'Divine+' },
    immortal: { minTier: 80, label: 'Immortal' },
  };

  /** Build the Explorer SQL query for hero item purchases in a rank bracket. */
  public static buildExplorerSQL(heroId: number, minRankTier: number): string {
    return `SELECT pm.purchase_log, pm.win, m.avg_rank_tier FROM player_matches pm JOIN matches m ON m.match_id = pm.match_id WHERE pm.hero_id = ${heroId} AND m.avg_rank_tier >= ${minRankTier} AND m.start_time > extract(epoch from now())::int - 2592000 AND pm.purchase_log IS NOT NULL LIMIT 200`;
  }

  /** Classify item purchase time into game phase tier. */
  public static classifyItemTier(purchaseTimeSec: number): HighRankItem['tier'] {
    if (purchaseTimeSec < 0) return 'starting';
    if (purchaseTimeSec < 600) return 'early';      // < 10 min
    if (purchaseTimeSec < 1800) return 'core';       // 10–30 min
    return 'luxury';                                  // > 30 min
  }

  /**
   * Fetch item builds for a hero filtered by rank bracket using the Explorer API.
   * Falls back to the standard itemPopularity endpoint if Explorer fails.
   */
  public async getHighRankItemsForHero(
    heroId: number,
    bracket: RankBracket = 'divine_plus',
  ): Promise<HighRankItemBuild> {
    const hero = this.getHeroById(heroId);
    const heroName = hero?.localized_name ?? `Hero #${heroId}`;
    const config = OpenDotaService.RANK_BRACKET_CONFIG[bracket];
    const cacheKey = `explorer/hero-items/${heroId}/${bracket}`;

    // If bracket is "all", skip Explorer and go straight to itemPopularity
    if (bracket === 'all') {
      return this.buildFallbackItemBuild(heroId, heroName, bracket, config.label);
    }

    try {
      const sql = OpenDotaService.buildExplorerSQL(heroId, config.minTier);
      const url = `https://api.opendota.com/api/explorer?sql=${encodeURIComponent(sql)}`;

      interface ExplorerRow {
        purchase_log: Array<{ time: number; key: string }> | null;
        win: boolean | number;
        avg_rank_tier: number;
      }
      interface ExplorerResponse {
        rows: ExplorerRow[];
        rowCount?: number;
      }

      const result = await openDotaCache.loadCustom<ExplorerResponse>(
        cacheKey,
        url,
        (data): data is ExplorerResponse =>
          !!data &&
          typeof data === 'object' &&
          'rows' in (data as Record<string, unknown>) &&
          Array.isArray((data as ExplorerResponse).rows),
      );

      const items = this.parseExplorerRows(result.rows as ExplorerRow[]);
      return {
        heroId,
        heroName,
        rankBracket: bracket,
        rankLabel: config.label,
        sampleSize: result.rows.length,
        items,
        fetchedAt: new Date().toISOString(),
        isExplorerData: true,
      };
    } catch (error) {
      console.warn(`[OpenDota] Explorer query failed for hero ${heroId}, falling back to itemPopularity:`, error);
      return this.buildFallbackItemBuild(heroId, heroName, bracket, config.label);
    }
  }

  /** Parse Explorer rows into aggregated HighRankItem list. */
  private parseExplorerRows(
    rows: Array<{ purchase_log: Array<{ time: number; key: string }> | null; win: boolean | number }>,
  ): HighRankItem[] {
    const itemAgg = new Map<string, {
      tier: HighRankItem['tier'];
      totalTime: number;
      count: number;
      wins: number;
      matches: number;
    }>();

    const totalMatches = rows.length;

    for (const row of rows) {
      if (!Array.isArray(row.purchase_log)) continue;
      const isWin = row.win === true || row.win === 1;
      const seenInMatch = new Set<string>();

      for (const purchase of row.purchase_log) {
        if (!purchase.key || typeof purchase.time !== 'number') continue;
        // Skip recipes and common consumables from aggregation
        if (purchase.key.startsWith('recipe_')) continue;

        const itemKey = purchase.key;
        const tier = OpenDotaService.classifyItemTier(purchase.time);

        if (!seenInMatch.has(itemKey)) {
          seenInMatch.add(itemKey);
          const agg = itemAgg.get(itemKey) ?? { tier, totalTime: 0, count: 0, wins: 0, matches: 0 };
          agg.count += 1;
          agg.totalTime += purchase.time;
          if (isWin) agg.wins += 1;
          agg.matches = totalMatches;
          // Assign tier based on earliest common purchase time
          if (tier < agg.tier || agg.count === 1) agg.tier = tier;
          itemAgg.set(itemKey, agg);
        }
      }
    }

    // Convert to HighRankItem array, filter low-count items, sort by purchase count
    const items: HighRankItem[] = [];
    const minCount = Math.max(2, Math.floor(totalMatches * 0.05)); // at least 5% usage

    for (const [itemKey, agg] of itemAgg) {
      if (agg.count < minCount) continue;

      const details = Object.values(ITEMS_MAP).find(i => i.key === itemKey);
      if (!details) continue;

      items.push({
        name: details.key,
        displayName: details.displayName,
        cost: details.cost,
        tier: agg.tier,
        purchaseCount: agg.count,
        winRate: Number(((agg.wins / agg.count) * 100).toFixed(1)),
        avgPurchaseTime: Math.round(agg.totalTime / agg.count),
        matchCount: agg.matches,
      });
    }

    // Sort: starting items first, then by purchase count descending within each tier
    const tierOrder: Record<HighRankItem['tier'], number> = { starting: 0, early: 1, core: 2, luxury: 3 };
    items.sort((a, b) => {
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
      if (tierDiff !== 0) return tierDiff;
      return b.purchaseCount - a.purchaseCount;
    });

    // Limit to top 3 per tier
    const result: HighRankItem[] = [];
    const countByTier: Record<string, number> = {};
    for (const item of items) {
      const tierCount = countByTier[item.tier] ?? 0;
      if (tierCount < 3) {
        result.push(item);
        countByTier[item.tier] = tierCount + 1;
      }
    }

    return result;
  }

  /** Build a fallback HighRankItemBuild from the standard itemPopularity endpoint. */
  private async buildFallbackItemBuild(
    heroId: number,
    heroName: string,
    bracket: RankBracket,
    rankLabel: string,
  ): Promise<HighRankItemBuild> {
    try {
      const popularItems = await this.getPopularItemsForHero(heroId);
      const items: HighRankItem[] = popularItems.map(pi => ({
        name: pi.name,
        displayName: pi.displayName,
        cost: pi.cost,
        tier: pi.tier === 'early' ? 'early' as const : pi.tier === 'core' ? 'core' as const : 'luxury' as const,
        purchaseCount: pi.popularityCount,
        matchCount: 0,
      }));

      return {
        heroId,
        heroName,
        rankBracket: bracket,
        rankLabel: bracket === 'all' ? 'All Ranks' : `${rankLabel} (fallback)`,
        sampleSize: 0,
        items,
        fetchedAt: new Date().toISOString(),
        isExplorerData: false,
      };
    } catch {
      return {
        heroId,
        heroName,
        rankBracket: bracket,
        rankLabel: `${rankLabel} (unavailable)`,
        sampleSize: 0,
        items: [],
        fetchedAt: new Date().toISOString(),
        isExplorerData: false,
      };
    }
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

  private loadBundledProBuilds() {
    const proMap = rawProBuilds as unknown as Record<string, RawProBuild>;
    for (const [heroKey, build] of Object.entries(proMap)) {
      this.proBuildCache.set(heroKey.toLowerCase(), build);
      this.proBuildCache.set(heroKey.replace("npc_dota_hero_", "").toLowerCase(), build);
    }
  }

  /**
   * Get pro player item recommendations for a given hero.
   * Resolves item details (display name, cost) for each item key.
   */
  public getProItemBuildForHero(heroNameOrKey: string): ProHeroItemBuild | null {
    if (!heroNameOrKey) return null;
    const cleanKey = heroNameOrKey.toLowerCase().trim();
    const raw = this.proBuildCache.get(cleanKey) ||
      this.proBuildCache.get(cleanKey.replace(/^npc_dota_hero_/, "")) ||
      this.proBuildCache.get(`npc_dota_hero_${cleanKey.replace(/^npc_dota_hero_/, "")}`);

    if (!raw) return null;

    const mapEntry = (key: string, phase: ProItemEntry['phase']): ProItemEntry => {
      const details = this.getItemDetails(key);
      return {
        name: key,
        displayName: details?.displayName || key.replace(/_/g, ' '),
        cost: details?.cost ?? null,
        phase,
      };
    };

    return {
      heroId: raw.heroId,
      heroName: raw.heroName,
      heroSlug: raw.heroSlug,
      proPlayer: raw.proPlayer,
      team: raw.team,
      role: raw.role,
      starting: raw.starting.map((k) => mapEntry(k, 'starting')),
      early: raw.early.map((k) => mapEntry(k, 'early')),
      core: raw.core.map((k) => mapEntry(k, 'core')),
      luxury: raw.luxury.map((k) => mapEntry(k, 'luxury')),
      situational: raw.situational.map((k) => mapEntry(k, 'situational')),
    };
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
