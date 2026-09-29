# Design Alignment Summary

Date: 2026-09-29T22:54:03.951464

### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสัมภาษณ์จัดแนวทาง (Interactive Grill-Me Alignment) ได้ข้อสรุปทั้ง 3 ข้อดังนี้:

1. **ระบบวิเคราะห์และประเมินผลหลังจบเกม (Post-Match Analytics & Fundamentals Scorecard)**:
   - บันทึกประวัติและสถิติการเล่นของแต่ละแมตช์ไว้ในเครื่อง พร้อมคำนวณคะแนน **Fundamentals Scorecard (0–100 คะแนน และตัดเกรด S, A, B, C, D)** โดยประเมิน 4 เสาหลักสำคัญ ได้แก่:
     - **CS Pace (10:00)**: เปรียบเทียบกับ Role Benchmark ของแต่ละตำแหน่ง
     - **Pre-Rune Wave Shove**: สัดส่วนการดันครีปเข้าใต้ป้อมที่วินาที :40 ก่อนเวลารูนคู่ (2, 4, 6, 8 นาที)
     - **Aegis Discipline**: ความคุ้มค่าในการถือ Aegis (การดันป้อม High Ground เทียบกับปล่อยโล่หมดอายุโดยเปล่าประโยชน์)
     - **Buyback Discipline**: อัตราการปฏิบัติตาม Safe-to-Spend และการไม่ตายฟรีโดยไม่มี Buyback หลังนาทีที่ 30:00
2. **สถาปัตยกรรมการจัดเก็บข้อมูล (Embedded SQLite in Rust Background Worker)**:
   - ใช้ **Embedded SQLite (`rusqlite`)** ฝั่ง Rust Backend ใน Background Worker Thread เพื่อแยก Database I/O ออกจาก UI Thread 100% ทำให้ **ไม่กระทบ Frame Time (Zero FPS Impact)** และหลุดพ้นจากข้อจำกัดขนาด 5MB ของ Browser Storage พร้อม Fallback อัตโนมัติเมื่อรันบนเบราว์เซอร์
3. **การนำเสนอผลวิเคราะห์และการแจ้งเตือน (Post-Match Debrief Modal & Thai Voice Summary)**:
   - แสดงหน้าต่างสรุปผล **Post-Match Debrief Modal** อัตโนมัติเมื่อจบเกม (`POST_GAME`) พร้อมเสียงโค้ชภาษาไทยสังเคราะห์ (TTS) สรุปคะแนน จุดเด่น และข้อผิดพลาดสำคัญ 15 วินาที
   - เพิ่มแท็บ **"Match History" (ประวัติการเล่น)** ใน Strategy Dashboard เพื่อให้เปิดดูกราฟ สถิติย้อนหลัง และกรองตามฮีโร่/บทบาท/เกรดได้ตลอดเวลา

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions)

