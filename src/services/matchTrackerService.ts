import { GSIPayload } from '../types/gsi';
import {
  MatchRecord,
  FundamentalsScorecard,
  CSPacePillar,
  PreRuneShovePillar,
  AegisDisciplinePillar,
  BuybackDisciplinePillar,
} from '../types/matchHistory';
import { alertProfiles, Role } from './alertProfiles';
import { audioService } from './audioService';
import { ROLE_BENCHMARKS } from './laningBenchmarkService';
import { buybackService } from './buybackService';

// Fallback storage key when Tauri invoke is unavailable (e.g. browser dev/test)
const LOCAL_STORAGE_KEY = 'dotaassist_match_history_records';

function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

function getStorage(): Storage | undefined {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof global !== 'undefined' && (global as any).localStorage) {
    return (global as any).localStorage;
  }
  return undefined;
}

async function invokeTauri<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  throw new Error('Tauri IPC unavailable');
}

export class MatchTrackerService {
  private currentMatchId: string | null = null;
  private matchStartTime: number = 0;
  private hasCompletedThisMatch: boolean = false;
  private isMatchInProgress: boolean = false;

  // Telemetry state
  private playerHeroName: string = '';
  private playerHeroDisplayName: string = '';
  private playerHeroId: number = 0;
  private playerTeam: string = 'radiant';
  private playerRole: Role = 'carry';

  // In-match stats
  private kills: number = 0;
  private deaths: number = 0;
  private assists: number = 0;
  private lastHits: number = 0;
  private denies: number = 0;
  private netWorth: number = 0;
  private gpm: number = 0;
  private xpm: number = 0;
  private matchDuration: number = 0;
  private matchWon: boolean | null = null;

  // CS Pace at 10m
  private csAt10: number = 0;
  private deniesAt10: number = 0;
  private hasRecorded10m: boolean = false;

  // Pre-Rune Shove telemetry
  private runeShoveWindowsEvaluated: Set<number> = new Set();
  private successfulShoves: number = 0;
  private totalRuneWindows: number = 0;
  private lastHitsAtShoveStart: number = 0;

  // Aegis telemetry
  private hasAegis: boolean = false;
  private aegisCount: number = 0;
  private towersTakenWithAegis: number = 0;
  private wastedAegisCount: number = 0;
  private aegisAcquiredTime: number = 0;

  // Buyback telemetry
  private deathsPost30: number = 0;
  private deathsWithoutBuybackPost30: number = 0;
  private wasDead: boolean = false;
  private safeSpendSamples: number = 0;
  private compliantSpendSamples: number = 0;

  // UI state & subscribers
  private activeDebriefModal: MatchRecord | null = null;
  private listeners: Set<() => void> = new Set();

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public getActiveDebrief(): MatchRecord | null {
    return this.activeDebriefModal;
  }

  public dismissDebrief(): void {
    this.activeDebriefModal = null;
    this.notify();
  }

  public resetAll(): void {
    this.currentMatchId = null;
    this.matchStartTime = 0;
    this.hasCompletedThisMatch = false;
    this.isMatchInProgress = false;

    this.playerHeroName = '';
    this.playerHeroDisplayName = '';
    this.playerHeroId = 0;
    this.playerTeam = 'radiant';
    this.playerRole = alertProfiles.getSnapshot().active;

    this.kills = 0;
    this.deaths = 0;
    this.assists = 0;
    this.lastHits = 0;
    this.denies = 0;
    this.netWorth = 0;
    this.gpm = 0;
    this.xpm = 0;
    this.matchDuration = 0;
    this.matchWon = null;

    this.csAt10 = 0;
    this.deniesAt10 = 0;
    this.hasRecorded10m = false;

    this.runeShoveWindowsEvaluated.clear();
    this.successfulShoves = 0;
    this.totalRuneWindows = 0;
    this.lastHitsAtShoveStart = 0;

    this.hasAegis = false;
    this.aegisCount = 0;
    this.towersTakenWithAegis = 0;
    this.wastedAegisCount = 0;
    this.aegisAcquiredTime = 0;

    this.deathsPost30 = 0;
    this.deathsWithoutBuybackPost30 = 0;
    this.wasDead = false;
    this.safeSpendSamples = 0;
    this.compliantSpendSamples = 0;

    this.activeDebriefModal = null;
    this.notify();
  }

