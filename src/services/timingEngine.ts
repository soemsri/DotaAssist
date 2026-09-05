import { TimingEventAlert } from '../types/meta';
import { GSIEvent, GSIPayload } from '../types/gsi';
import { audioService } from './audioService';

export const DOTA_RULESET_VERSION = '7.41e';

const BOUNTY_RUNE_INTERVAL_SECONDS = 240;
const WISDOM_SHRINE_INTERVAL_SECONDS = 420;
const LOTUS_POOL_INTERVAL_SECONDS = 180;
const DAY_NIGHT_INTERVAL_SECONDS = 300;

export interface RoshanTrackState {
  isDead: boolean;
  deathClockTime: number;
}

export interface TormentorTrackState {
  isDead: boolean;
  deathClockTime: number;
}

export class TimingEngine {
  private playedAlerts: Set<string> = new Set();
  private roshanState: RoshanTrackState = { isDead: false, deathClockTime: 0 };
  private tormentorState: TormentorTrackState = { isDead: false, deathClockTime: 0 };
  private lastClockTime: number = 0;
  private lastMatchId: string | null = null;
  private lastRoshanGSIState: string | null = null;
  private lastRoshanAlive: boolean | null = null;
  private processedGSIEvents: Set<string> = new Set();

  public recordRoshanDeath(clockTime: number) {
    const time = Math.max(0, Math.floor(clockTime));
    if (this.roshanState.isDead && Math.abs(this.roshanState.deathClockTime - time) <= 1) {
      return;
    }

    this.roshanState = {
      isDead: true,
      deathClockTime: time,
    };
    this.lastClockTime = time;
    this.clearPlayedAlerts(['audio_aegis_', 'audio_roshan_']);
    audioService.playWarningBeep();
  }

  public resetRoshan() {
    this.roshanState = { isDead: false, deathClockTime: 0 };
  }

  public getRoshanState(): RoshanTrackState {
    return this.roshanState;
  }

  public recordTormentorDeath(clockTime: number) {
    const time = Math.max(0, Math.floor(clockTime));
    if (this.tormentorState.isDead && Math.abs(this.tormentorState.deathClockTime - time) <= 1) {
      return;
    }

    this.tormentorState = {
      isDead: true,
      deathClockTime: time,
    };
    this.clearPlayedAlerts(['audio_tormentor_respawn_']);
    audioService.playWarningBeep();
  }

  public resetTormentor() {
    this.tormentorState = { isDead: false, deathClockTime: 0 };
  }

  public getTormentorState(): TormentorTrackState {
    return this.tormentorState;
  }

  /** Synchronize objective state exposed by Dota 2 GSI. Manual controls remain
   * available when a client or game mode omits these optional fields. */
  public handleGSIPayload(payload: GSIPayload) {
    const map = payload.map;
    const matchId = map?.matchid?.trim() || null;

    if (matchId && this.lastMatchId && matchId !== this.lastMatchId) {
      this.resetAll();
    }
    if (matchId) this.lastMatchId = matchId;

    const clockTime = Number.isFinite(map?.clock_time)
      ? Number(map?.clock_time)
      : this.lastClockTime;
    const roshanGSIState = map?.roshan_state?.toLowerCase() ?? null;

    if (roshanGSIState) {
      const wasDeadState = this.isDeadRoshanGSIState(this.lastRoshanGSIState);
      const isDeadState = this.isDeadRoshanGSIState(roshanGSIState);

      if (isDeadState && (!wasDeadState || !this.roshanState.isDead)) {
        this.recordRoshanDeath(clockTime);
      } else if (roshanGSIState === 'alive' && wasDeadState) {
        this.resetRoshan();
      }
      this.lastRoshanGSIState = roshanGSIState;
    }

    if (typeof payload.roshan?.alive === 'boolean') {
      if (!payload.roshan.alive && (this.lastRoshanAlive !== false || !this.roshanState.isDead)) {
        this.recordRoshanDeath(clockTime);
      } else if (payload.roshan.alive && this.lastRoshanAlive === false) {
        this.resetRoshan();
      }
      this.lastRoshanAlive = payload.roshan.alive;
    }

    this.getGSIEvents(payload.events).forEach((event) => {
      const eventType = String(event.event_type ?? event.event ?? '').toLowerCase();
      if (!eventType) return;

      const signature = `${matchId ?? 'unknown'}:${eventType}:${event.game_time ?? JSON.stringify(event)}`;
      if (this.processedGSIEvents.has(signature)) return;
      this.processedGSIEvents.add(signature);
      if (this.processedGSIEvents.size > 200) {
        const oldest = this.processedGSIEvents.values().next().value;
        if (oldest) this.processedGSIEvents.delete(oldest);
      }

      const isKillEvent = eventType.includes('kill') || eventType.includes('slain') || eventType.includes('destroy');
      if (eventType.includes('roshan') && isKillEvent) {
        this.recordRoshanDeath(clockTime);
      }
      if (eventType.includes('tormentor') && isKillEvent) {
        this.recordTormentorDeath(clockTime);
      }
    });
  }

