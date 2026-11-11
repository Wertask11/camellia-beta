import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  resolve: { alias: { '@': process.cwd() } },
  server: { middlewareMode: true, hmr: false },
});
try {
  const o = await server.ssrLoadModule('/lib/server/ai-observation.ts'),
    p = await server.ssrLoadModule('/lib/conversation/provider-observation.ts'),
    { collectReplyStream } = await server.ssrLoadModule(
      '/lib/conversation/stream.ts',
    ),
    { createGeminiChatHandler } = await server.ssrLoadModule(
      '/lib/conversation/gemini-server.ts',
    );
  const meta = {
      promptTokenCount: 100,
      candidatesTokenCount: 20,
      thoughtsTokenCount: 50,
      cachedContentTokenCount: 10,
      totalTokenCount: 170,
      text: 'PRIVATE',
    },
    u = o.readProviderUsage(meta);
  assert.deepEqual(u, {
    input: 100,
    output: 20,
    thinking: 50,
    cached: 10,
    total: 170,
  });
  assert.equal(o.readProviderUsage({ candidatesTokenCount: -1 }).output, null);
  assert.equal(o.readProviderUsage(undefined).thinking, null);
  assert.deepEqual(o.mergeProviderUsage(u, o.readProviderUsage(meta)), u);
  const price = {
    approved: true,
    currency: 'JPY',
    inputPerMillion: 10,
    outputPerMillion: 20,
    thinkingPerMillion: 30,
    cachedPerMillion: 5,
    sourceUrl: 'https://example.org/fixture-only',
    checkedAt: '2026-11-11',
  };
  assert.equal(o.estimateAttempt(u, price).amountYen, 0.00285);
  assert.equal(o.estimateAttempt(u, price).invoiceVerified, false);
  for (const bad of [
    {},
    { ...price, sourceUrl: undefined },
    { ...price, thinkingPerMillion: -1 },
    { ...price, checkedAt: 'bad' },
  ])
    assert.equal(o.estimateAttempt(u, bad).status, 'pricing_not_configured');
  assert.equal(
    o.estimateAttempt(
      o.readProviderUsage({ promptTokenCount: 10, candidatesTokenCount: 1 }),
      price,
    ).status,
    'usage_incomplete',
  );
  const records = [];
  const signal = new AbortController().signal;
  const run = (fn) =>
    p.observeProviderAttempt({
      model: 'gemini-test',
      attempt: 1,
      signal,
      run: fn,
      record: async (v) => records.push(v),
    });
  const reply = await run(async (report) => {
    async function* chunks() {
      yield { text: '{"reply":"少し', usageMetadata: meta };
      yield { text: '話してみよう。","actionId":null}', usageMetadata: meta };
    }
    return collectReplyStream(
      p.observeUsageChunks(chunks(), report),
      () => {},
      () => {},
      signal,
    );
  });
  assert.match(reply, /話して/);
  assert.deepEqual(records[0].usage, u);
  await assert.rejects(
    run(async (report) => {
      report(meta);
      throw Object.assign(new Error('PRIVATE provider failure'), {
        status: 503,
      });
    }),
  );
  assert.equal(records[1].outcome, 'error');
  await assert.rejects(
    run(async (report) => {
      report(meta);
      throw { code: 'SAFETY_BLOCK' };
    }),
  );
  assert.equal(records[2].outcome, 'safety_block');
  assert.ok(!JSON.stringify(records).includes('PRIVATE'));
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    p.observeProviderAttempt({
      model: 'gemini-test',
      attempt: 1,
      signal: abort.signal,
      run: async () => {
        abort.signal.throwIfAborted();
      },
      record: async (v) => records.push(v),
    }),
  );
  assert.equal(records[3].outcome, 'aborted');
  assert.equal(records[3].usage.input, null);
  assert.equal(
    await p.observeProviderAttempt({
      model: 'gemini-test',
      attempt: 1,
      signal,
      run: async () => 'ok',
      record: async () => {
        throw new Error('telemetry unavailable');
      },
    }),
    'ok',
  );
  let generated = 0,
    claimed = 0,
    identity;
  const finish = [];
  const deps = {
    env: { CAMELLIA_GEMINI_CHAT_ENABLED: 'true', GEMINI_API_KEY: 'synthetic' },
    verifyToken: async () => ({ uid: 'VERIFIED' }),
    getTodayMood: async () => undefined,
    limiter: { take: async () => true },
    claimRequest: async (uid, id) => {
      assert.equal(uid, 'VERIFIED');
      assert.ok(o.validAiRequestId(id));
      claimed++;
      return { finish: async (s) => finish.push(s) };
    },
    generate: async (_, __, c) => {
      generated++;
      identity = c.identity;
      return '{"reply":"今日は、どんなことから話そうか。","actionId":null}';
    },
  };
  const requestId = randomUUID(),
    req = {
      method: 'POST',
      headers: { authorization: 'Bearer synthetic' },
      body: { message: '話したい', modelId: 'yura', requestId, uid: 'FORGED' },
    },
    response = () => ({
      setHeader() {},
      status(code) {
        this.code = code;
        return this;
      },
      json(body) {
        this.body = body;
      },
    });
  let res = response();
  await createGeminiChatHandler(deps)(req, res);
  assert.equal(res.code, 200);
  assert.deepEqual(identity, { uid: 'VERIFIED', requestId });
  assert.deepEqual(finish, ['success']);
  for (const invalid of [
    'admin',
    'not-a-uuid',
    {},
    '00000000-0000-0000-0000-000000000000',
  ]) {
    res = response();
    await createGeminiChatHandler(deps)(
      { ...req, body: { ...req.body, requestId: invalid } },
      res,
    );
    assert.equal(res.code, 400);
  }
  assert.equal(generated, 1);
  res = response();
  await createGeminiChatHandler(deps)(
    { ...req, body: { message: '自殺したい', requestId: randomUUID() } },
    res,
  );
  assert.equal(res.body.safety, true);
  assert.equal(claimed, 1);
  res = response();
  await createGeminiChatHandler({
    ...deps,
    claimRequest: async () => {
      throw { code: 'DUPLICATE_REQUEST' };
    },
  })(req, res);
  assert.equal(res.code, 409);
  assert.equal(generated, 1);
  console.log(
    'PASS runtime numeric metadata, cumulative stream counters, thinking/cache estimates, incomplete/invalid pricing, failed/safety/aborted attempts, observation failure leaves Free usable, verified request identity, invalid and duplicate IDs, urgent safety before reservation. Provider response is injected, not live Gemini.',
  );
} finally {
  await server.close();
}
