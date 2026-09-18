import { GSIPayload } from '../types/gsi';
import { audioService } from './audioService';

export const GLYPH_COOLDOWN = 300; // 5 minutes in Dota 2
export const GLYPH_DURATION = 7; // 7 seconds invulnerability duration

export interface EnemyGlyphSnapshot {
  isReady: boolean;
  isActive: boolean;
  activeRemainingSeconds: number;
  cooldownRemainingSeconds: number;
  activatedClockTime: number | null;
  cooldownEndClockTime: number | null;
  firstT1Destroyed: boolean;
  enemyTeam: 'radiant' | 'dire' | 'unknown';
}

export class EnemyGlyphService {
  private isReady: boolean = true;
  private isActive: boolean = false;
  private activatedClockTime: number | null = null;
  private cooldownEndClockTime: number | null = null;
  private firstT1Destroyed: boolean = false;
  private enemyTeam: 'radiant' | 'dire' | 'unknown' = 'unknown';
  private readyAlertPlayed: boolean = false;
  private processedEvents: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getSnapshot = (): EnemyGlyphSnapshot => {
    const clock = this.activatedClockTime !== null ? this.activatedClockTime : 0;
    void clock; // avoid unused warning

    return {
      isReady: this.isReady,
      isActive: this.isActive,
      activeRemainingSeconds: this.calculateActiveRemaining(),
      cooldownRemainingSeconds: this.calculateCooldownRemaining(),
      activatedClockTime: this.activatedClockTime,
      cooldownEndClockTime: this.cooldownEndClockTime,
      firstT1Destroyed: this.firstT1Destroyed,
      enemyTeam: this.enemyTeam,
    };
  };

  private lastClockTime: number = 0;

  private calculateActiveRemaining(): number {
    if (!this.isActive || this.activatedClockTime === null) return 0;
    const remaining = Math.max(0, GLYPH_DURATION - (this.lastClockTime - this.activatedClockTime));
    return Math.ceil(remaining);
  }

  private calculateCooldownRemaining(): number {
    if (this.isReady || this.cooldownEndClockTime === null) return 0;
    const remaining = Math.max(0, this.cooldownEndClockTime - this.lastClockTime);
    return Math.ceil(remaining);
  }

  public resetAll() {
    this.isReady = true;
    this.isActive = false;
    this.activatedClockTime = null;
    this.cooldownEndClockTime = null;
    this.firstT1Destroyed = false;
    this.readyAlertPlayed = false;
    this.processedEvents.clear();
    this.notify();
  }

  /**
   * Decision 1: Record enemy glyph activation.
   * Decision 3: Spoken voice alert: "Enemy Glyph activated"
   */
  public recordGlyphActivated(clockTime: number) {
    const clock = Math.floor(clockTime);
    this.lastClockTime = clock;
    this.isReady = false;
    this.isActive = true;
    this.activatedClockTime = clock;
    this.cooldownEndClockTime = clock + GLYPH_COOLDOWN;
    this.readyAlertPlayed = false;

    // Trigger Decision 3 audio announcement
    audioService.playEnemyGlyphActivatedAlert();
    this.notify();
  }

  /**
   * Refresh glyph cooldown immediately (e.g., when first Tier 1 tower is destroyed).
   * Decision 3: Spoken voice alert: "Enemy Glyph is ready"
   */
  public resetGlyphCooldown(_reason?: string) {
    this.isReady = true;
    this.isActive = false;
    this.activatedClockTime = null;
    this.cooldownEndClockTime = null;
    this.readyAlertPlayed = true;

    // Trigger Decision 3 audio announcement
    audioService.playEnemyGlyphReadyAlert();
    this.notify();
  }

  /**
   * Called when an enemy Tier 1 tower is destroyed.
   * According to Dota 2 mechanics, the first Tier 1 tower destroyed refreshes Glyph.
   */
  public recordT1TowerDestroyed(clockTime: number) {
    this.lastClockTime = Math.floor(clockTime);
    if (!this.firstT1Destroyed) {
      this.firstT1Destroyed = true;
      if (!this.isReady) {
        this.resetGlyphCooldown('first_t1_destroyed');
      } else {
        this.notify();
      }
    }
  }

