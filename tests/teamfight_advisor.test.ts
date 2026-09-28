import assert from 'node:assert/strict';
import { makeFightPlan, FightVoiceGate } from '../src/services/teamfightAdvisor';
import { FightPreferences } from '../src/services/teamfightPreferences';
import type { GSIPayload } from '../src/types/gsi';
import type { EnemyUltimateSlot } from '../src/services/enemyUltimateService';
const base = { map: { clock_time: 1800, matchid: '1', game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', paused: false },
  hero: { name: 'npc_dota_hero_sniper', alive: true, health_percent: 100, buyback_cost: 1000 },
  player: { team_name: 'radiant', gold: 1800 }, items: {},
  draft: { team2: { pick0_class: 'npc_dota_hero_sniper' }, team3: { pick0_class: 'npc_dota_hero_lion' } },
} as GSIPayload;
const plan = (p = base, duty: Parameters<typeof makeFightPlan>[3] = 'auto') => makeFightPlan(p,true,'carry',duty,[],false)!;
assert.equal(makeFightPlan(base,false,'carry','auto',[],false),null);
assert.equal(plan({...base,map:{...base.map!,clock_time:1799}}),null);
assert.equal(plan({...base,map:{...base.map!,game_state:'DOTA_GAMERULES_STATE_POST_GAME'}}),null);
assert.equal(plan().duty,'follow'); assert.match(plan().task,/backline/);
assert.match(plan().target,/Lion/); assert.doesNotMatch(plan().target,/Sniper/);
assert.equal(plan().items[0].name,'Black King Bar');
assert.equal(plan().items.length,2);
assert.equal(plan(base,'protect').duty,'protect'); assert.match(plan(base,'protect').target,/damage dealer/);
assert.equal(makeFightPlan(base,true,'support','auto',[],false)!.items[0].name,'Force Staff');
assert.equal(plan({...base,items:{backpack0:{name:'item_black_king_bar',purchaser:0},stash0:{name:'item_hurricane_pike',purchaser:0}}}).items.some(i=>['Black King Bar','Force Staff'].includes(i.name)),false);
assert.equal(plan({...base,items:{slot0:{name:'item_black_king_bar',cooldown:20,purchaser:0}}}).status,'wait');
assert.equal(plan({...base,hero:{...base.hero!,health_percent:20}}).status,'recover');
assert.equal(plan({...base,hero:{...base.hero!,alive:false}}).status,'recover');
assert.equal(plan({...base,draft:undefined}).status,'unknown');
assert.equal(plan({...base,player:undefined}).status,'unknown');
assert.equal(plan({...base,items:undefined}).items.length,0);
assert.equal(plan({...base,map:{...base.map!,paused:true}}).status,'wait');
const slot = {heroClass:'npc_dota_hero_lion',heroName:'Lion',source:'manual',state:'cooldown',cooldownEndClock:1820} as EnemyUltimateSlot;
const estimate = makeFightPlan({...base,draft:undefined},true,'carry','auto',[slot],false)!;
assert.match(estimate.estimates[0],/estimated 20s/);
assert.equal(makeFightPlan(base,true,'carry','auto',[{...slot,state:'ready'}],false)!.estimates.length,0);
assert.match(makeFightPlan(base,true,'carry','auto',[],true)!.task,/แนวหลัง/);
const gate = new FightVoiceGate();
assert.ok(gate.update('1',plan(),1800,true));
assert.equal(gate.update('1',plan(),1801,true),null);
assert.equal(gate.update('1',plan(base,'protect'),1810,true),null);
assert.ok(gate.update('1',plan(base,'counter'),1930,true));
assert.equal(gate.update('1',plan(base,'counter'),1931,false),null);
assert.ok(gate.update('2',plan(),1800,true));
assert.equal(gate.update('2',null,1801,true),null);
const memory = new Map<string,string>(); const storage = { getItem: (k:string) => memory.get(k) ?? null, setItem: (k:string,v:string) => { memory.set(k,v); } };
const prefs = new FightPreferences(storage); prefs.setDuty('carry','counter'); prefs.setVoice(false);
const restarted = new FightPreferences(storage); assert.equal(restarted.getSnapshot().duties.carry,'counter'); assert.equal(restarted.getSnapshot().voice,false);
assert.equal(restarted.getSnapshot().duties.support,'auto');
console.log('Teamfight phase, role, inventory, uncertainty, estimates, voice throttling and persistence passed.');
