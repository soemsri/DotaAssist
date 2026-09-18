import { audioService } from './audioService';
import { gsiService } from './gsiService';

export interface MinimapScanResult {
  enemies_visible_count: number;
  all_missing: boolean;
  scanned: boolean;
  message: string;
}

export type MinimapScanCallback = (result: MinimapScanResult) => void;

class MinimapScannerService {
  private intervalId: number | null = null;
  private lastAlertTime: number = 0;
  private wasAllMissing = false;
  private hasSeenEnemies = false;
  private lastMatchId: string | null = null;
  private scanInFlight = false;
  private lastResult: MinimapScanResult | null = null;
  private listeners: Set<MinimapScanCallback> = new Set();
  private isRunning: boolean = false;
  private cooldownMs: number = 45_000; // 45s cooldown between missing enemy audio announcements
  private customPredicate?: () => boolean;

  public subscribe(cb: MinimapScanCallback): () => void {
    this.listeners.add(cb);
    if (this.lastResult) {
      cb(this.lastResult);
    }
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getLastResult(): MinimapScanResult | null {
    return this.lastResult;
  }

  private shouldScan(): boolean {
    // Screen capture is only implemented by the native Tauri command. Avoid
    // scanning the user's desktop in browser/SSE mode and avoid false alerts
    // before the first real in-game GSI payload arrives.
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      return false;
    }

    if (this.customPredicate && !this.customPredicate()) return false;
    const isConnected = gsiService.getIsConnected();
    if (!isConnected) return false;

    const state = gsiService.getLastPayload()?.map?.game_state;
    if (state !== 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS') {
      return false;
    }

    return true;
  }

  public start(shouldScanPredicate?: () => boolean) {
    this.customPredicate = shouldScanPredicate;
    if (this.isRunning) return;
    this.isRunning = true;

    if (typeof window === 'undefined') return;

    // Run a responsive scan every 10 seconds.
    this.intervalId = window.setInterval(async () => {
      const currentSettings = audioService.getSettings();
      if (!currentSettings.minimapScannerEnabled) return;

      if (!this.shouldScan()) return;

      await this.scanOnce();
    }, 10_000);
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalId !== null) {
      if (typeof window !== 'undefined') {
        window.clearInterval(this.intervalId);
      }
      this.intervalId = null;
    }
  }

  public async scanOnce(): Promise<MinimapScanResult | null> {
    if (typeof window === 'undefined' || this.scanInFlight) return null;

    this.scanInFlight = true;

    try {
      if ('__TAURI_INTERNALS__' in window) {
        const { invoke } = await import('@tauri-apps/api/core');
        const pos = audioService.getSettings().minimapPosition;
        const payload = gsiService.getLastPayload();
        const playerTeam = payload?.player?.team_name ?? 'radiant';
        const clockTime = payload?.map?.clock_time ?? 0;
        const matchId = payload?.map?.matchid?.trim() || null;

        if (matchId && this.lastMatchId && matchId !== this.lastMatchId) {
          this.resetState();
        }
        if (matchId) this.lastMatchId = matchId;

        const res = await invoke<MinimapScanResult>('scan_minimap', {
          position: pos,
          playerTeam,
        });

        this.lastResult = res;
        this.listeners.forEach((cb) => cb(res));

        if (res.scanned) {
          if (res.enemies_visible_count > 0) {
            // Enemies have been sighted in vision
            this.hasSeenEnemies = true;
            this.wasAllMissing = false;
          } else if (res.all_missing) {
            // Trigger voice announcement when transitioning from visible into all missing
            // Suppress in the opening 60s before laners clash or before any enemy is seen
            const shouldAlert =
              this.hasSeenEnemies &&
              !this.wasAllMissing &&
              clockTime >= 60;

            if (shouldAlert) {
              const now = Date.now();
              if (now - this.lastAlertTime >= this.cooldownMs) {
                this.lastAlertTime = now;
                audioService.playAllEnemiesMissingAlert();
              }
            }
            this.wasAllMissing = true;
          }
        }

        return res;
      }
    } catch (err) {
      console.warn('[MinimapScanner] Scan error:', err);
    } finally {
      this.scanInFlight = false;
    }

    return null;
  }

  public resetState() {
    this.lastAlertTime = 0;
    this.wasAllMissing = false;
    this.hasSeenEnemies = false;
    this.lastResult = null;
    this.lastMatchId = null;
  }

  public resetCooldown() {
    this.resetState();
  }
}

export const minimapScanner = new MinimapScannerService();
