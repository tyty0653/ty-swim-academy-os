import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const command = isWindows ? 'npx.cmd playwright test tests/ui/os-ui.spec.mjs --reporter=list' : 'npx';
const args = isWindows ? [] : ['playwright', 'test', 'tests/ui/os-ui.spec.mjs', '--reporter=list'];
const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: isWindows,
  env: {
    ...process.env,
    UI_SCREENSHOTS: '1',
  },
});

if (result.error) {
  console.error(`Unable to start Playwright screenshot run: ${result.error.message}`);
}

process.exitCode = result.status ?? 1;
