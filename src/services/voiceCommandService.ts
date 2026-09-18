import {
  EnemyCooldownTracker,
  VoiceAssistantStatus,
  VoiceCommandRule,
  VoiceRecognitionResult,
} from '../types/voice';
import { audioService } from './audioService';
import { timingEngine } from './timingEngine';
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
  // 1. Roshan Death
  {
    intent: 'roshan_death',
    phrasesTh: ['โรชานตาย', 'ฆ่าโรชาน', 'โรชานล้ม', 'โรชานดับ', 'จดเวลาโรชาน', 'โรชาน'],
    phrasesEn: ['roshan dead', 'roshan down', 'roshan killed', 'roshan died', 'kill roshan', 'record roshan'],
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
  private hudToggleHandler: HudToggleHandler | null = null;
  private lastClockTime: number = 0;
  private shouldBeListening: boolean = false;

  constructor() {
    this.initRecognition();
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
        this.processTranscript(transcript, confidence, this.lastClockTime);
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
   * Matches transcript against configured rules
   */
  public matchCommand(
    rawText: string,
    lang: 'th-TH' | 'en-US' = audioService.getSettings().voiceLanguage
  ): { rule: VoiceCommandRule; phrase: string } | null {
    const text = rawText.toLowerCase().trim().replace(/[,.!?]/g, '');
    if (!text) return null;

    // Check language-specific phrases first
    for (const rule of COMMAND_RULES) {
      const phrases = lang === 'th-TH' ? rule.phrasesTh : rule.phrasesEn;
      for (const phrase of phrases) {
        if (text.includes(phrase.toLowerCase())) {
          return { rule, phrase };
        }
      }
    }

    // Fallback cross-language check (user might speak English while in Thai mode or vice versa)
    for (const rule of COMMAND_RULES) {
      const alternatePhrases = lang === 'th-TH' ? rule.phrasesEn : rule.phrasesTh;
      for (const phrase of alternatePhrases) {
        if (text.includes(phrase.toLowerCase())) {
          return { rule, phrase };
        }
      }
    }

    return null;
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
    }
  ): VoiceRecognitionResult {
    const lang = audioService.getSettings().voiceLanguage;
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
      case 'roshan_death': {
        timingEngine.recordRoshanDeath(clockTime);
        feedbackText =
          lang === 'th-TH'
            ? 'บันทึกเวลาโรชานตายเรียบร้อยแล้ว'
            : 'Roshan death recorded';
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
          feedbackText =
            lang === 'th-TH'
              ? sec <= 5
                ? `${runeAlert.title} กำลังเกิดแล้ว!`
                : `${runeAlert.title} ในอีก ${sec} วินาที`
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
                ? `โรชานตาย หน้าต่างเกิดจะเปิดที่นาที ${formatMin(minTime)} (อีกราว ${left} นาที)`
                : `Roshan dead, window opens at ${formatMin(minTime)} (in ${left}m)`;
          } else if (clockTime <= maxTime) {
            feedbackText =
              lang === 'th-TH'
                ? 'หน้าต่างเกิดโรชานกำลังเปิดอยู่! เกิดแน่นอนที่นาที ' + formatMin(maxTime)
                : 'Roshan window active! Guaranteed alive at ' + formatMin(maxTime);
          } else {
            feedbackText =
              lang === 'th-TH'
                ? 'โรชานเกิดแน่นอนแล้ว!'
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
                ? `ขาดเงินอีก ${bb.deficit} โกลด์ สำหรับบายแบ็ค`
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
    this.activeCooldowns = [];
    this.lastResult = null;
    this.notifyCooldowns();
  }
}

export const voiceCommandService = new VoiceCommandService();
