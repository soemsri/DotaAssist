const fs = require('fs');
const path = require('path');

async function build() {
  console.log('Fetching hero abilities and abilities from dotaconstants...');
  const [haRes, abRes] = await Promise.all([
    fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/hero_abilities.json'),
    fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/abilities.json')
  ]);
  const heroAbilities = await haRes.json();
  const abilities = await abRes.json();

  function cleanTalentName(rawName) {
    if (!rawName) return 'Special Bonus';
    return rawName
      .replace(/\{s:bonus_([a-zA-Z0-9_]+)\}/g, 'Bonus')
      .replace(/\{s:[a-zA-Z0-9_]+\}/g, 'Bonus')
      .trim();
  }

  function categorize(text) {
    const lower = text.toLowerCase();
    if (/health|armor|magic resist|strength|barrier|shield|lifesteal|evasion|regen|hp/.test(lower)) {
      return 'survivability';
    }
    if (/damage|attack speed|critical|agility|minus armor|dps|cleave|pierce|slash|bleed/.test(lower)) {
      return 'damage';
    }
    if (/movement speed|blink|cast range|jump|charges|move speed/.test(lower)) {
      return 'mobility';
    }
    return 'utility';
  }

  function translateToThai(text) {
    return text
      .replace(/\+([0-9.]+)\s*Health Regen/gi, '+$1 ฟื้นฟูเลือด')
      .replace(/\+([0-9.]+)\s*Health/gi, '+$1 เลือด')
      .replace(/\+([0-9.]+)\s*Armor/gi, '+$1 เกราะ')
      .replace(/\+([0-9.]+)\s*Attack Speed/gi, '+$1 ความเร็วโจมตี')
      .replace(/\+([0-9.]+)\s*Movement Speed/gi, '+$1 ความเร็วเคลื่อนที่')
      .replace(/\+([0-9.]+)\s*Strength/gi, '+$1 Strength')
      .replace(/\+([0-9.]+)\s*Agility/gi, '+$1 Agility')
      .replace(/\+([0-9.]+)\s*Intelligence/gi, '+$1 Intelligence')
      .replace(/\+([0-9.]+)\s*All Stats/gi, '+$1 สเตตัสรวม')
      .replace(/\+([0-9.]+)\s*Cast Range/gi, '+$1 ระยะร่ายสกิล')
      .replace(/\+([0-9.]+)\s*Magic Resistance/gi, '+$1 ต้านทานเวท')
      .replace(/\+([0-9.]+)\s*Magic Resist/gi, '+$1 ต้านทานเวท')
      .replace(/\+([0-9.]+)%?\s*Spell Amp/gi, '+$1% ดาเมจเวท')
      .replace(/\+([0-9.]+)%?\s*Spell Lifesteal/gi, '+$1% ดูดเลือดเวท')
      .replace(/-([0-9.]+)s?\s*Cooldown/gi, '-$1s คูลดาวน์');
  }

  const result = {};
  let totalHeroes = 0;

  for (const [heroKey, data] of Object.entries(heroAbilities)) {
    if (!heroKey.startsWith('npc_dota_hero_')) continue;
    const cleanKey = heroKey.replace(/^npc_dota_hero_/, '');
    const talents = data.talents || [];
    if (talents.length < 8) continue;

    const levelMap = { 1: 10, 2: 15, 3: 20, 4: 25 };
    const tiers = [];

    for (let lvl = 1; lvl <= 4; lvl++) {
      const lvlTalents = talents.filter(t => t.level === lvl);
      if (lvlTalents.length < 2) continue;

      const leftRaw = abilities[lvlTalents[0].name]?.dname || lvlTalents[0].name;
      const rightRaw = abilities[lvlTalents[1].name]?.dname || lvlTalents[1].name;

      const leftEn = cleanTalentName(leftRaw);
      const rightEn = cleanTalentName(rightRaw);
      const leftCat = categorize(leftEn);
      const rightCat = categorize(rightEn);

      tiers.push({
        level: levelMap[lvl],
        left: {
          en: leftEn,
          th: translateToThai(leftEn),
          category: leftCat,
        },
        right: {
          en: rightEn,
          th: translateToThai(rightEn),
          category: rightCat,
        },
        defaultPick: leftCat === 'survivability' ? 'left' : 'right',
        defaultReasonEn: 'Balanced core talent for standard pacing.',
        defaultReasonTh: 'ทักษะพื้นฐานมาตรฐานสำหรับจังหวะการเล่นทั่วไป'
      });
    }

    if (tiers.length === 4) {
      result[cleanKey] = tiers;
      totalHeroes++;
    }
  }

  const outPath = path.resolve('src/data/dotaTalents.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log('Successfully saved dotaTalents.json! Total heroes:', totalHeroes);
}

build();
