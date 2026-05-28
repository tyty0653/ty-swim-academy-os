import { spawn, spawnSync } from 'node:child_process';

const port = 4191;
const routes = ['/', '/login', '/dashboard', '/students', '/schedule', '/review', '/money', '/more', '/system-check'];
const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npm';
const args = isWindows
  ? ['/d', '/s', '/c', `npm.cmd run dev -- --port ${port}`]
  : ['run', 'dev', '--', '--port', String(port)];

const server = spawn(command, args, {
  stdio: 'ignore',
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/login`);
      if (response.ok) return;
    } catch {
      await wait(500);
    }
  }
  throw new Error('Vite dev server did not start in time');
}

try {
  await waitForServer();
  const results = [];
  for (const route of routes) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`);
    results.push({ route, status: response.status, ok: response.ok });
  }
  const failed = results.filter((result) => !result.ok);
  const output = results.map((result) => `${result.ok ? 'PASS' : 'FAIL'} ${result.status} ${result.route}`).join('\n');
  process.stdout.write(`${output}\n`);
  await new Promise((resolve) => process.stdout.write('', resolve));
  if (failed.length) process.exitCode = 1;
} finally {
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    server.kill('SIGTERM');
  }
}
