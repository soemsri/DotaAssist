import { GSIPayload } from '../types/gsi';
import { audioService } from './audioService';

export interface BuybackStatus {
  hasBuyback: boolean;
  canAfford: boolean;
  cost: number;
  cooldown: number;
  currentGold: number;
  surplusGold: number;
  missingGold: number;
  isLateGame: boolean;
}

class BuybackService {
  private lastSpokenClockTime: number = -9999;
  private minAlertIntervalSeconds: number = 180; // 3-minute cooldown between voice warnings

  public calculateBuyback(payload: GSIPayload | null): BuybackStatus {
    const gold = payload?.player?.gold ?? 0;
    const cost = payload?.hero?.buyback_cost ?? 0;
    const cooldown = payload?.hero?.buyback_cooldown ?? 0;
    const clockTime = payload?.map?.clock_time ?? 0;

    const canAfford = gold >= cost;
    const hasBuyback = cooldown === 0 && canAfford && (cost > 0 || gold > 0);
    const surplusGold = gold - cost;
    const missingGold = Math.max(0, cost - gold);
    const isLateGame = clockTime >= 1800; // 30:00+

    return {
      hasBuyback,
      canAfford,
      cost,
      cooldown,
      currentGold: gold,
      surplusGold,
      missingGold,
      isLateGame,
    };
  }

  public checkObjectiveLinkedAlert(
    objectiveLabel: string,
    payload: GSIPayload | null,
    forceCheck = false
  ): boolean {
    if (!payload) return false;
    const status = this.calculateBuyback(payload);
    const clockTime = payload.map?.clock_time ?? 0;

    // Only alert if in late-game (30:00+) or forced, and buyback is NOT ready
    if ((!status.isLateGame && !forceCheck) || status.hasBuyback) {
      return false;
    }

    // Cooldown check to prevent repeated spam
    if (clockTime - this.lastSpokenClockTime < this.minAlertIntervalSeconds) {
      return false;
    }

    this.lastSpokenClockTime = clockTime;

    const isThai = audioService.getSettings().voiceLanguage === 'th-TH';
    const objName = isThai
      ? (objectiveLabel.toLowerCase().includes('wisdom')
          ? 'รูน EXP'
          : objectiveLabel.toLowerCase().includes('tormentor')
          ? 'บอสทอร์เมนเตอร์'
          : objectiveLabel.toLowerCase().includes('roshan')
          ? 'โรชาน'
          : objectiveLabel)
      : objectiveLabel;

    if (status.cooldown > 0) {
      const msg = isThai
        ? `ระวัง! ใกล้ถึงจังหวะ ${objName} แต่บายแบ็คยังติดคูลดาวน์อีก ${status.cooldown} วินาที`
        : `Caution: ${objectiveLabel} soon, and Buyback is on cooldown for ${status.cooldown} seconds.`;
      audioService.speak(msg, undefined, 'roshan');
    } else if (status.missingGold > 0) {
      const msg = isThai
        ? `ระวัง! ใกล้ถึงจังหวะ ${objName} แต่บายแบ็คยังไม่พร้อม ขาดเงินอีก ${status.missingGold}`
        : `Caution: ${objectiveLabel} soon, and Buyback is not ready. Missing ${status.missingGold} gold.`;
      audioService.speak(msg, undefined, 'roshan');
    }

    return true;
  }

  public resetAlerts() {
    this.lastSpokenClockTime = -9999;
  }
}

export const buybackService = new BuybackService();
