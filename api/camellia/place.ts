import { adminConfigured, serverAdmin } from '../../lib/server/admin.js';
import { PlaceError, PlaceService } from '../../lib/place/service.js';
type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type Response = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};
export default async function place(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const enabled =
    process.env.CAMELLIA_PLACE_ENABLED === 'true' && adminConfigured();
  if (req.method === 'GET' && req.query?.status === '1')
    return res.status(200).json({ enabled });
  if (!enabled) return res.status(503).json({ error: 'PLACE_UNAVAILABLE' });
  if (!['GET', 'POST'].includes(req.method ?? ''))
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const { db, auth } = serverAdmin();
    const service = new PlaceService(db);
    const operatorRequest =
      req.method === 'POST' ||
      req.query?.operator === '1' ||
      req.query?.operatorStatus === '1' ||
      req.query?.saved === '1';
    let identity;
    if (operatorRequest || req.headers.authorization) {
      const header = req.headers.authorization,
        token =
          typeof header === 'string' && header.startsWith('Bearer ')
            ? header.slice(7)
            : '';
      if (!token) return res.status(401).json({ error: 'LOGIN_REQUIRED' });
      let decoded;
      try {
        decoded = await auth.verifyIdToken(token, true);
      } catch {
        return res.status(401).json({ error: 'LOGIN_REQUIRED' });
      }
      identity = {
        uid: decoded.uid,
        operator:
          decoded.firebase?.sign_in_provider !== 'anonymous' &&
          (decoded.camelliaPlaceOperator === true ||
            decoded.camelliaAdmin === true),
      };
      if (decoded.firebase?.sign_in_provider === 'anonymous' && operatorRequest)
        return res.status(403).json({ error: 'LOGIN_REQUIRED' });
      if (req.query?.operatorStatus === '1')
        return res.status(200).json({ operator: identity.operator });
    }
    const cursor =
      typeof req.query?.cursor === 'string' ? req.query.cursor : undefined;
    const slug =
      typeof req.query?.slug === 'string' ? req.query.slug : undefined;
    if (req.method === 'GET') {
      if (req.query?.saved === '1')
        return res.status(200).json(await service.saved(identity!.uid, cursor));
      const operator = req.query?.operator === '1' ? identity : undefined;
      if (slug) {
        const place = await service.detail(slug, operator);
        return res
          .status(200)
          .json({
            place: (await service.withSaved([place], identity?.uid))[0],
          });
      }
      const list = await service.list(cursor, operator);
      return res
        .status(200)
        .json({
          ...list,
          places: await service.withSaved(list.places, identity?.uid),
        });
    }
    const body =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
    if (Buffer.byteLength(JSON.stringify(body)) > 12000)
      throw new PlaceError(413, 'INVALID_PLACE');
    if (body.operation === 'bookmark')
      return res
        .status(200)
        .json(await service.bookmark(identity!.uid, body.slug, body.saved));
    return res
      .status(200)
      .json(await service.change(identity!, body.operation, body));
  } catch (error) {
    if (error instanceof PlaceError)
      return res.status(error.status).json({ error: error.code });
    console.error('camellia_place_failed', { category: 'storage_or_server' });
    return res.status(503).json({ error: 'PLACE_UNAVAILABLE' });
  }
}
