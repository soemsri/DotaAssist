import { GSIPayload } from "../types/gsi";

export type GSICallback = (payload: GSIPayload) => void;

class GSIService {
  private listeners: Set<GSICallback> = new Set();
  private lastPayload: GSIPayload | null = null;
  private isConnected: boolean = false;
  private unlistenTauri: (() => void) | null = null;
  private lastHeartbeatTime: number = 0;

  constructor() {
    this.initTauriListener();
  }

  private async initTauriListener() {
    try {
      // Tauri injects this bridge only inside the desktop webview.
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { listen } = await import("@tauri-apps/api/event");
        this.unlistenTauri = await listen<GSIPayload>("gsi-update", (event) => {
          this.handlePayload(event.payload);
        });
        console.info("[GSIService] Tauri GSI event listener active");
      }
    } catch (err) {
      console.warn("[GSIService] Tauri API not available:", err);
    }
  }

  public subscribe(cb: GSICallback): () => void {
    this.listeners.add(cb);
    if (this.lastPayload && this.getIsConnected()) {
      cb(this.lastPayload);
    }
    return () => {
      this.listeners.delete(cb);
    };
  }

  public handlePayload(payload: GSIPayload) {
    this.isConnected = true;
    this.lastHeartbeatTime = Date.now();
    this.lastPayload = payload;
    this.listeners.forEach((cb) => cb(payload));
  }

  public getLastPayload(): GSIPayload | null {
    return this.lastPayload;
  }

  public getIsConnected(): boolean {
    // If no payload has been received within 35s, consider GSI disconnected
    if (this.isConnected && Date.now() - this.lastHeartbeatTime > 35000) {
      this.isConnected = false;
    }
    return this.isConnected;
  }

  public cleanup() {
    if (this.unlistenTauri) {
      this.unlistenTauri();
      this.unlistenTauri = null;
    }
  }
}

export const gsiService = new GSIService();