  /**
   * Decision 1: Parse GSI Events and game clock.
   * Automatically updates cooldown, active state, and detects tower/glyph events.
   */
  public updateFromGSI(payload: GSIPayload | null, clockTime: number) {
    const clock = Math.floor(clockTime);
    this.lastClockTime = clock;

    // Resolve enemy team
    const team = String(payload?.player?.team_name ?? '').toLowerCase();
    if (team.includes('radiant') || team === 'team2') {
      this.enemyTeam = 'dire';
    } else if (team.includes('dire') || team === 'team3') {
      this.enemyTeam = 'radiant';
    }

    // 1. Check Invulnerability Active (7 seconds duration)
    if (this.isActive && this.activatedClockTime !== null) {
      const activeElapsed = clock - this.activatedClockTime;
      if (activeElapsed >= GLYPH_DURATION) {
        this.isActive = false;
      }
    }

    // 2. Check Cooldown Completion (300 seconds)
    if (!this.isReady && this.cooldownEndClockTime !== null) {
      if (clock >= this.cooldownEndClockTime) {
        this.isReady = true;
        this.isActive = false;
        this.activatedClockTime = null;
        this.cooldownEndClockTime = null;
        if (!this.readyAlertPlayed) {
          this.readyAlertPlayed = true;
          audioService.playEnemyGlyphReadyAlert();
        }
      }
    }

    // 3. Process GSI Events
    const rawEvents = payload?.events;
    const eventsList = Array.isArray(rawEvents)
      ? rawEvents
      : rawEvents && typeof rawEvents === 'object'
      ? Object.values(rawEvents)
      : [];

    eventsList.forEach((event) => {
      const eventType = String(event.event_type ?? event.event ?? '').toLowerCase();
      if (!eventType) return;

      const signature = `${eventType}:${event.game_time ?? JSON.stringify(event)}`;
      if (this.processedEvents.has(signature)) return;
      this.processedEvents.add(signature);
      if (this.processedEvents.size > 200) {
        const oldest = this.processedEvents.values().next().value;
        if (oldest) this.processedEvents.delete(oldest);
      }

      // Detect Glyph activation event from GSI
      if (eventType.includes('glyph')) {
        const eventTeam = String(event.team ?? event.team_number ?? '').toLowerCase();
        // Check if event is for the enemy team
        const isEnemyGlyph =
          (this.enemyTeam === 'dire' && (eventTeam.includes('dire') || eventTeam === '3')) ||
          (this.enemyTeam === 'radiant' && (eventTeam.includes('radiant') || eventTeam === '2')) ||
          !eventTeam; // If unspecified, assume enemy in game

        if (isEnemyGlyph) {
          this.recordGlyphActivated(clock);
        }
      }

      // Detect Tier 1 Tower Kill event
      const isTowerKill =
        (eventType.includes('tower') || eventType.includes('building')) &&
        (eventType.includes('kill') || eventType.includes('slain') || eventType.includes('destroy'));

      if (isTowerKill) {
        const target = String(event.target ?? event.building ?? event.name ?? '').toLowerCase();
        const isT1 = target.includes('tower1') || target.includes('tier1') || target.includes('t1');

        if (isT1) {
          // Check if tower belongs to enemy
          const isEnemyTower =
            (this.enemyTeam === 'dire' && (target.includes('badguys') || target.includes('dire'))) ||
            (this.enemyTeam === 'radiant' && (target.includes('goodguys') || target.includes('radiant'))) ||
            (!target.includes('goodguys') && !target.includes('badguys'));

          if (isEnemyTower) {
            this.recordT1TowerDestroyed(clock);
          }
        }
      }
    });

    // 4. Check Buildings data from payload (if provided in GSI)
    if (payload?.buildings && !this.firstT1Destroyed) {
      const buildings = payload.buildings as Record<string, { health?: number }>;
      const enemyPrefix = this.enemyTeam === 'dire' ? 'badguys_tower1' : 'goodguys_tower1';
      const enemyT1Names = [`${enemyPrefix}_top`, `${enemyPrefix}_mid`, `${enemyPrefix}_bot`];

      for (const t1Name of enemyT1Names) {
        if (buildings[t1Name] && buildings[t1Name].health === 0) {
          this.recordT1TowerDestroyed(clock);
          break;
        }
      }
    }

    this.notify();
  }
}

export const enemyGlyphService = new EnemyGlyphService();
