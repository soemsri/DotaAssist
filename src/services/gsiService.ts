import { GSIPayload } from '../types/gsi';

export type GSICallback = (payload: GSIPayload) => void;

class GSIService {
  private listeners: Set<GSICallback> = new Set();
  private lastPayload: GSIPayload | null = null;
  private isConnected: boolean = false;
  private mockInterval: number | null = null;
  private unlistenTauri: (() => void) | null = null;

  constructor() {
    this.initTauriListener();
  }

  private async initTauriListener() {
    try {
      // Check if Tauri is available in window
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { listen } = await import('@tauri-apps/api/event');
        this.unlistenTauri = await listen<GSIPayload>('gsi-update', (event) => {
          this.handlePayload(event.payload);
        });
        console.log('[GSIService] Tauri event listener registered');
      }
    } catch {
      console.warn('[GSIService] Tauri API not available, falling back to WebSocket/HTTP polling or Simulator.');
    }
  }

  public subscribe(cb: GSICallback): () => void {
    this.listeners.add(cb);
    if (this.lastPayload) {
      cb(this.lastPayload);
    }
    return () => {
      this.listeners.delete(cb);
    };
  }

  public handlePayload(payload: GSIPayload) {
    this.isConnected = true;
    this.lastPayload = payload;
    this.listeners.forEach((cb) => cb(payload));
  }

  public getLastPayload(): GSIPayload | null {
    return this.lastPayload;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  // Simulation mode for testing overlays without active Dota 2 client
  public startSimulation() {
    if (this.mockInterval) return;

    let clock = 150; // starts at 02:30
    let hp = 1120;
    let mana = 540;
    let gold = 1450;
    let lastHits = 24;

    this.mockInterval = window.setInterval(() => {
      clock += 1;
      gold += 2;
      if (clock % 30 === 0) {
        lastHits += 3;
        gold += 150;
      }

      const mockPayload: GSIPayload = {
        provider: {
          name: 'Dota 2',
          appid: 570,
          version: 50,
          timestamp: Math.floor(Date.now() / 1000),
        },
        map: {
          name: 'start',
          matchid: '7829103942',
          game_time: clock + 90,
          clock_time: clock,
          daytime: Math.floor(clock / 300) % 2 === 0,
          nightstalker_night: false,
          game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
          paused: false,
          win_team: 'none',
          customgamename: '',
          radiant_score: 4,
          dire_score: 3,
        },
        player: {
          steamid: '76561198000000000',
          name: 'Player',
          activity: 'playing',
          kills: 2,
          deaths: 0,
          assists: 1,
          last_hits: lastHits,
          denies: 8,
          kill_streak: 2,
          commands_per_minute: 280,
          gold,
          gold_reliable: 400,
          gold_unreliable: gold - 400,
          gpm: 480,
          xpm: 520,
          net_worth: gold + 2400,
          team_name: 'radiant',
        },
        hero: {
          id: 1,
          name: 'npc_dota_hero_antimage',
          level: 6,
          alive: true,
          respawn_seconds: 0,
          buyback_cost: 320,
          buyback_cooldown: 0,
          health: hp,
          max_health: 1200,
          health_percent: Math.round((hp / 1200) * 100),
          mana,
          max_mana: 600,
          mana_percent: Math.round((mana / 600) * 100),
          silenced: false,
          stunned: false,
          disarmed: false,
          magicimmune: false,
          hexed: false,
          muted: false,
          break: false,
          aghs_scepter: false,
          aghs_shard: false,
          smoked: false,
          has_debuff: false,
        },
        items: {
          slot0: { name: 'item_power_treads', purchaser: 0, can_cast: true },
          slot1: { name: 'item_tango', purchaser: 0, charges: 2 },
          slot2: { name: 'item_quelling_blade', purchaser: 0, passive: true },
          slot3: { name: 'item_magic_wand', purchaser: 0, charges: 8 },
        },
        draft: {
          activeteam: 2,
          activeteam_time_remaining: 30,
          team2: {
            pick0_class: 'npc_dota_hero_antimage',
            pick1_class: 'npc_dota_hero_lion',
            pick2_class: 'npc_dota_hero_mars',
          },
          team3: {
            pick0_class: 'npc_dota_hero_phantom_assassin',
            pick1_class: 'npc_dota_hero_zeus',
            pick2_class: 'npc_dota_hero_pudge',
          }
        }
      };

      this.handlePayload(mockPayload);
    }, 1000);
  }

  public stopSimulation() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  public cleanup() {
    this.stopSimulation();
    if (this.unlistenTauri) {
      this.unlistenTauri();
      this.unlistenTauri = null;
    }
  }
}

export const gsiService = new GSIService();
