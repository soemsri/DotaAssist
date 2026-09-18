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

## Objective hotkeys, quick undo, and clipboard alignment — 2026-09-18

- Dedicated global hotkeys (`Alt+F9` for Roshan, `Alt+F8` for Tormentor) allow recording death times instantly without toggling overlay mouse interaction.
- Voice confirmation announces recording ("Roshan slain recorded" / "Tormentor slain recorded"). Pressing the same hotkey again within 10 seconds cancels the recording with spoken confirmation ("Roshan timer canceled" / "Tormentor timer canceled").
- Automatic clipboard copy formats a concise summary string (`Roshan 25:15 | Aegis 30:15 | Respawn 33:15-36:15` or `Tormentor 20:00 | Respawn 30:00`) for pasting directly into Dota 2 team chat. Toggleable in Settings and persisted in preferences.
- Verification: `npm run test:hotkeys` and `npm test` cover hotkey matching, conflict handling, voice undo timing, state reversibility, and clipboard formatting.


## Design Alignment & Workspace Preferences (2026-09-18)

### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสรุปผลการสัมภาษณ์ความต้องการ (Alignment Interview) ทั้ง 3 หัวข้อ ได้ข้อตกลงในการพัฒนาดังนี้:

1. **คีย์ลัดระดับระบบสำหรับวัตถุประสงค์ (Dedicated Global Hotkeys)**:
   - เพิ่มคีย์ลัดระดับระบบ (OS-level Global Hotkeys) โดยใช้ค่าเริ่มต้น `Alt+F9` สำหรับบันทึก **Roshan** และ `Alt+F8` สำหรับบันทึก **Tormentor** เพื่อให้ผู้เล่นบันทึกเวลาตายได้ทันทีโดยไม่ต้องสลับโหมดเมาส์จาก Overlay
2. **การตอบสนองด้วยเสียงและระบบกดยกเลิกด่วน (Voice Confirmation & Quick Undo)**:
   - มีเสียงพูดแจ้งเตือนยืนยันทันทีที่บันทึก (`"Roshan slain recorded"` / `"Tormentor slain recorded"`) พร้อมเปิดหน้าต่างเวลายกเลิก 10 วินาที
   - หากผู้เล่นกดคีย์ลัดเดิมซ้ำภายใน 10 วินาที ระบบจะยกเลิกการบันทึกทันที (Undo) และส่งเสียงยืนยัน (`"Roshan timer canceled"` / `"Tormentor timer canceled"`)
3. **คัดลอกสรุปเวลาลง Clipboard อัตโนมัติ (Automatic Clipboard Copy with Settings Toggle)**:
   - เมื่อบันทึกเวลาสำเร็จ ระบบจะจัดรูปแบบข้อความสรุปเวลา (เช่น `Roshan 25:15 | Aegis 30:15 | Respawn 33:15-36:15` หรือ `Tormentor 20:00 | Respawn 30:00`) และคัดลอกลงใน Clipboard ของระบบทันที เพื่อให้ผู้เล่นกด `Ctrl+V` ส่งในแชตทีม Dota 2 ได้อย่างรวดเร็ว พร้อมมีสวิตช์เปิด/ปิดได้ใน Settings

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions)

การเปลี่ยนแปลงทั้งหมดได้รับการพัฒนาและรวมเข้าสู่โค้ดเบสเรียบร้อยแล้ว:

