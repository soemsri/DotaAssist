const fs = require('fs');
const path = require('path');

// Curated overrides for hero abilities where standard filtering might miss the iconic ultimate or order
const HERO_ABILITY_OVERRIDES = {
  nevermore: {
    q: 'nevermore_shadowraze1',
    w: 'nevermore_frenzy',
    e: 'nevermore_dark_lord',
    r: 'nevermore_requiem',
  },
  invoker: {
    q: 'invoker_quas',
    w: 'invoker_wex',
    e: 'invoker_exort',
    r: 'invoker_invoke',
  },
  morphling: {
    q: 'morphling_waveform',
    w: 'morphling_adaptive_strike_agi',
    e: 'morphling_morph_agi',
    r: 'morphling_replicate',
  },
  rattletrap: {
    q: 'rattletrap_battery_assault',
    w: 'rattletrap_power_cogs',
    e: 'rattletrap_rocket_flare',
    r: 'rattletrap_hookshot',
  },
  clinkz: {
    q: 'clinkz_strafe',
    w: 'clinkz_tar_bomb',
    e: 'clinkz_death_pact',
    r: 'clinkz_burning_army',
  },
  visage: {
    q: 'visage_grave_chill',
    w: 'visage_soul_assumption',
    e: 'visage_gravekeepers_cloak',
    r: 'visage_summon_familiars',
  },
  dazzle: {
    q: 'dazzle_poison_touch',
    w: 'dazzle_shallow_grave',
    e: 'dazzle_shadow_wave',
    r: 'dazzle_bad_juju',
  },
  riki: {
    q: 'riki_smoke_screen',
    w: 'riki_blink_strike',
    e: 'riki_tricks_of_the_trade',
    r: 'riki_backstab',
  },
  tinker: {
    q: 'tinker_laser',
    w: 'tinker_march_of_the_machines',
    e: 'tinker_defense_matrix',
    r: 'tinker_rearm',
  },
  keeper_of_the_light: {
    q: 'keeper_of_the_light_illuminate',
    w: 'keeper_of_the_light_blinding_light',
    e: 'keeper_of_the_light_chakra_magic',
    r: 'keeper_of_the_light_spirit_form',
  },
  rubick: {
    q: 'rubick_telekinesis',
    w: 'rubick_fade_bolt',
    e: 'rubick_arcane_supremacy',
    r: 'rubick_spell_steal',
  },
  shadow_demon: {
    q: 'shadow_demon_disruption',
    w: 'shadow_demon_disseminate',
    e: 'shadow_demon_shadow_poison',
    r: 'shadow_demon_demonic_purge',
  },
  doom_bringer: {
    q: 'doom_bringer_devour',
    w: 'doom_bringer_scorched_earth',
    e: 'doom_bringer_infernal_blade',
    r: 'doom_bringer_doom',
  },
  techies: {
    q: 'techies_sticky_bomb',
    w: 'techies_reactive_tazer',
    e: 'techies_suicide',
    r: 'techies_land_mines',
  },
};

// Popular hero leveling priority overrides
const HERO_PRIORITY_OVERRIDES = {
  axe: { start: 'E', max1: 'E', max2: 'Q', max3: 'W' },
  antimage: { start: 'Q', max1: 'Q', max2: 'W', max3: 'E' },
  juggernaut: { start: 'Q', max1: 'Q', max2: 'E', max3: 'W' },
  pudge: { start: 'W', max1: 'W', max2: 'Q', max3: 'E' },
  phantom_assassin: { start: 'Q', max1: 'Q', max2: 'E', max3: 'W' },
  faceless_void: { start: 'Q', max1: 'E', max2: 'Q', max3: 'W' },
  legion_commander: { start: 'Q', max1: 'Q', max2: 'W', max3: 'E' },
  lion: { start: 'Q', max1: 'Q', max2: 'E', max3: 'W' },
  crystal_maiden: { start: 'Q', max1: 'Q', max2: 'W', max3: 'E' },
  witch_doctor: { start: 'Q', max1: 'E', max2: 'Q', max3: 'W' },
  sniper: { start: 'E', max1: 'Q', max2: 'E', max3: 'W' },
  drow_ranger: { start: 'E', max1: 'E', max2: 'Q', max3: 'W' },
  bristleback: { start: 'W', max1: 'W', max2: 'E', max3: 'Q' },
  slark: { start: 'E', max1: 'Q', max2: 'W', max3: 'E' },
  wraith_king: { start: 'Q', max1: 'E', max2: 'Q', max3: 'W' },
  skeleton_king: { start: 'Q', max1: 'E', max2: 'Q', max3: 'W' },
  ursa: { start: 'E', max1: 'E', max2: 'W', max3: 'Q' },
  viper: { start: 'Q', max1: 'Q', max2: 'W', max3: 'E' },
  tidehunter: { start: 'E', max1: 'E', max2: 'Q', max3: 'W' },
  ogre_magi: { start: 'W', max1: 'W', max2: 'Q', max3: 'E' },
  clinkz: { start: 'W', max1: 'W', max2: 'Q', max3: 'E' },
  bloodseeker: { start: 'E', max1: 'W', max2: 'E', max3: 'Q' },
  riki: { start: 'E', max1: 'E', max2: 'W', max3: 'Q' },
  sven: { start: 'Q', max1: 'E', max2: 'Q', max3: 'W' },
  nevermore: { start: 'Q', max1: 'Q', max2: 'E', max3: 'W' },
  luna: { start: 'Q', max1: 'Q', max2: 'E', max3: 'W' },
  earthshaker: { start: 'Q', max1: 'Q', max2: 'E', max3: 'W' },
  lina: { start: 'Q', max1: 'Q', max2: 'E', max3: 'W' },
  zuus: { start: 'Q', max1: 'Q', max2: 'W', max3: 'E' },
  windrunner: { start: 'W', max1: 'W', max2: 'E', max3: 'Q' },
};

