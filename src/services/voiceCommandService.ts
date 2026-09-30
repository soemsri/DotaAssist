import {
  EnemyCooldownTracker,
  VoiceAssistantStatus,
  VoiceCommandRule,
  VoiceRecognitionResult,
  VoiceActivationMode,
  VoicePttState,
} from '../types/voice';
import { audioService } from './audioService';
import { timingEngine } from './timingEngine';
import { objectiveTracker, matchesHotkey } from './objectiveTracker';
import { visionEngine } from './visionEngine';
import { TacticalCoachState, PopularItem, TimingEventAlert } from '../types/meta';

const ULTIMATE_COOLDOWNS: Record<string, { duration: number; nameTh: string; nameEn: string }> = {
  black_hole: { duration: 180, nameTh: 'แบล็กโฮล (Enigma)', nameEn: 'Black Hole' },
  ravage: { duration: 150, nameTh: 'เรเวจ (Tidehunter)', nameEn: 'Ravage' },
  chronosphere: { duration: 160, nameTh: 'โครโนสเฟียร์ (Faceless Void)', nameEn: 'Chronosphere' },
  doom: { duration: 145, nameTh: 'ดูม (Doom)', nameEn: 'Doom' },
  global_silence: { duration: 130, nameTh: 'โกลบอล ไซเลนซ์ (Silencer)', nameEn: 'Global Silence' },
  arena_of_blood: { duration: 90, nameTh: 'อารีน่า (Mars)', nameEn: 'Arena of Blood' },
};

