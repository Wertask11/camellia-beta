import {isGeminiEnabled,type ChatApiResponse} from '../../lib/conversation/gemini-server.js';
export default async function freeChat(request:{method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown},response:ChatApiResponse){
 response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');
 if(request.method==='GET')return response.status(200).json({enabled:isGeminiEnabled(process.env),dataPolicy:['free','paid'].includes(process.env.GEMINI_DATA_POLICY??'')?process.env.GEMINI_DATA_POLICY:'unknown'});
 if(request.method!=='POST'){response.setHeader('Allow','GET, POST');return response.status(405).json({error:'method_not_allowed'});}
 if(!isGeminiEnabled(process.env))return response.status(503).json({error:'disabled',category:'disabled'});
 const receivedAt=Date.now();try{return await (await import('../../lib/free/chat-runtime.js')).freeChat(request,response,receivedAt);}catch{return response.status(503).json({error:'temporarily_unavailable',category:'provider_error'});}
}