// Situational threat overrides for key heroes
const SITUATIONAL_RULES = {
  antimage: [
    {
      threat: 'magic_burst',
      level: 2,
      recommendedSlot: 'E',
      reasonEn: 'Level Counterspell at Lvl 2 for magic shield against hostile magic burst.',
      reasonTh: 'อัพ Counterspell ที่เลเวล 2 เพื่อสร้างเกราะกันเวทรับมือนิวเคลียร์เวทหนัก'
    },
    {
      threat: 'cc',
      level: 2,
      recommendedSlot: 'W',
      reasonEn: 'Prioritize Blink at Lvl 2 to escape stun chains.',
      reasonTh: 'อัพ Blink ที่เลเวล 2 เพื่อหนีเอาตัวรอดจากการโดนสตั๊นต่อเนื่อง'
    }
  ],
  juggernaut: [
    {
      threat: 'magic_burst',
      level: 2,
      recommendedSlot: 'Q',
      reasonEn: 'Max Blade Fury early for continuous magic immunity in aggressive lane.',
      reasonTh: 'เน้น Blade Fury เพื่อป้องกันเวทต่อเนื่องในเลนที่ศัตรูดุ'
    },
    {
      threat: 'cc',
      level: 4,
      recommendedSlot: 'W',
      reasonEn: 'Level Healing Ward at Lvl 4 to sustain through heavy lane harass.',
      reasonTh: 'อัพ Healing Ward ที่เลเวล 4 เพื่อฟื้นฟูเลือดต้านการตอดหนัก'
    }
  ],
  phantom_assassin: [
    {
      threat: 'magic_burst',
      level: 2,
      recommendedSlot: 'W',
      reasonEn: 'Phantom Strike escape point at Lvl 2 to disengage dangerous burst.',
      reasonTh: 'อัพ Phantom Strike ที่เลเวล 2 สำหรับกระโดดหนีดาเมจเวทกะทันหัน'
    }
  ],
  slark: [
    {
      threat: 'cc',
      level: 2,
      recommendedSlot: 'Q',
      reasonEn: 'Dark Pact early point to purge debuffs and disable chains.',
      reasonTh: 'อัพ Dark Pact ล้างสถานะสตั๊นและดีบัฟตั้งแต่ช่วงต้นเกม'
    }
  ],
  axe: [
    {
      threat: 'magic_burst',
      level: 2,
      recommendedSlot: 'Q',
      reasonEn: 'Berserker Call bonus armor helps mitigate mixed assault.',
      reasonTh: 'อัพ Berserker Call เพิ่มเกราะป้องกันการรุมโจมตี'
    }
  ]
};

