class AudioNotificationService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playWisdomRuneAlert() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Chime: Two ascending pure sine tones (600Hz -> 900Hz)
    const now = this.ctx.currentTime;
    this.playTone(600, now, 0.25, 'sine');
    this.playTone(900, now + 0.18, 0.35, 'sine');
  }

  public playPowerRuneAlert() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Fast double ping
    const now = this.ctx.currentTime;
    this.playTone(750, now, 0.12, 'triangle');
    this.playTone(1050, now + 0.14, 0.2, 'triangle');
  }

  public playBountyRuneAlert() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    // High coin chime
    const now = this.ctx.currentTime;
    this.playTone(987.77, now, 0.1, 'sine'); // B5
    this.playTone(1318.51, now + 0.08, 0.25, 'sine'); // E6
  }

  public playTormentorAlert() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Deep warning pulse
    const now = this.ctx.currentTime;
    this.playTone(330, now, 0.3, 'sawtooth');
    this.playTone(440, now + 0.25, 0.4, 'sawtooth');
  }

  public playRoshanAlert() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Heavy horn/brass pulse
    const now = this.ctx.currentTime;
    this.playTone(220, now, 0.35, 'sawtooth');
    this.playTone(180, now + 0.3, 0.45, 'sawtooth');
  }

  public playWarningBeep() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    this.playTone(880, now, 0.15, 'sine');
  }

  private playTone(freq: number, startTime: number, duration: number, type: OscillatorType) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(this.volume * 0.4, startTime);
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
