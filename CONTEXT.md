## Manual enemy lineup alignment — 2026-09-18

- Empty ultimate slots offer hero selection from the bundled catalog, in dashboard and interactive overlay modes. Duplicate and occupied-slot selections are rejected.
- GSI fills available empty slots without moving existing heroes, duplicating them, or resetting their timers/corrections. Manual slots are labeled and retain their hotkeys.
- Clear selection is available for manual slots. Active cooldowns or manual corrections require explicit in-app confirmation; Cancel preserves state. A cleared manual slot stays reserved for replacement until selected or reset, so incoming GSI cannot immediately fill it.
- Match/tracker reset clears all five heroes, timers, corrections, and replacement reservations. Manual lineups are not persisted between matches.
- Regression coverage includes late/repeated GSI, duplicates, selection validation, clearing confirmation, replacement, and match reset.

## Enemy ultimate estimate corrections — 2026-09-18

- Countdown, readiness, clipboard summaries and readiness speech explicitly describe estimates.
- Each enemy has a separate Edit control with optional level and cooldown overrides; native overlay editing requires interaction mode. Cast recording and quick undo retain their controls.
- Corrections immediately recalculate an active countdown from its recorded cast time and persist for future casts in the match. Match/tracker reset or hero replacement clears overrides. Blank fields restore automatic estimates; explicit cooldown takes precedence over level.
- Corrections that move completion into the past mark estimated readiness immediately. They clear the old clipboard notice without overwriting the clipboard.

## Enemy ultimate tracker alignment — 2026-09-18

- Synchronizes 5 enemy heroes from live GSI draft data, mapping into slots 1-5 with ultimate names and cooldown levels.
- Dedicated global hotkeys (`Alt+1` to `Alt+5`) record casts in click-through mode without refocusing.
- 10-second quick-undo window cancels accidental triggers with spoken confirmation.
- 5-slot HUD bar renders real-time countdowns (green = ready, red = cooldown) and announces completion with spoken voice alert ("[Hero] ultimate is ready").
- Automatic clipboard copy formats concise summary for Dota 2 team chat.
- Tests in `tests/enemy_ultimates.test.ts` verify draft synchronization, hotkey triggers, 10s undo, countdowns, ready audio announcements, and profile filtering.

## Objective hotkeys, quick undo, and clipboard alignment — 2026-09-18

- Dedicated global hotkeys (`Alt+F9` for Roshan, `Alt+F8` for Tormentor) allow recording death times instantly without toggling overlay mouse interaction.
- Voice confirmation announces recording ("Roshan slain recorded" / "Tormentor slain recorded"). Pressing the same hotkey again within 10 seconds cancels the recording with spoken confirmation ("Roshan timer canceled" / "Tormentor timer canceled").
- Automatic clipboard copy formats a concise summary string (`Roshan 25:15 | Aegis 30:15 | Respawn 33:15-36:15` or `Tormentor 20:00 | Respawn 30:00`) for pasting directly into Dota 2 team chat. Toggleable in Settings and persisted in preferences.
- Tests in `tests/objective_hotkeys.test.ts` cover hotkey matching, conflict handling, voice undo timing, state reversibility, and clipboard formatting.

## OpenDota cache alignment — 2026-09-18

- Language work was skipped; existing language behavior is unchanged.
- Validated successful hero-statistics, matchup and item-popularity responses persist in local storage with fetch timestamps. Each request attempts the network; failures use matching-patch saved data with a stale label. Concurrent requests for the same resource coalesce; requests time out after 15 seconds.
- Cache records carry the app's supported rules patch at fetch time. Records tagged with another patch are excluded, so an outage without a matching entry shows unavailable. This tag does not imply OpenDota's underlying aggregate data is restricted to that patch.
- Draft statistics, matchup panels, item guides and the HUD show fetch times and manual Refresh controls. Refreshing shared item data also updates the other visible view. Storage failures preserve in-session data and show a persistence notice.
- This supersedes the earlier live-only outage policy; values are never synthesized. `npm run test:cache` checks restart fallback, patch exclusion, corruption, response validation, refresh, request coalescing and storage failure.

## Voice queue alignment — 2026-09-18

- Voice reminders queue by objective deadline, batching each synchronous game update and retaining stable order for ties. Already playing speech finishes unless it expires or is disabled.
- Countdown wording is calculated from the latest received game clock when an utterance is submitted to the speech engine. Past-deadline reminders are removed; game time is not extrapolated during pauses.
- Profile edits/changes immediately remove disabled objectives and cancel affected speech. Voice-off clears all queued/current speech; re-enabling never restores discarded reminders.
- Match/tracker resets invalidate affected reminders, and disconnected GSI clears speech. Roshan state announcements expire after 30 game seconds; all queued entries have a 35-second wall-time freshness limit. A 15-second speech watchdog recovers from missing browser completion events.
- Chimes remain immediate. Audio previews use the same serial voice queue and respect profile filtering, with their existing sample wording.
- Verification: `npm run test:voice` covers urgency, deduplication, fresh countdowns, expiry, cancellation, mute/re-enable, late callbacks, pauses, and timing-engine integration. Real Windows speech output still requires a device test.

## Alert and rules alignment — 2026-09-18

