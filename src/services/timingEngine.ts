import { TimingEventAlert } from '../types/meta';
import { audioService } from './audioService';

export interface RoshanTrackState {
  isDead: boolean;
  deathClockTime: number;
}

export class TimingEngine {
  private playedAlerts: Set<string> = new Set();
  private roshanState: RoshanTrackState = { isDead: false, deathClockTime: 0 };
  private lastClockTime: number = 0;

  public recordRoshanDeath(clockTime: number) {
    const time = Math.floor(clockTime);
    this.roshanState = {
      isDead: true,
      deathClockTime: time,
    };
    this.lastClockTime = time;
    audioService.playWarningBeep();
  }

  public resetRoshan() {
    this.roshanState = { isDead: false, deathClockTime: 0 };
  }

  public getRoshanState(): RoshanTrackState {
    return this.roshanState;
  }

  public resetAlerts() {
    this.playedAlerts.clear();
  }

  public resetAll() {
    this.playedAlerts.clear();
    this.roshanState = { isDead: false, deathClockTime: 0 };
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

    // 1. Bounty Runes (every 3 min = 180s: 3:00, 6:00, 9:00...)
    const nextBountyInterval = (Math.floor(currentSec / 180) + 1) * 180;
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

    if (currentSec < 360) {
      nextPowerSec = currentSec < 120 ? 120 : (currentSec < 240 ? 240 : 360);
      if (nextPowerSec < 360) {
        isWaterRune = true;
        powerLabel = 'Water Runes';
      }
    } else {
      nextPowerSec = (Math.floor(currentSec / 120) + 1) * 120;
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

    // 3. Wisdom Runes (every 7 min = 420s: 7:00, 14:00, 21:00, 28:00...)
    const nextWisdomSec = (Math.floor(currentSec / 420) + 1) * 420;
    const wisdomDiff = nextWisdomSec - currentSec;
    if (wisdomDiff <= 90 && wisdomDiff >= 0) {
      alerts.push({
        id: `wisdom_${nextWisdomSec}`,
        title: 'Wisdom Rune',
        subtitle: `XP Rune at ${this.formatTime(nextWisdomSec)} (Offlane)`,
        targetSeconds: nextWisdomSec,
        secondsRemaining: wisdomDiff,
        type: 'rune_wisdom',
        urgent: wisdomDiff <= 30,
      });

      if (wisdomDiff <= 30 && wisdomDiff > 0 && !this.playedAlerts.has(`audio_wisdom_${nextWisdomSec}`)) {
        audioService.playWisdomRuneAlert();
        this.playedAlerts.add(`audio_wisdom_${nextWisdomSec}`);
      }
    }

    // 4. Tormentor (spawns at 20:00 = 1200s, respawns 10m = 600s after kill)
    if (currentSec < 1200) {
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
    const nextLotusSec = (Math.floor(currentSec / 180) + 1) * 180;
    const lotusDiff = nextLotusSec - currentSec;
    if (lotusDiff <= 40 && lotusDiff > 0) {
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
    const nextCycleSec = (Math.floor(currentSec / 300) + 1) * 300;
    const cycleDiff = nextCycleSec - currentSec;
    const isDayNow = Math.floor(currentSec / 300) % 2 === 0;
    if (cycleDiff <= 30 && cycleDiff >= 0) {
      alerts.push({
        id: `cycle_${nextCycleSec}`,
        title: isDayNow ? 'Nightfall Coming' : 'Daylight Approaching',
        subtitle: isDayNow ? 'Roshan moves to Dire Pit (Top)' : 'Roshan moves to Radiant Pit (Bottom)',
        targetSeconds: nextCycleSec,
        secondsRemaining: cycleDiff,
        type: 'day_night',
        urgent: cycleDiff <= 15,
      });

      if (cycleDiff <= 15 && cycleDiff > 0 && !this.playedAlerts.has(`audio_cycle_${nextCycleSec}`)) {
        audioService.playDayNightAlert(isDayNow);
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
}

export const timingEngine = new TimingEngine();
