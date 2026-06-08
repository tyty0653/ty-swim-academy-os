import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

loadLocalEnv();

const screenshotsEnabled = process.env.UI_SCREENSHOTS === '1';
const authPreflight = readAuthPreflight();
const adminCreds = credsFor('ADMIN');
const coachCreds = credsFor('COACH');
const adminState = { ok: false, issue: adminCreds.reason || 'Admin QA login preflight has not run yet.' };
const coachState = { ok: false, issue: coachCreds.reason || 'Coach QA login preflight has not run yet.' };
const storageStateCache = new Map();

const adminPages = [
  ['today', '/dashboard', 'Today'],
  ['students', '/students', 'Students'],
  ['schedule', '/schedule', 'Schedule'],
  ['review', '/review', 'Review'],
  ['money', '/money', 'Money'],
  ['more', '/more', 'More'],
  ['setup-check', '/system-check', 'Setup Check'],
  ['audit-logs', '/audit-logs', 'Audit Logs'],
];

const coachPages = [
  ['today', '/dashboard', 'Today'],
  ['schedule', '/schedule', 'My Schedule'],
  ['students', '/students', 'My Students'],
  ['my-pay', '/payroll', 'My Pay'],
  ['my-account-check', '/system-check', 'My Account Check'],
];

test.describe('Public login UI quality', () => {
  test('Login loads, fits, and saves language choice', async ({ page }, testInfo) => {
    await page.goto('/login');
    await page.evaluate(() => window.localStorage.removeItem('tyswim-os-language'));
    await page.reload();
    if (await page.getByTestId('login-email').count() === 0) {
      await expect(page.getByText('Supabase setup required')).toBeVisible();
      await expectNoHorizontalOverflow(page, testInfo);
      await capture(page, testInfo, 'public-login-setup-required');
      return;
    }
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit-button')).toBeVisible();
    await expect(page.getByTestId('language-toggle')).toBeVisible();
    await expectNoHorizontalOverflow(page, testInfo);

    await page.getByTestId('language-option-zh').click();
    await expect(page.getByTestId('language-option-zh')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('login-submit-button')).toContainText('登录');
    await expect(page.evaluate(() => window.localStorage.getItem('tyswim-os-language'))).resolves.toBe('zh');
    await page.reload();
    await expect(page.getByTestId('language-option-zh')).toHaveAttribute('aria-pressed', 'true');
    await expectNoHorizontalOverflow(page, testInfo);
    await capture(page, testInfo, 'public-login');
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  const directory = path.join('test-artifacts', 'ui-screenshots', 'failures', testInfo.project.name);
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `${safeFileName(testInfo.title)}.png`),
    fullPage: true,
  });
});

test.describe('Admin UI quality', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!adminCreds.ready, adminCreds.reason);

  test('Admin QA login preflight', async ({ page }, testInfo) => {
    const result = await ensureRoleSession(page, adminCreds, 'Admin', testInfo);
    adminState.ok = result.ok;
    adminState.issue = result.message;
    expect(result.ok, result.message).toBe(true);
  });

  for (const [slug, route] of adminPages) {
    test(`Admin ${slug} loads and fits`, async ({ page }, testInfo) => {
      test.skip(!adminState.ok, adminState.issue);
      await useRoleSession(page, adminCreds, 'Admin', testInfo);
      await openRoute(page, route);
      await expectNoAccessMessage(page, false);
      await expectMobileShell(page, testInfo);
      await expectNoHorizontalOverflow(page, testInfo);
      await capture(page, testInfo, `admin-${slug}`);
    });
  }

  test('Admin Student Profile loads when demo/student data exists', async ({ page }, testInfo) => {
    test.skip(!adminState.ok, adminState.issue);
    await useRoleSession(page, adminCreds, 'Admin', testInfo);
    await openRoute(page, '/students');
    const opened = await openFirstProfile(page);
    test.skip(!opened, 'No student profile card is available. Run demo seed or add a student first.');
    await expectNoHorizontalOverflow(page, testInfo);
    await expect(page.getByTestId('student-profile-page')).toBeVisible();
    await expect(page.getByText('Safety').first()).toBeVisible();
    await capture(page, testInfo, 'admin-student-profile');
  });

  test('Admin More includes Sign out', async ({ page }, testInfo) => {
    test.skip(!adminState.ok, adminState.issue);
    await useRoleSession(page, adminCreds, 'Admin', testInfo);
    await openRoute(page, '/more');
    await expect(page.getByTestId('more-page')).toBeVisible();
    await expect(page.getByTestId('account-section')).toBeVisible();
    await expect(page.getByTestId('more-page').getByTestId('sign-out-button')).toBeVisible();
  });
});