- Ship reviewed objective rules with app releases. `src/data/timingRules.ts` is the shared rules bundle; dashboard, HUD and Settings display its supported patch. There is no live patch detection or remote rules update.
- Editable Carry, Mid, Offlane and Support presets control enabled objective reminders. The selected role and edits persist locally; Support initially preserves all reminders.
- Suggest roles from bundled hero tags, explaining their limitations. Suggestions require confirmation or an explicit alternate selection; the previous profile remains active until then.
- `npm test` covers persistence, confirmation/dismissal, visual/audio filtering, deduplication and gameplay timing boundaries. See [timing rules release review](docs/timing-rules-release.md).

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
   - **OpenDota API**: Public cloud API for ranked hero win rates, matchup records, and per-hero item-popularity buckets. If a request fails, matching-patch saved responses are labeled stale; without a matching entry the UI shows unavailable. No values are synthesized.

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
| (Live / labeled cache)  |                                  | (Timing / Draft HUD) |
+------------------------+                                  +----------------------+
```

### Alert Thresholds:
- **Ruleset marker**: Hard-coded objective intervals are audited for Dota 2 `7.41e`; re-audit them after a major gameplay patch.
- **Audio & Voice Trigger**: Spoken voice announcement and audio chimes fired 15–30 seconds prior to rune/objective spawn.
- **Urgent Visual Pulsing**: Displays warning animation when time remaining is $\le$ 20 seconds.
- **Roshan Tracker**: Synchronizes from optional GSI map/Roshan/event fields when present and retains a one-click manual fallback.
- **Tormentor Tracker**: Starts a 10-minute respawn timer from a GSI event when available or from the manual HUD control.
- **Buyback & Safe-to-Spend**: Real-time calculation of buyback affordability (`gold >= cost && cooldown === 0`), missing gold, and safe-to-spend surplus (`gold - cost`). Objective-linked voice warnings trigger in late game (30:00+) prior to Roshan, Tormentor, and Wisdom Shrine teamfights with a 3-minute throttle.
- **Neutral Items (Tier 1-5)**: Countdown cards appear 60s before each Tier unlock (7:00, 17:00, 27:00, 37:00, 60:00) and dismiss at unlock. Voice announcements fire at 20s. A 90s grace period allows token farming before missing/outdated neutral slot checks trigger voice reminders (throttled at 2 minutes, max 2 reminders per tier).
- **Camp Stacking & Pulling**: Active in early-to-mid game (1:00 - 15:00 / 60s - 900s). Countdown cards appear 20s prior to pull timing (:33 - :53), auto-dismissing after :55. Spoken voice announcement fires at :43 ("Stack camp in ten seconds"), automatically yielding priority (remaining silent) if a major objective with spoken reminders (runes, roshan, tormentor, neutral tier unlock) is active within 25 seconds. Enabled by default for Support and Offlane alert profiles.

---

## 5. File Structure
- `public/gamestate_integration_dotaassist.cfg`: Configuration template for Dota 2 client.
- `src-tauri/`: Rust backend, embedded GSI HTTP server (port 3001), dynamic window controls.
- `src/services/`:
  - `gsiService.ts`: Real-time GSI stream receiver from Tauri IPC / Dota 2 client.
  - `timingEngine.ts`: Objective timing calculations (Bounty, Power, Wisdom, Roshan, Tormentor, Neutral Items, Camp Stacking) with float-tolerant threshold triggers.
  - `campStackService.ts`: Camp stacking timing calculation (:33 - :55), countdown cards, yielding voice trigger logic, and role profile integration.
  - `enemyUltimateService.ts`: Synchronizes 5 enemy heroes from GSI draft data, handles Alt+1 to Alt+5 hotkeys, 10s quick undo, and spoken ready alerts.
  - `neutralItemService.ts`: Neutral item tier classification, 90s grace period, and throttled voice reminders for missing or outdated neutral items.
  - `buybackService.ts`: Buyback affordability, safe-to-spend surplus calculation, and objective-linked late-game warning throttling.
  - `objectiveTracker.ts`: Dedicated global hotkey handling, 10s voice quick-undo, and auto-clipboard formatting.
  - `draftService.ts`: Resolves the opponent draft side from the local player's actual GSI team.
  - `apiService.ts`: OpenDota live statistics and item-popularity integration; bundled catalogs contain lookup metadata only.
  - `audioService.ts`: Web Speech API (TTS) voice announcer + Web Audio API synthesizer.
- `src/data/`:
  - `heroUltimates.ts`: Dota 2 hero ultimate catalog and level-based cooldown lookup.
- `src/components/`:
  - `OverlayHUD.tsx`: Compact draggable/floating in-game HUD with quick Roshan button, buyback status banner, neutral item status banner & badge, enemy ultimate tracker bar, & audio controls.
  - `EnemyUltimateBar.tsx`: 5-slot enemy ultimate tracker bar with green ready / red countdown states, hotkeys, and quick undo.
  - `TimingAlerts.tsx`: Interactive countdown cards with Roshan tracker, Neutral Items alerts, and enemy ultimate alerts.
  - `DraftAdvisor.tsx`: Counter-pick calculator and win-rate analyzer.
  - `ItemGuide.tsx`: Popular item phases derived from current OpenDota responses.
  - `GSIStatusBadge.tsx`: Connection health, hero vitality, game clock, Buyback / Safe-to-Spend indicators, and Neutral Item status badge.
  - `SettingsModal.tsx`: GSI config guide, voice synthesizer tester (with neutral items and enemy ultimate audio tests), and Dota 2 Borderless Window guide.
