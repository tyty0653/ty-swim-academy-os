import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const command = isWindows ? 'npx.cmd' : 'npx';
const result = spawnSync(command, ['playwright', 'test', 'tests/ui/os-ui.spec.mjs', '--reporter=list'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    UI_SCREENSHOTS: '1',
  },
});

process.exitCode = result.status ?? 1;