test.describe('Coach UI quality', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!coachCreds.ready, coachCreds.reason);

  test('Coach QA login preflight', async ({ page }, testInfo) => {
    const result = await ensureRoleSession(page, coachCreds, 'Coach', testInfo);
    coachState.ok = result.ok;
    coachState.issue = result.message;
    expect(result.ok, result.message).toBe(true);
  });

  for (const [slug, route] of coachPages) {
    test(`Coach ${slug} loads and fits`, async ({ page }, testInfo) => {
      test.skip(!coachState.ok, coachState.issue);
      await useRoleSession(page, coachCreds, 'Coach', testInfo);
      await openRoute(page, route);
      await expectMobileShell(page, testInfo);
      await expectNoHorizontalOverflow(page, testInfo);
      await capture(page, testInfo, `coach-${slug}`);
    });
  }

  test('Coach Student Profile loads when assigned student data exists', async ({ page }, testInfo) => {
    test.skip(!coachState.ok, coachState.issue);
    await useRoleSession(page, coachCreds, 'Coach', testInfo);
    await openRoute(page, '/students');
    const opened = await openFirstProfile(page);
    test.skip(!opened, 'No assigned student profile is available for this Coach. Run demo seed or assign a class first.');
    await expect(page.getByTestId('student-profile-page')).toBeVisible();
    await expect(page.getByText('Safety').first()).toBeVisible();
    await expect(page.getByText('Admin-only Finance')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, testInfo);
    await capture(page, testInfo, 'coach-student-profile');
  });

  test('Coach Submit Record opens when an assigned lesson exists', async ({ page }, testInfo) => {
    test.skip(!coachState.ok, coachState.issue);
    await useRoleSession(page, coachCreds, 'Coach', testInfo);
    await openRoute(page, '/dashboard');
    const submitButton = page.getByTestId('coach-submit-record-button');
    if (await submitButton.count() === 0) {
      await openRoute(page, '/schedule');
    }
    const fallbackSubmitButton = page.getByTestId('coach-submit-record-button');
    test.skip(await fallbackSubmitButton.count() === 0, 'No assigned lesson with Submit / Open is available for this Coach.');
    await fallbackSubmitButton.first().click();
    await page.waitForFunction(() => window.location.pathname.includes('/lessons/'));
    await expect(page.getByTestId('coach-submit-record-button').first()).toBeVisible();
    await expectNoHorizontalOverflow(page, testInfo);
    await capture(page, testInfo, 'coach-submit-record');
  });

  test('Coach More includes Sign out and hides admin finance wording', async ({ page }, testInfo) => {
    test.skip(!coachState.ok, coachState.issue);
    await useRoleSession(page, coachCreds, 'Coach', testInfo);
    await openRoute(page, '/more');
    await expect(page.getByTestId('more-page')).toBeVisible();
    await expect(page.getByTestId('account-section')).toBeVisible();
    await expect(page.getByTestId('more-page').getByTestId('sign-out-button')).toBeVisible();
    await expect(page.getByTestId('admin-tools-section')).toHaveCount(0);
    await expect(page.getByTestId('records-section')).toHaveCount(0);
  });
});

