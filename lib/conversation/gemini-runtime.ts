import {REFERRAL_INTEGRATION_READY} from '../referral/config.js';
import {prepareTrialGeneration} from '../referral/ai-runtime.js';
import {claimAiRequest,recordProviderAttempt} from '../server/ai-observation.js';
import {observeProviderAttempt,observeUsageChunks} from './provider-observation.js';
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
} from '@google/genai';
import {
  createGeminiChatHandler,
  type GenerationControls,
  type ChatApiResponse,
  chatServerStatus,
} from './gemini-server.js';

import { EligibilityServiceError, requireEligibleUser } from '../server/eligibility.js';
import { CONVERSATION_RESPONSE_SCHEMA } from './action-bridge.js';
import { adminConfigured, serverAdmin } from '../server/admin.js';
import { createSharedRateLimiter } from '../server/shared-limit.js';
import {loadConversationContext} from './context-loader.js';
import {collectReplyStream} from './stream.js';
import { createModelCooldown, generateWithModelRecovery } from './provider-recovery.js';
import { readProviderReply } from './provider-output.js';

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type ApiResponse = ChatApiResponse;

const modelCooldown = createModelCooldown();

// Stateless SDK client reuse; request contents/history remain request-local.
let client:GoogleGenAI|undefined;
function geminiClient(){
 const apiKey=process.env.GEMINI_API_KEY;
 if(!apiKey)throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
 return client??=new GoogleGenAI({apiKey,httpOptions:{retryOptions:{attempts:1}}});
}
export async function generate(contents:Parameters<ReturnType<typeof createGeminiChatHandler>>[0]['body'],systemInstruction:string,controls:GenerationControls|undefined,streaming:boolean){
 const startedAt=Date.now();
 const primaryModel=process.env.GEMINI_MODEL||'gemini-3.8-flash';
 const fallbackModel=process.env.GEMINI_FALLBACK_MODEL??'gemini-3.1-flash-lite';
 const ai=geminiClient();let receivedModel='',attempt=0;
 const signal=AbortSignal.any([AbortSignal.timeout(28000),...(controls?[controls.signal]:[])]);
 let trial:Awaited<ReturnType<typeof prepareTrialGeneration>>|undefined;
 if(controls?.identity?.usageLane==='referral_extension'){
  if(!REFERRAL_INTEGRATION_READY)throw new Error('TRIAL_AI_NOT_READY');
  const admin=serverAdmin();
  trial=await prepareTrialGeneration({db:admin.db,auth:admin.auth,...controls.identity,models:[primaryModel,fallbackModel],countInput:async model=>{const result=await ai.models.countTokens({model,contents:contents as Parameters<GoogleGenAI['models']['countTokens']>[0]['contents'],config:{systemInstruction,abortSignal:signal}});return result.totalTokens??NaN;}});
 }
 try{
  const result=await generateWithModelRecovery({
   ...modelCooldown.select(primaryModel,fallbackModel),signal,
   onFailure:metadata=>{modelCooldown.failed(metadata);console.warn('camellia_provider_attempt_failed',metadata);},
   request:async(model,attemptSignal)=>observeProviderAttempt({model,attempt:++attempt,signal:attemptSignal,record:async observation=>{trial?.observe(observation);if(controls?.identity)await recordProviderAttempt(serverAdmin().db,controls.identity.uid,controls.identity.requestId,observation);},run:async report=>{
    attemptSignal.throwIfAborted();await trial?.beforeDispatch();
    const params={model,contents:contents as Parameters<GoogleGenAI['models']['generateContent']>[0]['contents'],config:{
     systemInstruction,temperature:0.7,responseMimeType:'application/json',responseJsonSchema:CONVERSATION_RESPONSE_SCHEMA,
     maxOutputTokens:model.includes('flash-lite')?512:2048,
     thinkingConfig:{thinkingLevel:model.includes('flash-lite')?ThinkingLevel.MINIMAL:ThinkingLevel.LOW},
     automaticContinuation:false,abortSignal:attemptSignal,
     safetySettings:[
      {category:HarmCategory.HARM_CATEGORY_HARASSMENT,threshold:HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
      {category:HarmCategory.HARM_CATEGORY_HATE_SPEECH,threshold:HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
      {category:HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,threshold:HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
      {category:HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,threshold:HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
     ],
    }};
    let reply:string,previewed=false;
    try{
     if(streaming&&controls){
      const chunks=await ai.models.generateContentStream(params);
      reply=await collectReplyStream(observeUsageChunks(chunks,report),text=>{previewed=true;controls.onText(text);},controls.onFirstChunk,attemptSignal);
     }else {const response=await ai.models.generateContent(params);report(response.usageMetadata);reply=readProviderReply(response);}
    }catch(error){
     // A retry after displaying a prefix would mix two independent replies. Never do it.
     if(previewed&&!(error&&typeof error==='object'&&'code'in error&&error.code==='SAFETY_BLOCK'))throw Object.assign(new Error('INTERRUPTED_GENERATION'),{code:'STREAM_INTERRUPTED',cause:error});
     throw error;
    }
    modelCooldown.succeeded(model);receivedModel=model;return reply;
   }}),
  });
  console.info('camellia_provider_text_received',{route:receivedModel===primaryModel?'primary':'fallback',model:receivedModel,elapsedMs:Date.now()-startedAt});
  return result;
 }catch(error){
  const status=error&&typeof error==='object'&&'status'in error&&typeof error.status==='number'?error.status:undefined;
  console.error('camellia_generation_failed',{stage:'provider_request',status});throw error;
 }finally{try{await trial?.finish();}catch{console.warn('camellia_trial_settlement_unavailable',{stage:'settle'});}}
}

const handler = createGeminiChatHandler({
  env: process.env,
  rateLimitMode:chatServerStatus(process.env).rateLimitMode,
  verifyToken: async (token) => {
    let admin;
    try{admin=serverAdmin();}catch{throw new EligibilityServiceError('configuration');}
    const decoded=await requireEligibleUser(token,admin);return {uid:decoded.uid};
  },
  claimRequest:(uid,requestId)=>claimAiRequest(serverAdmin().db,uid,requestId),
  getTodayMood:async()=>undefined,
  loadContext:uid=>loadConversationContext(uid,serverAdmin().db as unknown as Parameters<typeof loadConversationContext>[1]),
  ...(adminConfigured() ? {limiter:{take:(uid:string)=>createSharedRateLimiter(serverAdmin().db).take(uid)}} : (process.env.VERCEL_ENV==='production'||process.env.CAMELLIA_SHARED_RATE_LIMIT_REQUIRED === 'true') ? {limiter:{take:async()=>{throw new Error('SHARED_LIMIT_UNAVAILABLE');}}} : {}),
  generate:(contents,prompt,controls)=>generate(contents,prompt,controls,false),
  generateStream:(contents,prompt,controls)=>generate(contents,prompt,controls,true),
});

export default function chat(request: ApiRequest, response: ApiResponse, receivedAt?:number) {
  return handler(request, response,receivedAt);
}
