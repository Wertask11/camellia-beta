import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
} from '@google/genai';
import {
  createGeminiChatHandler,
  getTodayJstDate,
  normalizeMoodForPrompt,
  verifyFirebaseIdToken,
} from './gemini-server.js';

import { CONVERSATION_RESPONSE_SCHEMA } from './action-bridge.js';
import { adminConfigured, serverAdmin } from '../server/admin.js';
import { createSharedRateLimiter } from '../server/shared-limit.js';
import { getSafeTodayContext } from './today-server.js';
import { createModelCooldown, generateWithModelRecovery } from './provider-recovery.js';

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

const PROJECT_ID = 'emusch-2a111';
const modelCooldown = createModelCooldown();

async function getTodayMood(uid: string, token: string) {
  const date = getTodayJstDate();
  const path = `projects/${PROJECT_ID}/databases/(default)/documents/camellia_users/${encodeURIComponent(uid)}/daily/${date}`;
  const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return undefined;
  const document = await response.json() as { fields?: { mood?: { stringValue?: unknown } } };
  return normalizeMoodForPrompt(document.fields?.mood?.stringValue);
}

const handler = createGeminiChatHandler({
  env: process.env,
  rateLimitMode:adminConfigured()?'firestore':process.env.CAMELLIA_SHARED_RATE_LIMIT_REQUIRED==='true'?'unavailable':'instance',
  verifyToken: (token) => verifyFirebaseIdToken(token, { projectId: PROJECT_ID }),
  getTodayMood,
  getTodayContext: getSafeTodayContext,
  ...(adminConfigured() ? {limiter:{take:(uid:string)=>createSharedRateLimiter(serverAdmin().db).take(uid)}} : process.env.CAMELLIA_SHARED_RATE_LIMIT_REQUIRED === 'true' ? {limiter:{take:async()=>{throw new Error('SHARED_LIMIT_UNAVAILABLE');}}} : {}),
  generate: async (contents, systemInstruction) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
    const ai = new GoogleGenAI({ apiKey, httpOptions: { retryOptions: { attempts: 1 } } });
    let response;
    try {
      response = await generateWithModelRecovery({
      ...modelCooldown.select(process.env.GEMINI_MODEL || 'gemini-3.8-flash', process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.1-flash-lite'),
      signal: AbortSignal.timeout(28_000),
      onFailure: (metadata) => { modelCooldown.failed(metadata); console.warn('camellia_provider_attempt_failed', metadata); },
      request: async (model, signal) => {
      const result = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseJsonSchema: CONVERSATION_RESPONSE_SCHEMA,
        // This limit includes internal thinking; 256 can yield no visible text.
        maxOutputTokens: model.includes('flash-lite') ? 512 : 2048,
        thinkingConfig: { thinkingLevel: model.includes('flash-lite') ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW },
        automaticContinuation: false,
        abortSignal: signal,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      },
    });
      modelCooldown.succeeded(model);
      return result;
    },
    });
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : undefined;
      // Do not log the SDK message, request, response, key, or user identity.
      console.error('camellia_generation_failed', { stage: 'provider_request', status });
      throw error;
    }
    const text = response.text?.trim() || '';
    if (!text) {
      console.error('camellia_generation_failed', { stage: 'empty_output', finishReason: response.candidates?.[0]?.finishReason, blockReason: response.promptFeedback?.blockReason });
    }
    if(!text)throw Object.assign(new Error('GENERATION_EMPTY'),{code:response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason==='SAFETY' ? 'SAFETY_BLOCK':'INVALID_RESPONSE'});
    return text;
  },
});

export default function chat(request: ApiRequest, response: ApiResponse) {
  return handler(request, response);
}
