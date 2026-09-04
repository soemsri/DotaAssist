import http from 'http';
import { spawn, ChildProcess } from 'child_process';

async function runGSITest() {
  console.log('--- STARTING GSI END-TO-END TEST ---');

  // Spawn gsi-bridge.cjs
  const bridge: ChildProcess = spawn(process.execPath, ['scripts/gsi-bridge.cjs'], {
    stdio: 'pipe',
  });

  bridge.stdout?.on('data', (d) => console.log(`[Bridge Output] ${d.toString().trim()}`));
  bridge.stderr?.on('data', (d) => console.error(`[Bridge Error] ${d.toString().trim()}`));

  // Wait for server to bind
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // Send simulated Dota 2 GSI payload
    const mockPayload = {
      provider: { name: 'Dota 2', appid: 570, version: 48, timestamp: 1725400000 },
      map: {
        name: 'start',
        matchid: '7900123456',
        game_time: 420,
        clock_time: 405.2,
        daytime: true,
        nightstalker_night: false,
        game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
        paused: false,
        win_team: 'none',
        customgamename: '',
      },
      player: {
        steamid: '76561198000000000',
        name: 'Player 1',
        activity: 'playing',
        kills: 2,
        deaths: 0,
        assists: 1,
        last_hits: 35,
        denies: 8,
        kill_streak: 2,
        commands_per_minute: 180,
        gold: 1450,
        gold_reliable: 400,
        gold_unreliable: 1050,
        gpm: 480,
        xpm: 520,
        net_worth: 3200,
        team_name: 'radiant',
      },
      hero: {
        id: 1,
        name: 'npc_dota_hero_antimage',
        level: 6,
        alive: true,
        respawn_seconds: 0,
        buyback_cost: 250,
        buyback_cooldown: 0,
        health: 850,
        max_health: 850,
        health_percent: 100,
        mana: 400,
        max_mana: 400,
        mana_percent: 100,
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
      }
    };

    const payloadData = JSON.stringify(mockPayload);

    const postPromise = new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 3001,
        path: '/gsi',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payloadData),
        },
      }, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          console.log(`[HTTP Response] Status: ${res.statusCode}, Body: ${responseBody}`);
          if (res.statusCode === 200) resolve(true);
          else reject(new Error(`HTTP status ${res.statusCode}`));
        });
      });

      req.on('error', reject);
      req.write(payloadData);
      req.end();
    });

    await postPromise;
    console.log('✓ Successfully sent and received GSI response 200 OK!');
  } finally {
    bridge.kill();
    console.log('--- GSI BRIDGE TEST COMPLETED ---');
  }
}

runGSITest().catch((e) => {
  console.error(e);
  process.exit(1);
});
