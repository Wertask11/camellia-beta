import {serverAdmin,adminConfigured} from '../../lib/server/admin.js';
import {requireEligibleUser,EligibilityError} from '../../lib/server/eligibility.js';
import {createSharedRateLimiter} from '../../lib/server/shared-limit.js';
import {PartnerShareService,ShareError,shareHash} from '../../lib/partner/service.js';
import {COMMERCE_PREVIEW_ONLY} from '../../lib/membership/model.js';
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={setHeader:(name:string,value:string)=>void;status:(code:number)=>{json:(body:unknown)=>void}};
export default async function share(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 const body=req.body&&typeof req.body==='object'&&!Array.isArray(req.body)?req.body as Record<string,unknown>:{};
 if(Buffer.byteLength(JSON.stringify(body))>4000)return res.status(413).json({error:'INVALID_SHARE'});
 if(COMMERCE_PREVIEW_ONLY&&body.operation==='create')return res.status(503).json({error:'BILLING_NOT_READY'});
 if(COMMERCE_PREVIEW_ONLY&&body.operation==='read')return res.status(404).json({error:'SHARE_NOT_FOUND'});
 if(!adminConfigured())return res.status(503).json({error:'SHARE_UNAVAILABLE'});
 try{
  const deps=serverAdmin(),service=new PartnerShareService(deps.db);
  const limit=createSharedRateLimiter(deps.db,{CAMELLIA_CHAT_RATE_USER:'100',CAMELLIA_CHAT_RATE_GLOBAL:'3000',CAMELLIA_CHAT_RATE_WINDOW_SECONDS:'300'},Date.now,'partner_rate_windows');
  if(body.operation==='read'){
   if(typeof body.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.token))return res.status(404).json({error:'SHARE_NOT_FOUND'});
   if(!await limit.take(`read:${shareHash(body.token)}`))return res.status(429).json({error:'SHARE_LIMIT'});
   return res.status(200).json({share:await service.read(body.token)});
  }
  const header=req.headers.authorization,token=typeof header==='string'&&header.startsWith('Bearer ')?header.slice(7):'';
  if(!token)return res.status(401).json({error:'LOGIN_REQUIRED'});
  let user;
  // Owners can revoke after expiry, suspension or personal deletion. Creation remains eligibility-gated.
  if(['revoke','revokeAll','list'].includes(String(body.operation))){try{user=await deps.auth.verifyIdToken(token,true);}catch{return res.status(401).json({error:'LOGIN_REQUIRED'});}if(user.firebase?.sign_in_provider==='anonymous')return res.status(401).json({error:'LOGIN_REQUIRED'});}
  else user=await requireEligibleUser(token,deps);
  if(!await limit.take(`owner:${user.uid}`))return res.status(429).json({error:'SHARE_LIMIT'});
  if(body.operation==='list')return res.status(200).json({shares:await service.list(user.uid)});
  if(body.operation==='revoke'){await service.revoke(user.uid,body.id);return res.status(200).json({ok:true});}
  if(body.operation==='revokeAll'){await service.revokeAll(user.uid);return res.status(200).json({ok:true});}
  // Explicit launch policy: only previews until payment setup and a separately reviewed release.
  if(body.operation==='create')return res.status(503).json({error:'BILLING_NOT_READY'});
  return res.status(400).json({error:'INVALID_SHARE'});
 }catch(e){
  if(e instanceof ShareError||e instanceof EligibilityError)return res.status(e.status).json({error:e.code});
  console.error('camellia_partner_share_failed',{category:'storage_or_server'});return res.status(503).json({error:'SHARE_UNAVAILABLE'});
 }
}
