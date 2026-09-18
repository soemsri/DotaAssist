import heroesData from '../data/dotaHeroes.json';
import { GSIDraft, GSIPlayer } from '../types/gsi';
import { getEnemyPickClasses } from './draftService';
import { getHeroUltimate } from '../data/heroUltimates';
import { timingEngine } from './timingEngine';
import { audioService } from './audioService';
import { alertProfiles } from './alertProfiles';
import { copyToClipboard, matchesHotkey } from './objectiveTracker';

export interface EnemyUltimateSlot {
  slot: number; // 1 to 5
  heroClass: string;
  source?: 'manual' | 'gsi';
  heroName: string;
  abilityName: string;
  cooldowns: [number, number, number];
  baseCooldown: number;
  level: 1 | 2 | 3;
  manualLevel?: 1 | 2 | 3;
  manualCooldown?: number;
  cooldownSeconds: number;
  state: 'ready' | 'cooldown';
  castClockTime: number;
  cooldownEndClock: number;
  remainingSeconds: number;
  undoExpiry: number; // Wall-clock ms timestamp
  undoActive: boolean;
  hotkey: string; // e.g. 'Alt+1'
}

export interface EnemyUltimateSnapshot {
  slots: EnemyUltimateSlot[];
  lastClipboardNotice: string | null;
  autoCopyClipboard: boolean;
  activeCooldownCount: number;
}

export class EnemyUltimateService {
  private slots: EnemyUltimateSlot[] = [];
  private lastClipboardNotice: string | null = null;
  private autoCopyClipboard: boolean = true;
  private listeners: Set<() => void> = new Set();
  private undoInterval: ReturnType<typeof setInterval> | null = null;
  private initialized: boolean = false;
  private currentClock = 0;
  private clearedManualSlots = new Set<number>();
  private snapshot: EnemyUltimateSnapshot | null = null;