  public processGSI(payload: GSIPayload | null): void {
    if (!payload || !payload.map) return;

    const clockTime = payload.map.clock_time ?? 0;
    const gameState = payload.map.game_state;

    const isPostGame = (gameState as string) === 'POST_GAME' || gameState === 'DOTA_GAMERULES_STATE_POST_GAME';

    // Detect match start or active game
    if (gameState === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' || (clockTime > 0 && !isPostGame)) {
      if (!this.isMatchInProgress) {
        this.isMatchInProgress = true;
        this.matchStartTime = Date.now();
        this.currentMatchId = `match_${Date.now()}_${payload.hero?.id ?? 0}`;
        this.hasCompletedThisMatch = false;
      }
    }

    // Extract player hero info
    if (payload.hero) {
      this.playerHeroId = payload.hero.id ?? this.playerHeroId;
      this.playerHeroName = payload.hero.name ?? this.playerHeroName;
      this.playerHeroDisplayName = this.formatHeroName(this.playerHeroName);
      this.kills = payload.player?.kills ?? this.kills;
      this.deaths = payload.player?.deaths ?? this.deaths;
      this.assists = payload.player?.assists ?? this.assists;
      this.lastHits = payload.player?.last_hits ?? this.lastHits;
      this.denies = payload.player?.denies ?? this.denies;
      this.netWorth = payload.player?.net_worth ?? this.netWorth;
      this.gpm = payload.player?.gpm ?? this.gpm;
      this.xpm = payload.player?.xpm ?? this.xpm;
    }

    this.playerRole = alertProfiles.getSnapshot().active;
    this.playerTeam = payload.player?.team_name?.toLowerCase() || 'radiant';
    this.matchDuration = Math.max(this.matchDuration, clockTime);

    // Track CS Pace at 10m (600s)
    if (clockTime >= 600 && !this.hasRecorded10m && clockTime <= 750) {
      this.csAt10 = this.lastHits;
      this.deniesAt10 = this.denies;
      this.hasRecorded10m = true;
    }

    // Telemetry 1: Pre-Rune Shove (at minutes 2, 4, 6, 8)
    if (clockTime >= 60 && clockTime <= 600) {
      const currentMinute = Math.floor(clockTime / 60);
      const secInMinute = clockTime % 60;
      const targetMinute = currentMinute + 1;

      if (targetMinute % 2 === 0 && targetMinute <= 8) {
        // Shove window is :40 to :59 of the odd minute
        if (secInMinute >= 40 && secInMinute <= 59) {
          if (!this.runeShoveWindowsEvaluated.has(targetMinute)) {
            // Window started
            if (secInMinute === 40 || this.lastHitsAtShoveStart === 0) {
              this.lastHitsAtShoveStart = this.lastHits;
            }
            // Check if player took last hits or pushed during this window
            if (this.lastHits > this.lastHitsAtShoveStart) {
              this.successfulShoves++;
              this.runeShoveWindowsEvaluated.add(targetMinute);
            }
          }
        } else if (secInMinute === 0 && !this.runeShoveWindowsEvaluated.has(targetMinute)) {
          // Window closed without shove
          this.runeShoveWindowsEvaluated.add(targetMinute);
        }
      }
    }
    this.totalRuneWindows = Math.min(4, Math.floor(Math.max(0, clockTime) / 120));

    // Telemetry 2: Aegis Discipline
    const items = [
      payload.items?.slot0?.name,
      payload.items?.slot1?.name,
      payload.items?.slot2?.name,
      payload.items?.slot3?.name,
      payload.items?.slot4?.name,
      payload.items?.slot5?.name,
    ];
    const holdingAegis = items.includes('item_aegis');

    if (holdingAegis && !this.hasAegis) {
      // Just acquired Aegis
      this.hasAegis = true;
      this.aegisCount++;
      this.aegisAcquiredTime = clockTime;
    } else if (!holdingAegis && this.hasAegis) {
      // Aegis consumed, expired, or dropped
      this.hasAegis = false;
      const heldDuration = clockTime - this.aegisAcquiredTime;
      // If held for full 300s (5m) and 0 towers were taken, marked as wasted/passive
      if (heldDuration >= 290 && this.towersTakenWithAegis === 0) {
        this.wastedAegisCount++;
      }
    }

    // Telemetry 3: Buyback Discipline (Post 30:00 / 1800s)
    if (clockTime >= 1800) {
      const isDead = Boolean(payload.hero && (payload.hero.respawn_seconds ?? 0) > 0);
      const buyback = buybackService.calculateBuyback(payload);

      // Track safe-to-spend compliance while alive
      if (!isDead) {
        this.safeSpendSamples++;
        if (buyback.surplusGold >= 0) {
          this.compliantSpendSamples++;
        }
      }

      // Check transition from alive to dead
      if (isDead && !this.wasDead) {
        this.deathsPost30++;
        if (!buyback.hasBuyback) {
          this.deathsWithoutBuybackPost30++;
        }
      }
      this.wasDead = isDead;
    }

    // Check Match Completion (POST_GAME)
    if (isPostGame) {
      if (this.isMatchInProgress && !this.hasCompletedThisMatch) {
        this.handleMatchCompleted(payload);
      }
    }
  }

