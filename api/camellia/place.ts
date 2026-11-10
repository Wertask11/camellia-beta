import {managedPlaceSlugs} from '../../lib/place/operator.js';
import {recordPlaceMetric,placeMetricSummary,acceptFreePilot} from '../../lib/place/metrics.js';
import {createSharedRateLimiter} from '../../lib/server/shared-limit.js';
import {CircleService,CircleError} from '../../lib/circle/service.js';
import { adminConfigured, serverAdmin } from '../../lib/server/admin.js';
import { PlaceError, PlaceService } from '../../lib/place/service.js';
import {requireEligibleUser,EligibilityError} from '../../lib/server/eligibility.js';
import {memberStatus} from '../../lib/membership/server.js';
import {rankPlaces,type PlaceIntent} from '../../lib/place/recommendation.js';
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
  const publicFlag=process.env.CAMELLIA_PLACE_ENABLED==='true';
  const operation=req.body&&typeof req.body==='object'&&!Array.isArray(req.body)?(req.body as Record<string,unknown>).operation:undefined;
  const management=req.query?.operator==='1'||req.query?.operatorStatus==='1'||req.query?.metrics!==undefined||req.method==='POST'&&typeof operation==='string'&&['save','submit','publish','suspend','acceptFreePilot','requestPaidOption','verifyVisit','merchantEvent','merchantEventEdit','merchantEventDelete'].includes(operation);
  if(!adminConfigured()||!publicFlag&&!management)return res.status(503).json({error:'PLACE_UNAVAILABLE'});
  if (!['GET', 'POST'].includes(req.method ?? ''))
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const { db, auth } = serverAdmin();
    const service = new PlaceService(db);
    const incoming=req.body&&typeof req.body==='object'&&!Array.isArray(req.body)?req.body as Record<string,unknown>:{};
    if(Buffer.byteLength(JSON.stringify(incoming))>12000)throw new PlaceError(413,'INVALID_PLACE');
    if(req.method==='POST'&&incoming.operation==='metric'){
      const limit=createSharedRateLimiter(db,{CAMELLIA_CHAT_RATE_USER:'120',CAMELLIA_CHAT_RATE_GLOBAL:'6000',CAMELLIA_CHAT_RATE_WINDOW_SECONDS:'300'},Date.now,'place_rate_windows');const forwarded=req.headers['x-vercel-forwarded-for'];const actor=typeof forwarded==='string'?forwarded.split(',')[0].trim():'public-metrics';
      if(!await limit.take(actor))throw new PlaceError(429,'SLOW_DOWN');return res.status(200).json(await recordPlaceMetric(db,incoming));
    }
    const operatorRequest =
      req.method === 'POST' ||
      req.query?.operator === '1' ||
      req.query?.operatorStatus === '1' ||
      req.query?.saved === '1' || req.query?.metrics!==undefined;
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
      const access=await db.doc(`camellia_users/${decoded.uid}/admin/access`).get();
      if(access.data()?.suspended===true)return res.status(403).json({error:'SUSPENDED'});
      const slugs=decoded.firebase?.sign_in_provider==='anonymous'?[]:await managedPlaceSlugs(db,decoded.uid);
      identity = {
        uid: decoded.uid,managedSlugs:slugs,
        operator:
          decoded.firebase?.sign_in_provider !== 'anonymous' &&
          (decoded.camelliaPlaceOperator === true ||
            decoded.camelliaAdmin === true),
      };
      if (decoded.firebase?.sign_in_provider === 'anonymous' && operatorRequest)
        return res.status(403).json({ error: 'LOGIN_REQUIRED' });
      if (req.query?.operatorStatus === '1')
        return res.status(200).json({ operator: identity.operator||slugs.length>0,canPublish:identity.operator });
    }
    if(req.method==='GET'&&req.query?.metrics!==undefined){if(!identity)throw new PlaceError(401,'LOGIN_REQUIRED');return res.status(200).json(await placeMetricSummary(db,identity,req.query.metrics));}
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
    if(body.operation==='acceptFreePilot')return res.status(200).json(await acceptFreePilot(db,identity!,body.slug,body.agrees));
    if(body.operation==='requestPaidOption'||body.operation==='verifyVisit')throw new PlaceError(503,'SERVICE_NOT_OFFERED');
    if(body.operation==='merchantEventEdit'||body.operation==='merchantEventDelete'){
      if(!identity?.managedSlugs?.length||typeof body.id!=='string'||!/^[-\w]{1,160}$/.test(body.id)||!process.env.CAMELLIA_CIRCLE_SIGNING_SECRET)throw new PlaceError(403,'OPERATOR_REQUIRED');
      const circle=new CircleService(db,process.env.CAMELLIA_CIRCLE_SIGNING_SECRET);return res.status(200).json(await circle.change({uid:identity.uid,moderator:false,merchantEndpoint:true},'post',body.id,body.operation==='merchantEventEdit'?'edit':'delete',{text:body.text,event:body.event}));
    }
    if(body.operation==='merchantEvent'){
      if(!identity?.managedSlugs?.length)throw new PlaceError(403,'OPERATOR_REQUIRED');
      if(!process.env.CAMELLIA_CIRCLE_SIGNING_SECRET||process.env.CAMELLIA_CIRCLE_ENABLED!=='true'||process.env.CAMELLIA_CIRCLE_PLACE_LINKS_ENABLED!=='true')throw new PlaceError(503,'SERVICE_NOT_OFFERED');
      const circle=new CircleService(db,process.env.CAMELLIA_CIRCLE_SIGNING_SECRET);return res.status(200).json(await circle.write({uid:identity.uid,moderator:false,merchantEndpoint:true},typeof body.circleId==='string'?body.circleId:'',{text:body.text,placeSlug:body.slug,event:body.event}));
    }
    if(body.operation==='recommendation'){
      if(Object.keys(body).some(k=>!['operation','intents','area','compareSlugs'].includes(k))||!Array.isArray(body.intents)||body.intents.length>3||body.intents.some(x=>!['quiet','rest','try','move','together'].includes(String(x)))||body.area!==undefined&&(typeof body.area!=='string'||body.area.length>40))throw new PlaceError(400,'INVALID_PLACE');
      const header=req.headers.authorization;const user=await requireEligibleUser(typeof header==='string'?header.slice(7):'',{db,auth});
      if((await memberStatus(db,user.uid)).plan!=='plus')return res.status(403).json({error:'PLUS_REQUIRED'});
      if(body.compareSlugs!==undefined){if(!Array.isArray(body.compareSlugs)||body.compareSlugs.length<2||body.compareSlugs.length>3||body.compareSlugs.some(s=>typeof s!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(s)))throw new PlaceError(400,'INVALID_PLACE');const places=await Promise.all((body.compareSlugs as string[]).map(slug=>service.detail(slug)));return res.status(200).json({places:rankPlaces(places,body.intents as PlaceIntent[]),personalized:true});}
      const catalog=[];let cursor: string|undefined;
      for(let page=0;page<3;page++){const result=await service.list(cursor);catalog.push(...result.places);cursor=result.nextCursor;if(!cursor)break;}
      const places=rankPlaces(catalog.filter(p=>!body.area||p.area===body.area),body.intents as PlaceIntent[]).slice(0,12);
      return res.status(200).json({places:await service.withSaved(places,user.uid),personalized:true,catalogComplete:!cursor,nextCursor:cursor});
    }
    if (body.operation === 'bookmark')
      return res
        .status(200)
        .json(await service.bookmark(identity!.uid, body.slug, body.saved));
    return res
      .status(200)
      .json(await service.change(identity!, body.operation, body));
  } catch (error) {
    if(error instanceof CircleError)return res.status(error.status).json({error:error.code});
    if(error instanceof EligibilityError)return res.status(error.status).json({error:error.code});
    if (error instanceof PlaceError)
      return res.status(error.status).json({ error: error.code });
    console.error('camellia_place_failed', { category: 'storage_or_server' });
    return res.status(503).json({ error: 'PLACE_UNAVAILABLE' });
  }
}