  constructor() {
    this.loadSettings();
    this.initDefaultSlots();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const savedAutoCopy = localStorage.getItem('dotaassist_enemy_auto_copy');
      if (savedAutoCopy !== null) {
        this.autoCopyClipboard = savedAutoCopy === 'true';
      }
    } catch {}
  }

  private initDefaultSlots() {
    // Provide empty placeholder slots 1 to 5
    if (this.slots.length === 0) {
      this.slots = [1, 2, 3, 4, 5].map((slot) => ({
        slot,
        heroClass: '',
        heroName: `Enemy ${slot}`,
        abilityName: 'Ultimate',
        cooldowns: [120, 100, 80],
        baseCooldown: 100,
        level: 1,
        cooldownSeconds: 120,
        state: 'ready',
        castClockTime: 0,
        cooldownEndClock: 0,
        remainingSeconds: 0,
        undoExpiry: 0,
        undoActive: false,
        hotkey: `Alt+${slot}`,
      }));
    }
  }

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Window keyboard listener for Alt+1 to Alt+5
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      for (let i = 1; i <= 5; i++) {
        if (matchesHotkey(e, `Alt+${i}`)) {
          e.preventDefault();
          this.recordCast(i);
          break;
        }
      }
    });

    // Tauri IPC listener for native OS global shortcuts
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/event')
        .then(({ listen }) => {
          listen<number>('hotkey-enemy-ultimate', (event) => {
            if (typeof event.payload === 'number') {
              this.recordCast(event.payload);
            }
          }).catch(() => {});

          for (let i = 1; i <= 5; i++) {
            listen(`hotkey-enemy-${i}`, () => this.recordCast(i)).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.snapshot = null;
    this.listeners.forEach((fn) => fn());
  }

  private ensureUndoTimer() {
    if (this.undoInterval) return;
    this.undoInterval = setInterval(() => {
      const now = Date.now();
      let hasActiveUndo = false;

      this.slots.forEach((s) => {
        if (s.undoActive) {
          if (now >= s.undoExpiry) {
            s.undoActive = false;
          } else {
            hasActiveUndo = true;
          }
        }
      });

      if (!hasActiveUndo && this.undoInterval) {
        clearInterval(this.undoInterval);
        this.undoInterval = null;
      }
      this.notify();
    }, 500);
  }

  public getSnapshot = (): EnemyUltimateSnapshot => {
    if (this.snapshot) return this.snapshot;
    const activeCooldownCount = this.slots.filter(
      (s) => s.heroClass && s.state === 'cooldown' && s.remainingSeconds > 0,
    ).length;

    return this.snapshot = {
      slots: this.slots.map(slot => ({ ...slot })),
      lastClipboardNotice: this.lastClipboardNotice,
      autoCopyClipboard: this.autoCopyClipboard,
      activeCooldownCount,
    };
  };

  /**
   * Automatically synchronizes enemy hero picks from GSI Draft data.
   * Decision 1: Pulls all 5 enemy heroes from GSI draft data.
   */
  public updateFromGSI(
    draft?: GSIDraft,
    playerTeam?: GSIPlayer['team_name'],
    currentClockTime: number = 0,
  ) {
    this.currentClock = currentClockTime;
    const enemyHeroClasses = getEnemyPickClasses(draft, playerTeam);
    let changed = false;

    for (const heroClass of enemyHeroClasses) {
      if (this.slots.some(slot => slot.heroClass === heroClass)) continue;
      const empty = this.slots.find(slot => !slot.heroClass && !this.clearedManualSlots.has(slot.slot));
      if (!empty) break;
      this.populateSlot(empty, heroClass, 'gsi');
      changed = true;
    }

    // Process cooldown countdowns on clock tick
    const nowSec = Math.floor(currentClockTime);
    this.slots.forEach((slot) => {
      if (!slot.heroClass) return;

      if (slot.state === 'cooldown') {
        const remaining = Math.max(0, slot.cooldownEndClock - nowSec);
        if (slot.remainingSeconds !== remaining) {
          slot.remainingSeconds = remaining;
          changed = true;
        }

        // When cooldown finishes (Decision 3: Voice alert when ready)
        if (remaining === 0) {
          slot.state = 'ready';
          slot.undoActive = false;
          changed = true;

          if (alertProfiles.enabled('enemy_ultimate')) {
            audioService.playEnemyUltimateReadyAlert(slot.heroName, slot.abilityName);
          }
        }
      }
    });

    if (changed) {
      this.notify();
    }
  }

  public calculateLevelFromClock(clockTime: number): 1 | 2 | 3 {
    if (clockTime < 1020) return 1; // Before 17:00 -> Level 1
    if (clockTime < 1620) return 2; // Before 27:00 -> Level 2
    return 3; // 27:00+ -> Level 3
  }

  /**
   * Records that an enemy ultimate was cast (Decision 2: Alt+1 to Alt+5, with 10s quick undo).
   */
  public recordCast(
    slotNumber: number,
    explicitClockTime?: number,
  ): { action: 'recorded' | 'undone' | 'ignored'; slot?: EnemyUltimateSlot } {
    const slot = this.slots.find((s) => s.slot === slotNumber);
    if (!slot || !slot.heroClass) {
      return { action: 'ignored' };
    }

    const now = Date.now();

    // Quick Undo: if pressed again within 10s
    if (slot.undoActive && now < slot.undoExpiry) {
      slot.state = 'ready';
      slot.cooldownEndClock = 0;
      slot.remainingSeconds = 0;
      slot.undoActive = false;
      slot.undoExpiry = 0;

      if (alertProfiles.enabled('enemy_ultimate')) {
        audioService.playWarningBeep();
        audioService.speak(`${slot.heroName} ultimate timer canceled`, undefined, 'enemy_ultimate');
      }

      this.notify();
      return { action: 'undone', slot };
    }

    // Record new cast
    const currentClock = Math.floor(explicitClockTime ?? timingEngine.getLastClockTime());
    this.currentClock = currentClock;
    const level = slot.manualLevel ?? this.calculateLevelFromClock(currentClock);
    const cd = slot.manualCooldown ?? (slot.cooldowns[level - 1] || slot.baseCooldown);

    // Passive ultimates (e.g. Drow Ranger, Phantom Assassin) have 0 cooldown
    if (cd <= 0) {
      return { action: 'ignored', slot };
    }

    slot.level = level;
    slot.cooldownSeconds = cd;
    slot.state = 'cooldown';
    slot.castClockTime = currentClock;
    slot.cooldownEndClock = currentClock + cd;
    slot.remainingSeconds = cd;
    slot.undoExpiry = now + 10000; // 10s quick-undo window
    slot.undoActive = true;

    this.ensureUndoTimer();

    // Audio confirmation
    if (alertProfiles.enabled('enemy_ultimate')) {
      audioService.playEnemyUltimateRecordedAlert(slot.heroName);
    }

    // Auto-copy to clipboard if enabled
    if (this.autoCopyClipboard) {
      const readyTimeStr = timingEngine.formatTime(slot.cooldownEndClock);
      const summaryText = `[DotaAssist] ${slot.heroName} ${slot.abilityName} estimated CD | Estimated ready at ${readyTimeStr} (${cd}s)`;
      copyToClipboard(summaryText).catch(() => {});
      this.lastClipboardNotice = `${slot.heroName} ${slot.abilityName} (Estimated ready: ${readyTimeStr})`;
    }

    this.notify();
    return { action: 'recorded', slot };
  }

  public correctEstimate(slotNumber: number, level?: 1 | 2 | 3, cooldown?: number): boolean {
    const slot = this.slots.find(s => s.slot === slotNumber);
    if (!slot?.heroClass || slot.cooldowns.every(c => c <= 0)) return false;
    if (level !== undefined && ![1, 2, 3].includes(level)) return false;
    if (cooldown !== undefined && (!Number.isFinite(cooldown) || cooldown <= 0 || cooldown > 3600)) return false;
    slot.manualLevel = level;
    slot.manualCooldown = cooldown;
    slot.level = level ?? this.calculateLevelFromClock(this.currentClock);
    slot.cooldownSeconds = cooldown ?? (slot.cooldowns[slot.level - 1] || slot.baseCooldown);
    if (slot.state === 'cooldown') {
      slot.cooldownEndClock = slot.castClockTime + slot.cooldownSeconds;
      slot.remainingSeconds = Math.max(0, slot.cooldownEndClock - Math.floor(this.currentClock));
      if (slot.remainingSeconds === 0) {
        slot.state = 'ready';
        slot.undoActive = false;
        if (alertProfiles.enabled('enemy_ultimate')) {
          audioService.playEnemyUltimateReadyAlert(slot.heroName, slot.abilityName);
        }
      }
    }
    this.lastClipboardNotice = null;
    this.notify();
    return true;
  }

  public undoCast(slotNumber: number) {
    const slot = this.slots.find((s) => s.slot === slotNumber);
    if (!slot) return;

    slot.state = 'ready';
    slot.cooldownEndClock = 0;
    slot.remainingSeconds = 0;
    slot.undoActive = false;
    slot.undoExpiry = 0;

    if (alertProfiles.enabled('enemy_ultimate')) {
      audioService.playWarningBeep();
      audioService.speak(`${slot.heroName} ultimate timer canceled`, undefined, 'enemy_ultimate');
    }

    this.notify();
  }

  public setAutoCopyClipboard(enabled: boolean) {
    this.autoCopyClipboard = enabled;
    try {
      localStorage.setItem('dotaassist_enemy_auto_copy', String(enabled));
    } catch {}
    this.notify();
  }

  public clearClipboardNotice() {
    this.lastClipboardNotice = null;
    this.notify();
  }

  public resetAll() {
    if (this.undoInterval) {
      clearInterval(this.undoInterval);
      this.undoInterval = null;
    }
    this.currentClock = 0;
    this.clearedManualSlots.clear();
    this.slots = [];
    this.initDefaultSlots();
    this.lastClipboardNotice = null;
    this.notify();
  }

  /**
   * Helper to manually populate enemy slots (useful for tests or custom games).
   */
  public setEnemyHeroes(heroClasses: string[], clockTime: number = 0) {
    this.resetAll();
    this.currentClock = clockTime;
    heroClasses.slice(0, 5).forEach((hero, index) => this.selectHero(index + 1, hero));
  }

  private populateSlot(slot: EnemyUltimateSlot, heroClass: string, source: 'manual' | 'gsi') {
    const info = getHeroUltimate(heroClass);
    const level = this.calculateLevelFromClock(this.currentClock);
    Object.assign(slot, {
      heroClass, source, heroName: info.heroName, abilityName: info.abilityName,
      cooldowns: info.cooldowns, baseCooldown: info.baseCooldown, level,
      cooldownSeconds: info.cooldowns[level - 1] || info.baseCooldown,
      manualLevel: undefined, manualCooldown: undefined,
      state: 'ready', castClockTime: 0, cooldownEndClock: 0,
      remainingSeconds: 0, undoExpiry: 0, undoActive: false,
    });
  }

  public selectHero(slotNumber: number, heroClass: string): boolean {
    const slot = this.slots.find(s => s.slot === slotNumber);
    if (!slot || slot.heroClass || !heroesData.some(hero => hero.name === heroClass)
      || this.slots.some(s => s.heroClass === heroClass)) return false;
    this.clearedManualSlots.delete(slotNumber);
    this.populateSlot(slot, heroClass, 'manual');
    this.notify();
    return true;
  }

  public clearSelection(slotNumber: number, confirmed = false): 'cleared' | 'confirmation-required' | 'ignored' {
    const slot = this.slots.find(s => s.slot === slotNumber);
    if (!slot || slot.source !== 'manual') return 'ignored';
    if (!confirmed && (slot.state === 'cooldown' || slot.manualLevel !== undefined || slot.manualCooldown !== undefined)) {
      return 'confirmation-required';
    }
    this.clearedManualSlots.add(slotNumber);
    Object.assign(slot, {
      heroClass: '', heroName: `Enemy ${slotNumber}`, abilityName: 'Ultimate', source: undefined,
      cooldowns: [120, 100, 80], baseCooldown: 100, level: 1, cooldownSeconds: 120,
      manualLevel: undefined, manualCooldown: undefined, state: 'ready',
      castClockTime: 0, cooldownEndClock: 0, remainingSeconds: 0, undoExpiry: 0, undoActive: false,
    });
    this.lastClipboardNotice = null;
    this.notify();
    return 'cleared';
  }
}

export const enemyUltimateService = new EnemyUltimateService();