  public handleMatchCompleted(payload: GSIPayload): void {
    if (this.hasCompletedThisMatch) return;
    this.hasCompletedThisMatch = true;
    this.isMatchInProgress = false;

    // Detect match victory
    const winTeam = payload.map?.win_team?.toLowerCase();
    if (winTeam) {
      this.matchWon = winTeam === this.playerTeam;
    }

    // If 10m CS wasn't captured earlier (e.g. game ended short or clock skipped)
    if (!this.hasRecorded10m) {
      this.csAt10 = this.lastHits;
      this.deniesAt10 = this.denies;
    }

    const scorecard = this.calculateScorecard();
    const record: MatchRecord = {
      id: this.currentMatchId || `match_${Date.now()}_${this.playerHeroId}`,
      timestamp: this.matchStartTime || Date.now(),
      heroId: this.playerHeroId,
      heroName: this.playerHeroName,
      heroDisplayName: this.playerHeroDisplayName,
      role: this.playerRole,
      matchDuration: this.matchDuration,
      won: this.matchWon,
      kills: this.kills,
      deaths: this.deaths,
      assists: this.assists,
      csAt10: this.csAt10,
      deniesAt10: this.deniesAt10,
      csBenchmarkAt10: ROLE_BENCHMARKS[this.playerRole]?.targetCS ?? 45,
      netWorth: this.netWorth,
      gpm: this.gpm,
      xpm: this.xpm,
      overallScore: scorecard.overallScore,
      overallGrade: scorecard.overallGrade,
      dataJson: JSON.stringify(scorecard),
      scorecard,
    };

    // Save record to SQLite backend (or browser fallback)
    this.saveMatchRecord(record).catch((err) => {
      console.warn('[DotaAssist MatchTracker] Save error:', err);
    });

    // Play Thai voice announcer debrief
    if (scorecard.spokenSummary) {
      audioService.playPostMatchDebrief(scorecard.spokenSummary);
    }

    // Show Debrief Modal
    this.activeDebriefModal = record;
    this.notify();
  }

