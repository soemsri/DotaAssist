import { GSIPayload } from '../types/gsi';
import { alertProfiles, Role } from './alertProfiles';
import { audioService } from './audioService';

export interface RoleBenchmark {
  role: Role;
  targetCS: number; // Target Last Hits at 10:00
  targetDenies: number;
  targetNetWorth: number;
}

export const ROLE_BENCHMARKS: Record<Role, RoleBenchmark> = {
  carry: { role: 'carry', targetCS: 50, targetDenies: 12, targetNetWorth: 4000 },
  mid: { role: 'mid', targetCS: 45, targetDenies: 10, targetNetWorth: 3800 },
  offlane: { role: 'offlane', targetCS: 35, targetDenies: 8, targetNetWorth: 3200 },
  support: { role: 'support', targetCS: 12, targetDenies: 4, targetNetWorth: 2200 },
};

export type PaceStatus = 'ahead' | 'on_pace' | 'behind';

export interface LaningSummaryReport {
  role: Role;
  finalLastHits: number;
  finalDenies: number;
  finalNetWorth: number;
  finalGpm: number;
  targetCS: number;
  grade: 'S' | 'A' | 'B' | 'C';
  summaryText: string;
}

export interface LaningPaceSnapshot {
  isActive: boolean; // True during 0:00 - 10:00 (and up to 15:00 if report visible)
  clockTime: number;
  currentLastHits: number;
  currentDenies: number;
  currentNetWorth: number;
  currentGpm: number;
  expectedCS: number;
  csDiff: number;
  paceStatus: PaceStatus;
  role: Role;
  benchmark: RoleBenchmark;
  report: LaningSummaryReport | null;
  reportDismissed: boolean;
}

export class LaningBenchmarkService {
  private playedMilestones: Set<string> = new Set();
  private report: LaningSummaryReport | null = null;
  private reportDismissed: boolean = false;
  private listeners: Set<() => void> = new Set();

  private lastSnapshot: LaningPaceSnapshot = {
    isActive: false,
    clockTime: 0,
    currentLastHits: 0,
    currentDenies: 0,
    currentNetWorth: 0,
    currentGpm: 0,
    expectedCS: 0,
    csDiff: 0,
    paceStatus: 'on_pace',
    role: 'support',
    benchmark: ROLE_BENCHMARKS.support,
    report: null,
    reportDismissed: false,
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getSnapshot = (): LaningPaceSnapshot => {
    return this.lastSnapshot;
  };

  public dismissReport() {
    this.reportDismissed = true;
    this.lastSnapshot = {
      ...this.lastSnapshot,
      reportDismissed: true,
    };
    this.notify();
  }

  public resetAll() {
    this.playedMilestones.clear();
    this.report = null;
    this.reportDismissed = false;
    this.lastSnapshot = {
      isActive: false,
      clockTime: 0,
      currentLastHits: 0,
      currentDenies: 0,
      currentNetWorth: 0,
      currentGpm: 0,
      expectedCS: 0,
      csDiff: 0,
      paceStatus: 'on_pace',
      role: alertProfiles.getSnapshot().active,
      benchmark: ROLE_BENCHMARKS[alertProfiles.getSnapshot().active] || ROLE_BENCHMARKS.support,
      report: null,
      reportDismissed: false,
    };
    this.notify();
  }

  /**
   * Decision 1: Evaluates role-based targets (Carry: 50, Mid: 45, Offlane: 35, Support: 12)
   * Decision 2: Compact Pace Indicator values (+/- CS diff, Pace status)
   * Decision 3: 5:00 and 10:00 milestone audio announcements and Laning Summary Report
   */
  public updateFromGSI(payload: GSIPayload | null, currentClockTime: number) {
    const clock = Math.floor(currentClockTime);
    const role = alertProfiles.getSnapshot().active;
    const benchmark = ROLE_BENCHMARKS[role] || ROLE_BENCHMARKS.support;

    // Active during 0:00 - 15:00
    const isActive = clock >= 0 && clock <= 900;

    const player = payload?.player;
    const lastHits = player?.last_hits ?? 0;
    const denies = player?.denies ?? 0;
    const netWorth = player?.net_worth ?? 0;
    const gpm = player?.gpm ?? 0;

    // Calculate expected CS proportional to laning clock (0 to 10 minutes)
    const minutes = Math.min(10, Math.max(0, clock / 60));
    const expectedCS = Math.round((benchmark.targetCS / 10) * minutes);
    const csDiff = lastHits - expectedCS;

    let paceStatus: PaceStatus = 'on_pace';
    if (csDiff >= 3) {
      paceStatus = 'ahead';
    } else if (csDiff <= -4) {
      paceStatus = 'behind';
    } else {
      paceStatus = 'on_pace';
    }

    // Decision 3: Milestone Voice Announcements
    // 1. 5:00 Milestone (300s)
    if (
      clock >= 300 &&
      clock <= 302 &&
      !this.playedMilestones.has('milestone_5m')
    ) {
      this.playedMilestones.add('milestone_5m');
      const statusWord = paceStatus === 'ahead' ? 'ahead of pace' : paceStatus === 'behind' ? 'behind pace' : 'on pace';
      audioService.playLaningMilestoneAlert(5, lastHits, statusWord);
    }

    // 2. 10:00 Milestone (600s) & Summary Report Generation
    if (
      clock >= 600 &&
      !this.playedMilestones.has('milestone_10m')
    ) {
      this.playedMilestones.add('milestone_10m');
      audioService.playLaningMilestoneAlert(10, lastHits, paceStatus, netWorth);

      // Generate Laning Summary Report
      let grade: 'S' | 'A' | 'B' | 'C' = 'B';
      if (csDiff >= 8) grade = 'S';
      else if (csDiff >= 0) grade = 'A';
      else if (csDiff >= -6) grade = 'B';
      else grade = 'C';

      this.report = {
        role,
        finalLastHits: lastHits,
        finalDenies: denies,
        finalNetWorth: netWorth,
        finalGpm: gpm,
        targetCS: benchmark.targetCS,
        grade,
        summaryText: `Laning phase completed with ${lastHits} CS (target ${benchmark.targetCS}) and ${netWorth} NW.`,
      };
    }

    this.lastSnapshot = {
      isActive,
      clockTime: clock,
      currentLastHits: lastHits,
      currentDenies: denies,
      currentNetWorth: netWorth,
      currentGpm: gpm,
      expectedCS,
      csDiff,
      paceStatus,
      role,
      benchmark,
      report: this.report,
      reportDismissed: this.reportDismissed,
    };

    this.notify();
  }
}

export const laningBenchmarkService = new LaningBenchmarkService();
