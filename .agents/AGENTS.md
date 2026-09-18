# Workspace Rules & Customizations


## Design Alignment & Workspace Preferences (2026-09-03)

กำลังติดตั้ง System Dependencies สำหรับ GTK และ WebKit (`pkg-config`, `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`) ในระบบเพื่อรองรับการตรวจสอบและ Build ฝั่ง Tauri Rust บน Linux ครับ ระบบจะดำเนินการต่อทันทีที่คำสั่งเสร็จสิ้น
### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสัมภาษณ์จัดแนวทาง (Alignment Interview) ได้ข้อสรุปทั้ง 3 ด้านดังนี้:

1. **รูปแบบแอปพลิเคชัน (Application Format)**:
   - **In-Game Overlay & Real-time Assistant**: หน้าต่าง Overlay ลอยโปร่งแสงซ้อนบนหน้าจอ Dota 2 เพื่อแสดงผลไทม์มิ่ง วัตถุประสงค์ และไอเทมแก้ทาง ควบคู่กับโหมด Strategy Dashboard สำหรับช่วงดราฟต์และวิเคราะห์ภาพรวม
2. **เทคโนโลยีและเฟรมเวิร์ก (Technology Stack)**:
   - **Tauri (Rust + React/TypeScript)**: สถาปัตยกรรมเนทีฟขนาดเบาพิเศษ ใช้ RAM เพียง ~10–25 MB (ไม่กินสเปกและไม่ดึง FPS เหมือน Electron) รองรับ Transparent Window และรัน Embedded HTTP Listener สำหรับ GSI ในฝั่ง Rust โดยตรง
3. **แหล่งข้อมูลและการแจ้งเตือน (Data Pipeline & Objectives)**:
   - **Hybrid Architecture (Local GSI + OpenDota API)**: รับ Event และ Game Clock เรียลไทม์ผ่าน Dota 2 Game State Integration (GSI) ภายในเครื่อง พร้อมดึงสถิติ Counter Picks, Win Rates และ Item Popularity จาก API จริง

---

### รายละเอียดการพัฒนาและไฟล์ที่สร้างขึ้น (Implementation Summary)

