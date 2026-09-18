import { TimingEventAlert } from '../types/meta';
import { TIMING_RULES } from '../data/timingRules';
import { alertProfiles } from './alertProfiles';

export class CampStackService {
  /**
   * Calculates the Camp Stacking timing alert card for the current game clock.
   * Decision 1: Active only between 1:00 (60s) and 15:00 (900s).
   * Decision 3: Appears 20 seconds before :53 pull timing (:33 - :53),
   * counting down to :53, and automatically disappears after :55.
   */
  public calculateStackAlert(clockTime: number): TimingEventAlert | null {
    if (clockTime < TIMING_RULES.stackStartClock || clockTime > TIMING_RULES.stackEndClock) {
      return null;
    }

    const currentSec = Math.floor(clockTime);
    const minuteStart = Math.floor(currentSec / 60) * 60;
    const secInMinute = currentSec - minuteStart;

    // Window: :33 through :55 of the minute
    const leadSec = TIMING_RULES.stackPullSec - TIMING_RULES.stackLeadSec; // 53 - 20 = 33
    if (secInMinute >= leadSec && secInMinute <= TIMING_RULES.stackWindowEndSec) {
      const targetSec = minuteStart + TIMING_RULES.stackPullSec;
      const diff = Math.max(0, targetSec - currentSec);

      return {
        id: `camp_stack_${targetSec}`,
        title: 'Camp Stacking',
        subtitle: diff === 0 ? 'Pull creeps NOW (window closes at :55)!' : 'Pull neutral creeps at :53',
        targetSeconds: targetSec,
        secondsRemaining: diff,
        type: 'camp_stack',
        urgent: diff <= 10,
      };
    }

    return null;
  }

  /**
   * Evaluates whether the voice prompt 'Stack camp in 10 seconds' should trigger at :43.
   * Decision 2: Triggers at :43 (10s before :53 pull). Yields / suppresses voice if
   * a major objective alert (runes, roshan, tormentor, neutral tier) is active or imminent (diff <= 25s).
   */
  public shouldPlayVoice(
    clockTime: number,
    previousClockTime: number,
    activeAlerts: TimingEventAlert[],
  ): boolean {
    if (clockTime < TIMING_RULES.stackStartClock || clockTime > TIMING_RULES.stackEndClock) {
      return false;
    }

    const currentSec = Math.floor(clockTime);
    const minuteStart = Math.floor(currentSec / 60) * 60;
    const targetVoiceSec = minuteStart + (TIMING_RULES.stackPullSec - 10); // 53 - 10 = 43

    const justCrossedVoiceSec =
      previousClockTime < targetVoiceSec &&
      currentSec >= targetVoiceSec &&
      currentSec <= targetVoiceSec + 2;

    if (!justCrossedVoiceSec) {
      return false;
    }

    // Yield check: if a major objective with voice reminders is active within 25 seconds, yield.
    // Note: lotus pool does not have a spoken voice alert, so it does not conflict.
    const hasMajorObjective = activeAlerts.some(
      (a) =>
        a.type !== 'camp_stack' &&
        a.type !== 'lotus' &&
        alertProfiles.enabled(a.type) &&
        a.secondsRemaining <= 25,
    );

    if (hasMajorObjective) {
      return false;
    }

    return true;
  }
}

export const campStackService = new CampStackService();
