# Design Alignment Summary

Date: 2026-09-30T00:52:46.640602

### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสัมภาษณ์จัดแนวทาง (Grill-Me Alignment Interview) ได้ข้อสรุปทั้ง 3 ข้อดังนี้:

1. **ระบบสั่งการด้วยเสียงแบบแฮนด์ฟรี (Hands-Free Voice Recognition)**:
   - สั่งบันทึกเวลาของ **Roshan** และ **Tormentor** หรือสั่ง **Quick Undo** ยกเลิกการบันทึกได้ด้วยเสียงพูดทันที โดยผู้เล่นไม่ต้องละมือจากเมาส์หรือคลำหาคีย์ลัดระหว่างไฟต์
2. **ระบบ Push-to-Talk (PTT) ป้องกันเสียงแทรก 100%**:
   - ใช้ระบบ **Push-to-Talk (PTT)** (ค่าเริ่มต้นระดับ OS: `Alt+V` / ในเบราว์เซอร์: ปุ่ม Grave Accent `~` หรือ `Backquote`) โดยไมโครโฟนจะเริ่มตรวจจับคำสั่งเฉพาะช่วงที่กดปุ่มค้างไว้
   - มีระบบ Noise Gate ตัดเสียงพูดทั่วไป เช่น เสียงคุยใน Discord หรือ Team Voice Chat ทิ้งทันทีเมื่อไม่ได้กดปุ่ม PTT ป้องกัน False Positives โดยสิ้นเชิง พร้อมตัวเลือกสลับเป็น Continuous Listening ได้ใน Settings
3. **รองรับ 2 ภาษาและแสดงสถานะคลื่นเสียงบน HUD (Bilingual & Visual Waveform)**:
   - รองรับคำสั่งเสียงทั้งภาษาไทยและอังกฤษอย่างเป็นธรรมชาติ (เช่น *"โรชานตาย"*, *"Roshan dead"*, *"ทอร์เมนเตอร์"*, *"Tormentor"*, *"ยกเลิก"*, *"Cancel roshan"*)
   - แสดงป้าย **PTT Mic Badge** พร้อมแท่งคลื่นเสียงอนิเมชัน 6 แถบ (6-Bar Audio Waveform) เรืองแสงสีเขียว/ส้มบน In-game Overlay HUD ทั้งในโหมด Minimized และ Expanded แบบเรียลไทม์

---

### รายละเอียดการพัฒนาและไฟล์ที่ได้ดำเนินการ (Implementation Actions Executed)

