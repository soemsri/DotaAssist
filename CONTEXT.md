# DotaAssist — Project Context & Architecture Guide

## 1. Project Vision
**DotaAssist** is an ultra-lightweight in-game overlay and strategic assistant application for Valve's Dota 2. It delivers real-time timing alerts, counter-pick recommendations, and dynamic item builds without impacting gameplay performance or FPS.

---

## 2. Core Architecture Choices (Interview Alignment)

1. **In-Game Overlay & Real-time Assistant**:
   - Dual interface modes:
     - **In-Game Overlay HUD**: Compact, translucent, floating widget showing immediate objective timers, situational warnings, and quick item advice.
     - **Strategy & Analysis Dashboard**: Comprehensive multi-tab interface designed for hero pick/drafting phase, dual monitors, or strategy review.
2. **Tauri (Rust + React/TypeScript)**:
   - Ultra-low memory footprint (~10-25 MB RAM total vs ~300-600 MB in Electron).
   - Zero measurable FPS degradation during intense Dota 2 team fights.
   - Native OS transparent window integration with `alwaysOnTop` and click-through options.
   - Built-in embedded Rust HTTP server (`tiny_http`) for receiving Dota 2 GSI payloads directly at localhost with zero latency.
3. **Hybrid Data Flow: Local GSI + Public Meta APIs**:
   - **Local Dota 2 GSI (Game State Integration)**: High-speed local HTTP POST feed emitted by the Dota 2 game client on port `3000/gsi` containing clock time, hero status, inventory, gold, health, mana, and live draft.
   - **Stratz / OpenDota API**: Public cloud APIs for global hero win rates, matchup matrices (+% advantage counters), and popular meta builds, paired with an offline fallback cache.

---

## 3. Domain Terminology

| Term | Definition |
|---|---|
| **GSI (Game State Integration)** | Valve's official engine feature in Dota 2 that exports live game events to an HTTP webhook listener. Completely VAC-safe and authorized. |
| **Bounty Runes** | Spawns at 0:00 and every 3 minutes (3:00, 6:00, 9:00, 12:00...) across 4 designated map points, granting team-wide gold. |
| **Power Runes** | Spawns at River runes every 2 minutes starting from 6:00 (Haste, Double Damage, Arcane, Invisibility, Regen, Shield). Water runes spawn at 2:00 & 4:00. |
| **Wisdom Runes** | Crucial team XP runes spawning every 7 minutes (7:00, 14:00, 21:00, 28:00...) on the edges of the map near offlane bases. |
| **Tormentor** | High-durability objective spawning at 20:00, granting an Aghanim's Shard to the lowest net-worth support. Respawns 10 minutes after being destroyed. |
| **Lotus Pools** | Spawns healing fruit every 3 minutes (3:00, 6:00, 9:00...) in the side lanes. |
| **Roshan Respawn Window** | When Roshan dies, Aegis of the Immortal expires after 5 minutes (300s). Roshan respawns at a random timestamp between 8 and 11 minutes (480s to 660s) post-slain. |
| **Day / Night Cycle** | Transitions every 5 minutes (300s). Determines Roshan pit location: Day = Southeast (Radiant), Night = Northwest (Dire). |
| **Advantage %** | Matchup advantage calculated against target enemy heroes based on thousands of high-bracket matches. |

---

## 4. State Rules & Pipeline

```
  +------------------+         HTTP POST (port 3000)        +----------------------+
  |   Dota 2 Client  | -----------------------------------> | Tauri Rust Backend   |
  |  (Official GSI)  |                                      | (tiny_http listener) |
  +------------------+                                      +----------------------+
                                                                       |
                                                               Tauri Event IPC ("gsi-update")
                                                                       |
                                                                       v
+------------------------+      Matchup / Counter Data      +----------------------+
| OpenDota / Stratz API  | -------------------------------> | React Frontend App   |
| (With Offline Cache)   |                                  | (Timing / Draft HUD) |
+------------------------+                                  +----------------------+
```

### Alert Thresholds:
- **Audio Cue Trigger**: Fired 20–30 seconds prior to rune/objective spawn via the zero-dependency Web Audio API synthesizer.
- **Urgent Visual Pulsing**: Displays warning animation when time remaining is $\le$ 20 seconds.
- **Roshan Tracker**: Can be auto-detected via GSI map events or toggled manually by one click in the HUD.

---

## 5. File Structure
- `public/gamestate_integration_dotaassist.cfg`: Configuration template for Dota 2 client.
- `src-tauri/`: Rust backend, embedded GSI HTTP server, window controls.
- `src/services/`:
  - `gsiService.ts`: Real-time GSI stream receiver & simulation engine.
  - `timingEngine.ts`: Objective timing calculations (Bounty, Power, Wisdom, Roshan, Tormentor).
  - `apiService.ts`: OpenDota & Stratz meta data integration.
  - `audioService.ts`: Web Audio API tone generator.
- `src/components/`:
  - `OverlayHUD.tsx`: Compact draggable/floating in-game HUD.
  - `TimingAlerts.tsx`: Interactive countdown cards with Roshan tracker.
  - `DraftAdvisor.tsx`: Counter-pick calculator and win-rate analyzer.
  - `ItemGuide.tsx`: Situational and core build recommendations.
  - `GSIStatusBadge.tsx`: Connection health, hero vitality, and game clock.
  - `SettingsModal.tsx`: GSI config generator and audio tester.
