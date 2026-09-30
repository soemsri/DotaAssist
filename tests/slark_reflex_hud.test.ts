import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SlarkReflexService } from '../src/services/slarkReflexService';
import { audioService } from '../src/services/audioService';
import { GSIPayload } from '../src/types/gsi';

describe('Slark Reflex & Top-Right Icon HUD Tests', () => {
  it('[Test 1] Slark Dark Pact Cleanse trigger & disable suppression', () => {
    const service = new SlarkReflexService();
    service.saveSettings({ enabled: true, darkPactHotkey: 'F', shadowDanceHotkey: 'R' });

    // Mock speech / reflex
    let emergencyCalls: Array<{ key: string; type: string }> = [];
    const origTrigger = audioService.triggerEmergencyReflex;
    audioService.triggerEmergencyReflex = (key, type) => {
      emergencyCalls.push({ key, type });
    };

    try {
      // 1. Slark with dispellable debuff and Dark Pact ready -> should trigger Cleanse
      const payloadReady: GSIPayload = {
        hero: {
          id: 93,
          name: 'npc_dota_hero_slark',
          level: 6,
          alive: true,
          respawn_seconds: 0,
          buyback_cost: 300,
          buyback_cooldown: 0,
          health: 800,
          max_health: 1000,
          health_percent: 80,
          mana: 400,
          max_mana: 500,
          mana_percent: 80,
          silenced: false,
          stunned: false,
          disarmed: false,
          magicimmune: false,
          hexed: false,
          muted: false,
          break: false,
          aghs_scepter: false,
          aghs_shard: false,
          smoked: false,
          has_debuff: true, // Dispellable debuff present!
        },
        abilities: {
          ability0: {
            name: 'slark_dark_pact',
            level: 3,
            can_cast: true,
            cooldown: 0,
            passive: false,
          },
          ability3: {
            name: 'slark_shadow_dance',
            level: 1,
            can_cast: true,
            cooldown: 0,
            passive: false,
          },
        },
      };

      service.processGSI(payloadReady, 100);
      assert.strictEqual(service.getSnapshot().cleanseUrgent, true, 'Cleanse should be urgent');
      assert.strictEqual(emergencyCalls.length, 1, 'Should fire emergency reflex call');
      assert.strictEqual(emergencyCalls[0].key, 'F', 'Should call mapped key F');
      assert.strictEqual(emergencyCalls[0].type, 'cleanse', 'Type should be cleanse');

      // 2. Slark stunned or silenced -> suppressed (cannot cast Q while disabled)
      emergencyCalls = [];
      const payloadStunned: GSIPayload = {
        ...payloadReady,
        hero: {
          ...payloadReady.hero!,
          stunned: true,
        },
      };

      service.processGSI(payloadStunned, 105);
      assert.strictEqual(service.getSnapshot().cleanseUrgent, false, 'Cleanse suppressed while stunned');
      assert.strictEqual(emergencyCalls.length, 0, 'No audio callout while stunned');

      // 3. Dark Pact on cooldown -> suppressed
      const payloadOnCooldown: GSIPayload = {
        ...payloadReady,
        abilities: {
          ...payloadReady.abilities,
          ability0: {
            name: 'slark_dark_pact',
            level: 3,
            can_cast: false,
            cooldown: 6,
            passive: false,
          },
        },
      };

      service.processGSI(payloadOnCooldown, 110);
      assert.strictEqual(service.getSnapshot().cleanseUrgent, false, 'Cleanse suppressed while on cooldown');

      // 4. Non-Slark hero -> suppressed
      const payloadOtherHero: GSIPayload = {
        ...payloadReady,
        hero: {
          ...payloadReady.hero!,
          name: 'npc_dota_hero_juggernaut',
        },
      };

      service.processGSI(payloadOtherHero, 115);
      assert.strictEqual(service.getSnapshot().isSlark, false, 'Not Slark');
      assert.strictEqual(service.getSnapshot().cleanseUrgent, false, 'Cleanse suppressed for other heroes');
    } finally {
      audioService.triggerEmergencyReflex = origTrigger;
    }
  });

  it('[Test 2] Slark Shadow Dance low-HP emergency trigger & threshold configuration', () => {
    const service = new SlarkReflexService();
    service.saveSettings({
      enabled: true,
      darkPactHotkey: 'F',
      shadowDanceHotkey: 'R',
      shadowDanceHpThreshold: 20, // 20%
    });

    let emergencyCalls: Array<{ key: string; type: string }> = [];
    const origTrigger = audioService.triggerEmergencyReflex;
    audioService.triggerEmergencyReflex = (key, type) => {
      emergencyCalls.push({ key, type });
    };

    try {
      const basePayload: GSIPayload = {
        hero: {
          id: 93,
          name: 'npc_dota_hero_slark',
          level: 6,
          alive: true,
          respawn_seconds: 0,
          buyback_cost: 300,
          buyback_cooldown: 0,
          health: 190,
          max_health: 1000,
          health_percent: 19, // <= 20%
          mana: 250,
          max_mana: 500,
          mana_percent: 50,
          silenced: false,
          stunned: false,
          disarmed: false,
          magicimmune: false,
          hexed: false,
          muted: false,
          break: false,
          aghs_scepter: false,
          aghs_shard: false,
          smoked: false,
          has_debuff: false,
        },
        abilities: {
          ability0: {
            name: 'slark_dark_pact',
            level: 3,
            can_cast: true,
            cooldown: 0,
            passive: false,
          },
          ability3: {
            name: 'slark_shadow_dance',
            level: 1,
            can_cast: true,
            cooldown: 0,
            passive: false,
          },
        },
      };

      // 1. HP at 19% (<= 20%) -> triggers Ulti
      service.processGSI(basePayload, 200);
      assert.strictEqual(service.getSnapshot().shadowDanceUrgent, true, 'Shadow dance should be urgent');
      assert.strictEqual(emergencyCalls.length, 1, 'Should fire emergency reflex call');
      assert.strictEqual(emergencyCalls[0].key, 'R', 'Should call mapped key R');
      assert.strictEqual(emergencyCalls[0].type, 'shadow_dance', 'Type should be shadow_dance');

      // 2. HP at 40% -> should not trigger
      emergencyCalls = [];
      const payloadHealthy: GSIPayload = {
        ...basePayload,
        hero: {
          ...basePayload.hero!,
          health_percent: 40,
        },
      };

      service.processGSI(payloadHealthy, 210);
      assert.strictEqual(service.getSnapshot().shadowDanceUrgent, false, 'Shadow dance not urgent when healthy');
      assert.strictEqual(emergencyCalls.length, 0, 'No audio callout when healthy');

      // 3. Re-configure threshold to 30% -> HP at 25% now triggers
      service.saveSettings({ shadowDanceHpThreshold: 30 });
      const payloadUnder30: GSIPayload = {
        ...basePayload,
        hero: {
          ...basePayload.hero!,
          health_percent: 25,
        },
      };

      service.processGSI(payloadUnder30, 220);
      assert.strictEqual(service.getSnapshot().shadowDanceUrgent, true, 'Shadow dance urgent under customized 30% threshold');
      assert.strictEqual(emergencyCalls.length, 1, 'Fired audio under 30% threshold');
    } finally {
      audioService.triggerEmergencyReflex = origTrigger;
    }
  });

  it('[Test 3] Custom hotkey remapping (e.g. F, Q, SPACE)', () => {
    const service = new SlarkReflexService();

    // Default settings
    assert.strictEqual(service.getSettings().darkPactHotkey, 'F');
    assert.strictEqual(service.getSettings().shadowDanceHotkey, 'R');

    // Remap to custom keys
    service.saveSettings({
      darkPactHotkey: 'SPACE',
      shadowDanceHotkey: 'D',
    });

    assert.strictEqual(service.getSettings().darkPactHotkey, 'SPACE');
    assert.strictEqual(service.getSettings().shadowDanceHotkey, 'D');
    assert.strictEqual(service.getSnapshot().cleanseHotkey, 'SPACE');
    assert.strictEqual(service.getSnapshot().shadowDanceHotkey, 'D');
  });

  it('[Test 4] Emergency Reflex Audio preemption & queue bypass', () => {
    let voiceStopped = false;
    const origStop = (audioService as any).stopCurrentVoice;
    (audioService as any).stopCurrentVoice = () => {
      voiceStopped = true;
    };

    try {
      // Trigger emergency reflex
      audioService.triggerEmergencyReflex('F', 'cleanse');
      assert.strictEqual(voiceStopped, true, 'Emergency reflex must stop currently playing macro voice');
    } finally {
      (audioService as any).stopCurrentVoice = origStop;
    }
  });

  it('[Test 5] Snapshot state reflects live GSI hero and ability statuses', () => {
    const service = new SlarkReflexService();
    const payload: GSIPayload = {
      hero: {
        id: 93,
        name: 'npc_dota_hero_slark',
        level: 12,
        alive: true,
        respawn_seconds: 0,
        buyback_cost: 450,
        buyback_cooldown: 0,
        health: 1200,
        max_health: 1500,
        health_percent: 80,
        mana: 600,
        max_mana: 800,
        mana_percent: 75,
        silenced: false,
        stunned: false,
        disarmed: false,
        magicimmune: false,
        hexed: false,
        muted: false,
        break: false,
        aghs_scepter: false,
        aghs_shard: false,
        smoked: false,
        has_debuff: false,
      },
      abilities: {
        ability0: {
          name: 'slark_dark_pact',
          level: 4,
          can_cast: true,
          cooldown: 0,
          passive: false,
        },
        ability3: {
          name: 'slark_shadow_dance',
          level: 2,
          can_cast: true,
          cooldown: 0,
          passive: false,
        },
      },
    };

    service.processGSI(payload, 300);
    const snap = service.getSnapshot();
    assert.strictEqual(snap.isSlark, true);
    assert.strictEqual(snap.darkPactReady, true);
    assert.strictEqual(snap.shadowDanceReady, true);
    assert.strictEqual(snap.cleanseUrgent, false);
    assert.strictEqual(snap.shadowDanceUrgent, false);
    assert.strictEqual(snap.currentHpPercent, 80);

    service.reset();
    assert.strictEqual(service.getSnapshot().cleanseUrgent, false);
    assert.strictEqual(service.getSnapshot().shadowDanceUrgent, false);
  });
});