function loadLocalEnv() {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.resolve(fileName);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const rawValue = trimmed.slice(index + 1).trim();
      if (!process.env[key]) process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

function credsFor(role) {
  const email = process.env[`QA_${role}_EMAIL`];
  const password = process.env[`QA_${role}_PASSWORD`];
  if (!email || !password) {
    return {
      ready: false,
      reason: `Missing QA_${role}_EMAIL or QA_${role}_PASSWORD. Add them to .env.local or your shell to run authenticated UI checks.`,
    };
  }
  const preflight = authPreflight?.[role.toLowerCase()];
  if (preflight && !preflight.ok && ['missing-qa-credentials', 'missing-supabase-env'].includes(preflight.reasonCode)) {
    return {
      ready: false,
      email,
      password,
      reason: preflight.message,
    };
  }
  return { ready: true, email, password };
}

function readAuthPreflight() {
  const filePath = path.resolve('test-artifacts', 'ui-auth-preflight.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function ensureRoleSession(page, creds, role, testInfo) {
  const statePath = storageStatePath(role, testInfo);
  const cacheKey = `${testInfo.project.name}:${role.toLowerCase()}`;
  const cached = storageStateCache.get(cacheKey);
  if (cached?.ok && fs.existsSync(cached.path)) return { ok: true, message: `${role} QA session reused for ${creds.email}.` };

  const result = await attemptLogin(page, creds, role, testInfo);
  if (!result.ok) return result;
  await page.context().storageState({ path: statePath });
  storageStateCache.set(cacheKey, { ok: true, path: statePath });
  return { ok: true, message: `${role} QA browser session is ready for ${creds.email}.` };
}

async function useRoleSession(page, creds, role, testInfo) {
  let result = await ensureRoleSession(page, creds, role, testInfo);
  expect(result.ok, result.message).toBe(true);
  await restoreStorageState(page, storageStatePath(role, testInfo));
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  if (!(await isAuthenticatedPage(page))) {
    storageStateCache.delete(`${testInfo.project.name}:${role.toLowerCase()}`);
    if (fs.existsSync(storageStatePath(role, testInfo))) fs.rmSync(storageStatePath(role, testInfo), { force: true });
    result = await ensureRoleSession(page, creds, role, testInfo);
    expect(result.ok, `${result.message} Retried UI login once after saved session was rejected.`).toBe(true);
    await restoreStorageState(page, storageStatePath(role, testInfo));
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  }
  expect(await isAuthenticatedPage(page), `${role} saved session was not accepted after one retry for ${creds.email}. Password was not printed.`).toBe(true);
}

async function attemptLogin(page, creds, role, testInfo) {
  if (!creds?.ready) return { ok: false, message: creds?.reason || `${role} QA credentials are missing.` };
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.getByTestId('login-email').fill(creds.email);
  await page.getByTestId('login-password').fill(creds.password);
  await page.getByTestId('login-submit-button').click();
  try {
    await page.waitForFunction(
      () => window.location.pathname !== '/login'
        || document.body.textContent.includes('Login failed')
        || document.body.textContent.includes('missing or inactive')
        || document.body.textContent.includes('invalid')
        || document.body.textContent.includes('inactive')
        || document.body.textContent.includes('taking too long'),
      { timeout: 16_000 },
    );
  } catch {
    await captureLoginFailure(page, testInfo, `${role.toLowerCase()}-login-timeout`);
    const buttonText = await page.getByTestId('login-submit-button').innerText().catch(() => 'unknown');
    return {
      ok: false,
      message: `${role} QA login timed out for ${creds.email}. Password was not printed. The login button text was "${buttonText}". Check Supabase Auth, profiles, network access, and whether the app shows "Login is taking too long."`,
    };
  }
  const body = await page.locator('body').innerText();
  const prefix = `${role} QA login failed for ${creds.email}.`;
  if (body.includes('taking too long')) {
    await captureLoginFailure(page, testInfo, `${role.toLowerCase()}-login-taking-too-long`);
    return { ok: false, message: `${prefix} The app reported that login is taking too long. Check Supabase Auth/profile connectivity and table loading warnings. Password was not printed.` };
  }
  if (body.includes('Login failed')) {
    await captureLoginFailure(page, testInfo, `${role.toLowerCase()}-login-failed`);
    return { ok: false, message: `${prefix} Check QA_${role.toUpperCase()}_EMAIL / QA_${role.toUpperCase()}_PASSWORD. Password was not printed.` };
  }
  if (body.includes('missing or inactive')) {
    return { ok: false, message: `${prefix} Login succeeded but staff profile is missing or inactive. Check Supabase profiles row for this Auth user.` };
  }
  if (body.includes('role is not valid')) {
    return { ok: false, message: `${prefix} Staff profile role is invalid. Role must be admin or coach.` };
  }
  if (body.includes('staff account is inactive')) {
    return { ok: false, message: `${prefix} Staff profile is inactive. Set active=true for this test user if appropriate.` };
  }
  if (page.url().endsWith('/login')) {
    return { ok: false, message: `${prefix} Browser stayed on /login after sign in. Check QA credentials and Supabase Auth/profile setup.` };
  }
  return { ok: true, message: `${role} QA login succeeded for ${creds.email}.` };
}

function storageStatePath(role, testInfo) {
  return path.join('test-artifacts', 'ui-auth-states', testInfo.project.name, `${role.toLowerCase()}.json`);
}

async function restoreStorageState(page, statePath) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  await page.context().clearCookies();
  await page.context().addCookies(state.cookies || []);
  await page.goto('/login');
  await page.evaluate((origins) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    const current = origins.find((origin) => origin.origin === window.location.origin);
    for (const item of current?.localStorage || []) window.localStorage.setItem(item.name, item.value);
    for (const item of current?.sessionStorage || []) window.sessionStorage.setItem(item.name, item.value);
  }, state.origins || []);
}

