import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const port = Number(process.env.LIGHTHOUSE_PORT || 5175);
const targetUrl = process.env.LIGHTHOUSE_URL || `http://127.0.0.1:${port}/login`;
const outputDir = path.resolve('test-artifacts', 'lighthouse');
const outputBase = path.join(outputDir, 'ty-swim-os-mobile');
const isWindows = process.platform === 'win32';
let server;

fs.mkdirSync(outputDir, { recursive: true });

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/login`);
      if (response.ok) return;
    } catch {
      await wait(500);
    }
  }
  throw new Error('Local app did not start in time for Lighthouse.');
}

try {
  if (!process.env.LIGHTHOUSE_URL) {
    const command = isWindows ? 'cmd.exe' : 'npm';
    const args = isWindows
      ? ['/d', '/s', '/c', `npm.cmd run dev -- --port ${port}`]
      : ['run', 'dev', '--', '--port', String(port)];
    server = spawn(command, args, { stdio: 'ignore' });
    await waitForServer();
  }

  const command = isWindows ? 'npx.cmd' : 'npx';
  const args = [
    'lighthouse',
    targetUrl,
    '--quiet',
    '--chrome-flags=--headless=new',
    '--form-factor=mobile',
    '--screenEmulation.mobile=true',
    '--screenEmulation.width=390',
    '--screenEmulation.height=844',
    '--only-categories=performance,accessibility,best-practices',
    '--output=html',
    '--output=json',
    `--output-path=${outputBase}`,
  ];
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status === 0) {
    console.log(`\nLighthouse reports saved in ${outputDir}`);
  } else {
    console.warn('\nLighthouse did not finish. Check that Chrome/Chromium is installed and reachable.');
    process.exitCode = result.status ?? 1;
  }
} finally {
  if (server) {
    if (isWindows) spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
    else server.kill('SIGTERM');
  }
}