const COMMAND_RULES: VoiceCommandRule[] = [
  // 1. Undo / Cancel Objective Recording (checked first to prevent partial match on objective names)
  {
    intent: 'undo_objective',
    phrasesTh: [
      'ยกเลิกโรชาน',
      'ยกเลิกทอร์เมนเตอร์',
      'ยกเลิกเวลา',
      'ยกเลิกไทเมอร์',
      'ยกเลิกการจับเวลา',
      'ยกเลิก',
      'แคนเซิล',
      'อันดู',
    ],
    phrasesEn: [
      'cancel roshan',
      'cancel tormentor',
      'undo roshan',
      'undo tormentor',
      'cancel timer',
      'undo timer',
      'cancel',
      'undo',
    ],
    actionType: 'action',
  },
  // 2. Roshan Death
  {
    intent: 'roshan_death',
    phrasesTh: ['โรชานตาย', 'ฆ่าโรชาน', 'โรชานล้ม', 'โรชานดับ', 'จดเวลาโรชาน', 'โรชานแล้ว', 'โรชาน'],
    phrasesEn: ['roshan dead', 'roshan down', 'roshan killed', 'roshan died', 'kill roshan', 'record roshan', 'roshan'],
    actionType: 'action',
  },
  // 3. Tormentor Death
  {
    intent: 'tormentor_death',
    phrasesTh: [
      'ทอร์เมนเตอร์ตาย',
      'ฆ่าทอร์เมนเตอร์',
      'ทอร์เมนเตอร์ล้ม',
      'จดเวลาทอร์เมนเตอร์',
      'ทอร์เมนเตอร์แล้ว',
      'ทอร์เมนเตอร์',
      'ทอร์เม้นตาย',
      'ทอร์เม้น',
      'ทอร์เมน',
    ],
    phrasesEn: [
      'tormentor dead',
      'tormentor down',
      'tormentor killed',
      'kill tormentor',
      'record tormentor',
      'tormentor slain',
      'tormentor',
    ],
    actionType: 'action',
  },
  // 2. Enemy BKB
  {
    intent: 'enemy_bkb',
    phrasesTh: ['บีเคบี', 'ศัตรูกดบีเคบี', 'ศัตรูใช้บีเคบี', 'เปิดบีเคบี', 'กดบีเคบี', 'มีบีเคบี', 'ใช้บีเคบี', 'บีเคบีศัตรู'],
    phrasesEn: ['bkb', 'enemy bkb', 'bkb used', 'used bkb', 'black king bar', 'enemy used bkb'],
    actionType: 'action',
  },
  // 3. Enemy Ultimates
  {
    intent: 'enemy_ultimate',
    phrasesTh: ['แบล็กโฮล', 'แบล็คโฮล', 'หลุมดำ'],
    phrasesEn: ['black hole', 'blackhole'],
    actionType: 'action',
    param: 'black_hole',
  },
  {
    intent: 'enemy_ultimate',
    phrasesTh: ['เรเวจ', 'เรเวต', 'หนามกวาด'],
    phrasesEn: ['ravage'],
    actionType: 'action',
    param: 'ravage',
  },
  {
    intent: 'enemy_ultimate',
    phrasesTh: ['โครโน', 'โครโนสเฟียร์', 'กางโดม'],
    phrasesEn: ['chronosphere', 'chrono'],
    actionType: 'action',
    param: 'chronosphere',
  },
  {
    intent: 'enemy_ultimate',
    phrasesTh: ['ดูม'],
    phrasesEn: ['doom'],
    actionType: 'action',
    param: 'doom',
  },
  {
    intent: 'enemy_ultimate',
    phrasesTh: ['โกลบอล', 'โกลบอลไซเลนซ์', 'ใบ้ทั้งแมพ'],
    phrasesEn: ['global silence', 'global'],
    actionType: 'action',
    param: 'global_silence',
  },
  {
    intent: 'enemy_ultimate',
    phrasesTh: ['อารีน่า', 'ขังกรง'],
    phrasesEn: ['arena of blood', 'arena'],
    actionType: 'action',
    param: 'arena_of_blood',
  },
  // 4. Ward Placed
  {
    intent: 'ward_placed',
    phrasesTh: ['ปักหวอร์ด', 'หวอร์ดแล้ว', 'ลงหวอร์ด', 'หวอร์ด'],
    phrasesEn: ['ward placed', 'warded', 'plant ward', 'placed ward'],
    actionType: 'action',
  },
  // 5. HUD Window Controls
  {
    intent: 'hud_toggle',
    phrasesTh: ['ย่อหน้าต่าง', 'ขยายหน้าต่าง', 'ย่อจอ', 'ขยายจอ', 'ย่อฮัด', 'ขยายฮัด'],
    phrasesEn: ['minimize hud', 'expand hud', 'toggle hud', 'minimize', 'expand', 'maximize'],
    actionType: 'action',
  },
  // 6. Audio Mute
  {
    intent: 'audio_mute',
    phrasesTh: ['ปิดเสียง', 'เปิดเสียง', 'เงียบเสียง'],
    phrasesEn: ['mute audio', 'unmute audio', 'mute sound', 'unmute sound', 'mute'],
    actionType: 'action',
  },
  // 7. Query Rune
  {
    intent: 'query_rune',
    phrasesTh: ['เวลารูน', 'รูนเกิดตอนไหน', 'รูนเกิดเมื่อไหร่', 'ดูรูน', 'รูนต่อไป', 'รูน'],
    phrasesEn: ['next rune', 'rune time', 'when is rune', 'rune status', 'check rune'],
    actionType: 'query',
  },
  // 8. Query Roshan
  {
    intent: 'query_roshan',
    phrasesTh: ['โรชานเกิดตอนไหน', 'สถานะโรชาน', 'ดูโรชาน', 'โรชานเมื่อไหร่', 'เวลาโรชาน'],
    phrasesEn: ['roshan status', 'when is roshan', 'roshan spawn', 'roshan time', 'check roshan'],
    actionType: 'query',
  },
  // 9. Query Next Item
  {
    intent: 'query_next_item',
    phrasesTh: ['ไอเทมต่อไป', 'ออกของอะไรดี', 'ออกไอเทมอะไร', 'แนะนำไอเทม', 'ของต่อไป'],
    phrasesEn: ['next item', 'what item', 'recommend item', 'next build', 'what to buy'],
    actionType: 'query',
  },
  // 10. Query Buyback
  {
    intent: 'query_buyback',
    phrasesTh: ['สถานะบายแบ็ค', 'บายแบ็คพร้อมไหม', 'ขาดเงินเท่าไหร่', 'ดูบายแบ็ค', 'บายแบ็ค'],
    phrasesEn: ['buyback status', 'is buyback ready', 'how much buyback', 'buyback check', 'check buyback'],
    actionType: 'query',
  },
  // 11. Query Healing Lotus
  {
    intent: 'query_lotus',
    phrasesTh: ['เวลาดอกบัว', 'ดอกบัวเกิดตอนไหน', 'ดอกบัวเกิดเมื่อไหร่', 'ดูดอกบัว', 'ดอกบัว', 'บัว', 'บัวฟื้นฟู'],
    phrasesEn: ['lotus time', 'when is lotus', 'check lotus', 'next lotus', 'lotus spawn', 'healing lotus', 'lotus'],
    actionType: 'query',
  },
];

