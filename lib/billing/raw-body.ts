/** Stripe signs exact incoming bytes. Parsed JSON must never be serialized and treated as the original. */
export async function rawBillingBody(req: { body?: unknown; rawBody?: unknown; [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array> }): Promise<Uint8Array> {
  const direct = req.rawBody ?? req.body;
  if (direct !== undefined && direct !== null) {
    if (!(direct instanceof Uint8Array) || direct.byteLength > 64000) throw new Error('RAW_BODY_REQUIRED');
    return direct;
  }
  if (!req[Symbol.asyncIterator]) throw new Error('RAW_BODY_REQUIRED');
  const chunks: Uint8Array[] = []; let length = 0;
  for await (const chunk of req as AsyncIterable<Uint8Array>) {
    if (!(chunk instanceof Uint8Array) || (length += chunk.byteLength) > 64000) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
