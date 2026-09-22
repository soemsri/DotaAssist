import assert from 'node:assert/strict';
import { audioService, formatThaiCountdown, normalizeThaiSpeech, PHRASES } from '../src/services/audioService';
import { objectiveTracker } from '../src/services/objectiveTracker';

console.log('--- RUNNING THAI VOICE NATURALNESS & PRONUNCIATION TESTS ---');

// Mock window & localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

// 1. Localized Countdown Strings
console.log('[Test 1] Countdown formatting in Thai');
assert.equal(formatThaiCountdown('Wisdom shrine', 28), 'รูน EXP ในอีก 28 วินาที');
assert.equal(formatThaiCountdown('Water runes', 19), 'รูนน้ำ ในอีก 19 วินาที');
assert.equal(formatThaiCountdown('Power Rune', 19), 'รูนแม่น้ำ ในอีก 19 วินาที');
assert.equal(formatThaiCountdown('Bounty runes', 14), 'รูนทอง ในอีก 14 วินาที');
assert.equal(formatThaiCountdown('Tormentor ready', 30), 'บอสทอร์เมนเตอร์ เกิดใน 30 วินาที');
assert.equal(formatThaiCountdown('Healing Lotus', 15), 'ดอกบัวฟื้นฟู ในอีก 15 วินาที');
assert.equal(formatThaiCountdown('Lotus Pool', 15, 'lotus'), 'ดอกบัวฟื้นฟู ในอีก 15 วินาที');
assert.equal(formatThaiCountdown('Stack camp', 10), 'ดึงซ้อนครีปป่า ในอีก 10 วินาที');
assert.equal(formatThaiCountdown('Aegis expires', 30), 'โล่เอจิส จะหมดอายุในอีก 30 วินาที');
assert.equal(formatThaiCountdown('Nightfall', 25), 'กำลังจะเข้าสู่เวลากลางคืน ในอีก 25 วินาที');
assert.equal(formatThaiCountdown('Daybreak', 25), 'กำลังจะเข้าสู่เวลากลางวัน ในอีก 25 วินาที');
console.log('  ✓ Natural Thai countdown formatting passed');

// 2. Phonetic Normalization for Smooth Google TTS & Web Speech
console.log('[Test 2] Speech normalization for smooth TTS pronunciation');
assert.equal(normalizeThaiSpeech('รูน EXP ในอีก 30 วินาที'), 'รูน อีเอ็กซ์พี ในอีก 30 วินาที');
assert.equal(normalizeThaiSpeech('ไอเทม BKB ศัตรู'), 'ไอเทม บีเคบี ศัตรู');
assert.equal(normalizeThaiSpeech('หวอร์ดหมดอายุแล้ว'), 'วอร์ดหมดอายุแล้ว');
assert.equal(normalizeThaiSpeech('ไม่มีใบวาป'), 'ไม่มีใบวาร์ป');
assert.equal(normalizeThaiSpeech('พูลครีป'), 'ดึง ครีป เลน');
assert.equal(normalizeThaiSpeech('ดึงครีปเลน'), 'ดึง ครีป เลน');
assert.equal(normalizeThaiSpeech('พูลครีปใหญ่'), 'ดึงครีปใหญ่');
assert.equal(normalizeThaiSpeech('สแต็กครีปป่า'), 'ดึงซ้อนครีปป่า');
assert.equal(normalizeThaiSpeech('สำหรับ Anti-Mage แนะนำ Tango'), 'สำหรับ แอนตี้เมจ แนะนำ แทงโก้');
console.log('  ✓ Thai TTS phonetic normalization passed');

// 3. Spoken Alerts in Thai Mode
console.log('[Test 3] Objective and tracker alerts in Thai mode');
const spoken: string[] = [];
const origSpeak = (audioService as any).speak.bind(audioService);
(audioService as any).speak = (text: string, langOverride?: string, objective?: any) => {
  spoken.push(text);
  return origSpeak(text, langOverride, objective);
};

audioService.setVoiceLanguage('th-TH');

// Neutral items tier
spoken.length = 0;
audioService.playNeutralTierAlert(2);
assert.ok(spoken.some(s => s.includes('ปลดล็อกไอเทมป่า เทียร์ 2 แล้ว')));

// Camp stacking
spoken.length = 0;
audioService.playCampStackAlert();
assert.ok(spoken.some(s => s.includes('ดึงซ้อนครีปป่า')));

// Healing Lotus
spoken.length = 0;
audioService.playLotusAlert();
assert.ok(spoken.some(s => s.includes('ดอกบัวฟื้นฟู ในอีก 15 วินาที')));

// Enemy Glyph
spoken.length = 0;
audioService.playEnemyGlyphActivatedAlert();
assert.ok(spoken.some(s => s.includes('ศัตรูกดใช้ป้อมอมตะแล้ว')));

spoken.length = 0;
audioService.playEnemyGlyphReadyAlert();
assert.ok(spoken.some(s => s.includes('ป้อมอมตะของศัตรูพร้อมใช้งานแล้ว')));

// Enemy Ultimate
spoken.length = 0;
audioService.playEnemyUltimateReadyAlert('Enigma', 'Black Hole');
assert.ok(spoken.some(s => s.includes('Black Hole') && s.includes('Enigma') && s.includes('น่าจะพร้อมใช้งานแล้ว')));

// Roshan & Tormentor Recording
spoken.length = 0;
objectiveTracker.resetAll();
objectiveTracker.recordRoshan(1200);
assert.ok(spoken.some(s => s.includes('บันทึกเวลาโรชานตายเรียบร้อยแล้ว')));

spoken.length = 0;
objectiveTracker.undoRoshan();
assert.ok(spoken.some(s => s.includes('ยกเลิกการจับเวลาโรชานแล้ว')));

spoken.length = 0;
objectiveTracker.recordTormentor(1200);
assert.ok(spoken.some(s => s.includes('บันทึกเวลาทอร์เมนเตอร์ตายเรียบร้อยแล้ว')));

spoken.length = 0;
objectiveTracker.undoTormentor();
assert.ok(spoken.some(s => s.includes('ยกเลิกการจับเวลาทอร์เมนเตอร์แล้ว')));

// Restore default en-US
audioService.setVoiceLanguage('en-US');
console.log('  ✓ Spoken Thai objective alerts passed');

console.log('--- ALL THAI VOICE NATURALNESS TESTS PASSED SUCCESSFULLY! ---');
