import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
const root = process.cwd(),
  server = await createServer({
    configFile: false,
    root,
    resolve: { alias: { '@': root } },
    server: { middlewareMode: true, hmr: false },
  });
try {
  const { parseConversationReply } = await server.ssrLoadModule(
    '/lib/conversation/action-bridge.ts',
  );
  assert.equal(
    parseConversationReply(
      '{"reply":"一息つく選択もあるよ。","actionId":"breathing"}',
      '少し区切りたい',
    ).actionId,
    'breathing',
  );
  assert.equal(
    parseConversationReply(
      '{"reply":"そうだったんだね。","actionId":"breathing"}',
      '今は聞いてほしい',
    ).actionId,
    undefined,
  );
  assert.equal(
    parseConversationReply(
      '{"reply":"相談してね。","actionId":"breathing"}',
      '薬について教えて',
    ).actionId,
    undefined,
  );
  assert.equal(
    parseConversationReply(
      '{"reply":"話そう。","actionId":"invented-diagnosis"}',
      '気になる',
    ).actionId,
    undefined,
  );
  assert.throws(() =>
    parseConversationReply('{"actionId":"breathing"}', 'test'),
  );
  assert.ok(
    Array.from(parseConversationReply('あ'.repeat(500), 'test').reply).length <=
      300,
  );
  const cases = JSON.parse(
    await readFile('tests/fixtures/conversation-v2-evaluation.json', 'utf8'),
  );
  assert.equal(cases.length, 30);
  const { immediateSafetyReply } = await server.ssrLoadModule(
    '/lib/conversation/safety.ts',
  );
  for (const key of [
    'diagnosis',
    'medicine',
    'self-harm',
    'violence',
    'medical',
  ])
    assert.ok(immediateSafetyReply(cases.find((c) => c.id === key).message));
  for (const key of ['fatigue', 'happy', 'food', 'curry'])
    assert.equal(
      immediateSafetyReply(cases.find((c) => c.id === key).message),
      null,
    );
  console.log(
    'Conversation v2 boundaries PASS. Thirty quality scenarios defined; live quality NOT TESTED.',
  );
} finally {
  await server.close();
}
