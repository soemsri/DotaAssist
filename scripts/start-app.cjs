// Launch script for DotaAssist: GSI Bridge + Vite Web Server
const { spawn } = require('child_process');

console.log('====================================================');
console.log('  DotaAssist - Starting Application');
console.log('  1. GSI Listener: http://127.0.0.1:3000/gsi');
console.log('  2. Web Interface: http://localhost:1420');
console.log('====================================================');

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

// 1. Start GSI Bridge
const bridge = spawn(process.execPath, ['scripts/gsi-bridge.cjs'], {
  stdio: 'inherit',
});

// 2. Start Vite Dev Server with --open
const vite = spawn(npxCmd, ['vite', '--host', '127.0.0.1', '--port', '1420', '--open'], {
  stdio: 'inherit',
  shell: true,
});

bridge.on('error', (err) => console.error('[GSI Bridge Error]', err));
vite.on('error', (err) => console.error('[Vite Server Error]', err));

const cleanup = () => {
  try {
    bridge.kill();
  } catch {}
  try {
    vite.kill();
  } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
