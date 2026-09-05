export type GameStateStage =
  | 'DOTA_GAMERULES_STATE_INIT'
  | 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD'
  | 'DOTA_GAMERULES_STATE_HERO_SELECTION'
  | 'DOTA_GAMERULES_STATE_STRATEGY_TIME'
  | 'DOTA_GAMERULES_STATE_TEAM_SHOWCASE'
  | 'DOTA_GAMERULES_STATE_PRE_GAME'
  | 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS'
  | 'DOTA_GAMERULES_STATE_POST_GAME'
  | 'DOTA_GAMERULES_STATE_DISCONNECT';

export interface GSIProvider {
  name: string;
  appid: number;
  version: number;
  timestamp: number;
}

export interface GSIMap {
  name: string;
  matchid: string;
  game_time: number;
  clock_time: number;
  daytime: boolean;
  nightstalker_night: boolean;
  game_state: GameStateStage;
  paused: boolean;
  win_team: string;
  customgamename: string;
  radiant_score?: number;
  dire_score?: number;
  roshan_state?: 'alive' | 'respawn_base' | 'respawn_variable' | string;
  roshan_state_end_seconds?: number;
}

export interface GSIEvent {
  event_type?: string;
  event?: string;
  game_time?: number;
  [key: string]: unknown;
}

export interface GSIRoshan {
  alive?: boolean;
  health?: number;
  max_health?: number;
  phase_time_remaining?: number;
  spawn_phase?: number;
}

export interface GSIPlayer {
  steamid: string;
  name: string;
  activity: string;
  kills: number;
  deaths: number;
  assists: number;
  last_hits: number;
  denies: number;
  kill_streak: number;
  commands_per_minute: number;
  gold: number;
  gold_reliable: number;
  gold_unreliable: number;
  gpm: number;
  xpm: number;
  net_worth: number;
  hero_damage?: number;
  wards_purchased?: number;
  wards_placed?: number;
  team_name: 'radiant' | 'dire';
}

export interface GSIHero {
  id: number;
  name: string;
  level: number;
  alive: boolean;
  respawn_seconds: number;
  buyback_cost: number;
  buyback_cooldown: number;
  health: number;
  max_health: number;
  health_percent: number;
  mana: number;
  max_mana: number;
  mana_percent: number;
  silenced: boolean;
  stunned: boolean;
  disarmed: boolean;
  magicimmune: boolean;
  hexed: boolean;
  muted: boolean;
  break: boolean;
  aghs_scepter: boolean;
  aghs_shard: boolean;
  smoked: boolean;
  has_debuff: boolean;
}

export interface GSIItem {
  name: string;
  purchaser: number;
  can_cast?: boolean;
  cooldown?: number;
  passive?: boolean;
  charges?: number;
}

export interface GSIItems {
  slot0?: GSIItem;
  slot1?: GSIItem;
  slot2?: GSIItem;
  slot3?: GSIItem;
  slot4?: GSIItem;
  slot5?: GSIItem;
  stash0?: GSIItem;
  stash1?: GSIItem;
  stash2?: GSIItem;
  teleport0?: GSIItem;
  neutral0?: GSIItem;
  [key: string]: GSIItem | undefined;
}

export interface GSIDraftTeam {
  home_team?: boolean;
  pick0_id?: number;
  pick1_id?: number;
  pick2_id?: number;
  pick3_id?: number;
  pick4_id?: number;
  pick0_class?: string;
  pick1_class?: string;
  pick2_class?: string;
  pick3_class?: string;
  pick4_class?: string;
  ban0_class?: string;
  ban1_class?: string;
  ban2_class?: string;
  ban3_class?: string;
  ban4_class?: string;
  ban5_class?: string;
  ban6_class?: string;
}

export interface GSIDraft {
  activeteam?: number;
  activeteam_time_remaining?: number;
  radiant_bonus_time?: number;
  dire_bonus_time?: number;
  team2?: GSIDraftTeam; // Radiant
  team3?: GSIDraftTeam; // Dire
}

export interface GSIPayload {
  provider?: GSIProvider;
  map?: GSIMap;
  player?: GSIPlayer;
  hero?: GSIHero;
  abilities?: Record<string, { name: string; level: number; can_cast: boolean; cooldown: number; passive: boolean }>;
  items?: GSIItems;
  draft?: GSIDraft;
  events?: GSIEvent[] | Record<string, GSIEvent>;
  roshan?: GSIRoshan;
  previously?: Partial<GSIPayload>;
}
