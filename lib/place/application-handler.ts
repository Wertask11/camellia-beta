import{serverAdmin,adminConfigured}from'../server/admin.js';
import{createSharedRateLimiter}from'../server/shared-limit.js';
import{PlaceApplicationService,applicationIntakeReady,ApplicationError}from'./applications.js';
type Req={method?:string;headers:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>;body?:unknown};type Res={setHeader:(n:string,v:string)=>void;status:(n:number)=>{json:(v:unknown)=>void}};
export default async function applications(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 if(req.method==='GET'&&req.query?.status==='1'){
  let enabled=false;if(adminConfigured()&&process.env.CAMELLIA_PLACE_APPLICATIONS_ENABLED==='true'){try{enabled=await applicationIntakeReady(serverAdmin().db);}catch{/* No private details in readiness. */}}return res.status(200).json({enabled});
 }
 if(!adminConfigured())return res.status(503).json({error:'INTAKE_NOT_READY'});
 try{
  const deps=serverAdmin(),header=req.headers.authorization;if(typeof header!=='string'||!header.startsWith('Bearer '))return res.status(401).json({error:'LOGIN_REQUIRED'});
  let decoded;try{decoded=await deps.auth.verifyIdToken(header.slice(7),true);}catch{return res.status(401).json({error:'LOGIN_REQUIRED'});}
  if(decoded.firebase?.sign_in_provider==='anonymous'||decoded.firebase?.sign_in_provider==='password'&&decoded.email_verified!==true)return res.status(401).json({error:'LOGIN_REQUIRED'});
  const account=await deps.auth.getUser(decoded.uid),actor={uid:decoded.uid,identityCreatedAt:account.metadata.creationTime,operator:decoded.camelliaAdmin===true||decoded.camelliaPlaceOperator===true},service=new PlaceApplicationService(deps.db,deps.auth);
  if(req.method==='GET'&&req.query?.review==='1'&&(await deps.db.doc(`camellia_users/${actor.uid}/admin/access`).get()).data()?.suspended===true)return res.status(403).json({error:'SUSPENDED'});
  if(req.method==='GET')return res.status(200).json(await service.list(actor,req.query?.review==='1',typeof req.query?.state==='string'?req.query.state:'submitted',typeof req.query?.after==='string'?req.query.after:undefined));
  const v=req.body as Record<string,unknown>|undefined;
  if(req.method!=='POST'||!v||typeof v!=='object'||Array.isArray(v)||Buffer.byteLength(JSON.stringify(v))>8000||Object.keys(v).some(k=>!['operation','requestId','fields','id','expectedRevision','slug'].includes(k)))return res.status(400).json({error:'INVALID_APPLICATION'});
  const access=await deps.db.doc(`camellia_users/${actor.uid}/admin/access`).get();if(v.operation!=='withdraw'&&access.data()?.suspended===true)return res.status(403).json({error:'SUSPENDED'});
  if(!await createSharedRateLimiter(deps.db,{},Date.now,'place_application_rate_windows').take(actor.uid))return res.status(429).json({error:'SLOW_DOWN'});
  if(v.operation==='submit')return res.status(200).json({application:await service.submit(actor,v.requestId,v.fields)});
  return res.status(200).json({application:await service.change(actor,v.id,v.expectedRevision,v.operation,v.slug)});
 }catch(e){return res.status(e instanceof ApplicationError?e.status:503).json({error:e instanceof ApplicationError?e.code:'APPLICATION_UNAVAILABLE'});}
}
