import { TimingEventAlert, PopularItem } from '../types/meta';
import { GSIEvent, GSIPayload } from '../types/gsi';
import { audioService, ReminderContext } from './audioService';
import { buybackService } from './buybackService';
import { neutralItemService } from './neutralItemService';
import { campStackService } from './campStackService';
import { enemyUltimateService } from './enemyUltimateService';
import { laningBenchmarkService } from './laningBenchmarkService';
import { enemyGlyphService } from './enemyGlyphService';

import { TIMING_RULES as RULES, NEUTRAL_TIER_TIMINGS } from '../data/timingRules';
import { alertProfiles, Objective } from './alertProfiles';
export const DOTA_RULESET_VERSION = RULES.patch;

export const BOUNTY_RUNE_MAX_TIME_SECONDS = 1800; // 30:00 - disable bounty rune alerts from minute 30 onwards

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
  private lastPayload: GSIPayload | null = null;

  public recordRoshanDeath(clockTime: number) {
    const time = Math.max(0, Math.floor(clockTime));
    if (this.roshanState.isDead && Math.abs(this.roshanState.deathClockTime - time) <= 1) {
      return;
    }

    audioService.clearReminders('roshan');
    this.roshanState = {
      isDead: true,
      deathClockTime: time,
    };
    this.lastClockTime = time;
    this.clearPlayedAlerts(['audio_aegis_', 'audio_roshan_']);
    this.play('roshan', () => audioService.playWarningBeep());
  }

  public resetRoshan() {
    audioService.clearReminders('roshan');
    this.roshanState = { isDead: false, deathClockTime: 0 };
  }

  public getRoshanState(): RoshanTrackState {
    return this.roshanState;
  }

  public getLastClockTime(): number {
    return this.lastClockTime;
  }

  public getLastPayload(): GSIPayload | null {
    return this.lastPayload;
  }

  public recordTormentorDeath(clockTime: number) {
    const time = Math.max(0, Math.floor(clockTime));
    if (this.tormentorState.isDead && Math.abs(this.tormentorState.deathClockTime - time) <= 1) {
      return;
    }

    audioService.clearReminders('tormentor');
    this.tormentorState = {
      isDead: true,
      deathClockTime: time,
    };
    this.clearPlayedAlerts(['audio_tormentor_respawn_']);
    this.play('tormentor', () => audioService.playWarningBeep());
  }

  public resetTormentor() {
    audioService.clearReminders('tormentor');
    this.tormentorState = { isDead: false, deathClockTime: 0 };
  }

  public getTormentorState(): TormentorTrackState {
    return this.tormentorState;
  }

  /** Synchronize objective state exposed by Dota 2 GSI. Manual controls remain
   * available when a client or game mode omits these optional fields. */
  public handleGSIPayload(payload: GSIPayload) {
    this.lastPayload = payload;
    const map = payload.map;
    const matchId = map?.matchid?.trim() || null;

    if (matchId && this.lastMatchId && matchId !== this.lastMatchId) {
      this.resetAll();
    }
    if (matchId) this.lastMatchId = matchId;

    const clockTime = Number.isFinite(map?.clock_time)
      ? Number(map?.clock_time)
      : this.lastClockTime;
    if (Number.isFinite(map?.clock_time)) audioService.updateGameClock(clockTime);
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

    enemyUltimateService.updateFromGSI(payload.draft, payload.player?.team_name, clockTime);
    laningBenchmarkService.updateFromGSI(payload, clockTime);
    enemyGlyphService.updateFromGSI(payload, clockTime);
  }

  public resetAlerts() {
    this.playedAlerts.clear();
  }

  public resetAll() {
    audioService.clearReminders();
    this.playedAlerts.clear();
    this.roshanState = { isDead: false, deathClockTime: 0 };
    this.tormentorState = { isDead: false, deathClockTime: 0 };
    this.lastClockTime = 0;
    this.lastMatchId = null;
    this.lastRoshanGSIState = null;
    this.lastRoshanAlive = null;
    this.processedGSIEvents.clear();
    buybackService.resetAlerts();
    neutralItemService.resetAlerts();
    enemyUltimateService.resetAll();
    laningBenchmarkService.resetAll();
    enemyGlyphService.resetAll();
  }

  public checkItemAdvice(clockTime: number, heroName: string, items: PopularItem[]) {
    if (!heroName || items.length === 0) return;
    const currentSec = Math.floor(clockTime);

    // 1. Early game items (30s - 90s)
    if (currentSec >= 30 && currentSec <= 90 && !this.playedAlerts.has('audio_item_early')) {
      const earlyItems = items.filter((i) => i.tier === 'early');
      if (earlyItems.length > 0) {
        audioService.playItemAdvice(heroName, 'early', earlyItems);
        this.playedAlerts.add('audio_item_early');
      }
    }

    // 2. Mid game core items (12:00 -> 720s - 760s)
    if (currentSec >= 720 && currentSec <= 760 && !this.playedAlerts.has('audio_item_core')) {
      const coreItems = items.filter((i) => i.tier === 'core');
      if (coreItems.length > 0) {
        audioService.playItemAdvice(heroName, 'core', coreItems);
        this.playedAlerts.add('audio_item_core');
      }
    }

    // 3. Late game luxury items (25:00 -> 1500s - 1540s)
    if (currentSec >= 1500 && currentSec <= 1540 && !this.playedAlerts.has('audio_item_luxury')) {
      const luxuryItems = items.filter((i) => i.tier === 'luxury');
      if (luxuryItems.length > 0) {
        audioService.playItemAdvice(heroName, 'luxury', luxuryItems);
        this.playedAlerts.add('audio_item_luxury');
      }
    }
  }

  public calculateAlerts(clockTime: number, isPreGame: boolean): TimingEventAlert[] {
    const roundedSec = Math.floor(clockTime);
    const previousClockTime = this.lastClockTime;

    // Detect game restart or match switch (clock jumped backward significantly)
    if (roundedSec < this.lastClockTime - 15 || (isPreGame && this.lastClockTime > 60)) {
      this.resetAll();
    }
    this.lastClockTime = roundedSec;
    audioService.updateGameClock(clockTime);

    if (!isPreGame) {
      laningBenchmarkService.updateFromGSI(this.lastPayload, clockTime);
      enemyGlyphService.updateFromGSI(this.lastPayload, clockTime);
    }

    if (isPreGame) {
      const preGameSeconds = Math.max(0, -roundedSec);
      if (preGameSeconds <= 15 && preGameSeconds > 0 && !this.playedAlerts.has('pregame_bounty_audio')) {
        this.play('rune_bounty', () => audioService.playBountyRuneAlert(), { id: 'pregame_bounty', target: 0, label: 'Bounty runes' });
        this.playedAlerts.add('pregame_bounty_audio');
      }

      return alertProfiles.enabled('rune_bounty') ? [
        {
          id: 'pregame_bounty',
          title: 'Initial Bounty Runes',
          subtitle: 'Spawns at 00:00 on 4 locations',
          targetSeconds: 0,
          secondsRemaining: preGameSeconds,
          type: 'rune_bounty',
          urgent: preGameSeconds <= 15,
        }
      ] : [];
    }

    const currentSec = Math.max(0, roundedSec);
    const alerts: TimingEventAlert[] = [];

    // 1. Bounty Runes (initial spawn at 0:00, then every 4 minutes until 30:00)
    if (currentSec < BOUNTY_RUNE_MAX_TIME_SECONDS) {
      const nextBountyInterval = this.nextOccurrence(
        currentSec,
        RULES.bountyInterval,
        0,
      );
      if (nextBountyInterval <= BOUNTY_RUNE_MAX_TIME_SECONDS) {
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
            this.play('rune_bounty', () => audioService.playBountyRuneAlert(), { id: `bounty_${nextBountyInterval}`, target: nextBountyInterval, label: 'Bounty runes' });
            this.playedAlerts.add(`audio_bounty_${nextBountyInterval}`);
          }
        }
      }
    }

    // 2. Power / Water Runes (every 2 min = 120s)
    // Water runes at 2:00 (120s) & 4:00 (240s)
    // Power runes start at 6:00 (360s) every 120s
    let nextPowerSec = 0;
    let isWaterRune = false;
    let powerLabel = 'Power Rune';

    if (currentSec <= RULES.powerFirst) {
      nextPowerSec = currentSec <= RULES.riverInterval ? RULES.riverInterval : (currentSec <= RULES.riverInterval * 2 ? RULES.riverInterval * 2 : RULES.powerFirst);
      if (nextPowerSec < RULES.powerFirst) {
        isWaterRune = true;
        powerLabel = 'Water Runes';
      }
    } else {
      nextPowerSec = this.nextOccurrence(currentSec, RULES.riverInterval, RULES.powerFirst);
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
        this.play('rune_power', () => audioService.playPowerRuneAlert(isWaterRune), { id: `power_${nextPowerSec}`, target: nextPowerSec, label: powerLabel });
        this.playedAlerts.add(`audio_power_${nextPowerSec}`);
      }
    }

    // 2b. Gank Alert: Minute 6:00 (Crucial First Night + River Power Rune)
    if (currentSec >= 345 && currentSec <= 360) {
      const gankDiff = 360 - currentSec;
      alerts.push({
        id: 'gank_window_min6',
        title: 'Gank Alert (Min 6)',
        subtitle: 'First Night & River Rune gank spike in side lanes',
        targetSeconds: 360,
        secondsRemaining: gankDiff,
        type: 'danger',
        urgent: true,
      });

      if (!this.playedAlerts.has('audio_gank_min6')) {
        audioService.playGankWindowAlert();
        this.playedAlerts.add('audio_gank_min6');
      }
    }

    // 3. Wisdom Shrines (first at 7:00, then every 7 minutes)
    const nextWisdomSec = this.nextOccurrence(
      currentSec,
      RULES.wisdomInterval,
      RULES.wisdomInterval,
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
        this.play('rune_wisdom', () => audioService.playWisdomShrineAlert(), { id: `wisdom_${nextWisdomSec}`, target: nextWisdomSec, label: 'Wisdom shrine' });
        this.playedAlerts.add(`audio_wisdom_${nextWisdomSec}`);
        if (nextWisdomSec >= 1800) {
          buybackService.checkObjectiveLinkedAlert('Wisdom shrine', this.lastPayload);
        }
      }
    }

    // 4. Tormentor (spawns at 20:00 = 1200s, respawns 10m = 600s after kill)
    if (this.tormentorState.isDead) {
      const tormentorRespawnSec = this.tormentorState.deathClockTime + RULES.tormentorRespawn;
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
          this.play('tormentor', () => audioService.playTormentorAlert(), { id: `tormentor_${tormentorRespawnSec}`, target: tormentorRespawnSec, label: 'Tormentor ready' });
          this.playedAlerts.add(`audio_tormentor_respawn_${tormentorRespawnSec}`);
          if (tormentorRespawnSec >= 1800) {
            buybackService.checkObjectiveLinkedAlert('Tormentor', this.lastPayload);
          }
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
    } else if (currentSec <= RULES.tormentorFirst) {
      const tormentorDiff = RULES.tormentorFirst - currentSec;
      if (tormentorDiff <= 120 && tormentorDiff >= 0) {
        alerts.push({
          id: 'tormentor_initial',
          title: 'Tormentor Spawn',
          subtitle: `Aghanim Shard Boss spawns at ${this.formatTime(RULES.tormentorFirst)}`,
          targetSeconds: RULES.tormentorFirst,
          secondsRemaining: tormentorDiff,
          type: 'tormentor',
          urgent: tormentorDiff <= 30,
        });

        if (tormentorDiff <= 30 && tormentorDiff > 0 && !this.playedAlerts.has('audio_tormentor_initial')) {
          this.play('tormentor', () => audioService.playTormentorAlert(), { id: 'tormentor_initial', target: RULES.tormentorFirst, label: 'Tormentor ready' });
          this.playedAlerts.add('audio_tormentor_initial');
        }
      }
    }

    // 5. Lotus Pool (every 3 min = 180s: 3:00, 6:00, 9:00...)
    const nextLotusSec = this.nextOccurrence(
      currentSec,
      RULES.lotusInterval,
      RULES.lotusInterval,
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
      RULES.dayNightInterval,
      RULES.dayNightInterval,
    );
    const cycleDiff = nextCycleSec - currentSec;
    const isNightfall = Math.floor(nextCycleSec / RULES.dayNightInterval) % 2 === 1;
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
        this.play('day_night', () => audioService.playDayNightAlert(isNightfall), { id: `cycle_${nextCycleSec}`, target: nextCycleSec, label: isNightfall ? 'Nightfall' : 'Daybreak' });
        this.playedAlerts.add(`audio_cycle_${nextCycleSec}`);
      }
    }

    // 7. Roshan & Aegis Tracking (if recorded dead)
    if (this.roshanState.isDead) {
      const aegisExpiresSec = this.roshanState.deathClockTime + RULES.aegisDuration; // 5 min
      const earliestRespawnSec = this.roshanState.deathClockTime + RULES.roshanEarliest; // 8 min
      const latestRespawnSec = this.roshanState.deathClockTime + RULES.roshanLatest; // 11 min

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
          this.play('roshan', () => audioService.playAegisExpiringAlert(), { id: 'aegis_expiring', target: aegisExpiresSec, label: 'Aegis expires' });
          this.playedAlerts.add('audio_aegis_expiring');
          if (currentSec >= 1800) {
            buybackService.checkObjectiveLinkedAlert('Aegis expiring', this.lastPayload);
          }
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
          this.play('roshan', () => audioService.playRoshanAlert('Roshan respawn window is open'), { id: 'roshan_window', target: currentSec, expiresAt: Math.min(latestRespawnSec, currentSec + 30) });
          this.playedAlerts.add('audio_roshan_window_opened');
          if (currentSec >= 1800) {
            buybackService.checkObjectiveLinkedAlert('Roshan window', this.lastPayload);
          }
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
          this.play('roshan', () => audioService.playRoshanAlert('Roshan is guaranteed alive'), { id: 'roshan_alive', target: currentSec, expiresAt: currentSec + 30 });
          this.playedAlerts.add('audio_roshan_guaranteed_alive');
        }
      }
    }

    // 8. Neutral Items (Tier 1-5 unlock timing cards & audio)
    for (const tierEntry of NEUTRAL_TIER_TIMINGS) {
      const tierDiff = tierEntry.time - currentSec;
      if (tierDiff <= 60 && tierDiff >= 0) {
        alerts.push({
          id: `neutral_tier_${tierEntry.tier}`,
          title: `Neutral Items ${tierEntry.label}`,
          subtitle: `Unlocks at ${this.formatTime(tierEntry.time)}`,
          targetSeconds: tierEntry.time,
          secondsRemaining: tierDiff,
          type: 'neutral_item',
          urgent: tierDiff <= 20,
        });

      }

      // Announce the unlock itself (rather than an early voice prompt). Allow a
      // two-second GSI sampling window so a dropped clock tick does not lose the
      // alert, while avoiding announcements for old tiers on a late connection.
      const justUnlocked = previousClockTime < tierEntry.time
        && currentSec >= tierEntry.time
        && currentSec <= tierEntry.time + 2;
      if (justUnlocked && !this.playedAlerts.has(`audio_neutral_tier_${tierEntry.tier}`)) {
        this.play('neutral_item', () => audioService.playNeutralTierAlert(tierEntry.tier), {
          id: `neutral_tier_${tierEntry.tier}`,
          target: tierEntry.time,
          label: `Neutral items ${tierEntry.label}`,
        });
        this.playedAlerts.add(`audio_neutral_tier_${tierEntry.tier}`);
      }
    }

    // Check missing or outdated neutral item reminder (Decisions 1 & 2: 90s grace period, 120s repeat, max 2)
    neutralItemService.checkMissingOrOutdatedReminder(this.lastPayload, currentSec);

    // 9. Camp Stacking (:33-:55 card, :43 voice, yielding to major objectives)
    const stackAlert = campStackService.calculateStackAlert(currentSec);
    if (stackAlert) {
      alerts.push(stackAlert);
    }

    const minuteStart = Math.floor(currentSec / 60) * 60;
    const targetVoiceSec = minuteStart + 43;
    if (
      !this.playedAlerts.has(`audio_camp_stack_${targetVoiceSec}`) &&
      campStackService.shouldPlayVoice(currentSec, previousClockTime, alerts)
    ) {
      this.play('camp_stack', () => audioService.playCampStackAlert(), {
        id: `camp_stack_${minuteStart + 53}`,
        target: minuteStart + 53,
        label: 'Stack camp',
      });
      this.playedAlerts.add(`audio_camp_stack_${targetVoiceSec}`);
    } else if (
      !this.playedAlerts.has(`audio_camp_stack_${targetVoiceSec}`) &&
      previousClockTime < targetVoiceSec &&
      currentSec >= targetVoiceSec
    ) {
      // Voice yielded to a major objective; mark as handled for this minute
      this.playedAlerts.add(`audio_camp_stack_${targetVoiceSec}`);
    }

    // 10. Enemy Ultimates
    enemyUltimateService.updateFromGSI(this.lastPayload?.draft, this.lastPayload?.player?.team_name, currentSec);
    const ultSnapshot = enemyUltimateService.getSnapshot();
    ultSnapshot.slots.forEach((s) => {
      if (s.heroClass && s.state === 'cooldown' && s.remainingSeconds <= 30 && s.remainingSeconds > 0) {
        alerts.push({
          id: `enemy_ult_${s.slot}`,
          title: `${s.heroName} Ult CD`,
          subtitle: `${s.abilityName} ready in ${s.remainingSeconds}s`,
          targetSeconds: s.cooldownEndClock,
          secondsRemaining: s.remainingSeconds,
          type: 'enemy_ultimate',
          urgent: s.remainingSeconds <= 15,
        });
      }
    });

    // 11. Enemy Glyph Ready Alert (when cooldown remaining <= 30s)
    const glyphSnap = enemyGlyphService.getSnapshot();
    if (!glyphSnap.isReady && glyphSnap.cooldownRemainingSeconds <= 30 && glyphSnap.cooldownRemainingSeconds > 0 && glyphSnap.cooldownEndClockTime !== null) {
      alerts.push({
        id: 'enemy_glyph_ready',
        title: 'Enemy Glyph Ready',
        subtitle: `Glyph off cooldown in ${glyphSnap.cooldownRemainingSeconds}s`,
        targetSeconds: glyphSnap.cooldownEndClockTime,
        secondsRemaining: glyphSnap.cooldownRemainingSeconds,
        type: 'enemy_glyph',
        urgent: glyphSnap.cooldownRemainingSeconds <= 15,
      });
    }

    return alerts.filter(alert => alertProfiles.enabled(alert.type)).sort((a, b) => a.secondsRemaining - b.secondsRemaining);
  }

  private play(objective: Objective, action: () => void, reminder?: Omit<ReminderContext, 'objective'>) {
    if (!alertProfiles.enabled(objective)) return;
    if (reminder) audioService.withReminder({ ...reminder, objective }, action);
    else action();
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
