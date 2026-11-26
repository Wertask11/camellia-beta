import {createHash,randomUUID} from 'node:crypto';
import {serverAdmin} from '../server/admin.js';
import {parseServiceAccountJson} from '../server/credential-json.js';
import {createSharedRateLimiter} from '../server/shared-limit.js';
import {claimAiRequest} from '../server/ai-observation.js';
import {ACCESS_CONFIG_PATH} from '../server/eligibility.js';
import {createGeminiChatHandler,type ChatApiResponse} from '../conversation/gemini-server.js';
import {generate} from '../conversation/gemini-runtime.js';
import {freeIdentity,requireFreeOrigin,takeFreeDaily} from './access.js';
type Request={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Generation=Parameters<typeof createGeminiChatHandler>[0];
export function createFreeChatRuntime(deps:{db:ReturnType<typeof serverAdmin>['db'];secret:string;env:Record<string,string|undefined>;generate:Generation['generate'];generateStream:NonNullable<Generation['generateStream']>}){
return async(request:Request,response:ChatApiResponse,receivedAt=Date.now())=>{
 try{requireFreeOrigin(request.headers);}catch{return response.status(403).json({error:'temporarily_unavailable',category:'invalid_request'});}
 if(!request.body||typeof request.body!=='object'||Array.isArray(request.body)||Buffer.byteLength(JSON.stringify(request.body))>20000)return response.status(400).json({error:'invalid_request',category:'invalid_request'});
 if('usageLane'in request.body&&request.body.usageLane!=='basic')return response.status(400).json({error:'invalid_request',category:'invalid_request'});
 const access=(await deps.db.doc(ACCESS_CONFIG_PATH).get()).data(),control=(await deps.db.doc('camellia_admin/release_phase1/config/free_chat').get()).data();
 if(access?.inviteRequired===true||control?.enabled===false)return response.status(503).json({error:'disabled',category:'disabled'});
 const requestId=(request.body as Record<string,unknown>).requestId,quotaRequestId=typeof requestId==='string'?requestId:randomUUID();
 const identity=freeIdentity(request.headers,deps.secret);if(identity.cookie)response.setHeader('Set-Cookie',identity.cookie);
 const handler=createGeminiChatHandler({env:deps.env,rateLimitMode:'firestore',verifyToken:async()=>({uid:identity.uid}),
  getTodayMood:async()=>undefined,loadContext:async()=>({context:''}),
  claimRequest:(uid,id)=>claimAiRequest(deps.db,uid,id),
  limiter:{take:async uid=>await createSharedRateLimiter(deps.db,deps.env).take(uid)&&await takeFreeDaily(deps.db,identity,quotaRequestId,Date.now(),true)},
  generate:deps.generate,generateStream:deps.generateStream});
 return handler({...request,headers:{...request.headers,authorization:'Bearer server-scoped-free-capability'}},response,receivedAt);
};
}
export async function freeChat(request:Request,response:ChatApiResponse,receivedAt:number){
 try{requireFreeOrigin(request.headers);}catch{return response.status(403).json({error:'temporarily_unavailable',category:'invalid_request'});}
 const admin=serverAdmin(),credentials=parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON??''),privateKey=credentials.private_key;if(typeof privateKey!=='string'||!privateKey.trim())throw new Error('FREE_SECURITY_UNAVAILABLE');
 // Domain-separated derivation; no extra credential or public signing key is introduced.
 const secret=createHash('sha256').update('camellia-free-cookie-v1:').update(privateKey).digest('hex');
 return createFreeChatRuntime({db:admin.db,secret,env:process.env,generate:(c,p,o)=>generate(c,p,o,false),generateStream:(c,p,o)=>generate(c,p,o,true)})(request,response,receivedAt);
}
