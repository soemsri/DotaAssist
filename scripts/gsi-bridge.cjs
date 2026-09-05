// Standalone Node.js GSI Bridge & Web Listener for DotaAssist
// Allows running DotaAssist in browser/dev mode without compiling Tauri Rust binary.
const http = require('http');

const PORT = Number(process.env.DOTAASSIST_GSI_PORT ?? 3001);
const HOST = process.env.DOTAASSIST_GSI_HOST ?? '127.0.0.1';
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
const sseClients = new Set();

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid DOTAASSIST_GSI_PORT: ${process.env.DOTAASSIST_GSI_PORT}`);
}

const server = http.createServer((req, res) => {
  // CORS headers for local web development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE endpoint for browser client
  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('retry: 3000\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // Dota 2 GSI POST webhook
  if (req.method === 'POST' && (req.url === '/gsi' || req.url === '/')) {
    let body = '';
    let payloadTooLarge = false;
    req.on('data', (chunk) => {
      if (payloadTooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > MAX_PAYLOAD_BYTES) {
        payloadTooLarge = true;
      }
    });
    req.on('end', () => {
      if (payloadTooLarge) {
        res.writeHead(413, { 'Content-Type': 'text/plain' });
        res.end('Payload Too Large');
        return;
      }

      if (!body.trim()) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing JSON payload');
        return;
      }

      try {
        const payload = JSON.parse(body);
        const dataString = `data: ${JSON.stringify(payload)}\n\n`;
        for (const client of sseClients) {
          client.write(dataString);
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      } catch (e) {
        console.error('[GSI Bridge] Failed to parse JSON payload:', e.message);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid JSON payload');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`[DotaAssist GSI Bridge] Listening on http://${HOST}:${PORT}/gsi`);
  console.log(`[DotaAssist GSI Bridge] SSE stream available at http://${HOST}:${PORT}/events`);
});
