// Standalone Node.js GSI Bridge & Web Listener for DotaAssist
// Allows running DotaAssist in browser/dev mode without compiling Tauri Rust binary.
const http = require('http');

const PORT = 3001;
const sseClients = new Set();

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

  // Dota 2 GSI POST webhook
  if (req.method === 'POST' && (req.url === '/gsi' || req.url === '/')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');

      if (body.trim()) {
        try {
          const payload = JSON.parse(body);
          const dataString = `data: ${JSON.stringify(payload)}\n\n`;
          for (const client of sseClients) {
            client.write(dataString);
          }
        } catch (e) {
          console.error('[GSI Bridge] Failed to parse JSON payload:', e.message);
        }
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[DotaAssist GSI Bridge] Listening on http://127.0.0.1:${PORT}/gsi`);
  console.log(`[DotaAssist GSI Bridge] SSE stream available at http://127.0.0.1:${PORT}/events`);
});
