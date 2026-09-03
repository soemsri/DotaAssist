export interface HeroCounter {
  heroId: number;
  heroName: string;
  heroSlug: string;
  advantage: number; // e.g. +3.5% or -2.1%
  winRateAgainst: number;
  sampleMatches: number;
}

export interface HeroSynergy {
  heroId: number;
  heroName: string;
  heroSlug: string;
  synergyScore: number;
}

export interface RecommendedItem {
  name: string;
  displayName: string;
  cost: number;
  tier: 'early' | 'core' | 'situational' | 'luxury';
  reason: string;
  iconUrl?: string;
  counterAgainst?: string;
}

export interface TimingEventAlert {
  id: string;
  title: string;
  subtitle: string;
  targetSeconds: number; // e.g. next rune spawn at 180s
  secondsRemaining: number;
  type: 'rune_bounty' | 'rune_power' | 'rune_wisdom' | 'roshan' | 'tormentor' | 'lotus' | 'day_night';
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
  winRate: number;
  pickRate: number;
}
