# DotaAssist — Real-Time In-Game Overlay & Voice Assistant

> **DotaAssist** คือแอปพลิเคชัน Desktop Assistant และ In-game Overlay สำหรับ Dota 2 ที่พัฒนาด้วย **Tauri (Rust + React/TypeScript)** ใช้ Dota 2 Game State Integration (GSI) โดยไม่อ่านหน่วยความจำเกมหรือฉีดโค้ด พร้อมข้อมูล Meta / Counter-Picks จาก **OpenDota API** และระบบเสียงพูดแจ้งเตือน (Voice Announcer TTS) การใช้ RAM/FPS จริงขึ้นอยู่กับระบบปฏิบัติการ WebView และเครื่องของผู้ใช้ จึงควรวัดบนเครื่องเป้าหมายก่อนเผยแพร่

---

## ฟีเจอร์หลัก (Key Features)

1. **In-Game Transparent Overlay HUD**:
   - หน้าต่าง Overlay แบบลอย โปร่งใส ปรับความโปร่งแสงและย่อขยายได้
   - รองรับทั้ง Native Desktop Overlay (Tauri) และ Document Picture-in-Picture (PiP) เมื่อเปิดผ่านเบราว์เซอร์
   - โหมดสลับระหว่าง **In-Game HUD** และ **Strategy Dashboard**
2. **ระบบเสียงพูดและเสียงเตือนไทม์มิ่ง (Voice Announcer & Timing Engine)**:
   - **Voice Speech (TTS)**: ประกาศเสียงพูดแจ้งเตือนล่วงหน้าชัดเจน (เช่น *"Wisdom Shrine in thirty seconds"*, *"Power Rune in twenty seconds"*, *"Tormentor ready"*, *"Roshan active"*, *"Aegis expires in thirty seconds"*)
   - **Wisdom Shrines**: แจ้งเตือนทุกๆ 7 นาที (7:00, 14:00, 21:00, 28:00...) เตือนล่วงหน้า 30 วินาที
   - **Bounty Runes**: เกิดครั้งแรกที่ 0:00 และทุกๆ 4 นาที (4:00, 8:00, 12:00...) เตือนล่วงหน้า 15 วินาที
   - **Power / Water Runes**: แจ้งเตือน Water Runes (2:00, 4:00) และ Power Runes แม่น้ำทุก 2 นาทีเริ่มตั้งแต่นาทีที่ 6:00 เตือนล่วงหน้า 20 วินาที
   - **Tormentor**: แจ้งเตือนเกิดครั้งแรกที่ 20:00 และนับเวลาเกิดใหม่ 10 นาทีหลังบันทึกว่า Tormentor ถูกกำจัด
   - **Roshan & Aegis Tracker**: ตรวจสถานะ Roshan จาก GSI เมื่อ game mode ส่งข้อมูลนี้มา พร้อมปุ่ม manual fallback; นับเวลา Aegis หมดอายุ (5 นาที) และช่วงหน้าต่างสุ่มเกิด 8–11 นาที
   - **Web Audio API Synthesizer**: สังเคราะห์เสียงเตือน Chime เฉพาะของแต่ละรูน
   - กฎเวลาในรุ่นนี้ตรวจเทียบกับ **Dota 2 7.41e**; เมื่อ Valve เปลี่ยนแพตช์หลักควรตรวจค่ากติกาและอัปเดต `DOTA_RULESET_VERSION`
3. **Draft Advisor & Counter-Pick Matrix**:
   - แสดงฮีโร่แก้ทางจากอัตราชนะเมื่อเจอฮีโร่เป้าหมาย และแสดงส่วนต่างจากฐาน 50% ที่คำนวณจาก matchup records
   - ตรวจจับฮีโร่ที่ฝ่ายตรงข้ามเลือกผ่าน GSI Draft Payload โดยอิง `player.team_name`; หาก GSI ไม่บอกทีม ระบบจะไม่เดาฝ่ายให้เอง
4. **OpenDota Item Popularity**:
   - แสดงไอเทมที่มีการซื้อจริงในแต่ละช่วงเกมจาก endpoint `itemPopularity` ของ OpenDota พร้อมจำนวนครั้งที่พบในข้อมูล
   - หาก OpenDota ใช้งานไม่ได้ หน้าจอจะแจ้งว่าไม่มีข้อมูลและจะไม่สร้างรายการทดแทนขึ้นมาเอง

---

## สถาปัตยกรรมระบบ (Architecture)

- **Backend**: Rust + `tiny_http` รัน Local HTTP Server ที่ `http://127.0.0.1:3001/gsi` เพื่อรับข้อมูล GSI จาก Dota 2 Client แล้วส่งต่อเข้า Frontend ผ่าน Tauri Event IPC
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Lucide Icons
- **Voice & Sound Engine**: Web Speech API (`SpeechSynthesis`) + Web Audio API (`AudioContext`)
- **Data Integration**: Valve Dota 2 GSI + OpenDota API; local catalog ใช้เฉพาะชื่อ/ID/role และรายละเอียด item สำหรับ lookup เท่านั้น

---

## ข้อกำหนดสำคัญสำหรับการแสดงผลบนหน้าจอเกม (Display Requirement)

> [!IMPORTANT]
> **การตั้งค่าหน้าจอ Dota 2 (Display Mode)**:
> เพื่อให้หน้าต่าง Overlay ลอยซ้อนทับบนหน้าจอเกม Dota 2 ได้ ต้องตั้งค่าในเกมเป็น **Borderless Window**:
> - เข้าเกม Dota 2 ➜ **Settings (รูปฟันเฟือง)** ➜ **Video** ➜ **Display Mode**: เลือก **Borderless Window** (หรือใส่ Launch Option ใน Steam: `-windowed -noborder`)
> *(หากใช้ Exclusive Fullscreen ระบบปฏิบัติการจะบล็อกหน้าต่างโปรแกรมอื่นไม่ให้แสดงทับหน้าจอเกม)*

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

### 2. วิธีเริ่มใช้งานแอป
- **Windows**: ดับเบิลคลิกที่ไฟล์ `DotaAssist.bat`
- **Command Line**:
```bash
# รัน GSI Bridge + Web App (รองรับ Always-On-Top PiP Floating HUD)
npm start

# หรือรันในโหมด Tauri Desktop App
npm run tauri:dev
```

### 3. ตรวจสอบก่อน Build/Release

บน Ubuntu/Debian ให้ติดตั้ง build และ AppImage media dependencies ก่อน:

```bash
sudo apt install pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev librsvg2-dev \
  patchelf gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good
```

หากต้องการเปิด smoke test แบบไม่มี desktop session ให้เพิ่ม `xvfb` และ `dbus-x11` ด้วย ตัวเลือก `bundleMediaFramework` ใน Tauri config จะรวม GStreamer ที่จำเป็นสำหรับเสียงไว้ใน AppImage

```bash
npm test
npm run build
cargo check --locked --manifest-path src-tauri/Cargo.toml
npm run tauri:build
```

`npm start` ใช้ Node GSI bridge + SSE สำหรับโหมดเว็บ ส่วน `npm run tauri:dev` ใช้ Rust GSI listener + Tauri IPC โดยตรง ทั้งสองโหมดไม่ควรรันพร้อมกันเพราะใช้พอร์ต `3001` เดียวกัน
