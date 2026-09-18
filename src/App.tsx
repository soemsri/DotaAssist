import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GSIPayload } from "./types/gsi";
import { gsiService } from "./services/gsiService";
import { DOTA_RULESET_VERSION, timingEngine } from "./services/timingEngine";
import { apiService } from "./services/apiService";
import { audioService } from "./services/audioService";
import { minimapScanner, MinimapScanResult } from "./services/minimapScanner";
import { tacticalCoach } from "./services/tacticalCoach";
import { TimingEventAlert, PopularItem } from "./types/meta";
import { GSIStatusBadge } from "./components/GSIStatusBadge";
import { TimingAlerts } from "./components/TimingAlerts";
import { DraftAdvisor } from "./components/DraftAdvisor";
import { ItemGuide } from "./components/ItemGuide";
import { TacticalCoachPanel } from "./components/TacticalCoachPanel";
import { OverlayHUD } from "./components/OverlayHUD";
import { SettingsModal } from "./components/SettingsModal";
import { VisionWardMap } from "./components/VisionWardMap";
import { Monitor, SlidersHorizontal, ShieldCheck, Swords, Clock, Sparkles, Minus, X, Volume2, ExternalLink, Zap, Eye } from "lucide-react";

export const App: React.FC = () => {
  const [payload, setPayload] = useState<GSIPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [overlayMode, setOverlayMode] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"timers" | "coach" | "draft" | "items" | "vision">("timers");
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [minimapResult, setMinimapResult] = useState<MinimapScanResult | null>(minimapScanner.getLastResult());
  const [isTauri, setIsTauri] = useState<boolean>(false);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  const lastRenderTimeRef = useRef<number>(0);
  const lastClockTimeRef = useRef<number | null>(null);
  const lastGameStateRef = useRef<string | null>(null);

  useEffect(() => {
    const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    setIsTauri(hasTauri);
  }, []);

  // Sync window Always-on-top, size, and decorations with Tauri backend
  useEffect(() => {
    if (isTauri) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("toggle_overlay_window", { overlay: overlayMode }).catch(console.error);
      });
    }
  }, [overlayMode, isTauri]);

  useEffect(() => {
    // Initial data load for heroes and live stats
    apiService.initData();

    // Unlock audio context on startup
    audioService.initContext();

    // Subscribe to genuine GSI events from Dota 2
    const unsubscribe = gsiService.subscribe((data) => {
      timingEngine.handleGSIPayload(data);

      // Throttle React DOM re-renders to eliminate CPU/GPU stutter:
      // Re-render only when whole second ticks (1Hz), game_state changes, or 1000ms elapses
      const now = Date.now();
      const rawClock = data.map?.clock_time;
      const clockSec = rawClock !== undefined && rawClock !== null ? Math.floor(rawClock) : null;
      const gameState = data.map?.game_state ?? null;

      const clockChanged = clockSec !== null && clockSec !== lastClockTimeRef.current;
      const stateChanged = gameState !== lastGameStateRef.current;
      const timeElapsed = now - lastRenderTimeRef.current >= 1000;

      if (clockChanged || stateChanged || timeElapsed || !lastRenderTimeRef.current) {
        lastClockTimeRef.current = clockSec;
        lastGameStateRef.current = gameState;
        lastRenderTimeRef.current = now;
        setPayload(data);
        setIsConnected(true);
      }
    });

    const unsubMinimap = minimapScanner.subscribe((res) => {
      setMinimapResult(res);
    });

    const connectionMonitor = window.setInterval(() => {
      setIsConnected(gsiService.getIsConnected());
    }, 1000);

    return () => {
      unsubscribe();
      unsubMinimap();
      window.clearInterval(connectionMonitor);
    };
  }, []);

  const livePayload = isConnected ? payload : null;
  const clockTime = livePayload?.map?.clock_time ?? 0;
  const isPreGame = livePayload?.map?.game_state === "DOTA_GAMERULES_STATE_PRE_GAME";
  const alerts: TimingEventAlert[] = livePayload?.map
    ? timingEngine.calculateAlerts(clockTime, isPreGame)
    : [];
  const heroName = livePayload?.hero?.name;
  const coachState = tacticalCoach.process(livePayload, minimapResult);

  useEffect(() => {
    let cancelled = false;
    const hero = heroName ? apiService.getHeroByName(heroName) : undefined;

    if (!hero) {
      setPopularItems([]);
      return;
    }

    setPopularItems([]);
    apiService
      .getPopularItemsForHero(hero.id)
      .then((items) => {
        if (!cancelled) setPopularItems(items);
      })
      .catch(() => {
        if (!cancelled) setPopularItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [heroName]);

  // Start minimap scanner lifecycle (only active when enabled in Settings)
  useEffect(() => {
    minimapScanner.start();

    return () => {
      minimapScanner.stop();
    };
  }, []);

  const closePiP = useCallback(() => {
    const pipWindow = pipWindowRef.current;
    pipWindowRef.current = null;
    setPipContainer(null);
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
  }, []);

  useEffect(() => () => {
    const pipWindow = pipWindowRef.current;
    pipWindowRef.current = null;
    if (pipWindow && !pipWindow.closed) pipWindow.close();
  }, []);

  // Handle Document Picture-in-Picture for browser users
  const handleOpenPiP = async () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus();
      return;
    }

    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await (window as unknown as {
          documentPictureInPicture: {
            requestWindow: (options: { width: number; height: number }) => Promise<Window>;
          };
        }).documentPictureInPicture.requestWindow({ width: 340, height: 480 });

        // Copy styles
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
          pipWindow.document.head.appendChild(el.cloneNode(true));
        });

        // Render Overlay HUD inside PiP
        const container = pipWindow.document.createElement('div');
        container.id = 'pip-root';
        pipWindow.document.body.appendChild(container);
        pipWindow.document.body.className = 'bg-slate-950 text-slate-100 overflow-hidden select-none m-0 p-0';
        pipWindowRef.current = pipWindow;
        setPipContainer(container);

        pipWindow.addEventListener('pagehide', () => {
          if (pipWindowRef.current === pipWindow) {
            pipWindowRef.current = null;
            setPipContainer(null);
          }
        }, { once: true });
      } catch (err) {
        console.warn('Document PiP failed, fallback to in-window overlay:', err);
        setOverlayMode(true);
      }
    } else {
      setOverlayMode(true);
    }
  };

  const pipOverlay = pipContainer
    ? createPortal(
        <OverlayHUD
          payload={livePayload}
          isConnected={isConnected}
          alerts={alerts}
          items={popularItems}
          coachState={coachState}
          scanResult={minimapResult}
          onOpenSettings={() => {
            setSettingsOpen(true);
            window.focus();
          }}
          onExitOverlay={closePiP}
        />,
        pipContainer,
      )
    : null;

  // If in overlay mode, render compact HUD
  if (overlayMode) {
    return (
      <>
        <div className="w-screen h-screen bg-transparent select-none overflow-hidden relative">
          <OverlayHUD
            payload={livePayload}
            isConnected={isConnected}
            alerts={alerts}
            items={popularItems}
            coachState={coachState}
            scanResult={minimapResult}
            onOpenSettings={() => setSettingsOpen(true)}
            onExitOverlay={() => setOverlayMode(false)}
          />
          <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
        {pipOverlay}
      </>
    );
  }

  // Dashboard / Strategy Mode
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Header with Drag Region and Controls */}
      <header
        data-tauri-drag-region
        className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-3 cursor-move select-none"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div data-tauri-drag-region className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Swords className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200">
                  DotaAssist
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-semibold border border-slate-700">
                  v1.0 · Rules {DOTA_RULESET_VERSION} {isTauri ? '(Native)' : '(Web / PiP)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                In-Game Real-Time Assistant, Voice Announcer &amp; Timing Engine
              </p>
            </div>
          </div>

          {/* Action & Window Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => audioService.playWisdomShrineAlert()}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition flex items-center gap-1.5 text-xs px-2.5"
              title="Test Voice & Sound Announcer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Test Audio</span>
            </button>

            {/* Switch to Overlay HUD */}
            {isTauri ? (
              <button
                onClick={() => setOverlayMode(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Switch to Overlay HUD</span>
              </button>
            ) : (
              <button
                onClick={handleOpenPiP}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                title="Pop out Always-On-Top floating HUD"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Floating HUD (PiP)</span>
              </button>
            )}

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="GSI Setup & Voice Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {isTauri && (
              <>
                <button
                  onClick={async () => {
                    const { getCurrentWindow } = await import("@tauri-apps/api/window");
                    getCurrentWindow().minimize();
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Minimize"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  onClick={async () => {
                    const { getCurrentWindow } = await import("@tauri-apps/api/window");
                    getCurrentWindow().close();
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 border border-slate-700 transition"
                  title="Close Application"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Helpful Dota 2 Borderless Window Banner */}
      <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px]">NOTE</span>
            <span>For HUD to stay visible over Dota 2: In Dota 2 Settings ➜ Video ➜ set Display Mode to <strong className="text-white">Borderless Window</strong>.</span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-amber-400 hover:underline font-semibold text-[11px]"
          >
            Setup Guide ➜
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-5 space-y-5">
        {/* Live GSI Status Bar */}
        <GSIStatusBadge
          payload={livePayload}
          isConnected={isConnected}
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("timers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "timers"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Timings & Runes ({alerts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("coach")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "coach"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Tactical Coach &amp; Talents</span>
          </button>

          <button
            onClick={() => setActiveTab("draft")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "draft"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Draft & Counter Advisor</span>
          </button>

          <button
            onClick={() => setActiveTab("items")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "items"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Item Guides & Builds</span>
          </button>

          <button
            onClick={() => setActiveTab("vision")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "vision"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Vision & Ward Map</span>
          </button>
        </div>

        {/* Active Tab View */}
        <div className="space-y-5">
          {activeTab === "coach" && (
            <div className="space-y-5">
              <TacticalCoachPanel
                coachState={coachState}
                payload={livePayload}
                isConnected={isConnected}
                minimapResult={minimapResult}
              />
            </div>
          )}
          {activeTab === "timers" && (
            <div className="space-y-5">
              <TimingAlerts alerts={alerts} clockTime={clockTime} />
              <ItemGuide
                heroName={heroName}
                currentGold={livePayload?.player?.gold}
              />
            </div>
          )}

          {activeTab === "draft" && (
            <div className="space-y-5">
              <DraftAdvisor
                draft={livePayload?.draft}
                playerTeam={livePayload?.player?.team_name}
              />
              <TimingAlerts alerts={alerts} clockTime={clockTime} />
            </div>
          )}

          {activeTab === "items" && (
            <div className="space-y-5">
              <ItemGuide
                heroName={heroName}
                currentGold={livePayload?.player?.gold}
              />
              <DraftAdvisor
                draft={livePayload?.draft}
                playerTeam={livePayload?.player?.team_name}
              />
            </div>
          )}

          {activeTab === "vision" && (
            <div className="space-y-5">
              <VisionWardMap
                coachState={coachState}
                payload={livePayload}
                isConnected={isConnected}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        DotaAssist — Powered by Tauri (Rust + React) &amp; Dota 2 Game State Integration (GSI)
      </footer>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {pipOverlay}
    </div>
  );
};

export default App;
