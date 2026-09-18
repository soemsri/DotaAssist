## Desktop alignment — 2026-09-17

- Windows Tauri is the primary release. `npm start` runs native development; `npm run dev:browser` explicitly starts the browser bridge. `npm run build:windows` produces an NSIS installer on Windows.
- Overlay entry defaults to click-through. The configurable global hotkey (default `Ctrl+Shift+F10`) toggles mouse interaction without requesting focus. Registration failure blocks overlay entry and appears in Settings. Hotkey and installation path persist in the app configuration directory.
- First launch opens Settings. Steam registry/default locations and `libraryfolders.vdf` provide installation candidates. The user selects or pastes a folder and confirms before installation. Existing DotaAssist GSI configuration receives a unique `.bak.N` backup. Connection verification requires incoming Dota 2 data; saving a file alone does not verify a connection.
- Windows installer, global hotkey behavior over Dota 2, and FPS impact require testing on a Windows gaming machine.

# DotaAssist — Project Context & Architecture Guide

## 1. Project Vision
**DotaAssist** is an in-game overlay and strategic assistant application for Valve's Dota 2. It delivers real-time timing alerts, spoken voice announcements (TTS), counter-pick recommendations, and dynamic item builds. Runtime memory and FPS impact must be measured on the target operating system and hardware.

---

## 2. Core Architecture Choices (Interview Alignment)

1. **In-Game Overlay & Real-time Assistant**:
   - Dual interface modes:
     - **In-Game Overlay HUD**: Compact, translucent, floating widget showing immediate objective timers, situational warnings, and quick item advice.
     - **Strategy & Analysis Dashboard**: Comprehensive multi-tab interface designed for hero pick/drafting phase, dual monitors, or strategy review.
2. **Tauri (Rust + React/TypeScript)**:
   - Uses the operating system WebView instead of bundling Chromium. Actual memory and FPS impact must be benchmarked on each target platform.
   - Native OS transparent window integration with `alwaysOnTop` and dynamic window resizing between Overlay HUD (360x520) and Strategy Dashboard (1280x840).
   - Built-in embedded Rust HTTP server (`tiny_http`) for receiving local Dota 2 GSI payloads at localhost:3001.
3. **Voice Announcer & Sound Engine**:
   - Web Speech API (TTS) voice announcements for upcoming objectives (Wisdom Shrine, Power Rune, Tormentor, Roshan, Aegis Expiration, Day/Night Cycle).
   - Zero-dependency Web Audio API synthesizer for clean chime cues.
4. **Hybrid Data Flow: Local GSI + Public Meta APIs**:
   - **Local Dota 2 GSI (Game State Integration)**: High-speed local HTTP POST feed emitted by the Dota 2 game client on port `3001/gsi` containing clock time, hero status, inventory, gold, health, mana, and live draft.
   - **OpenDota API**: Public cloud API for ranked hero win rates, matchup records, and per-hero item-popularity buckets. If a request fails, the UI exposes the unavailable state and does not synthesize replacement values.

---

## 3. Domain Terminology

| Term | Definition |
|---|---|
| **GSI (Game State Integration)** | Dota 2 engine feature that exports game state to a local HTTP webhook. DotaAssist uses this feed without memory reads, DLL injection, or input automation. |
| **Bounty Runes** | Spawns at 0:00 and every 4 minutes (4:00, 8:00, 12:00...), granting team-wide gold. |
| **Power Runes** | Spawns at River runes every 2 minutes starting from 6:00 (Haste, Double Damage, Arcane, Invisibility, Regen, Shield). Water runes spawn at 2:00 & 4:00. |
| **Wisdom Shrines** | Team XP objectives whose countdown becomes available every 7 minutes (7:00, 14:00, 21:00, 28:00...). |
| **Tormentor** | High-durability objective spawning at 20:00, granting an Aghanim's Shard to the lowest net-worth support. Respawns 10 minutes after being destroyed. |
| **Lotus Pools** | Spawns healing fruit every 3 minutes (3:00, 6:00, 9:00...) in the side lanes. |
| **Roshan Respawn Window** | When Roshan dies, Aegis of the Immortal expires after 5 minutes (300s). Roshan respawns at a random timestamp between 8 and 11 minutes (480s to 660s) post-slain. |
| **Day / Night Cycle** | Transitions every 5 minutes (300s), changing vision and other map conditions. Roshan movement is not inferred from this clock. |
| **Counter Edge** | Counter hero win rate against the selected target minus the neutral 50% baseline, calculated from OpenDota `games_played` and target-hero `wins`. |

---

## 4. State Rules & Pipeline

```
  +------------------+         HTTP POST (port 3001)        +----------------------+
  |   Dota 2 Client  | -----------------------------------> | Tauri Rust Backend   |
  |  (Official GSI)  |                                      | (tiny_http listener) |
  +------------------+                                      +----------------------+
                                                                       |
                                                               Tauri Event IPC ("gsi-update")
                                                                       |
                                                                       v
+------------------------+   Matchup / Popular Item Data    +----------------------+
|    OpenDota API        | -------------------------------> | React Frontend App   |
| (Live responses only)  |                                  | (Timing / Draft HUD) |
+------------------------+                                  +----------------------+
```

### Alert Thresholds:
- **Ruleset marker**: Hard-coded objective intervals are audited for Dota 2 `7.41e`; re-audit them after a major gameplay patch.
- **Audio & Voice Trigger**: Spoken voice announcement and audio chimes fired 15–30 seconds prior to rune/objective spawn.
- **Urgent Visual Pulsing**: Displays warning animation when time remaining is $\le$ 20 seconds.
- **Roshan Tracker**: Synchronizes from optional GSI map/Roshan/event fields when present and retains a one-click manual fallback.
- **Tormentor Tracker**: Starts a 10-minute respawn timer from a GSI event when available or from the manual HUD control.

---

## 5. File Structure
- `public/gamestate_integration_dotaassist.cfg`: Configuration template for Dota 2 client.
- `src-tauri/`: Rust backend, embedded GSI HTTP server (port 3001), dynamic window controls.
- `src/services/`:
  - `gsiService.ts`: Real-time GSI stream receiver from Tauri IPC / Dota 2 client.
  - `timingEngine.ts`: Objective timing calculations (Bounty, Power, Wisdom, Roshan, Tormentor) with float-tolerant threshold triggers.
  - `draftService.ts`: Resolves the opponent draft side from the local player's actual GSI team.
  - `apiService.ts`: OpenDota live statistics and item-popularity integration; bundled catalogs contain lookup metadata only.
  - `audioService.ts`: Web Speech API (TTS) voice announcer + Web Audio API synthesizer.
- `src/components/`:
  - `OverlayHUD.tsx`: Compact draggable/floating in-game HUD with quick Roshan button & audio controls.
  - `TimingAlerts.tsx`: Interactive countdown cards with Roshan tracker.
  - `DraftAdvisor.tsx`: Counter-pick calculator and win-rate analyzer.
  - `ItemGuide.tsx`: Popular item phases derived from current OpenDota responses.
  - `GSIStatusBadge.tsx`: Connection health, hero vitality, and game clock.
  - `SettingsModal.tsx`: GSI config guide, voice synthesizer tester, and Dota 2 Borderless Window guide.