async function build() {
  console.log('Fetching hero abilities and abilities from dotaconstants...');
  const [haRes, abRes] = await Promise.all([
    fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/hero_abilities.json'),
    fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/abilities.json')
  ]);

  const heroAbilities = await haRes.json();
  const abilities = await abRes.json();

  const heroesJsonPath = path.resolve(__dirname, '../src/data/dotaHeroes.json');
  const heroes = JSON.parse(fs.readFileSync(heroesJsonPath, 'utf-8'));

  const result = {};

  for (const h of heroes) {
    const heroKey = h.name;
    const cleanKey = heroKey.replace(/^npc_dota_hero_/, '').toLowerCase();
    const haData = heroAbilities[heroKey];

    if (!haData) {
      console.warn(`Missing hero data for ${cleanKey}`);
      continue;
    }

    // Determine Q, W, E, R
    let qKey, wKey, eKey, rKey;

    if (HERO_ABILITY_OVERRIDES[cleanKey]) {
      const o = HERO_ABILITY_OVERRIDES[cleanKey];
      qKey = o.q;
      wKey = o.w;
      eKey = o.e;
      rKey = o.r;
    } else {
      const rawAbs = haData.abilities.filter(a => {
        if (a === 'generic_hidden' || a.includes('empty')) return false;
        const d = abilities[a];
        if (!d) return false;
        if (d.is_innate) return false;
        if (Array.isArray(d.behavior) && d.behavior.includes('Hidden')) return false;
        if (d.behavior === 'Hidden') return false;
        return true;
      });

      qKey = rawAbs[0];
      wKey = rawAbs[1];
      eKey = rawAbs[2];
      rKey = rawAbs[rawAbs.length - 1];
    }

    const qName = abilities[qKey]?.dname || 'Skill Q';
    const wName = abilities[wKey]?.dname || 'Skill W';
    const eName = abilities[eKey]?.dname || 'Skill E';
    const rName = abilities[rKey]?.dname || 'Ultimate';

    const abilityList = [
      { slot: 'Q', key: qKey, name: qName },
      { slot: 'W', key: wKey, name: wName },
      { slot: 'E', key: eKey, name: eName },
      { slot: 'R', key: rKey, name: rName }
    ];

    // Priority
    const prio = HERO_PRIORITY_OVERRIDES[cleanKey] || {
      start: 'Q',
      max1: 'Q',
      max2: 'W',
      max3: 'E'
    };

    // Generate full 1-25 progression
    // Standard template with prioritized maxing
    const progression = [];
    const skillCounts = { Q: 0, W: 0, E: 0, R: 0 };

    function canAdd(s) {
      if (s === 'R') return skillCounts.R < 3;
      return skillCounts[s] < 4;
    }

    function addSlot(lvl, s, name, isTalent = false) {
      if (s !== 'Talent' && s !== 'Stats') {
        skillCounts[s] = (skillCounts[s] || 0) + 1;
      }
      progression.push({
        level: lvl,
        slot: s,
        skillKey: s === 'Q' ? qKey : s === 'W' ? wKey : s === 'E' ? eKey : s === 'R' ? rKey : undefined,
        skillName: name,
        targetLevel: s === 'Talent' || s === 'Stats' ? undefined : skillCounts[s],
        isTalent: s === 'Talent'
      });
    }

    for (let lvl = 1; lvl <= 25; lvl++) {
      if (lvl === 10 || lvl === 15 || lvl === 20 || lvl === 25) {
        addSlot(lvl, 'Talent', `Talent Lvl ${lvl}`, true);
      } else if (lvl === 6 || lvl === 12 || lvl === 18) {
        addSlot(lvl, 'R', rName);
      } else if (lvl === 1) {
        const s = prio.start;
        const n = s === 'Q' ? qName : s === 'W' ? wName : eName;
        addSlot(lvl, s, n);
      } else if (lvl === 2) {
        // take a second skill
        const candidates = [prio.max1, prio.max2, prio.max3].filter(s => skillCounts[s] === 0);
        const next = candidates[0] || prio.max1;
        const n = next === 'Q' ? qName : next === 'W' ? wName : eName;
        addSlot(lvl, next, n);
      } else if (lvl === 4 && skillCounts[prio.max3] === 0 && canAdd(prio.max3)) {
        // 1 value point in 3rd skill by level 4
        const n = prio.max3 === 'Q' ? qName : prio.max3 === 'W' ? wName : eName;
        addSlot(lvl, prio.max3, n);
      } else if (canAdd(prio.max1)) {
        const n = prio.max1 === 'Q' ? qName : prio.max1 === 'W' ? wName : eName;
        addSlot(lvl, prio.max1, n);
      } else if (canAdd(prio.max2)) {
        const n = prio.max2 === 'Q' ? qName : prio.max2 === 'W' ? wName : eName;
        addSlot(lvl, prio.max2, n);
      } else if (canAdd(prio.max3)) {
        const n = prio.max3 === 'Q' ? qName : prio.max3 === 'W' ? wName : eName;
        addSlot(lvl, prio.max3, n);
      } else {
        addSlot(lvl, 'Stats', '+2 All Attributes');
      }
    }

    const situationalRules = SITUATIONAL_RULES[cleanKey] || [
      {
        threat: 'magic_burst',
        level: 2,
        recommendedSlot: prio.max2,
        reasonEn: `Consider defensive/utility ${prio.max2} early against heavy magic pressure.`,
        reasonTh: `พิจารณาอัพสกิลช่อง ${prio.max2} ก่อนเพื่อป้องกันแรงกดดันดาเมจเวทช่วงต้นเกม`
      }
    ];

    result[cleanKey] = {
      heroName: h.localized_name,
      abilities: abilityList,
      progression,
      situationalRules
    };
  }

  const outPath = path.resolve(__dirname, '../src/data/dotaSkillBuilds.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Successfully built dotaSkillBuilds.json with ${Object.keys(result).length} heroes!`);
}

build().catch(console.error);
