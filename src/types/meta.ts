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

export type RankBracket = 'all' | 'ancient_plus' | 'divine_plus' | 'immortal';

export interface HighRankItem {
  name: string;
  displayName: string;
  cost: number | null;
  tier: 'starting' | 'early' | 'core' | 'luxury';
  purchaseCount: number;
  winRate?: number;
  avgPurchaseTime?: number;
  matchCount: number;
}

export interface HighRankItemBuild {
  heroId: number;
  heroName: string;
  rankBracket: RankBracket;
  rankLabel: string;
  sampleSize: number;
  items: HighRankItem[];
  fetchedAt: string;
  isExplorerData: boolean;
}

export interface TimingEventAlert {
  id: string;
  title: string;
  subtitle: string;
  targetSeconds: number; // Game clock for the objective occurrence.
  secondsRemaining: number;
  type: 'rune_bounty' | 'rune_power' | 'rune_wisdom' | 'roshan' | 'tormentor' | 'lotus' | 'day_night' | 'danger' | 'neutral_item' | 'camp_stack' | 'enemy_ultimate' | 'enemy_glyph';
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

export type TacticalDangerLevel = 'safe' | 'caution' | 'danger';

export interface PowerSpikeMilestone {
  level: number;
  isUnlocked: boolean;
  spikeName: string;
  comboTip: string;
}

export interface ThreatCounterItem {
  name: string;
  displayName: string;
  cost: number;
  reason: string;
  isEquipped: boolean;
}

export interface EnemyThreatAnalysis {
  threatType: 'invis' | 'cc' | 'regen' | 'evasion' | 'magic_burst' | 'illusions';
  threatName: string;
  enemyHeroes: string[];
  recommendedCounters: ThreatCounterItem[];
}

export interface BuybackStatusInfo {
  state: 'ready' | 'deficit' | 'cooldown' | 'early_game';
  hasBuyback?: boolean;
  buybackCost: number;
  currentGold: number;
  deficit: number;
  cooldownRemaining: number;
}

export interface NeutralItemRecommendation {
  key: string;
  displayName: string;
  tier: number;
  score: number;
  tierRank: 'S' | 'A' | 'B';
  reasonTh: string;
  reasonEn: string;
  statsSummary: string;
}

export interface NeutralSlotStatusInfo {
  tierUnlocked: number;
  nextTierSeconds: number;
  isSlotEmpty: boolean;
  equippedItemName: string | null;
  alertActive: boolean;
  heroRole: string;
  recommendations: NeutralItemRecommendation[];
  allTierRecommendations?: Record<number, NeutralItemRecommendation[]>;
}

export interface TpScrollStatusInfo {
  hasTp: boolean;
  charges: number;
  cooldownRemaining: number;
  isTravelBoots: boolean;
  alertActive: boolean;
}

export interface MacroStrategyPhase {
  phase: 'laning' | 'mid' | 'roshan' | 'late';
  phaseTitle: string;
  timeRange: string;
  keyObjectives: string[];
  coachAdvice: string;
}

export interface TalentChoice {
  en: string;
  th: string;
  category?: 'survivability' | 'damage' | 'utility' | 'mobility';
}

export interface TalentTierRecommendation {
  level: 10 | 15 | 20 | 25;
  left: TalentChoice;
  right: TalentChoice;
  recommended: 'left' | 'right';
  reasonTh: string;
  reasonEn: string;
  matchedThreat?: 'magic_burst' | 'cc' | 'invis' | 'evasion' | 'regen' | 'illusions';
}

export interface RawTalentTier {
  level: 10 | 15 | 20 | 25;
  left: TalentChoice;
  right: TalentChoice;
  defaultPick: 'left' | 'right';
  defaultReasonEn: string;
  defaultReasonTh: string;
}

export interface HeroTalentsAnalysis {
  heroName: string;
  tiers: TalentTierRecommendation[];
  activeMilestoneAdvice?: TalentTierRecommendation | null;
}

export interface HeroSkillInfo {
  slot: 'Q' | 'W' | 'E' | 'R' | string;
  key: string;
  name: string;
}

export interface SkillProgressionStep {
  level: number;
  slot: 'Q' | 'W' | 'E' | 'R' | 'Talent' | 'Stats' | string;
  skillKey?: string;
  skillName: string;
  targetLevel?: number;
  isTalent?: boolean;
}

export interface SituationalSkillRule {
  threat: 'magic_burst' | 'cc' | 'invis' | 'evasion' | 'regen' | 'illusions';
  level: number;
  recommendedSlot: string;
  reasonEn: string;
  reasonTh: string;
}

export interface SkillRecommendation {
  heroLevel: number;
  slot: 'Q' | 'W' | 'E' | 'R' | 'Talent' | 'Stats' | string;
  skillKey?: string;
  skillName: string;
  targetLevel?: number;
  reasonEn: string;
  reasonTh: string;
  isTalent?: boolean;
  unspentPoints: number;
}

export interface HeroSkillBuildAnalysis {
  heroName: string;
  abilities: HeroSkillInfo[];
  progression: SkillProgressionStep[];
  currentRecommendation: SkillRecommendation | null;
  unspentPoints: number;
  learnedLevelsBySlot: Record<string, number>;
}

export interface TacticalWardSpot {
  id: string;
  nameEn: string;
  nameTh: string;
  type: 'observer' | 'sentry_deward';
  x: number; // 0 - 100%
  y: number; // 0 - 100%
  phase: 'laning' | 'mid' | 'objective' | 'late' | 'any';
  team: 'radiant' | 'dire' | 'both';
  visionRadius: number;
  descEn: string;
  descTh: string;
}

export interface ActiveWardTracker {
  id: string;
  placedAtClockTime: number;
  expiresAtClockTime: number;
  remainingSeconds: number;
  totalDurationSeconds: number;
}

export interface VisionAdvisorState {
  activeWards: ActiveWardTracker[];
  nearestExpirySeconds: number | null;
  recommendedSpots: TacticalWardSpot[];
  wardsPlacedTotal: number;
}

export interface TacticalCoachState {
  dangerLevel: TacticalDangerLevel;
  dangerReasons: string[];
  powerSpike: PowerSpikeMilestone | null;
  threats: EnemyThreatAnalysis[];
  buyback: BuybackStatusInfo;
  neutralSlot: NeutralSlotStatusInfo;
  tpScroll: TpScrollStatusInfo;
  macroPhase: MacroStrategyPhase;
  talentAnalysis?: HeroTalentsAnalysis;
  skillBuildAnalysis?: HeroSkillBuildAnalysis;
  visionState?: VisionAdvisorState;
}
