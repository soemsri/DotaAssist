import { TimingEventAlert } from '../types/meta';
import { audioService } from './audioService';

export interface RoshanTrackState {
  isDead: boolean;
  deathClockTime: number;
}

export class TimingEngine {
  private playedAlerts: Set<string> = new Set();
  private roshanState: RoshanTrackState = { isDead: false, deathClockTime: 0 };

  public recordRoshanDeath(clockTime: number) {
    this.roshanState = {
      isDead: true,
      deathClockTime: clockTime,
    };
  }

  public resetRoshan() {
    this.roshanState = { isDead: false, deathClockTime: 0 };
  }

  public getRoshanState(): RoshanTrackState {
    return this.roshanState;
  }

  public calculateAlerts(clockTime: number, isPreGame: boolean): TimingEventAlert[] {
    if (isPreGame) {
      const preGameSeconds = Math.max(0, -clockTime);
      return [
        {
          id: 'pregame_bounty',
          title: 'Initial Bounty Runes',
          subtitle: 'Spawn at 00:00 on 4 locations',
          targetSeconds: 0,
          secondsRemaining: preGameSeconds,
          type: 'rune_bounty',
          urgent: preGameSeconds <= 15,
        }
      ];
    }

    const currentSec = Math.max(0, clockTime);
    const alerts: TimingEventAlert[] = [];

    // 1. Bounty Runes (every 3 min: 180s)
    const nextBountyInterval = (Math.floor(currentSec / 180) + 1) * 180;
    const bountyDiff = nextBountyInterval - currentSec;
    if (bountyDiff <= 60) {
      alerts.push({
        id: `bounty_${nextBountyInterval}`,
        title: 'Bounty Runes',
        subtitle: `Spawns at ${this.formatTime(nextBountyInterval)}`,
        targetSeconds: nextBountyInterval,
        secondsRemaining: bountyDiff,
        type: 'rune_bounty',
        urgent: bountyDiff <= 20,
      });
      if (bountyDiff === 20 && !this.playedAlerts.has(`audio_bounty_${nextBountyInterval}`)) {
        audioService.playBountyRuneAlert();
        this.playedAlerts.add(`audio_bounty_${nextBountyInterval}`);
      }
    }

    // 2. Power / Water Runes
    // Water runes at 2:00 (120s) and 4:00 (240s)
    // Power runes start at 6:00 (360s) every 120s
    let nextPowerSec = 0;
    let powerLabel = 'Power Rune';
    if (currentSec < 360) {
      nextPowerSec = currentSec < 120 ? 120 : (currentSec < 240 ? 240 : 360);
      if (nextPowerSec < 360) {
        powerLabel = 'Water Runes';
      }
    } else {
      nextPowerSec = (Math.floor(currentSec / 120) + 1) * 120;
    }
    const powerDiff = nextPowerSec - currentSec;
    if (powerDiff <= 60) {
      alerts.push({
        id: `power_${nextPowerSec}`,
        title: powerLabel,
        subtitle: `Spawns in River at ${this.formatTime(nextPowerSec)}`,
        targetSeconds: nextPowerSec,
        secondsRemaining: powerDiff,
        type: 'rune_power',
        urgent: powerDiff <= 20,
      });
      if (powerDiff === 20 && !this.playedAlerts.has(`audio_power_${nextPowerSec}`)) {
        audioService.playPowerRuneAlert();
        this.playedAlerts.add(`audio_power_${nextPowerSec}`);
      }
    }

    // 3. Wisdom Runes (every 7 min: 420s => 7:00, 14:00, 21:00, 28:00, 35:00...)
    const nextWisdomSec = (Math.floor(currentSec / 420) + 1) * 420;
    const wisdomDiff = nextWisdomSec - currentSec;
    if (wisdomDiff <= 90) {
      alerts.push({
        id: `wisdom_${nextWisdomSec}`,
        title: 'Wisdom Rune',
        subtitle: `XP Rune ready at ${this.formatTime(nextWisdomSec)} (Offlane base edge)`,
        targetSeconds: nextWisdomSec,
        secondsRemaining: wisdomDiff,
        type: 'rune_wisdom',
        urgent: wisdomDiff <= 30,
      });
      if (wisdomDiff === 30 && !this.playedAlerts.has(`audio_wisdom_${nextWisdomSec}`)) {
        audioService.playWisdomRuneAlert();
        this.playedAlerts.add(`audio_wisdom_${nextWisdomSec}`);
      }
    }

    // 4. Tormentor (spawns at 20:00 = 1200s, respawns 10m = 600s after kill)
    if (currentSec < 1200) {
      const tormentorDiff = 1200 - currentSec;
      if (tormentorDiff <= 120) {
        alerts.push({
          id: 'tormentor_initial',
          title: 'Tormentor Initial Spawn',
          subtitle: `Aghanim Shard Boss spawns at 20:00`,
          targetSeconds: 1200,
          secondsRemaining: tormentorDiff,
          type: 'tormentor',
          urgent: tormentorDiff <= 30,
        });
        if (tormentorDiff === 30 && !this.playedAlerts.has('audio_tormentor_initial')) {
          audioService.playTormentorAlert();
          this.playedAlerts.add('audio_tormentor_initial');
        }
      }
    }

    // 5. Lotus Pool (every 3 min: 180s)
    const nextLotusSec = (Math.floor(currentSec / 180) + 1) * 180;
    const lotusDiff = nextLotusSec - currentSec;
    if (lotusDiff <= 40 && lotusDiff > 0) {
      alerts.push({
        id: `lotus_${nextLotusSec}`,
        title: 'Lotus Fruit Spawning',
        subtitle: `Sides lanes harvest fruit at ${this.formatTime(nextLotusSec)}`,
        targetSeconds: nextLotusSec,
        secondsRemaining: lotusDiff,
        type: 'lotus',
        urgent: lotusDiff <= 15,
      });
    }

    // 6. Day/Night Cycle (every 5 min = 300s)
    const nextCycleSec = (Math.floor(currentSec / 300) + 1) * 300;
    const cycleDiff = nextCycleSec - currentSec;
    const isDayNow = Math.floor(currentSec / 300) % 2 === 0;
    if (cycleDiff <= 30) {
      alerts.push({
        id: `cycle_${nextCycleSec}`,
        title: isDayNow ? 'Nightfall Coming' : 'Daylight Approaching',
        subtitle: isDayNow ? 'Roshan moves to Dire Pit (Top)' : 'Roshan moves to Radiant Pit (Bottom)',
        targetSeconds: nextCycleSec,
        secondsRemaining: cycleDiff,
        type: 'day_night',
        urgent: cycleDiff <= 15,
      });
    }

    // 7. Roshan Tracking (if recorded dead)
    if (this.roshanState.isDead) {
      const aegisExpiresSec = this.roshanState.deathClockTime + 300; // 5 min
      const earliestRespawnSec = this.roshanState.deathClockTime + 480; // 8 min
      const latestRespawnSec = this.roshanState.deathClockTime + 660; // 11 min

      if (currentSec < aegisExpiresSec) {
        alerts.push({
          id: 'roshan_aegis',
          title: 'Aegis Active',
          subtitle: `Expires at ${this.formatTime(aegisExpiresSec)}`,
          targetSeconds: aegisExpiresSec,
          secondsRemaining: aegisExpiresSec - currentSec,
          type: 'roshan',
          urgent: (aegisExpiresSec - currentSec) <= 30,
        });
      } else if (currentSec < earliestRespawnSec) {
        alerts.push({
          id: 'roshan_window_wait',
          title: 'Roshan Dead',
          subtitle: `Earliest respawn at ${this.formatTime(earliestRespawnSec)}`,
          targetSeconds: earliestRespawnSec,
          secondsRemaining: earliestRespawnSec - currentSec,
          type: 'roshan',
          urgent: (earliestRespawnSec - currentSec) <= 30,
        });
      } else if (currentSec < latestRespawnSec) {
        alerts.push({
          id: 'roshan_window_active',
          title: 'Roshan Respawn Window ACTIVE',
          subtitle: `Could spawn any moment! Latest: ${this.formatTime(latestRespawnSec)}`,
          targetSeconds: latestRespawnSec,
          secondsRemaining: latestRespawnSec - currentSec,
          type: 'roshan',
          urgent: true,
        });
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
