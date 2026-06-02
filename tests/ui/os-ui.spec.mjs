import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

loadLocalEnv();

const screenshotsEnabled = process.env.UI_SCREENSHOTS === '1';
const adminCreds = credsFor('ADMIN');
const coachCreds = credsFor('COACH');

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
  test.skip(!adminCreds.ready, adminCreds.reason);

  test.beforeEach(async ({ page }) => {
    await login(page, adminCreds);
  });

  for (const [slug, route] of adminPages) {
    test(`Admin ${slug} loads and fits`, async ({ page }, testInfo) => {
      await openRoute(page, route);
      await expectNoAccessMessage(page, false);
      await expectMobileShell(page, testInfo);
      await expectNoHorizontalOverflow(page);
      await capture(page, testInfo, `admin-${slug}`);
    });
  }

  test('Admin Student Profile loads when demo/student data exists', async ({ page }, testInfo) => {
    await openRoute(page, '/students');
    const opened = await openFirstProfile(page);
    test.skip(!opened, 'No student profile card is available. Run demo seed or add a student first.');
    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId('student-profile-page')).toBeVisible();
    await expect(page.getByText('Safety').first()).toBeVisible();
    await capture(page, testInfo, 'admin-student-profile');
  });

  test('Admin More includes Sign out', async ({ page }) => {
    await openRoute(page, '/more');
    await expect(page.getByTestId('more-page')).toBeVisible();
    const count = await page.getByTestId('sign-out-button').count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Coach UI quality', () => {
  test.skip(!coachCreds.ready, coachCreds.reason);

  test.beforeEach(async ({ page }) => {
    await login(page, coachCreds);
  });

  for (const [slug, route] of coachPages) {
    test(`Coach ${slug} loads and fits`, async ({ page }, testInfo) => {
      await openRoute(page, route);
      await expectMobileShell(page, testInfo);
      await expectNoHorizontalOverflow(page);
      await capture(page, testInfo, `coach-${slug}`);
    });
  }

  test('Coach Student Profile loads when assigned student data exists', async ({ page }, testInfo) => {
    await openRoute(page, '/students');
    const opened = await openFirstProfile(page);
    test.skip(!opened, 'No assigned student profile is available for this Coach. Run demo seed or assign a class first.');
    await expect(page.getByTestId('student-profile-page')).toBeVisible();
    await expect(page.getByText('Safety').first()).toBeVisible();
    await expect(page.getByText('Admin-only Finance')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, 'coach-student-profile');
  });

  test('Coach Submit Record opens when an assigned lesson exists', async ({ page }, testInfo) => {
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
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, 'coach-submit-record');
  });

  test('Coach More includes Sign out and hides admin finance wording', async ({ page }) => {
    await openRoute(page, '/more');
    await expect(page.getByTestId('more-page')).toBeVisible();
    const count = await page.getByTestId('sign-out-button').count();
    expect(count).toBeGreaterThan(0);
    await expect(page.getByText('Expenses')).toHaveCount(0);
    await expect(page.getByText('Audit Logs')).toHaveCount(0);
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
  return { ready: true, email, password };
}

async function login(page, creds) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForFunction(() => window.location.pathname !== '/login' || document.body.textContent.includes('Login failed') || document.body.textContent.includes('missing or inactive') || document.body.textContent.includes('invalid'));
  const body = await page.locator('body').innerText();
  expect(body, 'Login failed or staff profile is not ready. Passwords are intentionally not printed.').not.toContain('Login failed');
  expect(body).not.toContain('missing or inactive');
  expect(body).not.toContain('role is not valid');
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
  const button = card.first().getByRole('button', { name: 'Open Profile' });
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

async function expectNoHorizontalOverflow(page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const width = Math.max(root.scrollWidth, body.scrollWidth);
    const overflow = Math.max(0, width - root.clientWidth);
    const offenders = [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          testId: element.getAttribute('data-testid') || '',
          className: String(element.getAttribute('class') || '').slice(0, 120),
          right: Math.round(rect.right),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          text: String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        };
      })
      .filter((item) => item.right > root.clientWidth + 2 || item.left < -2)
      .slice(0, 8);
    return { overflow, clientWidth: root.clientWidth, scrollWidth: width, offenders };
  });
  expect(result.overflow, `Page has ${result.overflow}px horizontal overflow: ${JSON.stringify(result.offenders)}`).toBeLessThanOrEqual(2);
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
