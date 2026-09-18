import { timingEngine } from './timingEngine';
import { audioService } from './audioService';

export interface ObjectiveUndoState {
  roshanActive: boolean;
  roshanRemainingSec: number;
  tormentorActive: boolean;
  tormentorRemainingSec: number;
  lastClipboardNotice: string | null;
  autoCopyClipboard: boolean;
  roshanHotkey: string;
  tormentorHotkey: string;
}

export interface HotkeyMatch {
  alt: boolean;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
}

export function parseHotkey(hotkeyStr: string): HotkeyMatch {
  const parts = hotkeyStr.split('+').map(p => p.trim().toLowerCase());
  const alt = parts.includes('alt');
  const ctrl = parts.includes('ctrl') || parts.includes('control');
  const shift = parts.includes('shift');
  const meta = parts.includes('meta') || parts.includes('cmd') || parts.includes('command') || parts.includes('win');
  const key = parts.find(p => !['alt', 'ctrl', 'control', 'shift', 'meta', 'cmd', 'command', 'win'].includes(p)) || '';
  return { alt, ctrl, shift, meta, key };
}

export function matchesHotkey(event: KeyboardEvent, hotkeyStr: string): boolean {
  const parsed = parseHotkey(hotkeyStr);
  if (event.altKey !== parsed.alt) return false;
  if (event.ctrlKey !== parsed.ctrl) return false;
  if (event.shiftKey !== parsed.shift) return false;
  if (event.metaKey !== parsed.meta) return false;

  const eventKey = event.key.toLowerCase();
  const eventCode = event.code.toLowerCase();
  const target = parsed.key.toLowerCase();

  return eventKey === target || eventCode === target || eventCode === `key${target}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to DOM fallback
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch {
      return false;
    }
  }

  return false;
}

class ObjectiveTrackerService {
  private roshanUndoExpiry: number = 0;
  private tormentorUndoExpiry: number = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  private autoCopyClipboard: boolean = true;
  private roshanHotkey: string = 'Alt+F9';
  private tormentorHotkey: string = 'Alt+F8';
  private lastClipboardNotice: string | null = null;
  private listeners: Set<() => void> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const savedAutoCopy = localStorage.getItem('dotaassist_auto_copy_clipboard');
      if (savedAutoCopy !== null) {
        this.autoCopyClipboard = savedAutoCopy === 'true';
      }
      const savedRoshanKey = localStorage.getItem('dotaassist_roshan_hotkey');
      if (savedRoshanKey) this.roshanHotkey = savedRoshanKey;
      const savedTormentorKey = localStorage.getItem('dotaassist_tormentor_hotkey');
      if (savedTormentorKey) this.tormentorHotkey = savedTormentorKey;
    } catch {}
  }

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Window keyboard listener for browser mode or unfocused overlay
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (matchesHotkey(e, this.roshanHotkey)) {
        e.preventDefault();
        this.recordRoshan();
      } else if (matchesHotkey(e, this.tormentorHotkey)) {
        e.preventDefault();
        this.recordTormentor();
      }
    });

    // Tauri IPC listeners for global OS shortcuts
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('hotkey-roshan', () => this.recordRoshan()).catch(() => {});
        listen('hotkey-tormentor', () => this.recordTormentor()).catch(() => {});
      }).catch(() => {});
    }
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  private ensureTimer() {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const roshanActive = now < this.roshanUndoExpiry;
      const tormentorActive = now < this.tormentorUndoExpiry;

      if (!roshanActive && !tormentorActive) {
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
      }
      this.notify();
    }, 500);
  }

  public getSnapshot = (): ObjectiveUndoState => {
    const now = Date.now();
    const roshanRemaining = Math.max(0, Math.ceil((this.roshanUndoExpiry - now) / 1000));
    const tormentorRemaining = Math.max(0, Math.ceil((this.tormentorUndoExpiry - now) / 1000));

    return {
      roshanActive: roshanRemaining > 0,
      roshanRemainingSec: roshanRemaining,
      tormentorActive: tormentorRemaining > 0,
      tormentorRemainingSec: tormentorRemaining,
      lastClipboardNotice: this.lastClipboardNotice,
      autoCopyClipboard: this.autoCopyClipboard,
      roshanHotkey: this.roshanHotkey,
      tormentorHotkey: this.tormentorHotkey,
    };
  };

  public formatRoshanSummary(clockTime: number): string {
    const time = Math.max(0, Math.floor(clockTime));
    const killStr = timingEngine.formatTime(time);
    const aegisStr = timingEngine.formatTime(time + 300); // 5 min
    const earliestStr = timingEngine.formatTime(time + 480); // 8 min
    const latestStr = timingEngine.formatTime(time + 660); // 11 min
    return `Roshan ${killStr} | Aegis ${aegisStr} | Respawn ${earliestStr}-${latestStr}`;
  }

  public formatTormentorSummary(clockTime: number): string {
    const time = Math.max(0, Math.floor(clockTime));
    const killStr = timingEngine.formatTime(time);
    const respawnStr = timingEngine.formatTime(time + 600); // 10 min
    return `Tormentor ${killStr} | Respawn ${respawnStr}`;
  }

  public recordRoshan(explicitClockTime?: number): { action: 'recorded' | 'undone'; text: string } {
    const now = Date.now();
    // Quick Undo: if pressed again within 10s
    if (now < this.roshanUndoExpiry) {
      this.undoRoshan();
      return { action: 'undone', text: 'Roshan timer canceled' };
    }

    const clockTime = explicitClockTime !== undefined ? explicitClockTime : timingEngine.getLastClockTime();
    timingEngine.recordRoshanDeath(clockTime);
    audioService.speak('Roshan slain recorded.', undefined, 'roshan');

    // 10 second undo window
    this.roshanUndoExpiry = now + 10000;
    this.ensureTimer();

    const summary = this.formatRoshanSummary(clockTime);
    if (this.autoCopyClipboard) {
      void copyToClipboard(summary);
      this.lastClipboardNotice = summary;
    }

    this.notify();
    return { action: 'recorded', text: summary };
  }

  public undoRoshan() {
    this.roshanUndoExpiry = 0;
    timingEngine.resetRoshan();
    audioService.speak('Roshan timer canceled.', undefined, 'roshan');
    this.notify();
  }

  public recordTormentor(explicitClockTime?: number): { action: 'recorded' | 'undone'; text: string } {
    const now = Date.now();
    // Quick Undo: if pressed again within 10s
    if (now < this.tormentorUndoExpiry) {
      this.undoTormentor();
      return { action: 'undone', text: 'Tormentor timer canceled' };
    }

    const clockTime = explicitClockTime !== undefined ? explicitClockTime : timingEngine.getLastClockTime();
    timingEngine.recordTormentorDeath(clockTime);
    audioService.speak('Tormentor slain recorded.', undefined, 'tormentor');

    // 10 second undo window
    this.tormentorUndoExpiry = now + 10000;
    this.ensureTimer();

    const summary = this.formatTormentorSummary(clockTime);
    if (this.autoCopyClipboard) {
      void copyToClipboard(summary);
      this.lastClipboardNotice = summary;
    }

    this.notify();
    return { action: 'recorded', text: summary };
  }

  public undoTormentor() {
    this.tormentorUndoExpiry = 0;
    timingEngine.resetTormentor();
    audioService.speak('Tormentor timer canceled.', undefined, 'tormentor');
    this.notify();
  }

  public setAutoCopyClipboard(enabled: boolean) {
    this.autoCopyClipboard = enabled;
    try {
      localStorage.setItem('dotaassist_auto_copy_clipboard', String(enabled));
    } catch {}
    this.notify();
  }

  public getAutoCopyClipboard(): boolean {
    return this.autoCopyClipboard;
  }

  public setHotkeys(roshanKey: string, tormentorKey: string, interactionKey?: string): { success: boolean; error?: string } {
    const r = roshanKey.trim();
    const t = tormentorKey.trim();
    const i = interactionKey ? interactionKey.trim() : null;

    if (!r || !t) {
      return { success: false, error: 'Hotkeys cannot be empty.' };
    }

    if (r.toLowerCase() === t.toLowerCase()) {
      return { success: false, error: 'Roshan and Tormentor hotkeys must be different.' };
    }

    if (i && (r.toLowerCase() === i.toLowerCase() || t.toLowerCase() === i.toLowerCase())) {
      return { success: false, error: 'Objective hotkeys cannot conflict with overlay interaction hotkey.' };
    }

    this.roshanHotkey = r;
    this.tormentorHotkey = t;
    try {
      localStorage.setItem('dotaassist_roshan_hotkey', r);
      localStorage.setItem('dotaassist_tormentor_hotkey', t);
    } catch {}

    this.notify();
    return { success: true };
  }

  public clearClipboardNotice() {
    this.lastClipboardNotice = null;
    this.notify();
  }

  public resetAll() {
    this.roshanUndoExpiry = 0;
    this.tormentorUndoExpiry = 0;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.lastClipboardNotice = null;
    this.notify();
  }
}

export const objectiveTracker = new ObjectiveTrackerService();
