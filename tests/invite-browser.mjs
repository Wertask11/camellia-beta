/** Real Chromium against tests/ux-preview.mjs (synthetic auth and access answers; every non-local request is
 *  blocked). Women only, by invite: a link's code lets her straight in, a typed code works, a stopped account
 *  stops, and a server that cannot answer never locks anyone out. Usage: node tests/invite-browser.mjs */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
// Playwright is installed on the machine, not in this project (the other browser tests use Python).
const { chromium } = createRequire(import.meta.url)('playwright');

const origin = 'http://127.0.0.1:4173';
const harness = spawn(process.execPath, ['tests/ux-preview.mjs'], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  harness.stdout.on('data', chunk => { if (String(chunk).includes('harness ready')) resolve(); });
  harness.on('exit', code => reject(new Error(`harness exited ${code}`)));
});
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function start(mode, path = '/') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tokyo' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  if (mode) await context.addCookies([{ name: 'ux-access', value: mode, url: origin }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + path);
  await page.getByRole('button', { name: '今日のわたしに会いにいく' }).click();
  await page.getByRole('button', { name: 'LINEで続ける' }).click();
  return { context, page, errors };
}
const events = page => page.evaluate(() => JSON.parse(localStorage.getItem('camellia-prototype-v3') || '{}').analyticsEvents ?? []);
try {
  {
    const { context, page, errors } = await start('invite', '/?invite=k7qm-2xpa&utm_source=invite&utm_campaign=instagram_1027');
    await page.getByRole('heading', { name: 'はじめに、少しだけ。' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: '招待コードを入力してください' }).count(), 0, 'the link\'s code is used without asking');
    assert.ok(!page.url().includes('invite='), 'the code is not left in the address bar');
    await page.getByLabel('私は女性です（自己申告）').waitFor();
    assert.ok((await page.locator('main').textContent()).includes('18〜45歳の女性に限ったサービス'));
    const names = (await events(page)).map(e => e.name);
    assert.ok(names.includes('invite_submit') && names.includes('invite_accepted'));
    const accepted = (await events(page)).find(e => e.name === 'invite_accepted');
    assert.equal(accepted.properties.invite_channel, 'instagram_1027');
    assert.ok(!JSON.stringify(await events(page)).includes('K7QM'), 'the code is not recorded');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS an invite link lets her straight through to the profile');
  }
  {
    const { context, page } = await start('invite');
    await page.getByRole('heading', { name: '招待コードを入力してください' }).waitFor();
    await page.getByLabel('招待コード（8文字）').fill('mmmm-3333');
    await page.getByRole('button', { name: '招待コードを使う' }).click();
    await page.getByText('この招待コードは見つかりませんでした').waitFor();
    await page.getByLabel('招待コード（8文字）').fill('k7qm 2xpa');
    await page.getByRole('button', { name: '招待コードを使う' }).click();
    await page.getByRole('heading', { name: 'はじめに、少しだけ。' }).waitFor();
    await context.close();
    console.log('PASS without a link she types the code, sees why a wrong one fails, then continues');
  }
  {
    const { context, page } = await start('suspended');
    await page.getByRole('heading', { name: 'このアカウントの利用を止めています' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'はじめに、少しだけ。' }).count(), 0);
    await page.getByRole('button', { name: 'ログアウトする' }).click();
    await page.getByRole('button', { name: 'LINEで続ける' }).waitFor();
    await context.close();
    console.log('PASS a stopped account goes no further and can log out');
  }
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => { const url = new URL(route.request().url()); return url.origin === origin && !url.pathname.startsWith('/__ux/') ? route.continue() : route.abort(); });
    const page = await context.newPage();
    await page.goto(origin);
    await page.getByRole('button', { name: '今日のわたしに会いにいく' }).click();
    await page.getByRole('button', { name: 'LINEで続ける' }).click();
    await page.getByRole('heading', { name: 'はじめに、少しだけ。' }).waitFor({ timeout: 8000 });
    await context.close();
    console.log('PASS when SchoolPark cannot answer, nobody is locked out (the server still checks conversations and Circle)');
  }
} finally {
  await browser.close();
  harness.kill();
}