  public calculateScorecard(): FundamentalsScorecard {
    const role = this.playerRole;
    const benchmark = ROLE_BENCHMARKS[role] || ROLE_BENCHMARKS.carry;

    // 1. CS Pace Pillar
    const expectedCs = benchmark.targetCS;
    const csRatio = expectedCs > 0 ? this.csAt10 / expectedCs : 1;
    const csScore = Math.min(100, Math.round(csRatio * 100));
    const csDiff = this.csAt10 - expectedCs;
    const csStatus: 'ahead' | 'on_pace' | 'behind' =
      csDiff >= 3 ? 'ahead' : csDiff <= -4 ? 'behind' : 'on_pace';

    const csGrade = this.scoreToGrade(csScore);
    const csPace: CSPacePillar = {
      score: csScore,
      grade: csGrade,
      actualCs: this.csAt10,
      expectedCs,
      denies: this.deniesAt10,
      status: csStatus,
      details: `ทำได้ ${this.csAt10} CS ที่ 10 นาที (เกณฑ์เป้าหมาย ${expectedCs} CS, ดิไน ${this.deniesAt10})`,
    };

    // 2. Pre-Rune Shove Pillar
    const totalRunes = Math.max(1, this.totalRuneWindows);
    const shovePercentage = Math.round((this.successfulShoves / totalRunes) * 100);
    const shoveScore = Math.min(100, shovePercentage);
    const shoveGrade = this.scoreToGrade(shoveScore);

    const preRuneShove: PreRuneShovePillar = {
      score: shoveScore,
      grade: shoveGrade,
      successfulShoves: this.successfulShoves,
      totalRunes,
      shovePercentage,
      details: `ดันครีปก่อนเวลารูนสำเร็จ ${this.successfulShoves}/${totalRunes} ครั้ง (${shovePercentage}%)`,
    };

    // 3. Aegis Discipline Pillar
    let aegisScore = 100;
    if (this.aegisCount > 0) {
      const penalty = this.wastedAegisCount * 30;
      const bonus = this.towersTakenWithAegis * 15;
      aegisScore = Math.max(20, Math.min(100, 100 - penalty + bonus));
    }
    const aegisGrade = this.scoreToGrade(aegisScore);

    const aegisDiscipline: AegisDisciplinePillar = {
      score: aegisScore,
      grade: aegisGrade,
      aegisCount: this.aegisCount,
      towersTakenWithAegis: this.towersTakenWithAegis,
      wastedAegisCount: this.wastedAegisCount,
      details:
        this.aegisCount === 0
          ? 'ไม่มีการเก็บ Aegis ในแมตช์นี้'
          : `เก็บ Aegis ${this.aegisCount} ครั้ง, ยึดป้อมได้ ${this.towersTakenWithAegis} ป้อม, เสียเปล่า ${this.wastedAegisCount} ครั้ง`,
    };

    // 4. Buyback Discipline Pillar
    let buybackScore = 100;
    if (this.deathsPost30 > 0) {
      const penalty = this.deathsWithoutBuybackPost30 * 40;
      buybackScore = Math.max(10, 100 - penalty);
    }
    const complianceRate =
      this.safeSpendSamples > 0
        ? Math.round((this.compliantSpendSamples / this.safeSpendSamples) * 100)
        : 100;

    const buybackGrade = this.scoreToGrade(buybackScore);
    const buybackDiscipline: BuybackDisciplinePillar = {
      score: buybackScore,
      grade: buybackGrade,
      deathsPost30: this.deathsPost30,
      deathsWithoutBuybackPost30: this.deathsWithoutBuybackPost30,
      safeSpendCompliance: complianceRate,
      details:
        this.deathsPost30 === 0
          ? 'ไม่ตายเลยหลังนาทีที่ 30:00 (ยอดเยี่ยม)'
          : `ตายหลังนาที 30:00 ทั้งหมด ${this.deathsPost30} ครั้ง (ตายโดยไม่มีบายแบ็ก ${this.deathsWithoutBuybackPost30} ครั้ง)`,
    };

    // Overall Weighted Score
    let overallScore = 0;
    if (role === 'carry' || role === 'mid') {
      overallScore = Math.round(
        csScore * 0.35 + shoveScore * 0.25 + aegisScore * 0.20 + buybackScore * 0.20
      );
    } else if (role === 'offlane') {
      overallScore = Math.round(
        csScore * 0.25 + shoveScore * 0.25 + aegisScore * 0.25 + buybackScore * 0.25
      );
    } else {
      // support
      overallScore = Math.round(
        shoveScore * 0.30 + aegisScore * 0.25 + buybackScore * 0.25 + csScore * 0.20
      );
    }
    overallScore = Math.max(0, Math.min(100, overallScore));
    const overallGrade = this.scoreToGrade(overallScore);

    // Strengths, Blunders & Next Game Focus
    const keyStrengths: string[] = [];
    const topBlunders: string[] = [];
    const nextGameFocus: string[] = [];

    if (csScore >= 85) {
      keyStrengths.push(`คุมจังหวะ Last Hit ในเลนได้ตามเป้าหมายระดับสูง (${this.csAt10} CS)`);
    } else {
      topBlunders.push(`CS ช่วงเลนช้ากว่าเกณฑ์เป้าหมาย (${this.csAt10}/${expectedCs} CS)`);
      nextGameFocus.push(`โฟกัสการเก็บลาสครีปใน 10 นาทีแรกให้แตะ ${expectedCs} CS ก่อนเริ่มเดินเกม`);
    }

    if (shoveScore >= 75) {
      keyStrengths.push(`ดันเลนก่อนเกิดรูนสำเร็จ ${shovePercentage}% ช่วยคุมคอนโทรลแม่น้ำ`);
    } else if (totalRunes >= 2) {
      topBlunders.push(`พลาดการดันครีปก่อนเวลารูนคู่ (${this.successfulShoves}/${totalRunes} ครั้ง)`);
      nextGameFocus.push(`จำไทม์มิ่งวินาทีที่ :40 เพื่อรีบกดสกิลเคลียร์ครีปก่อนรูนน้ำหรือรูนแม่น้ำเกิด`);
    }

    if (this.deathsWithoutBuybackPost30 > 0) {
      topBlunders.push(
        `ตายโดยไม่มี Buyback ในเลทเกม ${this.deathsWithoutBuybackPost30} ครั้ง ทำให้ทีมเสียเปรียบไฟต์สำคัญ`
      );
      nextGameFocus.push(`เช็ก Safe-to-Spend เสมอหลังนาทีที่ 30:00 และอย่าซื้อของจนเงินสำรองขาด`);
    } else if (this.matchDuration >= 1800) {
      keyStrengths.push(`มีวินัยการสำรองเงิน Buyback หลังนาทีที่ 30:00 สมบูรณ์แบบ`);
    }

    if (this.aegisCount > 0 && this.towersTakenWithAegis > 0) {
      keyStrengths.push(`ใช้ความได้เปรียบจาก Aegis บุกยึดป้อมได้สำเร็จ ${this.towersTakenWithAegis} ป้อม`);
    } else if (this.wastedAegisCount > 0) {
      topBlunders.push(`ถือ Aegis ฟาร์มโดยไม่ได้กดดันป้อม Tier 3 จนหมดอายุ`);
      nextGameFocus.push(`เมื่อได้ Aegis ให้รวมทีมดัน High Ground หรือดักคิลศัตรูทันที`);
    }

    if (keyStrengths.length === 0) {
      keyStrengths.push('เล่นจบแมตช์อย่างมีวินัยและพยายามรักษารูปเกม');
    }
    if (nextGameFocus.length === 0) {
      nextGameFocus.push('รักษามาตรฐานฟอร์มการเล่นนี้ต่อไปในแมตช์ถัดไป');
    }

    // Spoken Summary (~15s natural Thai TTS)
    const spokenSummary = this.generateSpokenSummary(
      overallGrade,
      overallScore,
      keyStrengths[0],
      topBlunders[0]
    );

    return {
      overallScore,
      overallGrade,
      pillars: {
        csPace,
        preRuneShove,
        aegisDiscipline,
        buybackDiscipline,
      },
      keyStrengths,
      topBlunders,
      nextGameFocus,
      spokenSummary,
    };
  }

