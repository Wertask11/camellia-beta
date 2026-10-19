import { chatServerStatus, isGeminiEnabled } from '../../lib/conversation/gemini-server.js';
type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type Response = {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => { json: (value: unknown) => void };
};
/** The public status probe must not initialize optional SDK/storage dependencies. */
export default async function chat(request: Request, response: Response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  const enabled = isGeminiEnabled(process.env);
  if (request.method === 'GET')
    return response.status(200).json({
      enabled,
      dataPolicy: ['free', 'paid'].includes(
        process.env.GEMINI_DATA_POLICY ?? '',
      )
        ? process.env.GEMINI_DATA_POLICY
        : 'unknown',
      ...chatServerStatus(process.env),
    });
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }
  if (!enabled)
    return response
      .status(503)
      .json({ error: 'disabled', category: 'disabled' });
  let initialized = false;
  try {
    const runtime = await import('../../lib/conversation/gemini-runtime.js');
    initialized = true;
    return await runtime.default(request, response);
  } catch (error) {
    // Never log request/SDK messages: they may contain user content or secrets.
    const code =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : 'UNKNOWN';
    console.error('camellia_generation_failed', {
      stage: initialized ? 'runtime_handler' : 'runtime_initialization',
      code,
    });
    return response
      .status(503)
      .json({ error: 'temporarily_unavailable', category: 'provider_error' });
  }
}
