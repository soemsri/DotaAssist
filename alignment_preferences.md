# Design Alignment Summary

Date: 2026-09-03T09:23:48.350247

กำลังติดตั้ง System Dependencies สำหรับ GTK และ WebKit (`pkg-config`, `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`) ในระบบเพื่อรองรับการตรวจสอบและ Build ฝั่ง Tauri Rust บน Linux ครับ ระบบจะดำเนินการต่อทันทีที่คำสั่งเสร็จสิ้น
### สรุปผลการคัดเลือกการออกแบบและข้อกำหนด (Design Decisions Summary)

จากการสัมภาษณ์จัดแนวทาง (Alignment Interview) ได้ข้อสรุปทั้ง 3 ด้านดังนี้:

1. **รูปแบบแอปพลิเคชัน (Application Format)**:
   - **In-Game Overlay & Real-time Assistant**: หน้าต่าง Overlay ลอยโปร่งแสงซ้อนบนหน้าจอ Dota 2 เพื่อแสดงผลไทม์มิ่ง วัตถุประสงค์ และไอเทมแก้ทาง ควบคู่กับโหมด Strategy Dashboard สำหรับช่วงดราฟต์และวิเคราะห์ภาพรวม
2. **เทคโนโลยีและเฟรมเวิร์ก (Technology Stack)**:
   - **Tauri (Rust + React/TypeScript)**: ใช้ WebView ของระบบ รองรับ Transparent Window และรัน Embedded HTTP Listener สำหรับ GSI ในฝั่ง Rust โดยตรง โดยต้อง benchmark RAM/FPS บนเครื่องเป้าหมายก่อนอ้างตัวเลขประสิทธิภาพ
3. **แหล่งข้อมูลและการแจ้งเตือน (Data Pipeline & Objectives)**:
   - **Hybrid Architecture (Local GSI + OpenDota API)**: รับ Event และ Game Clock เรียลไทม์ผ่าน Dota 2 Game State Integration (GSI) ภายในเครื่อง พร้อมดึงสถิติ Counter Picks, Win Rates และ Item Popularity จาก API จริง

---

### รายละเอียดการพัฒนาและไฟล์ที่สร้างขึ้น (Implementation Summary)

ได้ดำเนินการสร้างและติดตั้งโปรเจกต์เต็มรูปแบบใน [`/root/Desktop/DotaAssist`](file:///root/Desktop/DotaAssist) เรียบร้อยแล้ว:

#### 1. ฝั่ง Backend & GSI Integration (Rust / Tauri)
- [`src-tauri/Cargo.toml`](file:///root/Desktop/DotaAssist/src-tauri/Cargo.toml): คอนฟิก Tauri และโมดูล [`tiny_http`](file:///root/Desktop/DotaAssist/src-tauri/Cargo.toml#L12) สำหรับ Local GSI Server
- [`src-tauri/tauri.conf.json`](file:///root/Desktop/DotaAssist/src-tauri/tauri.conf.json): กำหนดค่าหน้าต่างโปร่งแสง (`transparent: true`), `alwaysOnTop`, และสิทธิ์การควบคุมหน้าต่าง
- [`src-tauri/src/main.rs`](file:///root/Desktop/DotaAssist/src-tauri/src/main.rs): รัน HTTP Webhook Server บนพอร์ต `127.0.0.1:3001/gsi` คอยรับ JSON Event จาก Dota 2 แล้วส่งต่อให้ React ผ่าน Tauri Event IPC (`gsi-update`)
- [`public/gamestate_integration_dotaassist.cfg`](file:///root/Desktop/DotaAssist/public/gamestate_integration_dotaassist.cfg): ไฟล์คอนฟิก GSI มาตรฐานของ Dota 2 สำหรับคัดลอกลงโฟลเดอร์เกม

#### 2. ฝั่ง Frontend & UI Components (React + TypeScript + Tailwind CSS)
- [`src/types/gsi.ts`](file:///root/Desktop/DotaAssist/src/types/gsi.ts) & [`src/types/meta.ts`](file:///root/Desktop/DotaAssist/src/types/meta.ts): Data Contracts สำหรับ GSI Payload (Map, Player, Hero, Draft, Items) และ Meta / Matchups
- [`src/services/timingEngine.ts`](file:///root/Desktop/DotaAssist/src/services/timingEngine.ts): เอ็นจินคำนวณเวลารูนและบอสแบบเรียลไทม์:
  - **Wisdom Shrines** (ทุก 7 นาที: 7:00, 14:00, 21:00...)
  - **Bounty Runes** (เริ่ม 0:00 และทุก 4 นาที: 4:00, 8:00...)
  - **Power / Water Runes** (ทุก 2 นาที: Water ที่ 2:00/4:00, Power เริ่มที่ 6:00)
  - **Tormentor** (เกิดที่นาทีที่ 20:00 และเกิดใหม่ทุก 10 นาที)
  - **Roshan & Aegis Tracker** (Aegis 5 นาที, หน้าต่างสุ่มเกิด 8–11 นาที และซิงก์สถานะจาก GSI เมื่อมีข้อมูล)
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
   - ศัพท์เฉพาะทางโดเมน (GSI, Wisdom Shrine, Power Rune, Tormentor, Roshan Window, Advantage %)
   - กฎสถานะเกมและเกณฑ์การแจ้งเตือนเสียงล่วงหน้า 20–30 วินาที
2. **[`docs/adr/0001-tauri-gsi-hybrid-overlay.md`](file:///root/Desktop/DotaAssist/docs/adr/0001-tauri-gsi-hybrid-overlay.md)**:
   - Architecture Decision Record บันทึกบริบท ปัญหาเรื่อง FPS/RAM ใน Electron vs Tauri, ขอบเขตที่ไม่อ่าน memory/ไม่ inject code และผลลัพธ์เชิงบวก/ข้อแลกเปลี่ยน
3. **[`README.md`](file:///root/Desktop/DotaAssist/README.md)**:
   - คู่มือการใช้งานภาษาไทยและภาษาอังกฤษ พร้อมพาธสำหรับวางไฟล์ GSI ใน Steam

---

### การตรวจสอบความถูกต้อง (Verification)

- **Frontend Assets**: ผ่านการคอมไพล์ TypeScript และ Vite (`npm run build`) สำเร็จ 100%
- **Rust Backend**: ผ่านการตรวจสอบโครงสร้างโค้ดด้วย [`cargo check`](file:///root/Desktop/DotaAssist/src-tauri) สำเร็จ 100% พร้อมเชื่อมโยงระบบ GSI และหน้าต่างโปร่งแสงเรียบร้อยแล้ว
