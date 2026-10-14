import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/genai';
import {
  createGeminiChatHandler,
  getTodayJstDate,
  normalizeMoodForPrompt,
  verifyFirebaseIdToken,
} from '@/lib/conversation/gemini-server';

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
  verifyToken: (token) => verifyFirebaseIdToken(token, { projectId: PROJECT_ID }),
  getTodayMood,
  generate: async (contents, systemInstruction) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 256,
        automaticContinuation: false,
        abortSignal: AbortSignal.timeout(18_000),
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      },
    });
    return response.text || '';
  },
});

export default function chat(request: ApiRequest, response: ApiResponse) {
  return handler(request, response);
}