type ResultListener = (res: VoiceRecognitionResult) => void;
type CooldownsListener = (cds: EnemyCooldownTracker[]) => void;
type StatusListener = (status: VoiceAssistantStatus) => void;
type HudToggleHandler = () => void;

class VoiceCommandService {
  private recognition: any = null;
  private status: VoiceAssistantStatus = 'disabled';
  private activeCooldowns: EnemyCooldownTracker[] = [];
  private lastResult: VoiceRecognitionResult | null = null;
  private resultListeners: Set<ResultListener> = new Set();
  private cooldownsListeners: Set<CooldownsListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private pttListeners: Set<(state: VoicePttState) => void> = new Set();
  private hudToggleHandler: HudToggleHandler | null = null;
  private lastClockTime: number = 0;
  private shouldBeListening: boolean = false;

  private isPttActive: boolean = false;
  private audioLevel: number = 0;
  private waveformBars: number[] = [0, 0, 0, 0, 0, 0];
  private pttHotkey: string = 'Backquote';
  private activationMode: VoiceActivationMode = 'ptt';
  private lastPttActiveTime: number = 0;
  private waveformInterval: any = null;
  private audioContext: any = null;
  private analyser: any = null;
  private mediaStream: any = null;
  private initializedListeners: boolean = false;

  constructor() {
    this.init();
  }

  public init() {
    this.loadSettings();
    this.initRecognition();
    this.initKeyListeners();
  }

  public loadSettings() {
    if (typeof window === 'undefined') return;
    const settings = audioService.getSettings();
    if (settings.voiceActivationMode) {
      this.activationMode = settings.voiceActivationMode;
    }
    if (settings.voicePttHotkey) {
      this.pttHotkey = settings.voicePttHotkey;
    }
  }