  public resetAlerts() {
    this.playedAlerts.clear();
  }

  public resetAll() {
    this.playedAlerts.clear();
    this.roshanState = { isDead: false, deathClockTime: 0 };
    this.tormentorState = { isDead: false, deathClockTime: 0 };
    this.lastClockTime = 0;
    this.lastMatchId = null;
    this.lastRoshanGSIState = null;
    this.lastRoshanAlive = null;
    this.processedGSIEvents.clear();
  }

  public calculateAlerts(clockTime: number, isPreGame: boolean): TimingEventAlert[] {
    const roundedSec = Math.floor(clockTime);

    // Detect game restart or match switch (clock jumped backward significantly)
    if (roundedSec < this.lastClockTime - 15 || (isPreGame && this.lastClockTime > 60)) {
      this.resetAll();
    }
    this.lastClockTime = roundedSec;

    if (isPreGame) {
      const preGameSeconds = Math.max(0, -roundedSec);
      if (preGameSeconds <= 15 && preGameSeconds > 0 && !this.playedAlerts.has('pregame_bounty_audio')) {
        audioService.playBountyRuneAlert();
        this.playedAlerts.add('pregame_bounty_audio');
      }

      return [
        {
          id: 'pregame_bounty',
          title: 'Initial Bounty Runes',
          subtitle: 'Spawns at 00:00 on 4 locations',
          targetSeconds: 0,
          secondsRemaining: preGameSeconds,
          type: 'rune_bounty',
          urgent: preGameSeconds <= 15,
        }
      ];
    }

    const currentSec = Math.max(0, roundedSec);
    const alerts: TimingEventAlert[] = [];

    // 1. Bounty Runes (initial spawn at 0:00, then every 4 minutes)
    const nextBountyInterval = this.nextOccurrence(
      currentSec,
      BOUNTY_RUNE_INTERVAL_SECONDS,
      0,
    );
    const bountyDiff = nextBountyInterval - currentSec;
    if (bountyDiff <= 60 && bountyDiff >= 0) {
      alerts.push({
        id: `bounty_${nextBountyInterval}`,
        title: 'Bounty Runes',
        subtitle: `Spawns at ${this.formatTime(nextBountyInterval)}`,
        targetSeconds: nextBountyInterval,
        secondsRemaining: bountyDiff,
        type: 'rune_bounty',
        urgent: bountyDiff <= 15,
      });

      if (bountyDiff <= 15 && bountyDiff > 0 && !this.playedAlerts.has(`audio_bounty_${nextBountyInterval}`)) {
        audioService.playBountyRuneAlert();
        this.playedAlerts.add(`audio_bounty_${nextBountyInterval}`);
      }
    }

    // 2. Power / Water Runes (every 2 min = 120s)
    // Water runes at 2:00 (120s) & 4:00 (240s)
    // Power runes start at 6:00 (360s) every 120s
    let nextPowerSec = 0;
    let isWaterRune = false;
    let powerLabel = 'Power Rune';

    if (currentSec <= 360) {
      nextPowerSec = currentSec <= 120 ? 120 : (currentSec <= 240 ? 240 : 360);
      if (nextPowerSec < 360) {
        isWaterRune = true;
        powerLabel = 'Water Runes';
      }
    } else {
      nextPowerSec = this.nextOccurrence(currentSec, 120, 360);
    }

    const powerDiff = nextPowerSec - currentSec;
    if (powerDiff <= 60 && powerDiff >= 0) {
      alerts.push({
        id: `power_${nextPowerSec}`,
        title: powerLabel,
        subtitle: `Spawns in River at ${this.formatTime(nextPowerSec)}`,
        targetSeconds: nextPowerSec,
        secondsRemaining: powerDiff,
        type: 'rune_power',
        urgent: powerDiff <= 20,
      });

      if (powerDiff <= 20 && powerDiff > 0 && !this.playedAlerts.has(`audio_power_${nextPowerSec}`)) {
        audioService.playPowerRuneAlert(isWaterRune);
        this.playedAlerts.add(`audio_power_${nextPowerSec}`);
      }
    }

    // 3. Wisdom Shrines (first at 7:00, then every 7 minutes)
    const nextWisdomSec = this.nextOccurrence(
      currentSec,
      WISDOM_SHRINE_INTERVAL_SECONDS,
      WISDOM_SHRINE_INTERVAL_SECONDS,
    );
    const wisdomDiff = nextWisdomSec - currentSec;
    if (wisdomDiff <= 90 && wisdomDiff >= 0) {
      alerts.push({
        id: `wisdom_${nextWisdomSec}`,
        title: 'Wisdom Shrine',
        subtitle: `XP becomes available at ${this.formatTime(nextWisdomSec)}`,
        targetSeconds: nextWisdomSec,
        secondsRemaining: wisdomDiff,
        type: 'rune_wisdom',
        urgent: wisdomDiff <= 30,
      });

      if (wisdomDiff <= 30 && wisdomDiff > 0 && !this.playedAlerts.has(`audio_wisdom_${nextWisdomSec}`)) {
        audioService.playWisdomShrineAlert();
        this.playedAlerts.add(`audio_wisdom_${nextWisdomSec}`);
      }
    }

    // 4. Tormentor (spawns at 20:00 = 1200s, respawns 10m = 600s after kill)
    if (this.tormentorState.isDead) {
      const tormentorRespawnSec = this.tormentorState.deathClockTime + 600;
      const tormentorDiff = tormentorRespawnSec - currentSec;

      if (tormentorDiff > 0) {
        alerts.push({
          id: `tormentor_respawn_${tormentorRespawnSec}`,
          title: 'Tormentor Respawn',
          subtitle: `Respawns at ${this.formatTime(tormentorRespawnSec)}`,
          targetSeconds: tormentorRespawnSec,
          secondsRemaining: tormentorDiff,
          type: 'tormentor',
          urgent: tormentorDiff <= 30,
        });

        if (tormentorDiff <= 30 && !this.playedAlerts.has(`audio_tormentor_respawn_${tormentorRespawnSec}`)) {
          audioService.playTormentorAlert();
          this.playedAlerts.add(`audio_tormentor_respawn_${tormentorRespawnSec}`);
        }
      } else {
        this.resetTormentor();
        alerts.push({
          id: `tormentor_ready_${tormentorRespawnSec}`,
          title: 'Tormentor Respawned',
          subtitle: 'Tormentor is available again',
          targetSeconds: tormentorRespawnSec,
          secondsRemaining: 0,
          type: 'tormentor',
          urgent: true,
        });
      }
    } else if (currentSec <= 1200) {
      const tormentorDiff = 1200 - currentSec;
      if (tormentorDiff <= 120 && tormentorDiff >= 0) {
        alerts.push({
          id: 'tormentor_initial',
          title: 'Tormentor Spawn',
          subtitle: `Aghanim Shard Boss spawns at 20:00`,
          targetSeconds: 1200,
          secondsRemaining: tormentorDiff,
          type: 'tormentor',
          urgent: tormentorDiff <= 30,
        });

        if (tormentorDiff <= 30 && tormentorDiff > 0 && !this.playedAlerts.has('audio_tormentor_initial')) {
          audioService.playTormentorAlert();
          this.playedAlerts.add('audio_tormentor_initial');
        }
      }
    }

    // 5. Lotus Pool (every 3 min = 180s: 3:00, 6:00, 9:00...)
    const nextLotusSec = this.nextOccurrence(
      currentSec,
      LOTUS_POOL_INTERVAL_SECONDS,
      LOTUS_POOL_INTERVAL_SECONDS,
    );
    const lotusDiff = nextLotusSec - currentSec;
    if (lotusDiff <= 40 && lotusDiff >= 0) {
      alerts.push({
        id: `lotus_${nextLotusSec}`,
        title: 'Lotus Pool Fruits',
        subtitle: `Harvest at sides at ${this.formatTime(nextLotusSec)}`,
        targetSeconds: nextLotusSec,
        secondsRemaining: lotusDiff,
        type: 'lotus',
        urgent: lotusDiff <= 15,
      });
    }

    // 6. Day/Night Cycle (every 5 min = 300s: 5:00, 10:00, 15:00, 20:00...)
    const nextCycleSec = this.nextOccurrence(
      currentSec,
      DAY_NIGHT_INTERVAL_SECONDS,
      DAY_NIGHT_INTERVAL_SECONDS,
    );
    const cycleDiff = nextCycleSec - currentSec;
    const isNightfall = Math.floor(nextCycleSec / DAY_NIGHT_INTERVAL_SECONDS) % 2 === 1;
    if (cycleDiff <= 30 && cycleDiff >= 0) {
      alerts.push({
        id: `cycle_${nextCycleSec}`,
        title: isNightfall ? 'Nightfall Coming' : 'Daylight Approaching',
        subtitle: isNightfall ? 'Night vision and map conditions change' : 'Day vision and map conditions return',
        targetSeconds: nextCycleSec,
        secondsRemaining: cycleDiff,
        type: 'day_night',
        urgent: cycleDiff <= 15,
      });

      if (cycleDiff <= 15 && cycleDiff > 0 && !this.playedAlerts.has(`audio_cycle_${nextCycleSec}`)) {
        audioService.playDayNightAlert(isNightfall);
        this.playedAlerts.add(`audio_cycle_${nextCycleSec}`);
      }
    }

    // 7. Roshan & Aegis Tracking (if recorded dead)
    if (this.roshanState.isDead) {
      const aegisExpiresSec = this.roshanState.deathClockTime + 300; // 5 min
      const earliestRespawnSec = this.roshanState.deathClockTime + 480; // 8 min
      const latestRespawnSec = this.roshanState.deathClockTime + 660; // 11 min

      if (currentSec < aegisExpiresSec) {
        const aegisDiff = aegisExpiresSec - currentSec;
        alerts.push({
          id: 'roshan_aegis',
          title: 'Aegis Active',
          subtitle: `Expires at ${this.formatTime(aegisExpiresSec)}`,
          targetSeconds: aegisExpiresSec,
          secondsRemaining: aegisDiff,
          type: 'roshan',
          urgent: aegisDiff <= 30,
        });

        if (aegisDiff <= 30 && aegisDiff > 0 && !this.playedAlerts.has('audio_aegis_expiring')) {
          audioService.playAegisExpiringAlert();
          this.playedAlerts.add('audio_aegis_expiring');
        }
      } else if (currentSec < earliestRespawnSec) {
        const respawnWaitDiff = earliestRespawnSec - currentSec;
        alerts.push({
          id: 'roshan_window_wait',
          title: 'Roshan Dead',
          subtitle: `Earliest respawn at ${this.formatTime(earliestRespawnSec)}`,
          targetSeconds: earliestRespawnSec,
          secondsRemaining: respawnWaitDiff,
          type: 'roshan',
          urgent: respawnWaitDiff <= 30,
        });
      } else if (currentSec < latestRespawnSec) {
        const latestDiff = latestRespawnSec - currentSec;
        alerts.push({
          id: 'roshan_window_active',
          title: 'Roshan Respawn Window ACTIVE',
          subtitle: `Could spawn any moment! Latest: ${this.formatTime(latestRespawnSec)}`,
          targetSeconds: latestRespawnSec,
          secondsRemaining: latestDiff,
          type: 'roshan',
          urgent: true,
        });

        if (!this.playedAlerts.has('audio_roshan_window_opened')) {
          audioService.playRoshanAlert('Roshan respawn window is open');
          this.playedAlerts.add('audio_roshan_window_opened');
        }
      } else {
        // Exceeded 11 minutes -> Roshan is guaranteed alive
        alerts.push({
          id: 'roshan_alive',
          title: 'Roshan GUARANTEED Alive',
          subtitle: 'Roshan is in pit',
          targetSeconds: currentSec,
          secondsRemaining: 0,
          type: 'roshan',
          urgent: true,
        });

        if (!this.playedAlerts.has('audio_roshan_guaranteed_alive')) {
          audioService.playRoshanAlert('Roshan is guaranteed alive');
          this.playedAlerts.add('audio_roshan_guaranteed_alive');
        }
      }
    }

    return alerts.sort((a, b) => a.secondsRemaining - b.secondsRemaining);
  }

  public formatTime(totalSeconds: number): string {
    const absSec = Math.abs(Math.floor(totalSeconds));
    const mins = Math.floor(absSec / 60);
    const secs = absSec % 60;
    const sign = totalSeconds < 0 ? '-' : '';
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private clearPlayedAlerts(prefixes: string[]) {
    for (const alertId of this.playedAlerts) {
      if (prefixes.some((prefix) => alertId.startsWith(prefix))) {
        this.playedAlerts.delete(alertId);
      }
    }
  }

  private nextOccurrence(currentSec: number, interval: number, firstOccurrence: number): number {
    if (currentSec <= firstOccurrence) return firstOccurrence;
    return firstOccurrence + Math.ceil((currentSec - firstOccurrence) / interval) * interval;
  }

  private isDeadRoshanGSIState(state: string | null): boolean {
    return state === 'respawn_base' || state === 'respawn_variable';
  }

  private getGSIEvents(events: GSIPayload['events']): GSIEvent[] {
    if (Array.isArray(events)) return events;
    if (events && typeof events === 'object') return Object.values(events);
    return [];
  }
}

export const timingEngine = new TimingEngine();
