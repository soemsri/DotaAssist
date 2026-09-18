import { GSIPayload } from '../types/gsi';
import {
  ActiveWardTracker,
  TacticalWardSpot,
  VisionAdvisorState,
} from '../types/meta';
import rawWardSpots from '../data/dotaWardSpots.json';
import { audioService } from './audioService';

const WARD_DURATION_SECONDS = 360; // 6 minutes for Observer Ward in Dota 2

class VisionEngine {
  private activeWards: ActiveWardTracker[] = [];
  private lastWardsPlaced: number | null = null;
  private lastMatchId: string | null = null;
  private announcedExpiredWardIds = new Set<string>();

  public reset() {
    this.activeWards = [];
    this.lastWardsPlaced = null;
    this.lastMatchId = null;
    this.announcedExpiredWardIds.clear();
  }

  public getAllSpots(): TacticalWardSpot[] {
    return rawWardSpots as TacticalWardSpot[];
  }

  /**
   * Manually record a ward placement (for testing or manual trigger)
   */
  public recordWardPlacement(clockTime: number, duration: number = WARD_DURATION_SECONDS): ActiveWardTracker {
    const id = `ward_${Math.floor(clockTime)}_${Math.random().toString(36).substring(2, 7)}`;
    const ward: ActiveWardTracker = {
      id,
      placedAtClockTime: clockTime,
      expiresAtClockTime: clockTime + duration,
      remainingSeconds: duration,
      totalDurationSeconds: duration,
    };
    this.activeWards.push(ward);
    return ward;
  }

  /**
   * Main processor called each tick from tacticalCoach / App
   */
  public process(payload: GSIPayload | null, clockTime: number): VisionAdvisorState {
    const map = payload?.map;
    const player = payload?.player;
    const matchId = map?.matchid?.trim() || null;

    if (matchId && this.lastMatchId && matchId !== this.lastMatchId) {
      this.reset();
    }
    if (matchId) this.lastMatchId = matchId;

    const currentWardsPlaced = player?.wards_placed ?? 0;
    const isGameActive = map?.game_state === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS';

    // 1. Detect ward placement via GSI player.wards_placed increment
    if (isGameActive && this.lastWardsPlaced !== null && currentWardsPlaced > this.lastWardsPlaced) {
      const placedCount = currentWardsPlaced - this.lastWardsPlaced;
      for (let i = 0; i < placedCount; i++) {
        this.recordWardPlacement(clockTime);
      }
    }
    if (isGameActive && (this.lastWardsPlaced === null || currentWardsPlaced > (this.lastWardsPlaced ?? 0))) {
      this.lastWardsPlaced = currentWardsPlaced;
    }

    // 2. Update remaining time and check for expired wards
    const survivingWards: ActiveWardTracker[] = [];
    for (const ward of this.activeWards) {
      const remaining = Math.max(0, Math.floor(ward.expiresAtClockTime - clockTime));
      ward.remainingSeconds = remaining;

      if (remaining <= 0) {
        if (!this.announcedExpiredWardIds.has(ward.id)) {
          this.announcedExpiredWardIds.add(ward.id);
          if (isGameActive) {
            audioService.playWardExpiredAlert();
          }
        }
      } else {
        survivingWards.push(ward);
      }
    }
    this.activeWards = survivingWards;

    // 3. Find nearest expiry time
    let nearestExpirySeconds: number | null = null;
    if (this.activeWards.length > 0) {
      nearestExpirySeconds = Math.min(...this.activeWards.map((w) => w.remainingSeconds));
    }

    // 4. Recommend strategic ward spots
    const team = (player?.team_name?.toLowerCase() === 'dire' ? 'dire' : 'radiant') as 'radiant' | 'dire';
    const isDaytime = map?.daytime !== false;
    const recommendedSpots = this.getRecommendedSpots(clockTime, team, isDaytime);

    return {
      activeWards: [...this.activeWards],
      nearestExpirySeconds,
      recommendedSpots,
      wardsPlacedTotal: currentWardsPlaced,
    };
  }

  /**
   * Filter and prioritize spots based on game clock, team perspective, and objectives
   */
  public getRecommendedSpots(
    clockTime: number,
    team: 'radiant' | 'dire',
    isDaytime: boolean,
  ): TacticalWardSpot[] {
    const all = rawWardSpots as TacticalWardSpot[];

    // Determine current phase
    let currentPhase: 'laning' | 'mid' | 'objective' | 'late' = 'laning';
    if (clockTime < 600) {
      currentPhase = 'laning';
    } else if (clockTime < 1200) {
      currentPhase = 'mid';
    } else if (clockTime < 1800) {
      currentPhase = 'objective';
    } else {
      currentPhase = 'late';
    }

    // Filter by team suitability
    const teamSpots = all.filter((s) => s.team === 'both' || s.team === team);

    // Score spots based on current objectives
    return teamSpots
      .map((spot) => {
        let score = 0;

        // Phase match
        if (spot.phase === currentPhase || spot.phase === 'any') {
          score += 10;
        }

        // Tormentor window approaching (around 19:00 - 22:00)
        if (clockTime >= 1140 && clockTime <= 1320 && spot.id.includes('tormentor')) {
          score += 25;
        }

        // Roshan Day vs Night pit prioritization
        if (spot.id === 'roshan_south_pit_entrance' && isDaytime) {
          score += 15;
        } else if (spot.id === 'roshan_north_pit_entrance' && !isDaytime) {
          score += 15;
        }

        // Rune cliff in early game
        if (clockTime < 600 && spot.id.includes('power_rune')) {
          score += 15;
        }

        return { spot, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.spot);
  }
}

export const visionEngine = new VisionEngine();
