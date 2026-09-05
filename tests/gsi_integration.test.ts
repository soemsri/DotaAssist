import { strict as assert } from 'node:assert';
import http, { ClientRequest } from 'node:http';
import { ChildProcess, spawn } from 'node:child_process';

const TEST_PORT = 31991;

function waitForBridge(bridge: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('GSI bridge did not start')), 5000);

    bridge.stdout?.on('data', (chunk) => {
      const message = chunk.toString().trim();
      console.log(`[Bridge Output] ${message}`);
      if (message.includes('Listening on')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    bridge.stderr?.on('data', (chunk) => {
      console.error(`[Bridge Error] ${chunk.toString().trim()}`);
    });
    bridge.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    bridge.once('exit', (code) => {
      if (code && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`GSI bridge exited early with code ${code}`));
      }
    });
  });
}

function openSSEStream(): {
  request: ClientRequest;
  connected: Promise<void>;
  payload: Promise<Record<string, unknown>>;
} {
  let resolveConnected!: () => void;
  let rejectConnected!: (error: Error) => void;
  let resolvePayload!: (payload: Record<string, unknown>) => void;
  let rejectPayload!: (error: Error) => void;

  const connected = new Promise<void>((resolve, reject) => {
    resolveConnected = resolve;
    rejectConnected = reject;
  });
  const payload = new Promise<Record<string, unknown>>((resolve, reject) => {
    resolvePayload = resolve;
    rejectPayload = reject;
  });

  const request = http.get(
    { hostname: '127.0.0.1', port: TEST_PORT, path: '/events' },
    (response) => {
      if (response.statusCode !== 200) {
        const error = new Error(`SSE returned HTTP ${response.statusCode}`);
        rejectConnected(error);
        rejectPayload(error);
        return;
      }

      resolveConnected();
      let buffer = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        buffer += chunk;
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const dataLine = frame
            .split('\n')
            .find((line) => line.startsWith('data: '));
          if (!dataLine) continue;

          try {
            resolvePayload(JSON.parse(dataLine.slice(6)) as Record<string, unknown>);
          } catch (error) {
            rejectPayload(error instanceof Error ? error : new Error(String(error)));
          }
        }
      });
    },
  );
  request.once('error', (error) => {
    rejectConnected(error);
    rejectPayload(error);
  });

  return { request, connected, payload };
}

function postPayload(payload: object): Promise<void> {
  const payloadData = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: '/gsi',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payloadData),
        },
      },
      (response) => {
        response.resume();
        response.once('end', () => {
          if (response.statusCode === 200) resolve();
          else reject(new Error(`GSI POST returned HTTP ${response.statusCode}`));
        });
      },
    );
    request.once('error', reject);
    request.end(payloadData);
  });
}

async function runGSITest() {
  console.log('--- STARTING GSI BRIDGE INTEGRATION TEST ---');
  const bridge = spawn(process.execPath, ['scripts/gsi-bridge.cjs'], {
    stdio: 'pipe',
    env: { ...process.env, DOTAASSIST_GSI_PORT: String(TEST_PORT) },
  });
  let stream: ClientRequest | null = null;

  try {
    await waitForBridge(bridge);
    const sse = openSSEStream();
    stream = sse.request;
    await sse.connected;

    const expectedPayload = {
      provider: { name: 'Dota 2', appid: 570, version: 48, timestamp: 1725400000 },
      map: {
        matchid: 'integration-test',
        clock_time: 405.2,
        game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      },
      player: { name: 'Integration Test', team_name: 'radiant', gold: 1450 },
      hero: { id: 1, name: 'npc_dota_hero_antimage', level: 6 },
    };

    await postPayload(expectedPayload);
    const receivedPayload = await Promise.race([
      sse.payload,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for SSE payload')), 3000),
      ),
    ]);

    assert.deepEqual(receivedPayload, expectedPayload);
    console.log('✓ GSI POST payload was forwarded unchanged through the SSE stream');
  } finally {
    stream?.destroy();
    bridge.kill();
  }
}

runGSITest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
