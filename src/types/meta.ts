export interface HeroCounter {
  heroId: number;
  heroName: string;
  heroSlug: string;
  edgeOverEven: number;
  winRateAgainst: number;
  sampleMatches: number;
}

export interface HeroSynergy {
  heroId: number;
  heroName: string;
  heroSlug: string;
  synergyScore: number;
}

export interface PopularItem {
  name: string;
  displayName: string;
  cost: number | null;
  tier: 'early' | 'core' | 'luxury';
  reason: string;
  popularityCount: number;
  dataSource: 'OpenDota itemPopularity';
}

export interface TimingEventAlert {
  id: string;
  title: string;
  subtitle: string;
  targetSeconds: number; // Game clock for the objective occurrence.
  secondsRemaining: number;
  type: 'rune_bounty' | 'rune_power' | 'rune_wisdom' | 'roshan' | 'tormentor' | 'lotus' | 'day_night' | 'neutral_item' | 'camp_stack' | 'enemy_ultimate' | 'enemy_glyph';
  urgent: boolean;
  audioPlayed?: boolean;
}

export interface HeroMetaInfo {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: 'str' | 'agi' | 'int' | 'all';
  attack_type: 'Melee' | 'Ranged';
  roles: string[];
  winRate?: number;
  statMatches?: number;
}
