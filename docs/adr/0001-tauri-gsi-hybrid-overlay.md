# 1. Tauri, In-Game Overlay, and Hybrid GSI Architecture

Date: 2026-09-03

## Status

Accepted

## Context

Dota 2 is a high-intensity, latency-critical competitive MOBA. Players need real-time situational awareness (such as Bounty/Power/Wisdom Rune timings, Tormentor spawns, Roshan respawn windows, counter-pick suggestions during drafting, and situational itemization against enemy hero abilities).

However, traditional desktop assistants built on Electron consume hundreds of megabytes of RAM (often 300MB–800MB) and run multi-process Chromium instances that can cause noticeable frame rate dips (FPS drops) and input lag during intensive 5v5 teamfights. Furthermore, directly reading Dota 2 game memory through hooking or DLL injection violates Valve Anti-Cheat (VAC) policies and leads to permanent account bans.

The user participated in an interactive alignment interview and selected three core preferences:
1. **In-Game Overlay & Real-Time Assistant**: Real-time HUD overlay on top of Dota 2 game window.
2. **Tauri (Rust + React/TypeScript)**: Ultra-low resource usage, minimal RAM footprint, and clean transparent window support.
3. **Hybrid Architecture**: Official Dota 2 Game State Integration (GSI) on local machine paired with Stratz/OpenDota APIs for meta insights and timing alerts.

## Decision

We will implement DotaAssist using the following architectural stack and patterns:

1. **Desktop Framework**:
   - **Tauri with Rust Backend**: Provides an ultra-lightweight binary (~10MB–20MB RAM footprint). Tauri utilizes the OS native webview rather than shipping a full Chromium runtime.
   - **Embedded Rust GSI Listener**: Rust will run an embedded `tiny_http` server on `127.0.0.1:3000/gsi` to process incoming Dota 2 GSI JSON payloads with zero latency and forward them via Tauri events to the webview.
2. **Frontend UI & Presentation**:
   - **React 18 + TypeScript + Tailwind CSS**: Responsive, type-safe interface offering two dedicated view modes:
     - *In-Game Overlay Mode*: A floating, draggable, collapsible transparent HUD positioned non-intrusively in a corner with adjustable opacity.
     - *Strategy Dashboard Mode*: A full multi-tab dashboard suitable for the drafting phase, dual monitors, or post-game review.
3. **Audio Alert Synthesizer**:
   - **Web Audio API**: Synthesizes melodic alert tones for Wisdom, Power, Bounty runes, Roshan, and Tormentor directly in software without requiring external MP3/WAV assets.
4. **Data Sourcing**:
   - **Local Dota 2 GSI**: Fully compliant with Valve's official API, 100% VAC-safe.
   - **Stratz & OpenDota REST APIs**: Query hero matchup win rates, counter-picks, and item builds, backed by an offline heuristic cache for network resilience.

## Consequences

### Positive
- **100% VAC Safe**: Valve's Game State Integration is officially provided by Valve for streamers, coaches, and tournaments. No DLL injection or memory tampering.
- **Ultra Low Overhead**: Consumes negligible CPU and memory, ensuring zero FPS impact in game.
- **Immediate Value**: 20-30s advance audio and visual cues provide tactical map rotation advantages.
- **Offline Resilience**: Pre-seeded hero and item databases allow the app to function even if internet connection fluctuates.

### Negative / Trade-offs
- Requires user to place `gamestate_integration_dotaassist.cfg` into their Dota 2 cfg directory once during setup (guided by the in-app Settings modal).
- GSI updates only when the player's Dota 2 client sends them (typically on tick/event throttle between 0.1s to 1s).