#### 1. สถาปัตยกรรมประเภทข้อมูลและ Intent
- [`src/types/voice.ts`](file:///root/Desktop/DotaAssist/src/types/voice.ts):
  - เพิ่ม Intent `tormentor_death` และ `undo_objective` ใน [`VoiceCommandIntent`](file:///root/Desktop/DotaAssist/src/types/voice.ts#L3)
  - กำหนดโหมดการเปิดใช้งาน [`VoiceActivationMode`](file:///root/Desktop/DotaAssist/src/types/voice.ts#L42) (`'ptt' | 'continuous'`)
  - กำหนดโครงสร้างสถานะ PTT และคลื่นเสียง [`VoicePttState`](file:///root/Desktop/DotaAssist/src/types/voice.ts#L44-L52) (`isPttActive`, `audioLevel`, `waveformBars`, `activationMode`, `pttHotkey`)

#### 2. เอ็นจินสั่งการด้วยเสียงและ PTT State Machine
- [`src/services/voiceCommandService.ts`](file:///root/Desktop/DotaAssist/src/services/voiceCommandService.ts):
  - เพิ่มพจนานุกรมคำสั่งเสียง 2 ภาษา (ไทย/อังกฤษ) สำหรับ Roshan, Tormentor, และ Quick Undo พร้อมระบบจัดลำดับแบบ Longest-phrase matching ป้องกันคำสั่งซ้อนทับ (เช่น *"cancel roshan"* จะตรงกับ `undo_objective` ก่อน `roshan_death`)
  - เชื่อมโยงกับ Web Audio API (`AudioContext` และ `AnalyserNode`) คำนวณคลื่นเสียง 6 แถบความถี่แบบเรียลไทม์ขณะกด PTT
  - ระบบ Noise Gate ตรวจสอบ `fromMic: true` หากไม่ได้กดปุ่ม PTT จะปฏิเสธการประมวลผลทันที
  - ส่งต่อคำสั่งไปยัง [`objectiveTracker.recordRoshan()`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts), [`objectiveTracker.recordTormentor()`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts), และ [`objectiveTracker.undoLatest()`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts)
- [`src/services/objectiveTracker.ts`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts):
  - เพิ่มฟังก์ชัน [`isRoshanUndoActive()`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts#L104), [`isTormentorUndoActive()`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts#L108), และ [`undoLatest()`](file:///root/Desktop/DotaAssist/src/services/objectiveTracker.ts#L112) รองรับการยกเลิกไทม์เมอร์ที่บันทึกล่าสุดผ่านเสียงภายในหน้าต่างเวลา 10 วินาที

#### 3. ฝั่ง Rust Backend & Global Shortcuts ระดับระบบ
- [`src-tauri/src/desktop.rs`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs):
  - เพิ่ม `DEFAULT_PTT_HOTKEY = "Alt+V"`, ฟิลด์ `ptt_hotkey` ในโครงสร้าง [`Preferences`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs#L24) และ [`DesktopStatus`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs#L55)
  - ลงทะเบียนคีย์ลัดระดับ OS แบบกดค้าง (`ShortcutState::Pressed` $\rightarrow$ ส่งอีเวนต์ IPC `ptt-start`) และปล่อยปุ่ม (`ShortcutState::Released` $\rightarrow$ ส่งอีเวนต์ IPC `ptt-stop`)
  - เพิ่ม Tauri Command [`set_ptt_hotkey`](file:///root/Desktop/DotaAssist/src-tauri/src/desktop.rs#L309) พร้อมบันทึกลงในไฟล์ Preferences ในเครื่อง
- [`src-tauri/src/main.rs`](file:///root/Desktop/DotaAssist/src-tauri/src/main.rs#L905): ลงทะเบียนคำสั่ง `set_ptt_hotkey` เข้ากับตัวจัดการ IPC

#### 4. ส่วนติดต่อผู้ใช้บน Overlay HUD และหน้าต่าง Settings
- [`src/components/OverlayHUD.tsx`](file:///root/Desktop/DotaAssist/src/components/OverlayHUD.tsx):
  - เพิ่มป้ายสถานะไมค์ PTT พร้อมแถบ Visual Waveform 6 ขีดแบบอนิเมชัน ทั้งในแถบหัว Full HUD และ Mini Badge
  - รองรับการกดค้างด้วยเมาส์ (MouseDown/MouseUp) สำหรับทดสอบการสั่งการ
- [`src/components/SettingsModal.tsx`](file:///root/Desktop/DotaAssist/src/components/SettingsModal.tsx):
  - เพิ่มพาเนลตั้งค่า Voice Recognition & Push-to-Talk ให้เลือกโหมด (PTT vs Always Listening)
  - เพิ่มตัวเลือกตั้งค่าปุ่ม PTT Hotkey (`Backquote`, `KeyV`, `Alt+V`, `Space`, `ControlLeft`)
  - เพิ่มปุ่มทดสอบคำสั่งเสียงจำลอง 2 ภาษา (Roshan, Tormentor, Undo, BKB, Lotus)
- [`src/App.tsx`](file:///root/Desktop/DotaAssist/src/App.tsx): เชื่อมต่อและเริ่มทำงาน `voiceCommandService.init()` ตอนเปิดแอป

#### 5. ชุดทดสอบครอบคลุมรอบด้าน
- [`tests/voice_ptt_commands.test.ts`](file:///root/Desktop/DotaAssist/tests/voice_ptt_commands.test.ts):
  - ทดสอบ PTT State Transitions และการรีเซ็ต Waveform
  - ทดสอบการจับคู่คำสั่ง 2 ภาษา (ไทย/อังกฤษ) และ Longest-phrase matching
  - ทดสอบระบบ PTT Noise Gate ตัดเสียง Discord Chatter
  - ทดสอบการสั่งบันทึก Roshan / Tormentor และการสั่ง Quick Undo ด้วยเสียงภายใน 10 วินาที
  - ทดสอบ Continuous Listening Mode Fallback

---

### การตรวจสอบความถูกต้อง (Verification Results)

1. **Unit Test Suite** (`npm run test:voice_ptt`):
   - ผ่านการทดสอบทั้งหมด **6/6 รายการ (100%)**
2. **Full Frontend Test Suite** (`npm test`):
   - ผ่านการทดสอบครบถ้วนทั้ง **24 ชุดทดสอบ (100%)** ปราศจากข้อผิดพลาดและไม่มี Regression
3. **Rust Backend Test Suite** (`cargo test --manifest-path src-tauri/Cargo.toml`):
   - ผ่านการทดสอบทั้งหมด **5/5 รายการ (100%)**
4. **Production Build** (`npm run build`):
   - ผ่านการตรวจสอบ Type Check ของ TypeScript และ Vite Build สร้าง Bundle ไฟล์สำหรับ Production สำเร็จสมบูรณ์โดยไม่มี Error (5.62s)

---

### เอกสารประกอบและสถานะ Workspace

- ได้อัปเดตบันทึกสถาปัตยกรรมและรายละเอียดการทำงานทั้งหมดลงใน [`.agents/AGENTS.md`](file:///root/Desktop/DotaAssist/.agents/AGENTS.md) เรียบร้อยแล้ว
- โค้ดทั้งหมดพร้อมใช้งาน หากต้องการให้ทำการ Commit และ Push แจ้งได้ทันทีครับ!