1. **สร้างระบบจัดการวัตถุประสงค์ ([`src/services/objectiveTracker.ts`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts))**:
   - เพิ่มคลาส [`ObjectiveTrackerService`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts) เพื่อควบคุมสถานะการจับเวลา, หน้าต่างนับถอยหลัง 10 วินาทีสำหรับ Quick-Undo, การเรียกเสียงแจ้งเตือนผ่าน [`audioService`](file:///root/Desktop/DotaAssist/src/services/audioService.ts), และการเชื่อมต่อ Clipboard
   - ฟังก์ชัน [`parseHotkey`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts#L22-L29) และ [`matchesHotkey`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts#L31-L43) สำหรับตรวจสอบปุ่มคีย์บอร์ดทั้งบนเว็บเบราว์เซอร์และระบบปฏิบัติการ
   - ฟังก์ชัน [`copyToClipboard`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts#L45-L72) พร้อม Fallback สำหรับคัดลอกข้อความสรุปไทม์มิ่ง

2. **ฝั่ง Rust Backend & Global Shortcuts ([`src-tauri/src/desktop.rs`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs) & [`src-tauri/src/main.rs`](file:///root/Desktop/DotaAssist/src-tauri/src/main.rs))**:
   - เพิ่มการตั้งค่า `roshan_hotkey`, `tormentor_hotkey`, และ `auto_copy_clipboard` ในโครงสร้าง [`Preferences`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs#L14-L23) และ [`DesktopStatus`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs#L44-L53)
   - ลงทะเบียนคีย์ลัดระดับระบบ 3 ชุดแยกอิสระใน [`initialize`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs#L119-L162)
   - เพิ่มคำสั่ง Tauri Commands: [`set_roshan_hotkey`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs#L201-L232), [`set_tormentor_hotkey`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs#L234-L265), และ [`set_auto_copy_clipboard`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs#L267-L278) พร้อมตรวจสอบคีย์ชนกัน

3. **In-Game Overlay HUD & Strategy Dashboard ([`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx) & [`src/components/TimingAlerts.tsx`](file:///root/Desktop/DotaAssist/src/components/TimingAlerts.tsx))**:
   - ปรับปรุงปุ่มบันทึกบน HUD ให้แสดงชื่อคีย์ลัด เช่น `Roshan (Alt+F9)` / `Tormentor (Alt+F8)`
   - แสดงสถานะนับถอยหลังยกเลิก เช่น `Roshan (Undo 10s)` พร้อมปุ่มกดยกเลิก
   - แสดงการแจ้งเตือน Toast เมื่อคัดลอกเวลาลง Clipboard สำเร็จ

4. **การตั้งค่า Desktop & Browser ([`src/components/DesktopSetup.tsx`](file:///root/Desktop/DotaAssist/src/components/DesktopSetup.tsx) & [`src/components/SettingsModal.tsx`](file:///root/Desktop/DotaAssist/src/components/SettingsModal.tsx))**:
   - เพิ่มช่องกรอกและบันทึกคีย์ลัดสำหรับ Roshan และ Tormentor พร้อมปุ่ม Save แยกอิสระ
   - เพิ่มเช็กบ็อกซ์เปิด/ปิดการคัดลอกลง Clipboard อัตโนมัติ

5. **ชุดทดสอบครอบคลุมรอบด้าน ([`tests/objective_hotkeys.test.ts`](file:///root/Desktop/DotaAssist/tests/objective_hotkeys.test.ts))**:
   - ทดสอบการจับคู่คีย์ลัด (Parsing & Matching)
   - ทดสอบการตรวจสอบคีย์ลัดซ้ำซ้อน (Conflict Detection)
   - ทดสอบการจัดรูปแบบข้อความ Clipboard สำหรับ Roshan และ Tormentor
   - ทดสอบการบันทึกเวลาและการทำงานของ Quick Undo ภายใน 10 วินาที
   - ทดสอบสวิตช์ Auto-copy

---

### การตรวจสอบความถูกต้อง (Verification)

- **Test Suite**: ผ่านครบ 6 ชุดทดสอบ (`npm test`) 100%:
  ```
  ✓ verification.test.ts
  ✓ gsi_integration.test.ts
  ✓ alert_profiles.test.ts
  ✓ voice_queue.test.ts
  ✓ opendota_cache.test.ts
  ✓ objective_hotkeys.test.ts
  ```
- **Production Build**: ผ่านการตรวจสอบและ build โดยสมบูรณ์ (`npm run build`) สำเร็จโดยไม่มีข้อผิดพลาด

## Design Alignment & Workspace Preferences (2026-09-18) — Buyback Tracking & Safe-to-Spend

### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสรุปผลการสัมภาษณ์ความต้องการ (Alignment Interview) ทั้ง 3 หัวข้อเรื่องระบบติดตาม Buyback และเงินคงเหลือปลอดภัย (Safe-to-Spend) ได้ข้อตกลงในการพัฒนาดังนี้:

1. **แสดงสถานะ Buyback บน HUD พร้อมเตือนเมื่อเงินไม่พอ (Buyback HUD Status & Voice Alert)**:
   - แสดงไอคอนและสถานะ Buyback (พร้อม / Cooldown / ขาดเงินกี่ Gold) ทั้งในโหมด Minimized HUD และ Expanded HUD รวมถึงหน้าต่าง Strategy Dashboard
   - ส่งเสียงพูดเตือนความปลอดภัยเมื่อเข้าสู่ช่วงท้ายเกม (นาทีที่ 30:00 เป็นต้นไป) แล้วเงินไม่พอซื้อเกิด หรือติดคูลดาวน์
2. **เตือนพ่วงกับจังหวะก่อนไฟต์วัตถุประสงค์ใหญ่ (Objective-Linked Alert)**:
   - ส่งเสียงเตือน Buyback พ่วงไปกับจังหวะนับถอยหลังของวัตถุประสงค์สำคัญช่วงท้ายเกม เช่น Roshan Respawn Window, Aegis กำลังจะหมดอายุ, Wisdom Shrines (35m+), หรือ Tormentor
   - มีระบบจำกัดความถี่ (Throttling) เว้นระยะอย่างน้อย 3 นาที (180 วินาที) เพื่อป้องกันการส่งเสียงเตือนซ้ำซ้อนรบกวนผู้เล่น
3. **แสดง Safe-to-Spend (เงินส่วนเกินที่ซื้อของได้โดย Buyback ไม่ขาด)**:
   - คำนวณ Gold ปัจจุบันลบด้วย Buyback Cost แบบเรียลไทม์
   - หากเงินพอซื้อเกิด จะแสดงเป็นตัวเลขบวกสีเขียว เช่น `+650g safe` เพื่อให้ผู้เล่นทราบงบที่สามารถกดซื้อไอเทมได้ทันทีโดยไม่เสียสิทธิ์ Buyback
   - หากเงินไม่พอซื้อเกิด จะแสดงเป็นตัวเลขลบสีแดง เช่น `-350g needed` และหากติดคูลดาวน์จะแสดงเวลานับถอยหลังชัดเจน

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions)

1. **สร้างระบบคำนวณและแจ้งเตือน Buyback ([`src/services/buybackService.ts`](file:///root/Desktop/DotaAssist/src/services/buybackService.ts))**:
   - ฟังก์ชัน [`calculateBuyback`](file:///root/Desktop/DotaAssist/src/services/buybackService.ts#L19-L41) คำนวณ `hasBuyback`, `canAfford`, `cost`, `cooldown`, `surplusGold`, `missingGold`, และ `isLateGame` (>= 1800s)
   - เมธอด [`checkObjectiveLinkedAlert`](file:///root/Desktop/DotaAssist/src/services/buybackService.ts#L43-L79) ส่งเสียงพูดเตือน Buyback พ่วงกับวัตถุประสงค์สำคัญ พร้อมกลไกจำกัดความถี่ 180 วินาที
2. **เชื่อมโยงเข้ากับ Timing Engine ([`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts))**:
   - บันทึก `lastPayload` ล่าสุดจาก Dota 2 GSI
   - เรียก [`buybackService.checkObjectiveLinkedAlert`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts) เมื่อมีเสียงแจ้งเตือน Wisdom Shrine (35m+), Tormentor Respawn (30m+), Aegis Expiring, หรือ Roshan Respawn Window
   - รีเซ็ตตัวนับการแจ้งเตือน Buyback เมื่อเกิดการเริ่มเกมใหม่หรือ Reset Match
3. **แสดงผลบน In-Game Overlay HUD ([`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx))**:
   - เพิ่มแท็ก Buyback ขนาดกะทัดรัดบน Minimized Badge เช่น `+850g` หรือ `-250g` หรือ `CD 40s`
   - เพิ่มแถบสถานะ Buyback & Safe-to-Spend แบบเต็ม พร้อมไอคอนเหรียญทองและตัวเลข Safe Gold / Missing Gold บน HUD ที่กางออก
4. **แสดงผลบน Strategy Dashboard ([`src/components/GSIStatusBadge.tsx`](file:///root/Desktop/DotaAssist/src/components/GSIStatusBadge.tsx))**:
   - แสดง Badge สถานะ Buyback พร้อมค่า Safe-to-Spend ต่อท้ายแถบ Gold / Net Worth
5. **ชุดทดสอบครอบคลุมรอบด้าน ([`tests/buyback_tracker.test.ts`](file:///root/Desktop/DotaAssist/tests/buyback_tracker.test.ts))**:
   - ทดสอบการคำนวณเงินส่วนเกิน (Surplus Gold) และเงินที่ขาด (Missing Gold)
   - ทดสอบการทำงานในสถานะ Cooldown
   - ทดสอบความปลอดภัยเมื่อรับ Payload ว่าง (Null Safety)
   - ทดสอบการส่งเสียงแจ้งเตือนพ่วงวัตถุประสงค์และการจำกัดความถี่ 180 วินาที (Throttling)
   - ทดสอบการเชื่อมต่อระหว่าง GSI Payload และ TimingEngine

---

### การตรวจสอบความถูกต้อง (Verification)

- **Test Suite**: ผ่านครบ 7 ชุดทดสอบ (`npm test`) 100%:
  ```
  ✓ verification.test.ts
  ✓ gsi_integration.test.ts
  ✓ alert_profiles.test.ts
  ✓ voice_queue.test.ts
  ✓ opendota_cache.test.ts
  ✓ objective_hotkeys.test.ts
  ✓ buyback_tracker.test.ts
  ```
- **Production Build**: ผ่านการตรวจสอบและ build โดยสมบูรณ์ (`npm run build`) สำเร็จโดยไม่มีข้อผิดพลาด

## Design Alignment & Workspace Preferences (2026-09-18)

The test suite is running to verify all 7 test suites. I will present the final summary as soon as the test suite completes.
### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสัมภาษณ์จัดแนวทาง (Alignment Interview) ทั้ง 3 คำถามเกี่ยวกับระบบติดตาม **Buyback Status & Safe-to-Spend Alerts** ได้ข้อสรุปดังนี้:

1. **แสดงสถานะ Buyback บน HUD พร้อมเตือนเมื่อเงินไม่พอ (Buyback HUD Status & Voice Alert)**:
   - แสดงสถานะ Buyback (พร้อม / ติดคูลดาวน์ / ขาดเงินกี่ Gold) ทั้งในโหมด Minimized HUD, Expanded Overlay HUD, และ Strategy Dashboard
   - ส่งเสียงพูดเตือนความปลอดภัยเมื่อเข้าสู่ช่วงท้ายเกม (นาทีที่ 30:00 เป็นต้นไป) แล้วเงินไม่พอซื้อเกิด หรือติดคูลดาวน์
2. **เตือนพ่วงกับจังหวะก่อนไฟต์วัตถุประสงค์ใหญ่ (Objective-Linked Alert)**:
   - ส่งเสียงเตือน Buyback พ่วงไปกับจังหวะนับถอยหลังของวัตถุประสงค์สำคัญช่วงท้ายเกม เช่น Roshan Respawn Window, Aegis กำลังจะหมดอายุ, Wisdom Shrines (35m+), หรือ Tormentor เพื่อเตือนสติก่อนเริ่มทีมไฟต์
   - มีระบบจำกัดความถี่ (Throttling) เว้นระยะอย่างน้อย 3 นาที (180 วินาที) เพื่อป้องกันการส่งเสียงเตือนซ้ำซ้อนรบกวนสมาธิผู้เล่น
3. **แสดง Safe-to-Spend (เงินส่วนเกินที่ซื้อของได้โดย Buyback ไม่ขาด)**:
   - คำนวณ Gold ปัจจุบันลบด้วย Buyback Cost แบบเรียลไทม์
   - หากเงินพอซื้อเกิด จะแสดงเป็นตัวเลขบวกสีเขียว เช่น `+650g safe` เพื่อให้ผู้เล่นทราบงบที่สามารถกดซื้อไอเทมได้ทันทีโดยไม่เสียสิทธิ์ Buyback
   - หากเงินไม่พอซื้อเกิด จะแสดงเป็นตัวเลขลบสีแดง เช่น `-350g needed` และหากติดคูลดาวน์จะแสดงเวลานับถอยหลังชัดเจน

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions)

1. **สร้างระบบคำนวณและแจ้งเตือน Buyback ([`src/services/buybackService.ts`](file:///root/Desktop/DotaAssist/src/services/buybackService.ts))**:
   - คลาส [`BuybackService`](file:///root/Desktop/DotaAssist/src/services/buybackService.ts#L15-L84) สำหรับจัดการข้อมูล Buyback
   - ฟังก์ชัน [`calculateBuyback`](file:///root/Desktop/DotaAssist/src/services/buybackService.ts#L19-L41) คำนวณ `hasBuyback`, `canAfford`, `cost`, `cooldown`, `currentGold`, `surplusGold`, `missingGold`, และสถานะช่วงท้ายเกม `isLateGame` (เมื่อ Game Clock $\ge$ 1800 วินาที)
   - เมธอด [`checkObjectiveLinkedAlert`](file:///root/Desktop/DotaAssist/src/services/buybackService.ts#L43-L79) ส่งเสียงแจ้งเตือน Buyback พ่วงกับชื่อวัตถุประสงค์ (เช่น `"Caution: Roshan window soon, and Buyback is not ready. Missing 500 gold."` หรือ `"Caution: Tormentor soon, and Buyback is on cooldown for 45 seconds."`) พร้อมระบบ Throttling 180 วินาที
   - เมธอด [`resetAlerts`](file:///root/Desktop/DotaAssist/src/services/buybackService.ts#L81-L83) สำหรับรีเซ็ตตัวนับการแจ้งเตือนเมื่อเริ่มเกมใหม่

2. **เชื่อมโยงเข้ากับ Timing Engine ([`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts))**:
   - เพิ่มการจัดเก็บ [`lastPayload`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L91) ใน [`handleGSIPayload`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L90-L103) และเมธอด [`getLastPayload`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L60-L62)
   - เชื่อมต่อการตรวจสอบเตือน Buyback ใน [`calculateAlerts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L166):
     - [Wisdom Shrines ช่วงนาทีที่ 35+](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L279-L282)
     - [Tormentor Respawn ช่วงนาทีที่ 30+](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L304-L307)
     - [Aegis of the Immortal กำลังจะหมดอายุ](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L405-L408)
     - [Roshan Respawn Window เริ่มเปิด](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L435-L438)
   - เรียก [`buybackService.resetAlerts()`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L163) ใน [`resetAll`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L153-L164) เมื่อเกิดการเปลี่ยนแมตช์หรือรีเซ็ตเวลา

3. **แสดงผลบน In-Game Overlay HUD ([`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx))**:
   - **Collapsed Mode**: เพิ่มแท็กสถานะ Buyback กะทัดรัด เช่น `+850g` (เขียว), `-250g` (แดง), หรือ `CD 40s` (ส้ม) บน Badge ย่อส่วน
   - **Expanded Mode**: เพิ่มแถบสถานะ Buyback Banner พร้อมไอคอน [`Coins`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx#L190-L198) แสดงสถานะ Buyback Ready / Cooldown / No Buyback พร้อมกล่องตัวเลข Safe-to-Spend / Missing Gold ชัดเจน

4. **แสดงผลบน Strategy Dashboard ([`src/components/GSIStatusBadge.tsx`](file:///root/Desktop/DotaAssist/src/components/GSIStatusBadge.tsx))**:
   - เพิ่มกล่องสถานะ Buyback พร้อมค่า Safe-to-Spend ต่อท้ายแถบ Gold และ Net Worth ของผู้เล่น

5. **ชุดทดสอบครอบคลุมรอบด้าน ([`tests/buyback_tracker.test.ts`](file:///root/Desktop/DotaAssist/tests/buyback_tracker.test.ts))**:
   - ทดสอบการคำนวณเงินส่วนเกิน (Surplus Gold / Safe to Spend) เมื่อเงินพอ
   - ทดสอบการคำนวณเงินที่ขาด (Missing Gold) เมื่อเงินไม่พอ
   - ทดสอบกรณีติดสถานะ Cooldown
   - ทดสอบ Fallback เมื่อ Payload เป็น null
   - ทดสอบการส่งเสียงแจ้งเตือนพ่วงวัตถุประสงค์และการจำกัดความถี่ 180 วินาที (Throttling)
   - ทดสอบการเชื่อมต่อระหว่าง GSI Payload และ [`TimingEngine`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts)

6. **อัปเดตเอกสารระบบ**:
   - บันทึกข้อกำหนดใน [`alignment_preferences.json`](file:///root/Desktop/DotaAssist/alignment_preferences.json) และ [`alignment_preferences.md`](file:///root/Desktop/DotaAssist/alignment_preferences.md)
   - อัปเดตสถาปัตยกรรมและรายการไฟล์ใน [`CONTEXT.md`](file:///root/Desktop/DotaAssist/CONTEXT.md#L104-L125)
   - อัปเดตบันทึกการตัดสินใจใน [`.agents/AGENTS.md`](file:///root/Desktop/DotaAssist/.agents/AGENTS.md#L204-L260)

---

### การตรวจสอบความถูกต้อง (Verification Status)

- **Test Suite**: ผ่านครบทั้ง 7 ชุดทดสอบ (`npm test`) 100% เรียบร้อยแล้ว:
  ```
  ✓ verification.test.ts
  ✓ gsi_integration.test.ts
  ✓ alert_profiles.test.ts
  ✓ voice_queue.test.ts
  ✓ opendota_cache.test.ts
  ✓ objective_hotkeys.test.ts
  ✓ buyback_tracker.test.ts
  ```
- **Production Build**: ผ่านการตรวจสอบและ build Vite + TypeScript (`npm run build`) สำเร็จโดยไม่มีข้อผิดพลาด

## Design Alignment & Workspace Preferences (2026-09-18) — Neutral Items Tracking & Reminders

### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสรุปผลการสัมภาษณ์ความต้องการ (Alignment Interview) ทั้ง 3 หัวข้อเรื่องระบบแจ้งเตือน Neutral Items (Tier 1-5) ได้ข้อตกลงในการพัฒนาดังนี้:

1. **แจ้งเตือนเวลาปลดล็อก Tier พร้อมตรวจช่อง Neutral Item (Unlock Alerts & Slot Auditing)**:
   - ส่งเสียงพูดแจ้งเตือนล่วงหน้า 20–30 วินาทีก่อนแต่ละ Tier ปลดล็อก (Tier 1 ที่ 7:00, Tier 2 ที่ 17:00, Tier 3 ที่ 27:00, Tier 4 ที่ 37:00, Tier 5 ที่ 60:00)
   - ตรวจสอบช่อง Neutral Item ใน GSI (`items.neutral0`) ว่ายังว่างเปล่า หรือยังสวมใส่ของ Tier เก่าที่ตกรุ่นอยู่หรือไม่ เพื่อส่งเสียงเตือนผู้เล่น
2. **ตั้งระยะเวลาผ่อนผัน 90 วินาที พร้อมจำกัดความถี่เตือนซ้ำ (Grace Period & Reminder Throttling)**:
   - หลังแต่ละ Tier ปลดล็อก ให้มีระยะเวลาผ่อนผัน (Grace Period) 90 วินาที เพื่อให้เวลาผู้เล่นและทีมฟาร์ม Neutral Token หรือกดเลือกไอเทมก่อน โดยไม่ส่งเสียงเตือนรบกวนก่อนเวลาอันควร
   - หากพ้น 90 วินาทีแล้วยังไม่สวมใส่หรือยังใช้ของ Tier เก่า จะส่งเสียงเตือน (`"Reminder: Neutral item slot is empty. Tier X is available."` หรือ `"Reminder: Still using Tier Y neutral item. Tier X is available."`) โดยเว้นระยะเตือนซ้ำทุก 2 นาที (120 วินาที) และเตือนสูงสุดไม่เกิน 2 ครั้งต่อ Tier
3. **รวมในรายการการ์ดนับถอยหลังวัตถุประสงค์ (Timing Alert Cards Integration)**:
   - แสดงเป็นการ์ดนับถอยหลังวัตถุประสงค์ล่วงหน้า 60 วินาทีก่อน Tier ใหม่ปลดล็อกบน HUD และ Timing Alerts พาเนล พร้อมเปลี่ยนสถานะเป็น Urgent กะพริบเตือนเมื่อเหลือน้อยกว่าหรือเท่ากับ 20 วินาที
   - การ์ดจะแสดงเวลา 0s เมื่อถึงเวลาปลดล็อก และหายไปจากหน้าจออัตโนมัติเมื่อพ้นเวลาปลดล็อก เหมือนระบบการ์ดรูนมาตรฐาน

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions)

1. **สร้างระบบจัดการและจำแนก Neutral Items ([`src/services/neutralItemService.ts`](file:///root/Desktop/DotaAssist/src/services/neutralItemService.ts))**:
   - ฟังก์ชัน [`getNeutralItemTier`](file:///root/Desktop/DotaAssist/src/services/neutralItemService.ts#L61-L87) จำแนก Tier 1-5 จากชื่อ Token และพจนานุกรมไอเทมป่า Dota 2 ทั้งหมด
   - ฟังก์ชัน [`getUnlockedTier`](file:///root/Desktop/DotaAssist/src/services/neutralItemService.ts#L89-L98) และ [`getNeutralItemStatus`](file:///root/Desktop/DotaAssist/src/services/neutralItemService.ts#L121-L144) คำนวณสถานะปลดล็อก, Tier ที่สวมใส่อยู่, และประเมินสถานะ `isMissing`, `isOutdated`, `isUpToDate`
   - เมธอด [`checkMissingOrOutdatedReminder`](file:///root/Desktop/DotaAssist/src/services/neutralItemService.ts#L151-L215) ตรวจสอบ Grace Period 90 วินาที, เว้นระยะเตือนซ้ำ 120 วินาที, จำกัดการเตือนสูงสุด 2 ครั้งต่อ Tier พร้อมส่งเสียงเตือนผ่าน [`audioService`](file:///root/Desktop/DotaAssist/src/services/audioService.ts)
2. **ขยายข้อกำหนดเวลาและกฎของเกม ([`src/data/timingRules.ts`](file:///root/Desktop/DotaAssist/src/data/timingRules.ts))**:
   - กำหนดค่าเวลาปลดล็อก Neutral Item Tier 1-5 (420s, 1020s, 1620s, 2220s, 3600s) ใน [`TIMING_RULES`](file:///root/Desktop/DotaAssist/src/data/timingRules.ts) และเพิ่ม [`NEUTRAL_TIER_TIMINGS`](file:///root/Desktop/DotaAssist/src/data/timingRules.ts)
3. **เพิ่มประเภทวัตถุประสงค์และการกรองตาม Role Profile ([`src/types/meta.ts`](file:///root/Desktop/DotaAssist/src/types/meta.ts) & [`src/services/alertProfiles.ts`](file:///root/Desktop/DotaAssist/src/services/alertProfiles.ts))**:
   - เพิ่ม `'neutral_item'` ใน [`TimingEventAlert`](file:///root/Desktop/DotaAssist/src/types/meta.ts) และออบเจกต์ [`OBJECTIVES`](file:///root/Desktop/DotaAssist/src/services/alertProfiles.ts)
   - เปิดใช้งาน Neutral Items เป็นค่าเริ่มต้นสำหรับทุก Role (Carry, Mid, Offlane, Support)
4. **เชื่อมโยงเข้ากับ Timing Engine ([`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts))**:
   - แสดงการ์ดนับถอยหลังก่อนปลดล็อก 60 วินาที พร้อมส่งเสียงแจ้งเตือนที่ 20 วินาที
   - เชื่อมต่อการตรวจสอบ Missing/Outdated Reminder กับ GSI Payload
   - รีเซ็ตตัวนับการแจ้งเตือน Neutral Items เมื่อเกิดการ Reset Match หรือเริ่มเกมใหม่
5. **ปรับปรุง UI Components ([`src/components/TimingAlerts.tsx`](file:///root/Desktop/DotaAssist/src/components/TimingAlerts.tsx) & [`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx))**:
   - แสดงไอคอน Package สีอำพันสำหรับรายการแจ้งเตือน Neutral Items บนทั้งสองหน้าจอ
6. **ชุดทดสอบครอบคลุมรอบด้าน ([`tests/neutral_items.test.ts`](file:///root/Desktop/DotaAssist/tests/neutral_items.test.ts))**:
   - ทดสอบการจำแนก Tier จากชื่อ Token และชื่อไอเทมป่าทุกระดับ
   - ทดสอบการปรากฏของการ์ดเตือนที่ 60 วินาที และการหายไปเมื่อเลยเวลา
   - ทดสอบ Grace Period 90 วินาที
   - ทดสอบการส่งเสียงเตือนช่องว่าง, การจำกัดความถี่ 120 วินาที, และการจำกัดสูงสุด 2 ครั้ง
   - ทดสอบการเตือนเมื่อใช้ไอเทมตกรุ่น (Outdated Tier) และการยกเลิกเตือนเมื่อสวมใส่ของใหม่

---

### การตรวจสอบความถูกต้อง (Verification)

- **Test Suite**: ผ่านครบ 8 ชุดทดสอบ (`npm test`) 100%:
  ```
  ✓ verification.test.ts
  ✓ gsi_integration.test.ts
  ✓ alert_profiles.test.ts
  ✓ voice_queue.test.ts
  ✓ opendota_cache.test.ts
  ✓ objective_hotkeys.test.ts
  ✓ buyback_tracker.test.ts
  ✓ neutral_items.test.ts
  ```
- **Production Build**: ผ่านการตรวจสอบและ build โดยสมบูรณ์ (`npm run build`) สำเร็จโดยไม่มีข้อผิดพลาด


## Design Alignment & Workspace Preferences (2026-09-18)

⚠️ *[Automatic Failover: Provider **agy** encountered an error or was unavailable. Successfully failed over to **codex** (5.6 Sol)]*

ดำเนินการครบทั้ง 3 ข้อแล้ว:

- แจ้งเสียงทันทีเมื่อ Neutral Item Tier 1–5 ปลดล็อก และตรวจช่อง `items.neutral0` จาก GSI ว่าว่างหรือใช้ Tier เก่า
- ใช้ Grace Period 90 วินาที จากนั้นเตือนซ้ำทุก 120 วินาที สูงสุด 2 ครั้งต่อ Tier
- เพิ่มการ์ด Neutral Item ใน Timing Alerts ตั้งแต่ 60 วินาทีก่อนปลดล็อก แสดง `0s` ณ เวลาปลดล็อก แล้วหายไป

การปรับเพิ่มเติม:

- เปลี่ยนเสียงจาก “unlock soon” เป็น “are now unlocked”
- รองรับ GSI ข้าม clock tick ได้ไม่เกิน 2 วินาที
- ป้องกันการประกาศ Tier เก่าย้อนหลังเมื่อต่อเข้าเกมช้า
- ป้องกันเสียงปลดล็อกซ้ำจากการ render ในวินาทีเดียวกัน
- เพิ่ม tests ครอบคลุม countdown, unlock audio, late connection, grace period, throttling, missing/outdated item และ profile filtering

ผลตรวจสอบ:

- `npm test` ผ่านทุกชุด
- `npm run build` ผ่านสำเร็จ
- มีเพียงคำเตือน Vite เดิมเกี่ยวกับ dynamic/static imports ของ Tauri ซึ่งไม่กระทบ build


## Design Alignment & Workspace Preferences (2026-09-18) — Camp Stacking & Lane Pulling

### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสัมภาษณ์จัดแนวทาง (Alignment Interview) ทั้ง 3 คำถามเกี่ยวกับระบบ **Camp Stacking & Lane Pulling Alerts** ได้ข้อสรุปดังนี้:

1. **ช่วงเวลาและบทบาทที่เปิดใช้งาน (Scope & Role Profiles)**:
   - ทำงานเฉพาะช่วงต้นถึงกลางเกม (นาทีที่ 1:00 - 15:00 หรือ 60s ถึง 900s)
   - เปิดใช้งานเป็นค่าเริ่มต้นเฉพาะบทบาท **Support** และ **Offlane** (ปิดใช้งานเป็นค่าเริ่มต้นสำหรับ Carry และ Mid)
   - ปรับแต่งเปิด/ปิดได้อิสระใน `AlertProfiles` ภายใต้หัวข้อ `'camp_stack'`
2. **การส่งเสียงเตือนและการหลีกทางให้วัตถุประสงค์ใหญ่ (Voice & Yielding Logic)**:
   - ส่งเสียงเตือนกระชับ `"Stack camp in ten seconds"` พร้อมเสียง Chime สังเคราะห์ที่วินาที :43 เพื่อนับถอยหลังสู่จังหวะลากครีปที่ :53
   - มีระบบ Yielding ตรวจจับหากมีวัตถุประสงค์ใหญ่ที่มีเสียงเตือน (เช่น Bounty Runes, Power/Water Runes, Wisdom Shrine, Day/Night, Tormentor, Roshan หรือ Neutral Tier) เกิดขึ้นในนาทีเดียวกัน ($\le$ 25 วินาที) ระบบจะหลีกทางและตัดเสียงเตือนสแตกครีปออกทันที เพื่อป้องกันเสียงพูดทับซ้อน
3. **การแสดงผลบน UI (Overlay HUD & Timing Alerts)**:
   - แสดงเป็นการ์ดนับถอยหลังล่วงหน้า 20 วินาที (:33 - :53) ใน `TimingAlerts` และหายไปอัตโนมัติเมื่อพ้นวินาทีที่ :55
   - บน Overlay HUD แสดงการ์ดพร้อมไอคอน `Layers` และมี Badge กะทัดรัด (เช่น `Stack 15s` หรือ `Stack NOW`) ในโหมด Collapsed

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions)

1. **สร้างบริการคำนวณและควบคุมไทม์มิ่ง ([`src/services/campStackService.ts`](file:///root/Desktop/DotaAssist/src/services/campStackService.ts))**:
   - คำนวณช่วงเวลาการแสดงการ์ด (:33 - :55) และนับถอยหลังสู่ :53
   - ตรวจสอบเงื่อนไขเสียงพูดที่ :43 พร้อมระบบ Yielding ต่อวัตถุประสงค์ใหญ่ที่มีเสียงเตือน
2. **อัปเดตโมเดลข้อมูลและกฎไทม์มิ่ง ([`src/types/meta.ts`](file:///root/Desktop/DotaAssist/src/types/meta.ts) & [`src/data/timingRules.ts`](file:///root/Desktop/DotaAssist/src/data/timingRules.ts))**:
   - เพิ่ม `'camp_stack'` ใน `TimingEventAlert['type']`
   - บันทึกค่าคงที่ `stackStartClock: 60`, `stackEndClock: 900`, `stackPullSec: 53`, `stackLeadSec: 20`, `stackWindowEndSec: 55`
3. **ปรับปรุงโปรไฟล์การแจ้งเตือน ([`src/services/alertProfiles.ts`](file:///root/Desktop/DotaAssist/src/services/alertProfiles.ts))**:
   - เพิ่ม `camp_stack` ใน `OBJECTIVES`
   - กำหนดค่าเริ่มต้น: Support & Offlane = เปิด (Enabled), Carry & Mid = ปิด (Disabled)
4. **เพิ่มเสียงเตือนสังเคราะห์ ([`src/services/audioService.ts`](file:///root/Desktop/DotaAssist/src/services/audioService.ts))**:
   - เมธอด [`playCampStackAlert()`](file:///root/Desktop/DotaAssist/src/services/audioService.ts) เล่นเสียง Chime คอร์ดคู่ และส่งเสียงพูด `"Stack camp in ten seconds"`
5. **เชื่อมโยงเข้ากับ Timing Engine ([`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts))**:
   - เรียกใช้ `campStackService.calculateStackAlert` และ `shouldPlayVoice` ในรอบการคำนวณของเกม
   - ตรวจสอบและบันทึกสถานะการส่งเสียงเตือนเพื่อป้องกันการพูดซ้ำในนาทีเดียวกัน
6. **ปรับแต่ง UI บน HUD และ Settings ([`src/components/TimingAlerts.tsx`](file:///root/Desktop/DotaAssist/src/components/TimingAlerts.tsx), [`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx), [`src/components/SettingsModal.tsx`](file:///root/Desktop/DotaAssist/src/components/SettingsModal.tsx))**:
   - แสดงไอคอน `Layers` สีเขียวมรกตสำหรับการ์ด Camp Stacking
   - เพิ่ม Badge แสดงสถานะ Stacking บน Collapsed Overlay HUD
   - เพิ่มปุ่มทดสอบเสียง Camp Stacking ในหน้าต่าง Settings Modal
7. **ชุดทดสอบครอบคลุมรอบด้าน ([`tests/camp_stacking.test.ts`](file:///root/Desktop/DotaAssist/tests/camp_stacking.test.ts))**:
   - ทดสอบขอบเขตเวลา 1:00 - 15:00
   - ทดสอบหน้าต่างการ์ด :33 ถึง :55 และการหายไปอัตโนมัติเมื่อพ้น :55
   - ทดสอบการส่งเสียงที่ :43 และการหลีกทาง (Yielding) ให้รูน/วัตถุประสงค์ใหญ่
   - ทดสอบการกรองตามบทบาทใน Alert Profiles
   - ทดสอบการตัดเสียงซ้ำและการ Reset ระบบ

---

### การตรวจสอบความถูกต้อง (Verification Status)

- **Test Suite**: ผ่านครบทั้ง 9 ชุดทดสอบ (`npm test`) 100%:
  ```
  ✓ verification.test.ts
  ✓ gsi_integration.test.ts
  ✓ alert_profiles.test.ts
  ✓ voice_queue.test.ts
  ✓ opendota_cache.test.ts
  ✓ objective_hotkeys.test.ts
  ✓ buyback_tracker.test.ts
  ✓ neutral_items.test.ts
  ✓ camp_stacking.test.ts
  ```
- **Production Build**: ผ่านการตรวจสอบและ build โดยสมบูรณ์ (`npm run build`) สำเร็จโดยไม่มีข้อผิดพลาด


## Design Alignment & Workspace Preferences (2026-09-18)

### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสัมภาษณ์จัดแนวทาง (Alignment Interview) ระบบ **Camp Stacking & Lane Pulling** ได้ข้อสรุปทั้ง 3 ข้อดังนี้:

1. **ช่วงเวลาและบทบาทที่เปิดใช้งาน (Scope & Role Profiles)**:
   - ทำงานเฉพาะช่วงต้นถึงกลางเกม (นาทีที่ **1:00 – 15:00** หรือ 60s – 900s)
   - เปิดใช้งานเป็นค่าเริ่มต้นเฉพาะบทบาท **Support** และ **Offlane** (ปิดใช้งานเป็นค่าเริ่มต้นสำหรับ Carry และ Mid)
   - ผู้เล่นสามารถเปิด/ปิดอิสระได้ตามต้องการผ่าน Alert Profiles ในการตั้งค่า
2. **การส่งเสียงเตือนและการหลีกทางให้วัตถุประสงค์ใหญ่ (Voice & Yielding Logic)**:
   - ส่งเสียงพูดสั้นกระชับ `"Stack camp in ten seconds"` พร้อมเสียง Chime เตือนล่วงหน้าที่วินาที **:43** เพื่อนับถอยหลังสู่จังหวะดึงครีปที่ **:53**
   - หากมีเสียงเตือนของวัตถุประสงค์หลัก (เช่น Runes, Roshan, Tormentor หรือ Neutral Items) เกิดขึ้นในนาทีเดียวกัน (ระยะเวลา $\le$ 25 วินาที) ระบบจะหลีกทาง (Yield) และระงับเสียงเตือนสแตกครีป เพื่อไม่ให้เสียงพูดทับซ้อนและลดเสียงรบกวนในเกม
3. **การแสดงผลบน UI (Overlay HUD & Timing Alerts)**:
   - แสดงการ์ดนับถอยหลังล่วงหน้า 20 วินาที (ช่วงวินาที **:33 – :53**) ในพาเนล `Timing Alerts` โดยนับถอยหลังสู่จังหวะ :53
   - ในช่วงวินาที :53 – :55 จะขึ้นสถานะเตือนให้ดึงครีปทันที (`Pull creeps NOW`) และหายไปอัตโนมัติเมื่อพ้นวินาทีที่ :55
   - บน In-game Overlay HUD จะแสดงไอคอนเลเยอร์ [`Layers`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx#L79-L80) ในรายการไทม์มิ่ง และแสดงแถบ Badge สีเขียวขนาดกะทัดรัด (เช่น `Stack 12s` หรือ `Stack NOW`) ในโหมด Minimized Collapsed HUD

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions)

ระบบได้รับการพัฒนาและผสานการทำงานเข้าสู่โค้ดเบสของ [DotaAssist](file:///root/Desktop/DotaAssist) ครบถ้วนทุกมิติ:

1. **คอนฟิกไทม์มิ่งกลาง ([`src/data/timingRules.ts`](file:///root/Desktop/DotaAssist/src/data/timingRules.ts#L21-L25))**:
   - เพิ่มค่าคงที่ `stackStartClock: 60`, `stackEndClock: 900`, `stackPullSec: 53`, `stackLeadSec: 20`, และ `stackWindowEndSec: 55` ภายใต้ Rule Bundle ของแพตช์ 7.41e
2. **ระบบวิเคราะห์การดึงครีป ([`src/services/campStackService.ts`](file:///root/Desktop/DotaAssist/src/services/campStackService.ts))**:
   - ฟังก์ชัน [`calculateStackAlert`](file:///root/Desktop/DotaAssist/src/services/campStackService.ts#L12-L39): ตรวจสอบกรอบเวลา 1:00 – 15:00 และสร้างการ์ดนับถอยหลังช่วงวินาที :33 – :55
   - ฟังก์ชัน [`shouldPlayVoice`](file:///root/Desktop/DotaAssist/src/services/campStackService.ts#L46-L83): ตรวจสอบการข้ามผ่านวินาที :43 พร้อมประเมิน Yielding Logic หลีกทางให้วัตถุประสงค์ใหญ่ที่มีการส่งเสียงล่วงหน้าภายใน 25 วินาที
3. **ระบบโปรไฟล์บทบาทผู้เล่น ([`src/services/alertProfiles.ts`](file:///root/Desktop/DotaAssist/src/services/alertProfiles.ts#L10-L23))**:
   - เพิ่ม Objective `'camp_stack'` ในระบบ Alert Profiles
   - กำหนดค่าเริ่มต้น: Support และ Offlane เปิดใช้งาน (`true`), Carry และ Mid ปิดใช้งาน (`false`)
4. **เอ็นจินไทม์มิ่งและการแจ้งเตือนด้วยเสียง ([`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L498-L523) & [`src/services/audioService.ts`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L263-L271))**:
   - เชื่อมต่อการคำนวณไทม์มิ่ง Camp Stacking เข้ากับ Loop ของ GSI Game Clock
   - ป้องกันการส่งเสียงซ้ำในนาทีเดียวกัน (Deduplication) และรองรับการ Reset เมื่อเริ่มเกมใหม่
   - เพิ่มฟังก์ชัน [`playCampStackAlert`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L263-L271) เล่นเสียงสังเคราะห์ Synthesizer คอร์ดคู่ 493.88 Hz / 587.33 Hz พร้อมเสียงพูด TTS ผ่าน Web Speech API
5. **การแสดงผลบนส่วนติดต่อผู้ใช้ (UI Components)**:
   - [`src/components/TimingAlerts.tsx`](file:///root/Desktop/DotaAssist/src/components/TimingAlerts.tsx#L67-L68): เพิ่มการแสดงไอคอน `Layers` และการ์ดนับถอยหลังพร้อมสถานะ Urgent เมื่อใกล้ถึงเวลา
   - [`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx#L148-L159): แสดง Badge สถานะกะทัดรัดบน Minimized HUD และการ์ดในโหมด Full HUD
   - [`src/components/SettingsModal.tsx`](file:///root/Desktop/DotaAssist/src/components/SettingsModal.tsx#L302-L306): เพิ่มปุ่มทดสอบเสียง `🌲 Camp Stacking` ในพาเนลตั้งค่า
6. **ชุดทดสอบครอบคลุมรอบด้าน ([`tests/camp_stacking.test.ts`](file:///root/Desktop/DotaAssist/tests/camp_stacking.test.ts))**:
   - ทดสอบขอบเขตเวลา 1:00 – 15:00
   - ทดสอบช่วงการแสดงการ์ด (:33 – :55) และการหายไปอัตโนมัติเมื่อพ้น :55
   - ทดสอบการส่งเสียงที่ :43 และ Yielding Logic หลีกทางให้ Water Rune 2:00
   - ทดสอบบทบาทเริ่มต้นใน Alert Profiles
   - ทดสอบการตัดเสียงซ้ำและการ Reset ใน TimingEngine

---

### การตรวจสอบความถูกต้อง (Verification Results)

1. **ชุดทดสอบ (Test Suites)**: ผ่านครบถ้วน 9 ชุดทดสอบ (`npm test`) 100%:
   - `tests/verification.test.ts`
   - `tests/gsi_integration.test.ts`
   - `tests/alert_profiles.test.ts`
   - `tests/voice_queue.test.ts`
   - `tests/opendota_cache.test.ts`
   - `tests/objective_hotkeys.test.ts`
   - `tests/buyback_tracker.test.ts`
   - `tests/neutral_items.test.ts`
   - `tests/camp_stacking.test.ts`
2. **การคอมไพล์สำหรับ Production**: ผ่านคำสั่ง `npm run build` สำเร็จเรียบร้อยโดยไม่มีข้อผิดพลาด

## Design Alignment & Workspace Preferences (2026-09-18) — Enemy Ultimate Tracker

### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสัมภาษณ์จัดแนวทาง (Alignment Interview) ระบบ **Enemy Ultimate Tracker** ได้ข้อสรุปทั้ง 3 ข้อดังนี้:

1. **การดึงข้อมูลอัลติเมตศัตรู (Tracking Scope & Draft Synchronization)**:
   - ดึงรายชื่อและข้อมูล Ultimate ของฮีโร่ฝั่งตรงข้ามครบทั้ง 5 ตัวโดยอัตโนมัติจาก GSI Draft Data (ตามการสลับฝ่าย Radiant vs Dire ของผู้เล่น)
   - แสดงสล็อตฮีโร่คนที่ 1–5 พร้อมชื่อสกิลอัลติเมตและไอคอนอย่างชัดเจน
   - คำนวณระยะเวลาคูลดาวน์ตามเลเวลสกิล 1-3 อัตโนมัติจากช่วงเวลาของเกม (Level 1 ก่อนนาที 17:00, Level 2 ช่วงนาที 17:00–27:00, Level 3 ตั้งแต่นาที 27:00 เป็นต้นไป)
2. **การบันทึกคูลดาวน์และระบบ Quick Undo (Trigger Method & Hotkeys)**:
   - รองรับ Global Hotkeys ระดับระบบ (`Alt+1` ถึง `Alt+5` สำหรับศัตรูสล็อต 1–5) บันทึกคูลดาวน์ได้ทันทีขณะอยู่ในโหมด Click-Through โดยไม่ต้องสลับเมาส์
   - มีระบบ Quick Undo ภายใน 10 วินาที หากกดซ้ำหรือกดปุ่มบน HUD จะยกเลิกการจับเวลาและคืนสถานะ Ready ทันที พร้อมเสียงยืนยัน
   - รองรับการคลิกบนแถบ HUD ในโหมด Interactive
3. **การแสดงผลและการแจ้งเตือน (HUD Display & Ready Announcement)**:
   - แสดงแถบ 5 สล็อตบน HUD: สีเขียว = พร้อมใช้งาน (`READY`) / สีแดง = ติดคูลดาวน์พร้อมเวลานับถอยหลัง
   - เมื่อคูลดาวน์สิ้นสุดลง ระบบจะส่งเสียงแจ้งเตือนผ่าน Web Speech API และ Synthesizer ทันที (เช่น `"[Hero] [Ability] is ready"` หรือ `"[Hero] ultimate is ready"`)
   - คัดลอกข้อความสรุปเวลาลง Clipboard อัตโนมัติสำหรับแชร์ในแชตทีม

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions)

1. **ฐานข้อมูลสกิลอัลติเมต ([`src/data/heroUltimates.ts`](file:///root/Desktop/DotaAssist/src/data/heroUltimates.ts))**:
   - รวบรวมข้อมูลสกิลอัลติเมตและคูลดาวน์ของฮีโร่ Dota 2 ครบถ้วน พร้อมฟังก์ชัน [`getHeroUltimate`](file:///root/Desktop/DotaAssist/src/data/heroUltimates.ts#L137)
2. **ระบบติดตามคูลดาวน์อัลติเมต ([`src/services/enemyUltimateService.ts`](file:///root/Desktop/DotaAssist/src/services/enemyUltimateService.ts))**:
   - ซิงค์ดราฟต์ฮีโร่ศัตรู 5 ตัวจาก GSI Draft Data อัตโนมัติ
   - จัดการสถานะคูลดาวน์, 10s Quick Undo, และการคัดลอกลง Clipboard
   - ดักจับคีย์ลัด `Alt+1` ถึง `Alt+5` ทั้งในเบราว์เซอร์และผ่าน Tauri IPC
3. **การส่งเสียงและการแจ้งเตือน ([`src/services/audioService.ts`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L273-L289))**:
   - เพิ่มฟังก์ชัน [`playEnemyUltimateReadyAlert`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L273-L282) และ [`playEnemyUltimateRecordedAlert`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L284-L290)
4. **การเชื่อมต่อเข้ากับ TimingEngine ([`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L151,L167,L528-L544))**:
   - ซิงค์ข้อมูล GSI และ Match Reset
   - แสดงการ์ดไทม์มิ่งนับถอยหลังเมื่อคูลดาวน์เหลือ $\le$ 30 วินาที
5. **คอมโพเนนต์ส่วนติดต่อผู้ใช้ (UI Components)**:
   - [`src/components/EnemyUltimateBar.tsx`](file:///root/Desktop/DotaAssist/src/components/EnemyUltimateBar.tsx): แถบแสดงสถานะ 5 สล็อต แสดงสีเขียว (Ready) / แดง (Cooldown) / ส้ม (Undo)
   - [`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx#L165-L172,L319): แถบแสดงผลบน Full HUD และ Badge ย่อส่วนบน Minimized Collapsed HUD
   - [`src/components/TimingAlerts.tsx`](file:///root/Desktop/DotaAssist/src/components/TimingAlerts.tsx#L69-L70): รองรับไอคอน `Swords` สำหรับการ์ดเตือนอัลติเมต
   - [`src/components/SettingsModal.tsx`](file:///root/Desktop/DotaAssist/src/components/SettingsModal.tsx#L307-L312): เพิ่มปุ่มทดสอบเสียง Enemy Ultimate Ready
   - [`src/App.tsx`](file:///root/Desktop/DotaAssist/src/App.tsx#L43,L431): รวม `EnemyUltimateBar` ในแท็บ Timers ของ Strategy Dashboard
6. **ชุดทดสอบครอบคลุมรอบด้าน ([`tests/enemy_ultimates.test.ts`](file:///root/Desktop/DotaAssist/tests/enemy_ultimates.test.ts))**:
   - ทดสอบการคำนวณคูลดาวน์และเลเวลสกิลตามเวลาเกม
   - ทดสอบการซิงค์ดราฟต์ศัตรู 5 ตัว
   - ทดสอบการบันทึกคูลดาวน์และการทำ Quick Undo ใน 10 วินาที
   - ทดสอบการนับถอยหลังและการส่งเสียงแจ้งเตือนเมื่อพร้อมใช้งาน
   - ทดสอบการจัดรูปแบบ Clipboard และ Profile Filtering

---

### การตรวจสอบความถูกต้อง (Verification Results)

1. **ชุดทดสอบ (Test Suites)**: ผ่านครบถ้วน 10 ชุดทดสอบ (`npm test`) 100%:
   - `tests/verification.test.ts`
   - `tests/gsi_integration.test.ts`
   - `tests/alert_profiles.test.ts`
   - `tests/voice_queue.test.ts`
   - `tests/opendota_cache.test.ts`
   - `tests/objective_hotkeys.test.ts`
   - `tests/buyback_tracker.test.ts`
   - `tests/neutral_items.test.ts`
   - `tests/camp_stacking.test.ts`
   - `tests/enemy_ultimates.test.ts`
2. **การคอมไพล์สำหรับ Production**: ผ่านคำสั่ง `npm run build` สำเร็จ 100%

## Design Alignment & Workspace Preferences (2026-09-18)

### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสัมภาษณ์จัดแนวทาง (Alignment Interview) ในระบบ **Enemy Ultimate Tracker (ระบบติดตามคูลดาวน์อัลติเมตและสกิลสำคัญของศัตรู)** ได้ข้อสรุปทั้ง 3 ข้อดังนี้:

1. **การดึงข้อมูลอัลติเมตศัตรู (Tracking Scope & Draft Synchronization)**:
   - ดึงรายชื่อและข้อมูลสกิล Ultimate ของฮีโร่ฝั่งตรงข้ามครบทั้ง 5 ตัวโดยอัตโนมัติจาก GSI Draft Data (ตามการสลับฝั่ง Radiant vs Dire ของผู้เล่นจริง)
   - แสดงสล็อตฮีโร่คนที่ 1–5 พร้อมชื่อสกิลอัลติเมตและไอคอนกำกับชัดเจน
   - คำนวณระยะเวลาคูลดาวน์ตามเลเวลสกิล 1–3 อัตโนมัติจากช่วงเวลาของเกม (Level 1 ก่อนนาที 17:00, Level 2 ช่วงนาที 17:00–27:00, และ Level 3 ตั้งแต่นาที 27:00 เป็นต้นไป)
2. **การบันทึกคูลดาวน์และระบบ Quick Undo (Trigger Method & Hotkeys)**:
   - รองรับ Global Hotkeys ระดับระบบ (`Alt+1` ถึง `Alt+5` สำหรับศัตรูคนที่ 1–5) เพื่อกดบันทึกได้ทันทีขณะอยู่ในโหมดคลิกทะลุจอ (Click-Through) โดยไม่ต้องสลับเมาส์
   - มีระบบ Quick Undo ภายใน 10 วินาที หากกดปุ่มซ้ำหรือคลิกบน HUD จะยกเลิกการจับเวลาและคืนสถานะ Ready ทันที พร้อมเสียงพูดและ Chime ยืนยัน
   - รองรับการคลิกบนแถบ HUD ในโหมด Interactive เพื่อเริ่มหรือยกเลิกคูลดาวน์ได้เช่นกัน
3. **การแสดงผลและการแจ้งเตือน (HUD Display & Ready Announcement)**:
   - แสดงแถบ 5 สล็อตบน HUD: สีเขียว = พร้อมใช้งาน (`READY`) / สีแดง = ติดคูลดาวน์พร้อมเวลานับถอยหลัง
   - เมื่อคูลดาวน์สิ้นสุดลง ระบบจะส่งเสียงแจ้งเตือนผ่าน Web Speech API และ Synthesizer ทันที (เช่น `"[Hero] [Ability] is ready"` หรือ `"[Hero] ultimate is ready"`)
   - คัดลอกข้อความสรุปเวลาลง Clipboard อัตโนมัติสำหรับแชร์ในแชตทีม

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions)

การเปลี่ยนแปลงทั้งหมดได้รับการผสานและติดตั้งลงในโค้ดเบสของ [DotaAssist](file:///root/Desktop/DotaAssist) เรียบร้อยแล้ว:

1. **ฐานข้อมูลสกิลอัลติเมตของฮีโร่ ([`src/data/heroUltimates.ts`](file:///root/Desktop/DotaAssist/src/data/heroUltimates.ts))**:
   - รวบรวมข้อมูลสกิลอัลติเมตและระยะเวลาคูลดาวน์ตามเลเวลของฮีโร่ Dota 2 พร้อมฟังก์ชัน [`getHeroUltimate`](file:///root/Desktop/DotaAssist/src/data/heroUltimates.ts#L137)
2. **ระบบติดตามคูลดาวน์อัลติเมตศัตรู ([`src/services/enemyUltimateService.ts`](file:///root/Desktop/DotaAssist/src/services/enemyUltimateService.ts))**:
   - ซิงค์ดราฟต์ฮีโร่ศัตรู 5 ตัวจาก GSI Draft Data อัตโนมัติผ่าน [`updateFromGSI`](file:///root/Desktop/DotaAssist/src/services/enemyUltimateService.ts#L173)
   - เมธอด [`recordCast`](file:///root/Desktop/DotaAssist/src/services/enemyUltimateService.ts#L248) บันทึกคูลดาวน์ตามเลเวลเวลาเกม และจัดการ Quick Undo ใน 10 วินาที
   - ดักจับคีย์ลัด `Alt+1` ถึง `Alt+5` ทั้งในเบราว์เซอร์และผ่าน Tauri IPC
3. **การส่งเสียงและการแจ้งเตือน ([`src/services/audioService.ts`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L273-L289))**:
   - เพิ่มฟังก์ชัน [`playEnemyUltimateReadyAlert`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L273-L282) สังเคราะห์เสียง Chime และส่งเสียงพูด TTS เมื่อคูลดาวน์พร้อม
   - เพิ่มฟังก์ชัน [`playEnemyUltimateRecordedAlert`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L284-L290) ส่งเสียงยืนยันเมื่อบันทึก
4. **ระบบโปรไฟล์การแจ้งเตือน ([`src/services/alertProfiles.ts`](file:///root/Desktop/DotaAssist/src/services/alertProfiles.ts#L10) & [`src/types/meta.ts`](file:///root/Desktop/DotaAssist/src/types/meta.ts#L33))**:
   - เพิ่ม Objective `'enemy_ultimate'` พร้อมเปิดใช้งานเป็นค่าเริ่มต้นสำหรับทุกบทบาท
5. **การเชื่อมต่อเข้ากับ TimingEngine ([`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L151,L167,L528-L544))**:
   - รับส่งข้อมูล Game Clock, GSI Payload, และ Match Reset เข้ากับ `enemyUltimateService`
   - แปลงสถานะเป็น Timing Alerts นับถอยหลังเมื่อคูลดาวน์เหลือ $\le$ 30 วินาที
6. **คอมโพเนนต์ส่วนติดต่อผู้ใช้ (UI Components)**:
   - [`src/components/EnemyUltimateBar.tsx`](file:///root/Desktop/DotaAssist/src/components/EnemyUltimateBar.tsx): แถบแสดงสถานะ 5 สล็อต แสดงสีเขียว (Ready) / สีแดง (Cooldown) / สีส้ม (Undo 10s)
   - [`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx#L165-L172,L319): แสดงแถบอัลติเมตบน Full HUD และ Badge ย่อส่วนบน Minimized Collapsed HUD
   - [`src/components/TimingAlerts.tsx`](file:///root/Desktop/DotaAssist/src/components/TimingAlerts.tsx#L69-L70): รองรับไอคอน `Swords` สำหรับการ์ดเตือนอัลติเมตศัตรู
   - [`src/components/SettingsModal.tsx`](file:///root/Desktop/DotaAssist/src/components/SettingsModal.tsx#L307-L312): เพิ่มปุ่มทดสอบเสียง `⚔️ Enemy Ultimate Ready` ในพาเนลตั้งค่า
   - [`src/App.tsx`](file:///root/Desktop/DotaAssist/src/App.tsx#L43,L431): รวม `EnemyUltimateBar` ในแท็บ Timers ของ Strategy Dashboard และเรียกใช้งาน `enemyUltimateService.init()`
7. **ชุดทดสอบครอบคลุมรอบด้าน ([`tests/enemy_ultimates.test.ts`](file:///root/Desktop/DotaAssist/tests/enemy_ultimates.test.ts))**:
   - ทดสอบการคำนวณคูลดาวน์และเลเวลสกิลตามเวลาเกม
   - ทดสอบการซิงค์ดราฟต์ศัตรู 5 ตัวจาก GSI
   - ทดสอบการบันทึกคูลดาวน์และการทำ Quick Undo ภายใน 10 วินาที
   - ทดสอบการนับถอยหลังและการส่งเสียงแจ้งเตือนเมื่อพร้อมใช้งาน
   - ทดสอบการจัดรูปแบบ Clipboard และ Alert Profile Filtering

---

### การตรวจสอบความถูกต้อง (Verification Results)

1. **ชุดทดสอบ (Test Suites)**: ผ่านครบถ้วนทั้ง 10 ชุดทดสอบ (`npm test`) 100%:
   ```
   ✓ tests/verification.test.ts
   ✓ tests/gsi_integration.test.ts
   ✓ tests/alert_profiles.test.ts
   ✓ tests/voice_queue.test.ts
   ✓ tests/opendota_cache.test.ts
   ✓ tests/objective_hotkeys.test.ts
   ✓ tests/buyback_tracker.test.ts
   ✓ tests/neutral_items.test.ts
   ✓ tests/camp_stacking.test.ts
   ✓ tests/enemy_ultimates.test.ts
   ```
2. **การคอมไพล์สำหรับ Production**: ผ่านคำสั่ง `npm run build` (TypeScript + Vite) สำเร็จ 100% เรียบร้อยครับ

## Design Alignment & Workspace Preferences (2026-09-18)

กำลังดำเนินการรันชุดทดสอบทั้งหมด (`npm test`) ในพื้นหลังครับ เพื่อยืนยันว่าการพัฒนาและแก้ไขระบบทั้งหมดทำงานประสานกันได้อย่างสมบูรณ์และไม่มีการกระทบกระเทือน (No regression) ต่องานเดิม
กำลังรันชุดทดสอบทั้งหมดรอบสุดท้าย (`npm test`) เพื่อตรวจสอบความถูกต้องอย่างละเอียดครับ ระบบจะแจ้งผลทันทีที่เสร็จสิ้น

## Design Alignment & Workspace Preferences (2026-09-18)

กำลังรันชุดทดสอบทั้งหมด (`npm test`) ครอบคลุมทั้ง 12 ชุดทดสอบในพื้นหลังครับ ระบบจะแจ้งผลการตรวจสอบให้ทราบทันทีที่เสร็จสิ้น

## Design Alignment & Workspace Preferences (2026-09-18)

Implemented all three decisions:

- Timers, readiness labels, voice announcements, and clipboard summaries now identify estimates.
- Manual level and cooldown corrections immediately recalculate active timers from the recorded cast and persist for future casts until reset.
- Each enemy has a separate **Edit** button and compact correction panel, enabled during overlay interaction.

Updated documentation and regression tests. All 12 test suites and the production build pass. Native Windows interaction still needs an on-device check.

## Design Alignment & Workspace Preferences (2026-09-18)

Implemented all three choices:

- Empty slots now offer manual hero selection.
- Incoming GSI preserves existing slots, timers, and corrections while filling empty slots without duplicates.
- Manual slots have **Clear selection**, with confirmation before discarding timers or corrections.

Cleared slots remain available for replacement; match resets clear the lineup. Updated documentation and regression tests.

All 12 test suites and the production build pass. Native Windows interaction remains untested on-device.
