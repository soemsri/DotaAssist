# DotaAssist — Real-Time In-Game Overlay & Assistant

> **DotaAssist** คือแอปพลิเคชัน Desktop Assistant และ In-game Overlay สำหรับ Dota 2 ที่พัฒนาด้วย **Tauri (Rust + React/TypeScript)** ออกแบบมาให้กินทรัพยากรเครื่องน้อยมาก (RAM ~10-25 MB) ไม่ดึง FPS ในเกม ปลอดภัยต่อบัญชี 100% (VAC-Safe) ด้วยการใช้ **Dota 2 Game State Integration (GSI)** ทางการของ Valve ควบคู่กับข้อมูลสถิติ Meta / Counter-Picks จาก **OpenDota / Stratz API**

---

## ฟีเจอร์หลัก (Key Features)

1. **In-Game Transparent Overlay HUD**:
   - หน้าต่าง Overlay แบบลอย โปร่งใส ปรับความโปร่งแสงได้ตามต้องการ
   - สามารถย่อเป็น Minimal Floating Pill เมื่อต้องการความคล่องตัวในจังหวะ Teamfight
   - โหมดสลับระหว่าง **In-Game HUD** และ **Strategy Dashboard**
2. **ระบบแจ้งเตือนไทม์มิ่งเรียลไทม์ (Real-Time Timing Engine)**:
   - **Wisdom Runes**: แจ้งเตือนทุกๆ 7 นาที (7:00, 14:00, 21:00, 28:00...) เตือนล่วงหน้า 30 วินาทีเพื่อแย่งชิงรูนเลเวล
   - **Bounty Runes**: แจ้งเตือนทุกๆ 3 นาที (3:00, 6:00, 9:00...)
   - **Power / Water Runes**: แจ้งเตือน Water Runes (2:00, 4:00) และ Power Runes แม่น้ำทุก 2 นาทีเริ่มตั้งแต่นาทีที่ 6:00
   - **Tormentor**: แจ้งเตือนเกิดครั้งแรกที่ 20:00 และเกิดใหม่ทุก 10 นาทีหลังถูกกำจัด
   - **Lotus Pool**: เตือนเก็บดอกบัวทุก 3 นาที
   - **Roshan & Aegis Tracker**: นับเวลา Aegis หมดอายุ (5 นาที) และช่วงหน้าต่างสุ่มเกิดของ Roshan (8 - 11 นาที) พร้อมคำนวณตำแหน่งถ้ำ (กลางวัน = Radiant / กลางคืน = Dire)
   - **Web Audio API Synthesizer**: สังเคราะห์เสียงเตือนเฉพาะของแต่ละรูน โดยไม่ต้องโหลดไฟล์เสียงหนักๆ
3. **Draft Advisor & Counter-Pick Matrix**:
   - แนะนำฮีโร่แก้ทาง (Counter-picks) พร้อมคำนวณอัตราความได้เปรียบ (% Advantage) จากข้อมูลสถิติการเล่น
   - ตรวจจับฮีโร่ที่ฝ่ายตรงข้ามเลือกผ่าน GSI Draft Payload
4. **Dynamic Item Build & Situational Counters**:
   - แนะนำไอเทมแก้ทางสถานการณ์เฉพาะ เช่น แนะนำ Monkey King Bar เมื่อเจอฮีโร่ที่มี Evasion (เช่น Phantom Assassin), Spirit Vessel เมื่อเจอฮีโร่รีเจนเลือดสูง, Black King Bar เมื่อเจอสกิลเวท Burst หรือ Disable หนัก

---

## สถาปัตยกรรมระบบ (Architecture)

- **Backend**: Rust + `tiny_http` รัน Local HTTP Server ที่ `http://127.0.0.1:3000/gsi` เพื่อรับข้อมูล GSI จาก Dota 2 Client แล้วส่งต่อเข้า Frontend ผ่าน Tauri Event IPC
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Lucide Icons
- **Data Integration**: Valve Dota 2 GSI + OpenDota / Stratz API (พร้อม Offline Fallback Cache)

---

## วิธีติดตั้งและเริ่มใช้งาน (Getting Started)

### 1. การตั้งค่า Dota 2 GSI Configuration
คัดลอกไฟล์ `gamestate_integration_dotaassist.cfg` ไปไว้ในโฟลเดอร์เกม Dota 2:
- **Windows**:
  `C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\`
- **Linux**:
  `~/.steam/steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/`
- **macOS**:
  `~/Library/Application Support/Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/`

### 2. รันในโหมด Development
```bash
# ติดตั้ง dependencies
npm install

# รัน Vite Web Dev Server (พร้อม Mock Simulation Feed)
npm run dev

# หรือรันผ่าน Tauri Desktop App
npm run tauri dev
```

### 3. Build สำหรับ Production
```bash
npm run build
npm run tauri build
```
