# 1. Tauri, In-Game Overlay, and Hybrid GSI Architecture

Date: 2026-09-03

## Status

Accepted. The live-only outage policy below was superseded on 2026-09-18 by persistent, patch-tagged response caching; see [cache policy](../opendota-cache.md).

## Context

Dota 2 is a high-intensity, latency-critical competitive MOBA. Players need real-time situational awareness (such as Bounty/Power Rune and Wisdom Shrine timings, Tormentor spawns, Roshan respawn windows, counter-pick suggestions during drafting, and situational itemization against enemy hero abilities).

Traditional Electron applications bundle a Chromium runtime, while Tauri can use the operating system WebView. Actual resource use still varies by platform and must be benchmarked. The assistant must not read Dota 2 process memory, hook the game, inject a DLL, or automate input.

The user participated in an interactive alignment interview and selected three core preferences:
1. **In-Game Overlay & Real-Time Assistant**: Real-time HUD overlay on top of Dota 2 game window.
2. **Tauri (Rust + React/TypeScript)**: Operating-system WebView reuse and transparent window support, with performance subject to target-machine benchmarks.
3. **Hybrid Architecture**: Official Dota 2 Game State Integration (GSI) on local machine paired with the OpenDota API for meta insights and timing alerts.

## Decision

We will implement DotaAssist using the following architectural stack and patterns:

1. **Desktop Framework**:
   - **Tauri with Rust Backend**: Uses the OS native WebView rather than shipping a full Chromium runtime. No fixed RAM figure is guaranteed because WebView processes and platform libraries vary substantially.
   - **Embedded Rust GSI Listener**: Rust runs an embedded `tiny_http` server on `127.0.0.1:3001/gsi` and forwards valid Dota 2 GSI JSON payloads to the webview through Tauri events.
2. **Frontend UI & Presentation**:
   - **React 18 + TypeScript + Tailwind CSS**: Responsive, type-safe interface offering two dedicated view modes:
     - *In-Game Overlay Mode*: A floating, draggable, collapsible transparent HUD positioned non-intrusively in a corner with adjustable opacity.
     - *Strategy Dashboard Mode*: A full multi-tab dashboard suitable for the drafting phase, dual monitors, or post-game review.
3. **Audio Alert Synthesizer**:
   - **Web Audio API**: Synthesizes melodic alert tones for Wisdom Shrines, Power/Bounty runes, Roshan, and Tormentor directly in software without requiring external MP3/WAV assets.
4. **Data Sourcing**:
   - **Local Dota 2 GSI**: Uses the game's exported HTTP state feed without process-memory access or code injection.
   - **OpenDota REST API**: Query ranked hero win rates, matchup records, and item-popularity buckets. Failed requests are represented as unavailable; no inferred statistics or replacement builds are generated.

## Consequences

### Positive
- **No game-process access**: The selected architecture uses only the local GSI HTTP feed and does not inject code or tamper with game memory.
- **Platform-native WebView**: Avoids shipping an Electron/Chromium runtime, while leaving performance claims subject to target-machine benchmarks.
- **Immediate Value**: 20-30s advance audio and visual cues provide tactical map rotation advantages.
- **Stable Lookup Metadata**: Bundled hero identities and item details let the UI resolve OpenDota IDs without presenting bundled values as current statistics.

### Negative / Trade-offs
- Requires user to place `gamestate_integration_dotaassist.cfg` into their Dota 2 cfg directory once during setup (guided by the in-app Settings modal).
- GSI updates only when the player's Dota 2 client sends them (typically on tick/event throttle between 0.1s to 1s).
- Meta and item panels intentionally show an unavailable state during OpenDota outages.
