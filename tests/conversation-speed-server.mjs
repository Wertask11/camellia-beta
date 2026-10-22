/** Real HTTP/SSE + React; auth/storage/provider dependencies are explicitly synthetic. */
import {createServer} from 'vite';import react from '@vitejs/plugin-react';import tailwindcss from '@tailwindcss/postcss';
const root=process.cwd();const failures=new Map();
const server=await createServer({configFile:false,root,define:{__CAMELLIA_ANALYTICS_DIAGNOSTICS__:'true'},cacheDir:root+'/work/speed-vite',resolve:{alias:{'@':root},dedupe:['react','react-dom']},optimizeDeps:{include:['react','react-dom/client','lucide-react']},css:{postcss:{plugins:[tailwindcss()]}},plugins:[react(),{
 name:'speed-fixture',enforce:'pre',resolveId(id){if(id.includes('schoolpark/firebase'))return '\0speed-auth';if(id.includes('schoolpark/sync'))return '\0speed-sync';if(id.includes('analytics/posthog'))return '\0speed-analytics';},
 load(id){if(id==='\0speed-auth')return 'export const schoolParkAuth={currentUser:{getIdToken:async()=>"synthetic"}};';if(id==='\0speed-sync')return 'export const syncToSchoolPark=()=>{};export const deleteSyncedCamelliaData=async()=>{};export const prepareSchoolParkAccount=async s=>s;';if(id==='\0speed-analytics')return 'export const forwardEvent=()=>false;export const resetAnalyticsIdentity=()=>{};';},
 configureServer(s){s.middlewares.use((req,res,next)=>{
  if(req.url?.startsWith('/speed-fixture')){void s.transformIndexHtml('/speed-fixture','<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tests/conversation-speed-entry.tsx"></script></html>').then(html=>{res.setHeader('Content-Type','text/html');res.end(html);});return;}
  if(req.url!=='/api/camellia/chat'){next();return;}
  void(async()=>{
   const {createGeminiChatHandler}=await s.ssrLoadModule('/lib/conversation/gemini-server.ts');
   const wait=ms=>new Promise(r=>setTimeout(r,ms));
   const wire=JSON.stringify({reply:'少しずつ言葉にしてみよう。今いちばん気になることはどの辺？',actionId:null});
   const handler=createGeminiChatHandler({env:{CAMELLIA_GEMINI_CHAT_ENABLED:'true',GEMINI_API_KEY:'synthetic'},verifyToken:async()=>{await wait(15);return{uid:'synthetic-local'};},getTodayMood:async()=>undefined,loadContext:async()=>{await wait(20);return{context:''};},limiter:{take:async()=>{await wait(10);return true;}},generate:async()=>{await wait(800);return wire;},generateStream:async(contents,_prompt,c)=>{
    const input=contents.at(-1)?.parts?.[0]?.text??'';
    await wait(100);c.signal.throwIfAborted();c.onFirstChunk();c.onText('少しずつ');
    await wait(350);c.signal.throwIfAborted();if(input==='QA_FAIL'){const n=failures.get(input)??0;failures.set(input,n+1);if(n===0)throw {status:503};}if(input==='QA_SAFETY_LATE')throw {code:'SAFETY_BLOCK'};c.onText('少しずつ言葉にしてみよう。');
    await wait(350);c.signal.throwIfAborted();return wire;
   }});
   const body=[];for await(const b of req)body.push(b);req.body=body.length?JSON.parse(Buffer.concat(body).toString()):undefined;
   res.status=function(n){this.statusCode=n;return this;};res.json=function(data){this.setHeader('Content-Type','application/json');this.end(JSON.stringify(data));};
   await handler(req,res);
  })().catch(()=>{if(!res.headersSent){res.statusCode=500;res.end('{}');}else res.end();});
 });},
}],server:{host:'127.0.0.1',port:4331,strictPort:true,hmr:false}});
await server.listen();console.log('LOCAL SYNTHETIC HTTP/SSE speed fixture http://127.0.0.1:4331/speed-fixture');