  public initKeyListeners() {
    if (this.initializedListeners || typeof window === 'undefined') return;
    this.initializedListeners = true;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.activationMode !== 'ptt' || !audioService.getSettings().voiceCommandEnabled) return;
      if (e.repeat) return;

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (matchesHotkey(e, this.pttHotkey)) {
        e.preventDefault();
        this.startPtt();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (this.activationMode !== 'ptt') return;
      if (matchesHotkey(e, this.pttHotkey)) {
        e.preventDefault();
        this.stopPtt();
      }
    });

    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('ptt-start', () => {
          if (this.activationMode === 'ptt' && audioService.getSettings().voiceCommandEnabled) {
            this.startPtt();
          }
        }).catch(() => {});
        listen('ptt-stop', () => {
          if (this.activationMode === 'ptt') {
            this.stopPtt();
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  }

  public getPttState(): VoicePttState {
    return {
      isPttActive: this.isPttActive,
      audioLevel: this.audioLevel,
      waveformBars: [...this.waveformBars],
      activationMode: this.activationMode,
      pttHotkey: this.pttHotkey,
    };
  }

  public subscribePttState(listener: (state: VoicePttState) => void): () => void {
    this.pttListeners.add(listener);
    listener(this.getPttState());
    return () => this.pttListeners.delete(listener);
  }

  private notifyPttState() {
    const st = this.getPttState();
    this.pttListeners.forEach((l) => l(st));
  }

  public setActivationMode(mode: VoiceActivationMode) {
    this.activationMode = mode;
    audioService.updateSettings({ voiceActivationMode: mode });
    if (mode === 'continuous') {
      this.startListening();
    } else {
      this.stopListening();
    }
    this.notifyPttState();
  }

  public setPttHotkey(hotkey: string) {
    this.pttHotkey = hotkey;
    audioService.updateSettings({ voicePttHotkey: hotkey });
    this.notifyPttState();
  }

  public getActivationMode(): VoiceActivationMode {
    return this.activationMode;
  }

  public getPttHotkey(): string {
    return this.pttHotkey;
  }

  public startPtt() {
    if (this.isPttActive) return;
    this.isPttActive = true;
    this.lastPttActiveTime = Date.now();
    this.setStatus('listening');

    if (this.recognition && this.status !== 'listening') {
      try {
        const lang = audioService.getSettings().voiceLanguage;
        this.recognition.lang = lang;
        this.recognition.start();
      } catch {}
    }

    this.startWaveformAnalysis();
    this.notifyPttState();
  }

  public stopPtt() {
    if (!this.isPttActive) return;
    this.isPttActive = false;
    this.lastPttActiveTime = Date.now();

    this.stopWaveformAnalysis();
    this.waveformBars = [0, 0, 0, 0, 0, 0];
    this.audioLevel = 0;

    if (this.activationMode === 'ptt') {
      this.setStatus('disabled');
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch {}
      }
    }
    this.notifyPttState();
  }

  private startWaveformAnalysis() {
    this.stopWaveformAnalysis();

    if (
      typeof window !== 'undefined' &&
      (window.AudioContext || (window as any).webkitAudioContext) &&
      navigator.mediaDevices?.getUserMedia &&
      !this.analyser
    ) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          this.mediaStream = stream;
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          this.audioContext = new AudioCtx();
          const source = this.audioContext.createMediaStreamSource(stream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          source.connect(this.analyser);
        })
        .catch(() => {});
    }

    let stepCounter = 0;
    this.waveformInterval = setInterval(() => {
      if (!this.isPttActive) return;

      if (this.analyser) {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 6));

        for (let i = 0; i < 6; i++) {
          const val = dataArray[i * step] || 0;
          bars.push(Math.min(100, Math.round((val / 255) * 100)));
          sum += val;
        }

        const avg = bufferLength > 0 ? (sum / (bufferLength * 255)) * 100 : 0;
        this.audioLevel = Math.round(avg);
        this.waveformBars = bars;
      } else {
        // Fallback lively simulated waveform pattern
        stepCounter++;
        this.waveformBars = [
          Math.round(35 + 25 * Math.sin(stepCounter * 0.4)),
          Math.round(55 + 35 * Math.cos(stepCounter * 0.3)),
          Math.round(70 + 25 * Math.sin(stepCounter * 0.5)),
          Math.round(80 + 15 * Math.cos(stepCounter * 0.4)),
          Math.round(60 + 30 * Math.sin(stepCounter * 0.35)),
          Math.round(40 + 20 * Math.cos(stepCounter * 0.45)),
        ];
        this.audioLevel = Math.round(
          this.waveformBars.reduce((a, b) => a + b, 0) / this.waveformBars.length
        );
      }
      this.notifyPttState();
    }, 50);
  }

  private stopWaveformAnalysis() {
    if (this.waveformInterval) {
      clearInterval(this.waveformInterval);
      this.waveformInterval = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((t: any) => t.stop());
      } catch {}
      this.mediaStream = null;
    }
  }

  public registerHudToggleHandler(handler: HudToggleHandler) {
    this.hudToggleHandler = handler;
  }

  public subscribeResult(listener: ResultListener): () => void {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  public subscribeCooldowns(listener: CooldownsListener): () => void {
    this.cooldownsListeners.add(listener);
    listener([...this.activeCooldowns]);
    return () => this.cooldownsListeners.delete(listener);
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  public getStatus(): VoiceAssistantStatus {
    return this.status;
  }

  public getActiveCooldowns(): EnemyCooldownTracker[] {
    return [...this.activeCooldowns];
  }

  public getLastResult(): VoiceRecognitionResult | null {
    return this.lastResult;
  }

  private setStatus(status: VoiceAssistantStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  private notifyResult(res: VoiceRecognitionResult) {
    this.lastResult = res;
    this.resultListeners.forEach((l) => l(res));
  }

  private notifyCooldowns() {
    this.cooldownsListeners.forEach((l) => l([...this.activeCooldowns]));
  }

  private initRecognition() {
    if (typeof window === 'undefined') {
      this.status = 'unsupported';
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.status = 'unsupported';
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.setStatus('listening');
      };

      this.recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0]?.transcript || '';
        const confidence = event.results[lastIndex][0]?.confidence || 0.9;
        this.processTranscript(transcript, confidence, this.lastClockTime, { fromMic: true });
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.setStatus('disabled');
          this.shouldBeListening = false;
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if continuous listening is desired
        if (this.shouldBeListening && this.status !== 'disabled') {
          try {
            this.recognition.start();
          } catch {
            this.setStatus('paused');
          }
        } else {
          this.setStatus('disabled');
        }
      };
    } catch {
      this.status = 'unsupported';
    }
  }

  public startListening() {
    if (!this.recognition) return;
    const settings = audioService.getSettings();
    if (!settings.voiceCommandEnabled) return;

    this.shouldBeListening = true;
    this.recognition.lang = settings.voiceLanguage;

    try {
      this.recognition.start();
      this.setStatus('listening');
    } catch {
      // Already running or starting
    }
  }

  public stopListening() {
    this.shouldBeListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.setStatus('disabled');
  }

  public toggleListening(): boolean {
    if (this.status === 'listening') {
      this.stopListening();
      return false;
    } else {
      this.startListening();
      return true;
    }
  }

  /**
   * Updates internal clock time and ticks down active cooldowns
   */
  public tick(clockTime: number) {
    this.lastClockTime = clockTime;
    let changed = false;

    const remaining = this.activeCooldowns
      .map((cd) => {
        const rem = Math.max(0, Math.floor(cd.expiresAtClockTime - clockTime));
        if (rem !== cd.remainingSeconds) {
          changed = true;
          return { ...cd, remainingSeconds: rem };
        }
        return cd;
      })
      .filter((cd) => cd.remainingSeconds > 0);

    if (changed || remaining.length !== this.activeCooldowns.length) {
      this.activeCooldowns = remaining;
      this.notifyCooldowns();
    }
  }

  /**
   * Matches transcript against configured rules, picking the longest phrase match
   */
  public matchCommand(
    rawText: string,
    lang: 'th-TH' | 'en-US' = audioService.getSettings().voiceLanguage
  ): { rule: VoiceCommandRule; phrase: string } | null {
    const text = rawText.toLowerCase().trim().replace(/[,.!?]/g, '');
    if (!text) return null;

    let bestMatch: { rule: VoiceCommandRule; phrase: string; length: number } | null = null;

    // Check language-specific phrases first
    for (const rule of COMMAND_RULES) {
      const phrases = lang === 'th-TH' ? rule.phrasesTh : rule.phrasesEn;
      for (const phrase of phrases) {
        const normPhrase = phrase.toLowerCase();
        if (text.includes(normPhrase)) {
          if (!bestMatch || normPhrase.length > bestMatch.length) {
            bestMatch = { rule, phrase, length: normPhrase.length };
          }
        }
      }
    }

    if (bestMatch) {
      return { rule: bestMatch.rule, phrase: bestMatch.phrase };
    }

    // Fallback cross-language check (user might speak English while in Thai mode or vice versa)
    for (const rule of COMMAND_RULES) {
      const alternatePhrases = lang === 'th-TH' ? rule.phrasesEn : rule.phrasesTh;
      for (const phrase of alternatePhrases) {
        const normPhrase = phrase.toLowerCase();
        if (text.includes(normPhrase)) {
          if (!bestMatch || normPhrase.length > bestMatch.length) {
            bestMatch = { rule, phrase, length: normPhrase.length };
          }
        }
      }
    }

    return bestMatch ? { rule: bestMatch.rule, phrase: bestMatch.phrase } : null;
  }

  /**
   * Main processor for incoming voice text (from real mic or test simulation)
   */
  public processTranscript(
    transcript: string,
    confidence: number = 0.9,
    clockTime: number = this.lastClockTime,
    context?: {
      coachState?: TacticalCoachState | null;
      popularItems?: PopularItem[];
      alerts?: TimingEventAlert[];
      fromMic?: boolean;
    }
  ): VoiceRecognitionResult {
    const lang = audioService.getSettings().voiceLanguage;

    // In Push-to-Talk (PTT) mode, if the transcript originated from the microphone,
    // verify that PTT is actively pressed or was pressed within the last 2.5 seconds.
    // Discard microphone speech that arrived while PTT was inactive (e.g. Discord or team voice chat).
    if (context?.fromMic && this.activationMode === 'ptt') {
      const timeSincePtt = Date.now() - this.lastPttActiveTime;
      const isPttValid = this.isPttActive || (this.lastPttActiveTime > 0 && timeSincePtt < 2500);
      if (!isPttValid) {
        const ignoredResult: VoiceRecognitionResult = {
          id: `voice_ignored_${Date.now()}`,
          transcript,
          intent: null,
          confidence,
          timestamp: Date.now(),
          feedbackText:
            lang === 'th-TH'
              ? 'ละเว้นคำสั่ง (ไม่ได้กดปุ่ม PTT)'
              : 'Ignored (PTT key was not held)',
          success: false,
        };
        return ignoredResult;
      }
    }

    const match = this.matchCommand(transcript, lang);

    if (!match) {
      const result: VoiceRecognitionResult = {
        id: `voice_${Date.now()}`,
        transcript,
        intent: null,
        confidence,
        timestamp: Date.now(),
        feedbackText: lang === 'th-TH' ? 'ไม่พบคำสั่งที่ตรงกัน' : 'Command not recognized',
        success: false,
      };
      this.notifyResult(result);
      return result;
    }

    const { rule, phrase } = match;
    let feedbackText = '';
    let isQuery = rule.actionType === 'query';

    // Play feedback chime on valid match
    audioService.playVoiceCommandChime();

    switch (rule.intent) {
      case 'undo_objective': {
        const undoRes = objectiveTracker.undoLatest();
        if (undoRes.undone) {
          feedbackText =
            lang === 'th-TH'
              ? undoRes.objective === 'roshan'
                ? 'ยกเลิกการจับเวลาโรชานแล้ว'
                : 'ยกเลิกการจับเวลาทอร์เมนเตอร์แล้ว'
              : undoRes.objective === 'roshan'
              ? 'Roshan timer canceled'
              : 'Tormentor timer canceled';
        } else {
          feedbackText =
            lang === 'th-TH'
              ? 'ไม่มีการจับเวลาที่สามารถยกเลิกได้'
              : 'No active timer to cancel';
          audioService.speakVoiceFeedback(feedbackText);
        }
        break;
      }

      case 'roshan_death': {
        objectiveTracker.recordRoshan(clockTime);
        feedbackText =
          lang === 'th-TH'
            ? 'บันทึกเวลาโรชานตายเรียบร้อยแล้ว'
            : 'Roshan death recorded';
        break;
      }

      case 'tormentor_death': {
        objectiveTracker.recordTormentor(clockTime);
        feedbackText =
          lang === 'th-TH'
            ? 'บันทึกเวลาทอร์เมนเตอร์ตายเรียบร้อยแล้ว'
            : 'Tormentor death recorded';
        break;
      }

      case 'enemy_bkb': {
        const id = `bkb_${Math.floor(clockTime)}`;
        this.activeCooldowns = this.activeCooldowns.filter((c) => c.skillOrItem !== 'bkb');
        this.activeCooldowns.push({
          id,
          name: lang === 'th-TH' ? 'BKB ศัตรู' : 'Enemy BKB',
          skillOrItem: 'bkb',
          durationSeconds: 90,
          expiresAtClockTime: clockTime + 90,
          remainingSeconds: 90,
          icon: '🛡️',
        });
        this.notifyCooldowns();
        feedbackText =
          lang === 'th-TH'
            ? 'เริ่มจับเวลา บีเคบี 90 วินาที'
            : 'Enemy BKB tracker started (90s)';
        break;
      }

      case 'enemy_ultimate': {
        const ultKey = rule.param || 'black_hole';
        const ultInfo = ULTIMATE_COOLDOWNS[ultKey] || {
          duration: 150,
          nameTh: ultKey,
          nameEn: ultKey,
        };
        const id = `ult_${ultKey}_${Math.floor(clockTime)}`;
        this.activeCooldowns = this.activeCooldowns.filter((c) => c.skillOrItem !== ultKey);
        this.activeCooldowns.push({
          id,
          name: lang === 'th-TH' ? ultInfo.nameTh : ultInfo.nameEn,
          skillOrItem: ultKey,
          durationSeconds: ultInfo.duration,
          expiresAtClockTime: clockTime + ultInfo.duration,
          remainingSeconds: ultInfo.duration,
          icon: '🌀',
        });
        this.notifyCooldowns();
        feedbackText =
          lang === 'th-TH'
            ? `เริ่มจับเวลา ${ultInfo.nameTh} (${ultInfo.duration}s)`
            : `Enemy ${ultInfo.nameEn} tracker started (${ultInfo.duration}s)`;
        break;
      }

      case 'ward_placed': {
        visionEngine.recordWardPlacement(clockTime);
        feedbackText =
          lang === 'th-TH'
            ? 'บันทึกการปักหวอร์ด 6:00 แล้ว'
            : 'Observer ward (6:00) recorded';
        break;
      }

      case 'hud_toggle': {
        if (this.hudToggleHandler) {
          this.hudToggleHandler();
        }
        feedbackText =
          lang === 'th-TH' ? 'สลับการแสดงผลหน้าต่าง HUD' : 'HUD window toggled';
        break;
      }

      case 'audio_mute': {
        const settings = audioService.getSettings();
        const nextMuted = !settings.voiceEnabled;
        audioService.updateSettings({ voiceEnabled: nextMuted });
        feedbackText =
          lang === 'th-TH'
            ? nextMuted
              ? 'เปิดเสียงแจ้งเตือนแล้ว'
              : 'ปิดเสียงแจ้งเตือนแล้ว'
            : nextMuted
            ? 'Voice alerts unmuted'
            : 'Voice alerts muted';
        break;
      }

      case 'query_rune': {
        const alerts = context?.alerts ?? timingEngine.calculateAlerts(clockTime, false);
        const runeAlert = alerts.find((a) => a.type.startsWith('rune_'));
        if (runeAlert) {
          const sec = runeAlert.secondsRemaining;
          const thaiTitle = runeAlert.type === 'rune_wisdom'
            ? 'รูน EXP'
            : runeAlert.type === 'rune_power'
            ? (runeAlert.title.toLowerCase().includes('water') ? 'รูนน้ำ' : 'รูนแม่น้ำ')
            : runeAlert.type === 'rune_bounty'
            ? 'รูนทอง'
            : runeAlert.title;
          feedbackText =
            lang === 'th-TH'
              ? sec <= 5
                ? `${thaiTitle} กำลังเกิดแล้ว!`
                : `${thaiTitle} ในอีก ${sec} วินาที`
              : sec <= 5
              ? `${runeAlert.title} is spawning now!`
              : `${runeAlert.title} in ${sec} seconds`;
        } else {
          feedbackText =
            lang === 'th-TH'
              ? 'ยังไม่มีรูนใกล้เกิดในขณะนี้'
              : 'No runes spawning soon';
        }
        audioService.speakVoiceFeedback(feedbackText);
        break;
      }

      case 'query_roshan': {
        const rState = timingEngine.getRoshanState();
        if (!rState.isDead) {
          feedbackText =
            lang === 'th-TH' ? 'โรชานยังมีชีวิตอยู่' : 'Roshan is currently alive';
        } else {
          const death = rState.deathClockTime ?? 0;
          const minTime = death + 8 * 60;
          const maxTime = death + 11 * 60;
          const formatMin = (s: number) => {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${sec.toString().padStart(2, '0')}`;
          };
          if (clockTime < minTime) {
            const left = Math.ceil((minTime - clockTime) / 60);
            feedbackText =
              lang === 'th-TH'
                ? `โรชานตาย ช่วงเวลาสุ่มเกิดจะเปิดที่นาที ${formatMin(minTime)} (อีกราว ${left} นาที)`
                : `Roshan dead, window opens at ${formatMin(minTime)} (in ${left}m)`;
          } else if (clockTime <= maxTime) {
            feedbackText =
              lang === 'th-TH'
                ? 'ช่วงเวลาสุ่มเกิดโรชานกำลังเปิดอยู่! เกิดแน่นอนที่นาที ' + formatMin(maxTime)
                : 'Roshan window active! Guaranteed alive at ' + formatMin(maxTime);
          } else {
            feedbackText =
              lang === 'th-TH'
                ? 'โรชานเกิดแล้ว!'
                : 'Roshan is guaranteed alive!';
          }
        }
        audioService.speakVoiceFeedback(feedbackText);
        break;
      }

      case 'query_next_item': {
        const popular = context?.popularItems;
        if (popular && popular.length > 0) {
          const top = popular[0].displayName;
          feedbackText =
            lang === 'th-TH'
              ? `ไอเทมยอดนิยมที่แนะนำถัดไป: ${top}`
              : `Recommended next item: ${top}`;
        } else {
          feedbackText =
            lang === 'th-TH'
              ? 'แนะนำออกไอเทมตามสถานะศัตรูในหน้าไกด์'
              : 'Check Item Guide for situational build';
        }
        audioService.speakVoiceFeedback(feedbackText);
        break;
      }

      case 'query_buyback': {
        const bb = context?.coachState?.buyback;
        if (bb) {
          if (bb.hasBuyback) {
            feedbackText =
              lang === 'th-TH' ? 'คุณมีเงินพอสำหรับบายแบ็ค' : 'Buyback is ready';
          } else {
            feedbackText =
              lang === 'th-TH'
                ? `ขาดเงินอีก ${bb.deficit} สำหรับบายแบ็ค`
                : `Need ${bb.deficit} more gold for buyback`;
          }
        } else {
          feedbackText =
            lang === 'th-TH'
              ? 'ไม่สามารถตรวจสอบบายแบ็คได้ในขณะนี้'
              : 'Buyback status currently unavailable';
        }
        audioService.speakVoiceFeedback(feedbackText);
        break;
      }

      case 'query_lotus': {
        const nextLotusSec = clockTime <= 180 ? 180 : 180 + Math.ceil((clockTime - 180) / 180) * 180;
        const sec = Math.max(0, Math.ceil(nextLotusSec - clockTime));
        feedbackText =
          lang === 'th-TH'
            ? sec <= 5
              ? 'ดอกบัวฟื้นฟู กำลังเกิดแล้ว!'
              : `ดอกบัวฟื้นฟู ในอีก ${sec} วินาที`
            : sec <= 5
            ? 'Healing Lotus is spawning now!'
            : `Healing Lotus in ${sec} seconds`;
        audioService.speakVoiceFeedback(feedbackText);
        break;
      }
    }

    const result: VoiceRecognitionResult = {
      id: `voice_${Date.now()}`,
      transcript,
      intent: rule.intent,
      confidence,
      matchedPhrase: phrase,
      timestamp: Date.now(),
      feedbackText,
      success: true,
      isQuery,
    };

    this.notifyResult(result);
    return result;
  }

  public reset() {
    this.stopPtt();
    this.lastPttActiveTime = 0;
    this.activeCooldowns = [];
    this.lastResult = null;
    this.notifyCooldowns();
  }
}

export const voiceCommandService = new VoiceCommandService();
