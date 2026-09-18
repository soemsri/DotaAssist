import { alertProfiles, Objective } from './alertProfiles';
import { VoiceQueue } from './voiceQueue';

export interface ReminderContext {
  id: string;
  objective: Objective;
  target: number;
  label?: string;
  expiresAt?: number;
}

export interface AudioSettings {
  masterVolume: number; // 0.0 - 1.0
  sfxEnabled: boolean;
  voiceEnabled: boolean;
  voiceLanguage: 'en-US' | 'th-TH';
}

class AudioNotificationService {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.8,
    sfxEnabled: true,
    voiceEnabled: true,
    voiceLanguage: 'en-US',
  };
  private isUnlocked: boolean = false;

  private clock: number | null = null;
  private reminder: ReminderContext | null = null;
  private sequence = 0;
  private speechTimeout: ReturnType<typeof setTimeout> | undefined;
  private voiceQueue = new VoiceQueue({
    speak: (text, language, done) => this.startSpeech(text, language, done),
    cancel: () => {
      clearTimeout(this.speechTimeout);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
  }, () => this.clock, alertProfiles.enabled);

  public updateGameClock(clock: number) {
    this.clock = Number.isFinite(clock) ? clock : null;
    this.voiceQueue.reconcile();
  }
  public clearReminders(objective?: Objective) { this.voiceQueue.clear(objective); }
  public withReminder(context: ReminderContext, action: () => void) {
    const previous = this.reminder;
    this.reminder = context;
    try { action(); } finally { this.reminder = previous; }
  }

  constructor() {
    alertProfiles.subscribe(() => this.voiceQueue.reconcile());
    this.setupAutoUnlock();
  }

  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else {
        this.isUnlocked = true;
      }

      // Pre-warm SpeechSynthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }

      // Remove listeners once unlocked
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
    window.addEventListener('click', unlock, { once: false });
  }

  public initContext() {
    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch(() => {});
    } else if (this.ctx) {
      this.isUnlocked = true;
    }
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public setMasterVolume(vol: number) {
    this.settings.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public setSfxEnabled(val: boolean) {
    this.settings.sfxEnabled = val;
  }

  public setVoiceEnabled(val: boolean) {
    this.settings.voiceEnabled = val;
    this.voiceQueue.setEnabled(val);
  }

  public setVoiceLanguage(lang: 'en-US' | 'th-TH') {
    this.settings.voiceLanguage = lang;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /** Preview speech and game reminders use the same serial queue. */
  public speak(text: string, langOverride?: string, objective?: Objective) {
    if (!this.settings.voiceEnabled) return;
    const context = this.reminder;
    this.voiceQueue.enqueue({
      id: context?.id ?? `preview-${++this.sequence}`,
      objective: context?.objective ?? objective,
      priority: context?.target,
      deadline: context?.label ? context.target : undefined,
      expiresAt: context?.expiresAt,
      language: langOverride,
      text: clock => context?.label && clock !== null
        ? `${context.label} in ${Math.max(0, Math.ceil(context.target - clock))} seconds`
        : text,
    });
  }

  private startSpeech(text: string, language: string | undefined, done: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { done(); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = this.settings.masterVolume;
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.lang = language ?? this.settings.voiceLanguage;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
    if (voice) utterance.voice = voice;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      done();
    };
    const timeout = setTimeout(() => {
      window.speechSynthesis.cancel();
      finish();
    }, 15000);
    this.speechTimeout = timeout;
    utterance.onend = finish;
    utterance.onerror = finish;
    try { window.speechSynthesis.speak(utterance); }
    catch { finish(); }
  }

  // --- Objective-Specific Alerts (Chime + Speech) ---

  public playWisdomShrineAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(600, now, 0.25, 'sine');
      this.playTone(900, now + 0.18, 0.35, 'sine');
    }
    this.speak('Wisdom Shrine in thirty seconds', undefined, 'rune_wisdom');
  }

  public playPowerRuneAlert(isWaterRune: boolean = false) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(750, now, 0.12, 'triangle');
      this.playTone(1050, now + 0.14, 0.2, 'triangle');
    }
    if (isWaterRune) {
      this.speak('Water Runes in twenty seconds', undefined, 'rune_power');
    } else {
      this.speak('Power Rune in twenty seconds', undefined, 'rune_power');
    }
  }

  public playBountyRuneAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(987.77, now, 0.1, 'sine');
      this.playTone(1318.51, now + 0.08, 0.25, 'sine');
    }
    this.speak('Bounty Runes in fifteen seconds', undefined, 'rune_bounty');
  }

  public playTormentorAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(330, now, 0.3, 'sawtooth');
      this.playTone(440, now + 0.25, 0.4, 'sawtooth');
    }
    this.speak('Tormentor ready in thirty seconds', undefined, 'tormentor');
  }

  public playRoshanAlert(message: string = 'Roshan respawn window is active') {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(220, now, 0.35, 'sawtooth');
      this.playTone(180, now + 0.3, 0.45, 'sawtooth');
    }
    this.speak(message, undefined, 'roshan');
  }

  public playAegisExpiringAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(550, now, 0.2, 'sine');
      this.playTone(440, now + 0.15, 0.3, 'sine');
    }
    this.speak('Aegis expires in thirty seconds', undefined, 'roshan');
  }

  public playDayNightAlert(isNightfall: boolean) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(400, now, 0.2, 'sine');
      this.playTone(isNightfall ? 300 : 500, now + 0.15, 0.3, 'sine');
    }
    if (isNightfall) {
      this.speak('Nightfall approaching.', undefined, 'day_night');
    } else {
      this.speak('Daybreak approaching.', undefined, 'day_night');
    }
  }

  public playWarningBeep() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(880, now, 0.15, 'sine');
    }
  }

  private playTone(freq: number, startTime: number, duration: number, type: OscillatorType) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(this.settings.masterVolume * 0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }
}

export const audioService = new AudioNotificationService();
