import type { Objective } from './alertProfiles';

export interface VoiceReminder {
  id: string;
  objective?: Objective;
  deadline?: number;
  priority?: number;
  expiresAt?: number;
  text: (clock: number | null) => string;
  language?: string;
}
export interface SpeechDriver {
  speak(text: string, language: string | undefined, done: () => void): void;
  cancel(): void;
}

/** One utterance at a time. A microtask batches reminders from the same game tick. */
export class VoiceQueue {
  private pending: (VoiceReminder & { queuedAt: number })[] = [];
  private active: (VoiceReminder & { queuedAt: number }) | null = null;
  private scheduled = false;
  private enabled = true;
  constructor(private driver: SpeechDriver, private clock: () => number | null,
    private allowed: (objective: Objective) => boolean, private now = Date.now) {}

  enqueue(reminder: VoiceReminder) {
    if (!this.enabled || this.active?.id === reminder.id || this.pending.some(item => item.id === reminder.id)) return;
    this.pending.push({ ...reminder, queuedAt: this.now() });
    this.schedule();
  }
  private valid(item: VoiceReminder & { queuedAt: number }) {
    const clock = this.clock();
    return this.enabled && (!item.objective || this.allowed(item.objective))
      && this.now() - item.queuedAt < 35000
      && (item.deadline === undefined || (clock !== null && clock < item.deadline))
      && (item.expiresAt === undefined || (clock !== null && clock < item.expiresAt));
  }
  private schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => { this.scheduled = false; this.drain(); });
  }
  reconcile() {
    this.pending = this.pending.filter(item => this.valid(item));
    if (this.active && !this.valid(this.active)) {
      this.active = null; // Invalidate callbacks before cancel (some engines fire synchronously).
      this.driver.cancel();
    }
    this.schedule();
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }
  cancelId(id: string) {
    this.pending = this.pending.filter(item => item.id !== id);
    if (this.active?.id === id) { this.active = null; this.driver.cancel(); }
    this.schedule();
  }
  clear(objective?: Objective) {
    this.pending = objective ? this.pending.filter(item => item.objective !== objective) : [];
    if (this.active && (!objective || this.active.objective === objective)) {
      this.active = null;
      this.driver.cancel();
    }
    this.schedule();
  }
  drain() {
    this.pending = this.pending.filter(item => this.valid(item));
    if (this.active || !this.enabled) return;
    this.pending.sort((a, b) => (a.priority ?? a.deadline ?? a.expiresAt ?? Infinity) - (b.priority ?? b.deadline ?? b.expiresAt ?? Infinity) || a.queuedAt - b.queuedAt);
    const item = this.pending.shift();
    if (!item) return;
    this.active = item;
    const done = () => {
      if (this.active !== item) return;
      this.active = null;
      this.schedule();
    };
    try { this.driver.speak(item.text(this.clock()), item.language, done); }
    catch { done(); }
  }
}