async function isAuthenticatedPage(page) {
  await page.waitForLoadState('domcontentloaded');
  if (page.url().endsWith('/login')) return false;
  if (await page.getByTestId('login-submit-button').count()) return false;
  if ((await page.locator('body').innerText()).includes('Login failed')) return false;
  return true;
}

async function captureLoginFailure(page, testInfo, slug) {
  if (!testInfo) return;
  const directory = path.join('test-artifacts', 'ui-screenshots', 'failures', testInfo.project.name);
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `${safeFileName(slug)}.png`),
    fullPage: true,
  }).catch(() => {});
}

async function openRoute(page, route) {
  await page.goto(route);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).not.toContainText('TY Swim Academy OS could not finish loading');
  await expect(page.locator('body')).not.toContainText('This page is Admin only.');
}

async function openFirstProfile(page) {
  const card = page.getByTestId('student-profile-card');
  if (await card.count() === 0) return false;
  const button = card.first().getByTestId('open-student-profile-button');
  if (await button.count() === 0) return false;
  await button.click();
  await page.waitForFunction(() => window.location.pathname.includes('/students/'));
  return true;
}

async function expectNoAccessMessage(page, shouldExist) {
  const count = await page.getByText('This page is Admin only.').count();
  if (shouldExist) expect(count).toBeGreaterThan(0);
  else expect(count).toBe(0);
}

async function expectMobileShell(page, testInfo) {
  const width = testInfo.project.use.viewport?.width || 1440;
  const mobileNav = page.getByTestId('mobile-bottom-nav');
  if (width < 1024) {
    await expect(mobileNav).toBeVisible();
  } else {
    await expect(mobileNav).toBeHidden();
  }
}

async function expectNoHorizontalOverflow(page, testInfo) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = root.clientWidth;
    const documentWidth = Math.max(root.scrollWidth, body.scrollWidth);
    const overflow = Math.max(0, documentWidth - viewportWidth);
    function selectorFor(element) {
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
        const tag = current.tagName.toLowerCase();
        const testId = current.getAttribute('data-testid');
        const id = current.id ? `#${current.id}` : '';
        const className = String(current.getAttribute('class') || '')
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 3)
          .map((item) => `.${CSS.escape(item)}`)
          .join('');
        parts.unshift(testId ? `${tag}[data-testid="${testId}"]` : `${tag}${id}${className}`);
        current = current.parentElement;
      }
      return parts.join(' > ');
    }
    const offenders = [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const computed = window.getComputedStyle(element);
        return {
          selector: selectorFor(element),
          tag: element.tagName.toLowerCase(),
          testId: element.getAttribute('data-testid') || '',
          className: String(element.getAttribute('class') || '').slice(0, 120),
          position: computed.position,
          overflowX: computed.overflowX,
          right: Math.round(rect.right),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          offsetWidth: element.offsetWidth,
          text: String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        };
      })
      .filter((item) => item.right > viewportWidth + 2 || item.left < -2 || item.scrollWidth > item.clientWidth + 2)
      .sort((a, b) => Math.max(b.right - viewportWidth, b.scrollWidth - b.clientWidth) - Math.max(a.right - viewportWidth, a.scrollWidth - a.clientWidth))
      .slice(0, 10);
    return {
      url: window.location.href,
      viewportWidth,
      viewportHeight: window.innerHeight,
      documentWidth,
      rootScrollWidth: root.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      overflow,
      offenders,
    };
  });
  if (result.overflow > 2 && testInfo) {
    const directory = path.join('test-artifacts', 'ui-overflow-diagnostics', testInfo.project.name);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, `${safeFileName(testInfo.title)}.json`),
      JSON.stringify(result, null, 2),
    );
  }
  expect(
    result.overflow,
    `Horizontal overflow on ${result.url}\nViewport: ${result.viewportWidth}x${result.viewportHeight}\nDocument width: ${result.documentWidth} (root ${result.rootScrollWidth}, body ${result.bodyScrollWidth})\nOverflow: ${result.overflow}px\nLikely overflowing elements:\n${JSON.stringify(result.offenders, null, 2)}`,
  ).toBeLessThanOrEqual(2);
}

async function capture(page, testInfo, slug) {
  if (!screenshotsEnabled) return;
  const directory = path.join('test-artifacts', 'ui-screenshots', testInfo.project.name);
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `${slug}.png`),
    fullPage: true,
  });
}

function safeFileName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 100) || 'failed-test';
}