  private scoreToGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }

  private generateSpokenSummary(
    grade: string,
    score: number,
    topStrength?: string,
    topBlunder?: string
  ): string {
    const gradeThai = grade === 'S' ? 'เอส' : grade === 'A' ? 'เอ' : grade === 'B' ? 'บี' : grade === 'C' ? 'ซี' : 'ดี';
    let text = `จบแมตช์แล้วครับ! คะแนนวินัยภาพรวมได้เกรด ${gradeThai} ${score} คะแนน`;

    if (topStrength) {
      text += ` จุดเด่นคือ ${topStrength}`;
    }
    if (topBlunder) {
      text += ` ข้อควรปรับปรุงคือ ${topBlunder}`;
    } else {
      text += ` ทำผลงานได้ยอดเยี่ยม รักษาฟอร์มนี้ต่อไปครับ`;
    }

    return text;
  }

  private formatHeroName(heroName: string): string {
    if (!heroName) return 'Unknown Hero';
    return heroName
      .replace(/^npc_dota_hero_/, '')
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // --- Persistence & DB Operations ---

  public async saveMatchRecord(record: MatchRecord): Promise<void> {
    try {
      if (isTauri()) {
        await invokeTauri('save_match_record', { record });
        return;
      }
    } catch (e) {
      console.warn('[DotaAssist MatchTracker] Tauri SQLite save fallback:', e);
    }

    // Fallback: localStorage
    try {
      const store = getStorage();
      if (store) {
        const records = await this.getFallbackRecords();
        const existingIdx = records.findIndex((r) => r.id === record.id);
        if (existingIdx >= 0) {
          records[existingIdx] = record;
        } else {
          records.unshift(record);
        }
        if (records.length > 50) records.length = 50; // keep last 50
        store.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
      }
    } catch (err) {
      console.error('[DotaAssist MatchTracker] LocalStorage save failed:', err);
    }
  }

  public async getMatchHistory(limit: number = 50): Promise<MatchRecord[]> {
    try {
      if (isTauri()) {
        const records = await invokeTauri<MatchRecord[]>('get_match_history', { limit });
        if (records && Array.isArray(records)) {
          return records.map((r) => {
            if (r.dataJson && !r.scorecard) {
              try {
                r.scorecard = JSON.parse(r.dataJson);
              } catch {}
            }
            return r;
          });
        }
      }
    } catch (e) {
      console.warn('[DotaAssist MatchTracker] Tauri SQLite query fallback:', e);
    }

    return this.getFallbackRecords(limit);
  }

  public async getMatchDetails(matchId: string): Promise<MatchRecord | null> {
    try {
      if (isTauri()) {
        const record = await invokeTauri<MatchRecord | null>('get_match_details', { matchId });
        if (record && record.dataJson && !record.scorecard) {
          try {
            record.scorecard = JSON.parse(record.dataJson);
          } catch {}
        }
        return record;
      }
    } catch (e) {
      console.warn('[DotaAssist MatchTracker] Tauri SQLite details fallback:', e);
    }

    const records = await this.getFallbackRecords();
    return records.find((r) => r.id === matchId) || null;
  }

  public async deleteMatchRecord(matchId: string): Promise<void> {
    try {
      if (isTauri()) {
        await invokeTauri('delete_match_record', { matchId });
        return;
      }
    } catch (e) {
      console.warn('[DotaAssist MatchTracker] Tauri SQLite delete fallback:', e);
    }

    const store = getStorage();
    if (store) {
      const records = (await this.getFallbackRecords()).filter((r) => r.id !== matchId);
      try {
        store.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
      } catch {}
    }
  }

  public async clearAllMatches(): Promise<void> {
    try {
      if (isTauri()) {
        await invokeTauri('clear_all_matches');
        return;
      }
    } catch (e) {
      console.warn('[DotaAssist MatchTracker] Tauri SQLite clear fallback:', e);
    }

    try {
      const store = getStorage();
      if (store) {
        store.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch {}
  }

  private async getFallbackRecords(limit: number = 50): Promise<MatchRecord[]> {
    try {
      const store = getStorage();
      if (!store) return [];
      const raw = store.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed: MatchRecord[] = JSON.parse(raw);
      return parsed.slice(0, limit).map((r) => {
        if (r.dataJson && !r.scorecard) {
          try {
            r.scorecard = JSON.parse(r.dataJson);
          } catch {}
        }
        return r;
      });
    } catch {
      return [];
    }
  }


  // Testing helpers
  public setTelemetryForTesting(telemetry: Partial<{
    csAt10: number;
    deniesAt10: number;
    successfulShoves: number;
    totalRuneWindows: number;
    aegisCount: number;
    towersTakenWithAegis: number;
    wastedAegisCount: number;
    deathsPost30: number;
    deathsWithoutBuybackPost30: number;
    matchDuration: number;
    role: Role;
  }>): void {
    if (telemetry.csAt10 !== undefined) this.csAt10 = telemetry.csAt10;
    if (telemetry.deniesAt10 !== undefined) this.deniesAt10 = telemetry.deniesAt10;
    if (telemetry.successfulShoves !== undefined) this.successfulShoves = telemetry.successfulShoves;
    if (telemetry.totalRuneWindows !== undefined) this.totalRuneWindows = telemetry.totalRuneWindows;
    if (telemetry.aegisCount !== undefined) this.aegisCount = telemetry.aegisCount;
    if (telemetry.towersTakenWithAegis !== undefined) this.towersTakenWithAegis = telemetry.towersTakenWithAegis;
    if (telemetry.wastedAegisCount !== undefined) this.wastedAegisCount = telemetry.wastedAegisCount;
    if (telemetry.deathsPost30 !== undefined) this.deathsPost30 = telemetry.deathsPost30;
    if (telemetry.deathsWithoutBuybackPost30 !== undefined) this.deathsWithoutBuybackPost30 = telemetry.deathsWithoutBuybackPost30;
    if (telemetry.matchDuration !== undefined) this.matchDuration = telemetry.matchDuration;
    if (telemetry.role !== undefined) this.playerRole = telemetry.role;
  }
}

export const matchTrackerService = new MatchTrackerService();
