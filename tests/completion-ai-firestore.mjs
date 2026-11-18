import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'vite';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085');
const app = initializeApp({ projectId: 'demo-camellia' }, 'completion-ai'),
  db = getFirestore(app),
  root = 'camellia_admin/release_phase1',
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    ssr: { noExternal: ['@google/genai'] },
    plugins: [
      {
        name: 'local-runtime-fixture',
        enforce: 'pre',
        resolveId(source, importer) {
          if (source === '@google/genai') return '\0local-genai';
          if (/server\/admin(?:\.js|\.ts)?$/.test(source) && importer)
            return '\0local-admin';
        },
        load(id) {
          if (id === '\0local-genai')
            return `export class GoogleGenAI {models=globalThis.__completionSdk;} export const HarmBlockThreshold={BLOCK_MEDIUM_AND_ABOVE:'fixture'},HarmCategory={},ThinkingLevel={MINIMAL:'fixture',LOW:'fixture'};`;
          if (id === '\0local-admin')
            return `export const SERVER_ROOT='camellia_admin/release_phase1';export const adminConfigured=()=>false;export const serverAdmin=()=>globalThis.__completionAdmin;`;
        },
      },
    ],
    server: { middlewareMode: true, hmr: false },
  });
try {
  const o = await server.ssrLoadModule('/lib/server/ai-observation.ts'),
    uid = 'LOCAL-AI-USER',
    id = randomUUID();
  const claims = await Promise.allSettled(
    Array.from({ length: 5 }, () => o.claimAiRequest(db, uid, id)),
  );
  assert.equal(claims.filter((v) => v.status === 'fulfilled').length, 1);
  const lease = claims.find((v) => v.status === 'fulfilled').value;
  await lease.finish('success');
  await assert.rejects(o.claimAiRequest(db, uid, id), /DUPLICATE/);
  await o.claimAiRequest(db, 'ANOTHER-OWNER', id);
  const usage = o.readProviderUsage({
      promptTokenCount: 100,
      candidatesTokenCount: 20,
      thoughtsTokenCount: 10,
      cachedContentTokenCount: 0,
      totalTokenCount: 130,
    }),
    value = {
      model: 'gemini-completion-observation',
      attempt: 1,
      outcome: 'error',
      durationMs: 25,
      usage,
      text: 'PRIVATE',
    };
  assert.equal(
    (await o.recordProviderAttempt(db, uid, id, value)).reason,
    'observation_not_approved',
  );
  const config = {
    approved: true,
    approvedBy: 'LOCAL-OPERATOR',
    approvedAt: new Date().toISOString(),
    retentionMs: 1000,
    pricing: {
      'gemini-completion-observation': {
        approved: true,
        currency: 'JPY',
        inputPerMillion: 1,
        outputPerMillion: 2,
        thinkingPerMillion: 3,
        cachedPerMillion: 0,
        sourceUrl: 'https://example.org/fixture',
        checkedAt: '2026-11-11',
      },
    },
  };
  await db.doc(`${root}/config/ai_observation`).set(config);
  const out = await Promise.all(
    Array.from({ length: 5 }, () =>
      o.recordProviderAttempt(db, uid, id, value),
    ),
  );
  assert.equal(out.filter((v) => v.recorded).length, 1);
  await o.recordProviderAttempt(db, uid, id, {
    ...value,
    attempt: 2,
    outcome: 'success',
    usage: o.readProviderUsage(undefined),
  });
  const attempts = await db
    .collection(`${root}/ai_usage_receipts`)
    .where('model', '==', 'gemini-completion-observation')
    .get();
  assert.equal(attempts.size, 2);
  assert.ok(
    !JSON.stringify(attempts.docs.map((x) => x.data())).includes('PRIVATE'),
  );
  assert.ok(!JSON.stringify(attempts.docs.map((x) => x.data())).includes(uid));
  const day = await db.collection(`${root}/ai_attempt_days`).get();
  assert.equal(day.size, 1);
  assert.equal(day.docs[0].data().attempts, 2);
  assert.equal(day.docs[0].data().thinkingTokens, 10);
  assert.equal(day.docs[0].data().incomplete, 1);
  assert.equal(day.docs[0].data().invoiceVerified, false);
  // Call the actual runtime generator, with SDK response fixtures and the real emulator ledger.
  globalThis.__completionAdmin = { db };
  process.env.GEMINI_API_KEY = 'LOCAL-SYNTHETIC-KEY';
  process.env.GEMINI_MODEL = 'gemini-test-primary';
  process.env.GEMINI_FALLBACK_MODEL = 'gemini-test-fallback';
  globalThis.__completionSdk = {
    generateContent: async (params) => {
      if (params.model === 'gemini-test-primary') throw { status: 503 };
      return {
        text: '{"reply":"少しずつ話してみよう。","actionId":null}',
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 20,
          thoughtsTokenCount: 10,
          cachedContentTokenCount: 0,
          totalTokenCount: 130,
        },
      };
    },
    generateContentStream: async function* () {
      yield {
        text: '{"reply":"少し',
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 10,
          thoughtsTokenCount: 10,
          cachedContentTokenCount: 0,
          totalTokenCount: 120,
        },
      };
      yield {
        text: 'ずつ話してみよう。","actionId":null}',
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 20,
          thoughtsTokenCount: 10,
          cachedContentTokenCount: 0,
          totalTokenCount: 130,
        },
      };
    },
  };
  const runtime = await server.ssrLoadModule(
      '/lib/conversation/gemini-runtime.ts',
    ),
    signal = new AbortController().signal;
  await runtime.generate(
    [],
    'LOCAL SYSTEM FIXTURE',
    {
      identity: { uid, requestId: randomUUID() },
      signal,
      onText() {},
      onFirstChunk() {},
    },
    false,
  );
  let preview = '';
  await runtime.generate(
    [],
    'LOCAL SYSTEM FIXTURE',
    {
      identity: { uid, requestId: randomUUID() },
      signal,
      onText(t) {
        preview = t;
      },
      onFirstChunk() {},
    },
    true,
  );
  assert.equal(preview, '少しずつ話してみよう。');
  const actual = await db.collection(`${root}/ai_usage_receipts`).get(),
    runtimeRecords = actual.docs
      .map((d) => d.data())
      .filter((v) => v.model.startsWith('gemini-test-'));
  assert.equal(runtimeRecords.length, 3);
  assert.equal(
    runtimeRecords.find((v) => v.model === 'gemini-test-primary').outcome,
    'error',
  );
  assert.equal(
    runtimeRecords.filter((v) => v.model === 'gemini-test-fallback').length,
    2,
  );
  assert.equal(
    runtimeRecords
      .filter((v) => v.model === 'gemini-test-fallback')
      .reduce((sum, v) => sum + v.usage.input, 0),
    200,
  );
  delete globalThis.__completionAdmin;
  delete globalThis.__completionSdk;
  const { prepareTrialGeneration } = await server.ssrLoadModule(
      '/lib/referral/ai-runtime.ts',
    ),
    { referralHash } = await server.ssrLoadModule('/lib/referral/identity.ts'),
    { ReferralService } = await server.ssrLoadModule(
      '/lib/referral/service.ts',
    ),
    auth = { getUser: async () => ({}) },
    trialUser = 'LOCAL-TRIAL',
    grant = db.doc(`${root}/referral_grants/${referralHash(trialUser)}`),
    trialService = new ReferralService(db, auth);
  await grant.set({
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    revoked: false,
    aiUsed: 0,
    aiLimit: 3,
    aiReservedYen: 0,
    reservedYen: 10,
  });
  const options = {
    db,
    auth,
    uid: trialUser,
    requestId: randomUUID(),
    models: ['gemini-completion-observation'],
    countInput: async () => 100,
  };
  await assert.rejects(prepareTrialGeneration(options), /NOT_CONFIGURED/);
  assert.equal((await grant.get()).data().aiUsed, 0);
  await db
    .doc(`${root}/config/ai_observation`)
    .set({
      ...config,
      trialGenerationApproved: true,
      maxTrialInputTokens: 1000,
    });
  const cancelled = await prepareTrialGeneration(options);
  await cancelled.finish();
  await cancelled.finish();
  assert.equal((await grant.get()).data().aiUsed, 0);
  assert.equal((await grant.get()).data().aiReservedYen, 0);
  await assert.rejects(prepareTrialGeneration(options), /DUPLICATE/);
  const chargedId = randomUUID(),
    charged = await prepareTrialGeneration({
      ...options,
      requestId: chargedId,
    });
  await charged.beforeDispatch();
  charged.observe({ ...value, text: undefined });
  await charged.finish();
  await charged.finish();
  assert.equal((await grant.get()).data().aiUsed, 1);
  await assert.rejects(
    trialService.releaseTrialAi(trialUser, chargedId),
    /ALREADY_DISPATCHED/,
  );
  const receipt = await db
    .doc(
      `${root}/referral_ai_reservations/${referralHash(`${trialUser}:${chargedId}`)}`,
    )
    .get();
  assert.equal(receipt.data().costBasis, 'provider_token_estimate');
  assert.equal(receipt.data().invoiceVerified, false);
  assert.equal(receipt.data().actualCostYen, undefined);
  const unknown = await prepareTrialGeneration({
    ...options,
    requestId: randomUUID(),
  });
  await unknown.beforeDispatch();
  unknown.observe({ ...value, usage: o.readProviderUsage(undefined) });
  await unknown.finish();
  assert.equal((await grant.get()).data().costReviewRequired, true);
  await assert.rejects(prepareTrialGeneration({...options,requestId:randomUUID()}), /TRIAL_COST_REVIEW_REQUIRED/);
  await grant.update({ revoked: true });
  await assert.rejects(unknown.beforeDispatch(), /TRIAL_EXPIRED/);
  await assert.rejects(
    prepareTrialGeneration({ ...options, requestId: randomUUID() }),
    /TRIAL_EXPIRED/,
  );
  console.log(
    'PASS dedicated trial runtime: absent settings stop, real token-count boundary, atomic reserve, no-dispatch idempotent return, no replay, dispatch, estimated settlement, no refund of possible provider work, unknown cost hold, emergency revocation. All money/quotas are local fixtures.',
  );
  console.log(
    'PASS concurrent request/attempt dedup, cross-owner separation, finished replay denied, approved-only storage, failed+fallback attempts, thinking tokens, unknown usage and estimate/invoice distinction. Local emulator, no real billing.',
  );
} finally {
  await server.close();
  await db.terminate();
  await deleteApp(app);
}