#### 1. สถาปัตยกรรมฐานข้อมูลระดับระบบฝั่ง Rust Backend
- [`src-tauri/Cargo.toml`](file:///root/Desktop/DotaAssist/src-tauri/Cargo.toml): เพิ่ม crate [`rusqlite`](file:///root/Desktop/DotaAssist/src-tauri/Cargo.toml#L17) พร้อมฟีเจอร์ `bundled`
- [`src-tauri/src/db.rs`](file:///root/Desktop/DotaAssist/src-tauri/src/db.rs): สร้างโมดูลจัดการ SQLite แบบ WAL Mode (`dotaassist_matches.db`) พร้อมสร้างตาราง `matches` และอินเด็กซ์เวลา ทำงานแบบแยกเธรดเบื้องหลัง:
  - [`save_match_record`](file:///root/Desktop/DotaAssist/src-tauri/src/db.rs#L64): บันทึกประวัติแมตช์และ Scorecard JSON
  - [`get_match_history`](file:///root/Desktop/DotaAssist/src-tauri/src/db.rs#L104): ดึงรายการประวัติแมตช์เรียงตามเวลาล่าสุด
  - [`get_match_details`](file:///root/Desktop/DotaAssist/src-tauri/src/db.rs#L159): ดึงรายละเอียดแมตช์รายตัว
  - [`delete_match_record`](file:///root/Desktop/DotaAssist/src-tauri/src/db.rs#L207) & [`clear_all_matches`](file:///root/Desktop/DotaAssist/src-tauri/src/db.rs#L218): ลบแมตช์เดี่ยวหรือล้างประวัติทั้งหมด
- [`src-tauri/src/main.rs`](file:///root/Desktop/DotaAssist/src-tauri/src/main.rs#L12,L896-L900): ลงทะเบียนโมดูล `db` และคำสั่ง IPC ทั้ง 5 คำสั่งลงใน `tauri::generate_handler!`

#### 2. เอ็นจินประเมินและรวบรวมข้อมูล Telemetry ระหว่างแมตช์
- [`src/types/matchHistory.ts`](file:///root/Desktop/DotaAssist/src/types/matchHistory.ts): กำหนด Data Contracts สำหรับ `MatchRecord`, `FundamentalsScorecard`, และ 4 เสาหลักคะแนน (`CSPacePillar`, `PreRuneShovePillar`, `AegisDisciplinePillar`, `BuybackDisciplinePillar`)
- [`src/services/matchTrackerService.ts`](file:///root/Desktop/DotaAssist/src/services/matchTrackerService.ts):
  - ตรวจจับสถานะเริ่มเกมและคอยบันทึก CS ที่นาที 10:00, จังหวะดันครีปช่วง :40-:59 ก่อนเวลารูน, การเก็บและการใช้ประโยชน์จาก Aegis, และจังหวะตายโดยไม่มี Buyback หลังนาทีที่ 30:00
  - มีฟังก์ชัน [`calculateScorecard`](file:///root/Desktop/DotaAssist/src/services/matchTrackerService.ts#L336): คำนวณคะแนนถ่วงน้ำหนักตามบทบาท (Carry/Mid/Offlane/Support), สรุปจุดเด่น (Key Strengths), จุดหลุด (Top Blunders), และสิ่งที่ต้องโฟกัสในเกมถัดไป (Next Game Focus)
  - สร้างสคริปต์เสียงภาษาไทย 15 วินาทีที่เป็นธรรมชาติ: *"จบแมตช์แล้วครับ! คะแนนวินัยภาพรวมได้เกรด [X] ... จุดเด่นคือ ... ข้อควรปรับปรุงคือ ..."*
  - เชื่อมโยง SQLite IPC ผ่าน Tauri และมี LocalStorage Fallback สำหรับโหมดเบราว์เซอร์
- [`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts#L159,L179): เชื่อมต่อ `matchTrackerService.processGSI(payload)` ทุกครั้งที่มี Payload เข้ามา และเรียก `resetAll()` เมื่อเริ่มแมตช์ใหม่
- [`src/services/audioService.ts`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L1242): เพิ่มฟังก์ชัน [`playPostMatchDebrief`](file:///root/Desktop/DotaAssist/src/services/audioService.ts#L1242) สำหรับส่งเสียงสรุปผล

#### 3. ส่วนติดต่อผู้ใช้ (UI Components)
- [`src/components/PostMatchDebriefModal.tsx`](file:///root/Desktop/DotaAssist/src/components/PostMatchDebriefModal.tsx): หน้าต่าง Pop-up แสดงผลการประเมินหลังจบเกมแบบ Glassmorphism สไตล์ Dota 2:
  - วงแหวนแสดงเกรดใหญ่ (S / A / B / C / D) พร้อมหลอดคะแนนรวม 0–100
  - การ์ดแจกแจง 4 เสาหลักคะแนน พร้อมสถานะ Ahead / On Pace / Behind
  - กล่องแสดงจุดเด่น, ข้อผิดพลาดสำคัญ, และจุดโฟกัสเกมถัดไป
  - ปุ่ม 🔊 ฟังบทสรุปเสียงอีกครั้ง และปุ่ม 📊 เปิดดูประวัติแบบเต็ม
- [`src/components/MatchHistoryView.tsx`](file:///root/Desktop/DotaAssist/src/components/MatchHistoryView.tsx): แท็บประวัติการเล่นใน Strategy Dashboard:
  - แดชบอร์ดสรุปสถิติภาพรวม (จำนวนแมตช์, Win Rate %, คะแนนวินัยเฉลี่ย, เกรดเฉลี่ย)
  - ตัวกรองตามบทบาท (Carry, Mid, Offlane, Support) และตามเกรด (S, A, B, C, D)
  - รายการประวัติแมตช์พร้อม KDA, CS at 10m, Net Worth, และเกรดคะแนน สามารถกดเพื่อดูรายละเอียด Scorecard ฉบับเต็มได้
- [`src/App.tsx`](file:///root/Desktop/DotaAssist/src/App.tsx): เพิ่มแท็บ **"Match History"** บนแถบนำทาง พร้อมตรวจจับและเปิด `PostMatchDebriefModal` อัตโนมัติเมื่อเกมจบ ทั้งในโหมด Dashboard และ In-game Overlay

---

### การตรวจสอบความถูกต้อง (Verification Results)

1. **Rust Test Suite** (`cargo test --manifest-path src-tauri/Cargo.toml`): ผ่านการทดสอบทั้งหมด **5/5 รายการ (100%)**
   - `test db::tests::test_record_serialization ... ok`
   - `test desktop::tests::finds_additional_steam_libraries ... ok`
   - `test desktop::tests::validates_installation_and_preserves_each_backup ... ok`
   - `test minimap::tests::rejects_blank_and_changed_frames ... ok`
   - `test minimap::tests::validates_monitor_bounds_and_overflow ... ok`
2. **Frontend & Unit Test Suites** (`npm test`): ผ่านการทดสอบครบถ้วนทั้ง **19 ชุดทดสอบ (100%)** รวมถึงชุดทดสอบใหม่ [`tests/match_history_scorecard.test.ts`](file:///root/Desktop/DotaAssist/tests/match_history_scorecard.test.ts)
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
   ✓ enemy_ultimates.test.ts
   ✓ laning_benchmark.test.ts
   ✓ enemy_glyph.test.ts
   ✓ thai_voice_naturalness.test.ts
   ✓ healing_lotus.test.ts
   ✓ pro_builds.test.ts
   ✓ draft_item_recommendation.test.ts
   ✓ minimap_scanner.test.ts
   ✓ teamfight_advisor.test.ts
   ✓ smurf_coaching_insights.test.ts
   ✓ match_history_scorecard.test.ts
   ```
3. **Production Build** (`npm run build`): ผ่านการตรวจสอบ Type Check ของ TypeScript และ Vite Build ได้ Bundle ไฟล์สำหรับ Production เรียบร้อยสมบูรณ์โดยไม่มีข้อผิดพลาด