ได้ดำเนินการสร้างและติดตั้งโปรเจกต์เต็มรูปแบบใน [`/root/Desktop/DotaAssist`](file:///root/Desktop/DotaAssist) เรียบร้อยแล้ว:

#### 1. ฝั่ง Backend & GSI Integration (Rust / Tauri)
- [`src-tauri/Cargo.toml`](file:///root/Desktop/DotaAssist/src-tauri/Cargo.toml): คอนฟิก Tauri และโมดูล [`tiny_http`](file:///root/Desktop/DotaAssist/src-tauri/Cargo.toml#L12) สำหรับ Local GSI Server
- [`src-tauri/tauri.conf.json`](file:///root/Desktop/DotaAssist/src-tauri/tauri.conf.json): กำหนดค่าหน้าต่างโปร่งแสง (`transparent: true`), `alwaysOnTop`, และสิทธิ์การควบคุมหน้าต่าง
- [`src-tauri/src/main.rs`](file:///root/Desktop/DotaAssist/src-tauri/src/main.rs): รัน HTTP Webhook Server บนพอร์ต `127.0.0.1:3000/gsi` คอยรับ JSON Event จาก Dota 2 แล้วส่งต่อให้ React ผ่าน Tauri Event IPC (`gsi-update`)
- [`public/gamestate_integration_dotaassist.cfg`](file:///root/Desktop/DotaAssist/public/gamestate_integration_dotaassist.cfg): ไฟล์คอนฟิก GSI มาตรฐานของ Dota 2 สำหรับคัดลอกลงโฟลเดอร์เกม

#### 2. ฝั่ง Frontend & UI Components (React + TypeScript + Tailwind CSS)
- [`src/types/gsi.ts`](file:///root/Desktop/DotaAssist/src/types/gsi.ts) & [`src/types/meta.ts`](file:///root/Desktop/DotaAssist/src/types/meta.ts): Data Contracts สำหรับ GSI Payload (Map, Player, Hero, Draft, Items) และ Meta / Matchups
- [`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts): เอ็นจินคำนวณเวลารูนและบอสแบบเรียลไทม์:
  - **Wisdom Runes** (ทุก 7 นาที: 7:00, 14:00, 21:00...)
  - **Bounty Runes** (ทุก 3 นาที: 3:00, 6:00...)
  - **Power / Water Runes** (ทุก 2 นาที: Water ที่ 2:00/4:00, Power เริ่มที่ 6:00)
  - **Tormentor** (เกิดที่นาทีที่ 20:00 และเกิดใหม่ทุก 10 นาที)
  - **Roshan & Aegis Tracker** (Aegis 5 นาที, หน้าต่างสุ่มเกิด 8–11 นาที, และถ้ำ Roshan สลับตามกลางวัน/กลางคืน)
- [`src/services/audioService.ts`](file:///root/Desktop/DotaAssist/src/services/audioService.ts): ระบบสังเคราะห์เสียงแจ้งเตือนด้วย Web Audio API โดยไม่ต้องพึ่งพาไฟล์เสียงภายนอก
- [`src/services/apiService.ts`](file:///root/Desktop/DotaAssist/src/services/apiService.ts): เชื่อมต่อ OpenDota API และแสดงสถานะ unavailable โดยไม่สร้างสถิติหรือคำแนะนำทดแทน
- [`src/services/gsiService.ts`](file:///root/Desktop/DotaAssist/src/services/gsiService.ts): จัดการรับข้อมูล GSI จริงจาก Tauri IPC เท่านั้น
- [`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx): หน้าต่าง In-game HUD ลอย ย่อ/ขยายได้ ปรับความโปร่งแสงได้ ไม่บดบังจอเกม
- [`src/components/TimingAlerts.tsx`](file:///root/Desktop/DotaAssist/src/components/TimingAlerts.tsx): การ์ดแสดงผลเคานต์ดาวน์ไทม์มิ่ง พร้อมปุ่มบันทึก Roshan Slain และสวิตช์เปิด/ปิดเสียง
- [`src/components/DraftAdvisor.tsx`](file:///root/Desktop/DotaAssist/src/components/DraftAdvisor.tsx): ระบบวิเคราะห์และแนะนำ Counter-Pick ตามสถิติความได้เปรียบ
- [`src/components/ItemGuide.tsx`](file:///root/Desktop/DotaAssist/src/components/ItemGuide.tsx): แสดงไอเทมยอดนิยมตามช่วงเกมจาก OpenDota itemPopularity
- [`src/components/GSIStatusBadge.tsx`](file:///root/Desktop/DotaAssist/src/components/GSIStatusBadge.tsx): แถบแสดงสถานะเชื่อมต่อ GSI, หลอด HP/Mana, เงิน และ Net Worth
- [`src/components/SettingsModal.tsx`](file:///root/Desktop/DotaAssist/src/components/SettingsModal.tsx): คำแนะนำการติดตั้งไฟล์ GSI ในแต่ละ OS (Windows, Linux, macOS) และพาเนลทดสอบเสียง
- [`src/App.tsx`](file:///root/Desktop/DotaAssist/src/App.tsx): ตัวควบคุมโหมดหน้าจอ (สลับระหว่าง Overlay HUD และ Full Strategy Dashboard)

---

### เอกสารประกอบสถาปัตยกรรม (Documentation Updates)

1. **[`CONTEXT.md`](file:///root/Desktop/DotaAssist/CONTEXT.md)**:
   - บันทึกภาพรวมสถาปัตยกรรมระบบ Tauri + GSI + Cloud API
   - ศัพท์เฉพาะทางโดเมน (GSI, Wisdom Rune, Power Rune, Tormentor, Roshan Window, Advantage %)
   - กฎสถานะเกมและเกณฑ์การแจ้งเตือนเสียงล่วงหน้า 20–30 วินาที
2. **[`docs/adr/0001-tauri-gsi-hybrid-overlay.md`](file:///root/Desktop/DotaAssist/docs/adr/0001-tauri-gsi-hybrid-overlay.md)**:
   - Architecture Decision Record บันทึกบริบท ปัญหาเรื่อง FPS/RAM ใน Electron vs Tauri, การรับรองความปลอดภัย VAC-Safe, และผลลัพธ์เชิงบวก/ข้อแลกเปลี่ยน
3. **[`README.md`](file:///root/Desktop/DotaAssist/README.md)**:
   - คู่มือการใช้งานภาษาไทยและภาษาอังกฤษ พร้อมพาธสำหรับวางไฟล์ GSI ใน Steam

---

### การตรวจสอบความถูกต้อง (Verification)

- **Frontend Assets**: ผ่านการคอมไพล์ TypeScript และ Vite (`npm run build`) สำเร็จ 100%
- **Rust Backend**: ผ่านการตรวจสอบโครงสร้างโค้ดด้วย [`cargo check`](file:///root/Desktop/DotaAssist/src-tauri) สำเร็จ 100% พร้อมเชื่อมโยงระบบ GSI และหน้าต่างโปร่งแสงเรียบร้อยแล้ว

## Design Alignment & Workspace Preferences (2026-09-17)

Implemented all three decisions:

- **Windows desktop:** native startup by default, NSIS installer configuration, and Windows build workflow.
- **Click-through overlay:** configurable global hotkey, defaulting to `Ctrl+Shift+F10`, with persistent settings and conflict handling.
- **Guided setup:** Steam detection, location confirmation, configuration backups, and live connection verification.

Frontend build, existing tests, Rust tests/build, and native startup/GSI checks passed on Linux. Windows installer and in-game interaction still need Windows testing.

Run `npm start`. Build instructions are in [README.md](/root/Desktop/DotaAssist/README.md).

## Alert and rules alignment — 2026-09-18

- Ship reviewed objective rules with app releases. `src/data/timingRules.ts` is the shared rules bundle; dashboard, HUD and Settings display its supported patch. There is no live patch detection or remote rules update.
- Editable Carry, Mid, Offlane and Support presets control enabled objective reminders. The selected role and edits persist locally; Support initially preserves all reminders.
- Suggest roles from bundled hero tags, explaining their limitations. Suggestions require confirmation or an explicit alternate selection; the previous profile remains active until then.
- `npm test` covers persistence, confirmation/dismissal, visual/audio filtering, deduplication and gameplay timing boundaries. See [timing rules release review](docs/timing-rules-release.md).

## Design Alignment & Workspace Preferences (2026-09-18)

Implemented all three choices:

- Centralized bundled timing rules and added prominent supported-patch labels.
- Added editable, persistent Carry, Mid, Offlane, and Support presets.
- Added hero-based role suggestions with confirmation; the previous profile stays active until accepted.

Updated documentation and release-review instructions. `npm run build` and all tests passed, including new profile and timing-boundary tests. Windows in-game UI verification remains outstanding.

## Voice queue alignment — 2026-09-18

- Voice reminders queue by objective deadline, batching each synchronous game update and retaining stable order for ties. Already playing speech finishes unless it expires or is disabled.
- Countdown wording is calculated from the latest received game clock when an utterance is submitted to the speech engine. Past-deadline reminders are removed; game time is not extrapolated during pauses.
- Profile edits/changes immediately remove disabled objectives and cancel affected speech. Voice-off clears all queued/current speech; re-enabling never restores discarded reminders.
- Match/tracker resets invalidate affected reminders, and disconnected GSI clears speech. Roshan state announcements expire after 30 game seconds; all queued entries have a 35-second wall-time freshness limit. A 15-second speech watchdog recovers from missing browser completion events.
- Chimes remain immediate. Audio previews use the same serial voice queue and respect profile filtering, with their existing sample wording.
- Verification: `npm run test:voice` covers urgency, deduplication, fresh countdowns, expiry, cancellation, mute/re-enable, late callbacks, pauses, and timing-engine integration. Real Windows speech output still requires a device test.

## Design Alignment & Workspace Preferences (2026-09-18)

Implemented all three choices:

- Voice reminders queue by urgency and skip expired announcements.
- Countdowns use the latest game clock when speech is submitted.
- Profile changes immediately cancel disabled reminders; turning voice off stops speech and clears the queue.

Added queue tests and updated Settings and documentation. `npm run build` and all tests pass. Actual Windows speech playback still needs device verification.

## OpenDota cache alignment — 2026-09-18

- Language work was skipped; existing language behavior is unchanged.
- Validated successful hero-statistics, matchup and item-popularity responses persist in local storage with fetch timestamps. Each request attempts the network; failures use matching-patch saved data with a stale label. Concurrent requests for the same resource coalesce; requests time out after 15 seconds.
- Cache records carry the app's supported rules patch at fetch time. Records tagged with another patch are excluded, so an outage without a matching entry shows unavailable. This tag does not imply OpenDota's underlying aggregate data is restricted to that patch.
- Draft statistics, matchup panels, item guides and the HUD show fetch times and manual Refresh controls. Refreshing shared item data also updates the other visible view. Storage failures preserve in-session data and show a persistence notice.
- This supersedes the earlier live-only outage policy; values are never synthesized. `npm run test:cache` checks restart fallback, patch exclusion, corruption, response validation, refresh, request coalescing and storage failure.

## Design Alignment & Workspace Preferences (2026-09-18)

Implemented the selected caching policy:

- Language changes remained skipped.
- Successful OpenDota responses persist across restarts, with fetch times, stale-data labels, and Refresh buttons.
- Cache from another supported app patch is excluded; failed requests without matching data show unavailable.

Updated dashboard/HUD integration and documentation. Production build, existing tests, and new cache tests passed.
