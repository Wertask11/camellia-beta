/** Real Chromium against tests/ux-preview.mjs (synthetic auth and a synthetic conversation; every non-local
 *  request is blocked). The reaction lands on her message before the reply, メリィ shows as YURA / Lactone,
 *  and a renamed character shows everywhere. Usage: node tests/reaction-browser.mjs [screenshot-dir] */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
// Playwright is installed on the machine, not in this project (the other browser tests use Python).
const { chromium } = createRequire(import.meta.url)('playwright');

const origin = 'http://127.0.0.1:4173', shots = process.argv[2];
const harness = spawn(process.execPath, ['tests/ux-preview.mjs'], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  harness.stdout.on('data', chunk => { if (String(chunk).includes('harness ready')) resolve(); });
  harness.on('exit', code => reject(new Error(`harness exited ${code}`)));
});
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  // RECORD_VIDEO=<dir> keeps a screen recording of the run (to show the motion to people).
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tokyo', ...(process.env.RECORD_VIDEO ? { recordVideo: { dir: process.env.RECORD_VIDEO, size: { width: 390, height: 844 } } } : {}) });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('pageerror', error.stack?.split('\n').slice(0, 4).join(' | ')); });
  await page.goto(origin);
  await page.getByRole('button', { name: '今日のわたしに会いにいく' }).click();
  await page.getByRole('button', { name: 'LINEで続ける' }).click();
  await page.getByLabel('名前／ニックネーム').fill('テスト');
  await page.getByLabel('生年月日').fill('2000-01-01');
  await page.getByLabel('私は女性です（自己申告）').check();
  await page.getByRole('button', { name: '今日の私をCheckする' }).click();
  await page.getByRole('button', { name: 'Camellia', exact: true }).click();
  const start = page.getByRole('button', { name: /新しい会話を始める/ });
  if (await start.count()) await start.click();

  const box = page.getByLabel('Camelliaへのメッセージ', { exact: true });
  await box.fill('今日、プレゼンを最後までやりきれた');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  // Her message, then the reaction (and the same face and emoji on メリィ), and only then the thinking dots and the reply.
  const pill = page.locator('.bubble.user .message-reaction');
  await pill.waitFor({ timeout: 1500 });
  assert.equal(await page.locator('.chat-loading').count(), 0, 'メリィ is not thinking yet while the reaction has its moment');
  assert.equal(await page.locator('.chat-mascot-emoji').textContent(), '👏', 'メリィ shows the same reaction');
  assert.equal(await page.locator('.chat-mascot img').getAttribute('src'), '/character/full/yura-praise.svg', 'with the same face');
  assert.equal(await page.locator('.chat-mascot-name').textContent(), 'メリィ · YURA');
  assert.ok(await page.locator('.camellia > header .chat-mascot').count(), 'メリィ is in the header, not over the messages');
  if (shots) await page.screenshot({ path: `${shots}/reaction-before-reply.png` });
  await page.locator('.chat-loading').waitFor({ timeout: 3000 });
  assert.equal(await page.locator('.chat-mascot-name').textContent(), 'メリィは考え中です', 'then she thinks');
  const mascot = page.locator('.chat-mascot img');
  assert.equal(await mascot.getAttribute('src'), '/character/full/yura-think.svg');
  if (shots) await page.screenshot({ path: `${shots}/reaction-then-thinking.png` });
  assert.equal(await pill.textContent(), 'メリィ · YURAのリアクション：がんばったね👏', 'the emoji, with words for screen readers');
  await page.locator('.bubble.assistant:not(.chat-loading)').waitFor();
  assert.equal(await page.locator('.bubble.assistant .message-model-label').first().textContent(), 'メリィ · YURA');
  assert.equal(await mascot.getAttribute('src'), '/character/full/yura-praise.svg', 'after the reply her face matches the reaction');
  await page.waitForFunction(() => document.querySelector('.chat-mascot img')?.getAttribute('src') === '/character/full/yura-listen.svg', null, { timeout: 6000 });
  assert.equal(await page.locator('.chat-mascot-name').textContent(), 'メリィ · YURA', 'then she goes back to listening');

  await box.fill('最近ずっとつらい');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await page.locator('.bubble.user .message-reaction').nth(1).waitFor({ timeout: 1500 });
  assert.ok((await page.locator('.bubble.user .message-reaction').nth(1).textContent()).includes('😭'), 'つらい gets 😭');
  assert.equal(await page.locator('.chat-mascot-emoji').textContent(), '😭');
  assert.equal(await page.locator('.chat-mascot img').getAttribute('src'), '/character/full/yura-cry.svg', 'and メリィ cries with her');
  if (shots) await page.screenshot({ path: `${shots}/reaction-cry.png` });
  await page.locator('.bubble.assistant:not(.chat-loading)').nth(1).waitFor();
  if (shots) await page.screenshot({ path: `${shots}/reaction-after-reply.png` });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('camellia-prototype-v3')).aiConversations.flatMap(c => c.messages).filter(m => m.role === 'user').map(m => m.reaction));
  assert.deepEqual(stored, ['clap', 'cry'], 'reactions are kept with her messages');
  await page.reload();
  await page.getByRole('button', { name: 'Camellia', exact: true }).click();
  const again = page.locator('.conversation-preview').first();
  if (await again.count()) await again.click();
  await page.locator('.bubble.user .message-reaction').nth(1).waitFor();
  console.log('PASS the reaction lands on her message before the reply, matches メリィ\'s face, and is still there after reloading');

  // Tap the floating character: her profile, then 「名前を編集」 and 「姿を変える」 from the pencil (as in companion apps).
  await page.getByRole('button', { name: 'メリィのプロフィールを開く' }).click();
  const sheet = page.locator('dialog.character-profile');
  await sheet.waitFor();
  assert.equal(await sheet.locator('h2').textContent(), 'メリィ');
  if (shots) await page.screenshot({ path: `${shots}/character-profile.png` });
  await sheet.getByRole('button', { name: 'キャラクターを編集' }).click();
  await sheet.getByRole('menuitem', { name: /名前を編集/ }).click();
  await sheet.getByLabel('この子の名前').fill('ことは');
  await sheet.getByRole('button', { name: '名前を保存する' }).click();
  assert.equal(await sheet.locator('h2').textContent(), 'ことは');
  await sheet.getByRole('button', { name: 'キャラクターを編集' }).click();
  await sheet.getByRole('menuitem', { name: /姿を変える（Lactone）/ }).click();
  await sheet.locator('.character-profile-portrait--lactone').waitFor();
  await sheet.getByRole('button', { name: '閉じる' }).click();
  assert.equal(await page.locator('.chat-mascot-name').textContent(), 'ことは · Lactone');
  assert.equal(await page.locator('.chat-mascot img').getAttribute('src'), '/character/full/lactone-listen.svg');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('camellia-prototype-v3')).profile.characterName), 'ことは');
  await page.getByRole('button', { name: 'ことはのプロフィールを開く' }).click();
  await sheet.getByRole('button', { name: 'キャラクターを編集' }).click();
  await sheet.getByRole('menuitem', { name: /姿を変える（YURA）/ }).click();
  await sheet.getByRole('button', { name: '閉じる' }).click();
  console.log('PASS tapping the character opens her profile; she can be renamed and switch between YURA and Lactone there');

  await page.getByRole('button', { name: 'My', exact: true }).click();
  await page.getByText('Camelliaのキャラクター').click();
  await page.getByLabel('この子の名前').fill('つばきちゃん');
  await page.getByRole('button', { name: '名前を保存する' }).click();
  await page.getByText('「つばきちゃん」になりました').waitFor();
  if (shots) await page.screenshot({ path: `${shots}/character-name.png`, fullPage: false });
  await page.getByLabel('この子の名前').fill('あいうえおかきくけこさしす');
  assert.equal(await page.getByRole('button', { name: '名前を保存する' }).isDisabled(), true, '13 characters cannot be saved');
  await page.getByRole('button', { name: 'Camellia', exact: true }).click();
  const thread = page.locator('.conversation-preview').first();
  if (await thread.count()) await thread.click();
  await page.locator('.bubble.assistant .message-model-label').first().waitFor();
  assert.equal(await page.locator('.bubble.assistant .message-model-label').first().textContent(), 'つばきちゃん · YURA');
  assert.equal(await page.locator('.chat-mascot-name').textContent(), 'つばきちゃん · YURA');
  assert.deepEqual(errors, []);
  console.log('PASS she can rename メリィ (1–12 characters); the new name shows in the conversation');
  await context.close();
} finally {
  await browser.close();
  harness.kill();
}
