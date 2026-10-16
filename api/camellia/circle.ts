import {
  adminConfigured,
  adminInitializationStatus,
  serverAdmin,
} from '../../lib/server/admin.js';
import { CircleError, CircleService } from '../../lib/circle/service.js';

type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};
type Response = {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => { json: (value: unknown) => void };
};
export default async function circle(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const configurationStatus =
    process.env.CAMELLIA_CIRCLE_ENABLED !== 'true'
      ? 'disabled'
      : !adminConfigured()
        ? 'storage_not_configured'
        : (process.env.CAMELLIA_CIRCLE_SIGNING_SECRET?.length ?? 0) < 32
          ? 'signing_not_configured'
          : 'ready';
  const enabled = configurationStatus === 'ready';
  if (req.method === 'GET' && req.query?.status === '1')
    // Configuration labels only: never return secret values, identities or SDK errors.
    return res.status(200).json({
      enabled,
      configurationStatus,
      ...(enabled ? { storageStatus: adminInitializationStatus() } : {}),
    });
  if (!enabled) return res.status(503).json({ error: 'COMMUNITY_UNAVAILABLE' });
  if (req.method !== 'GET' && req.method !== 'POST')
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const header = req.headers.authorization;
  const token =
    typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7)
      : '';
  if (!token) return res.status(401).json({ error: 'LOGIN_REQUIRED' });
  try {
    const { auth, db } = serverAdmin();
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token, true);
    } catch {
      return res.status(401).json({ error: 'LOGIN_REQUIRED' });
    }
    if (decoded.firebase?.sign_in_provider === 'anonymous')
      return res.status(403).json({ error: 'LOGIN_REQUIRED' });
    const profile = await db.doc(`camellia_users/${decoded.uid}`).get();
    if (!profile.exists || !profile.data()?.agreedAt)
      return res.status(403).json({ error: 'PROFILE_REQUIRED' });
    const identity = {
      uid: decoded.uid,
      moderator:
        decoded.camelliaModerator === true || decoded.camelliaAdmin === true,
    };
    const service = new CircleService(
      db,
      process.env.CAMELLIA_CIRCLE_SIGNING_SECRET!,
    );
    if (req.method === 'GET') {
      const cursor =
        typeof req.query?.cursor === 'string' ? req.query.cursor : undefined;
      if (req.query?.audit === '1')
        return res
          .status(200)
          .json(await service.moderationHistory(identity, cursor));
      if (req.query?.own === '1')
        return res
          .status(200)
          .json(
            await service.ownPage(
              identity,
              req.query?.kind === 'comment' ? 'comment' : 'post',
              cursor,
            ),
          );
      if (req.query?.blocks === '1')
        return res.status(200).json({ blocks: await service.blocks(identity) });
      if (req.query?.moderation === '1') {
        const reports = await service.moderation(identity, undefined, cursor);
        return res.status(200).json({
          reports,
          nextReportCursor: Array.isArray(reports)
            ? reports[0]?.nextCursor
            : undefined,
        });
      }
      const id =
        typeof req.query?.circle === 'string' ? req.query.circle : undefined;
      if (!id)
        return res.status(200).json({
          circles: await service.list(identity),
          moderator: identity.moderator,
        });
      const post =
        typeof req.query?.post === 'string' ? req.query.post : undefined;
      if (post && !/^[\w-]{1,160}$/.test(post))
        throw new CircleError(400, 'INVALID_INPUT');
      return res
        .status(200)
        .json(await service.feed(identity, id, post, cursor));
    }
    const body =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
    if (Buffer.byteLength(JSON.stringify(body)) > 5000)
      throw new CircleError(413, 'INVALID_INPUT');
    const id =
      typeof body.id === 'string' && /^[\w-]{1,160}$/.test(body.id)
        ? body.id
        : '';
    const circleId = typeof body.circleId === 'string' ? body.circleId : '';
    const kind = body.kind === 'comment' ? 'comment' : 'post';
    let result;
    switch (body.operation) {
      case 'join':
        result = await service.join(identity, circleId, body);
        break;
      case 'leave':
        result = await service.leave(identity, circleId);
        break;
      case 'post':
        result = await service.write(identity, circleId, { text: body.text });
        break;
      case 'comment':
        if (typeof body.postId !== 'string')
          throw new CircleError(400, 'INVALID_INPUT');
        result = await service.write(identity, circleId, body);
        break;
      case 'edit':
      case 'delete':
        if (!id) throw new CircleError(400, 'INVALID_INPUT');
        result = await service.change(identity, kind, id, body.operation, body);
        break;
      case 'report':
        if (!id) throw new CircleError(400, 'INVALID_INPUT');
        result = await service.report(identity, kind, id, body.reason);
        break;
      case 'react':
        if (!id) throw new CircleError(400, 'INVALID_INPUT');
        result = await service.react(identity, kind, id, body.reaction);
        break;
      case 'block':
        result = await service.block(
          identity,
          typeof body.authorId === 'string' ? body.authorId : '',
          body.remove === true,
        );
        break;
      case 'moderate':
        result = await service.moderation(identity, body);
        break;
      default:
        throw new CircleError(400, 'INVALID_INPUT');
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof CircleError)
      return res.status(error.status).json({ error: error.code });
    console.error('camellia_circle_failed', { category: 'storage_or_server' });
    return res.status(503).json({ error: 'COMMUNITY_UNAVAILABLE' });
  }
}
