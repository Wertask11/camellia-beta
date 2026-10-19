/** Local synthetic browser fixture only; no OAuth, cloud data or provider calls. */
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
const root=process.cwd();const port=Number(process.env.ALPHA_PORT||4311);
const server=await createServer({configFile:false,root,cacheDir:root+'/work/alpha-vite-'+port,optimizeDeps:{include:['react','react-dom/client','react/jsx-runtime','lucide-react','firebase/auth','firebase/app','firebase/firestore']},resolve:{alias:{'@':root}},css:{postcss:{plugins:[tailwindcss()]}},plugins:[{
 name:'alpha-local-services',enforce:'pre',resolveId(id){if(id.includes('schoolpark/sync'))return '\0alpha-sync';if(id.includes('analytics/posthog'))return '\0alpha-analytics';},load(id){
  if(id==='\0alpha-sync')return 'export const syncToSchoolPark=()=>{};export const deleteSyncedCamelliaData=async clear=>{clear();return {cloudDeleted:false};};export const prepareSchoolParkAccount=async s=>s;const status={phase:"idle"};export const getSyncStatus=()=>status;export const subscribeSyncStatus=()=>()=>{};export const flushSchoolParkSync=async()=>{};';
  if(id==='\0alpha-analytics')return 'export const forwardEvent=()=>false;export const resetAnalyticsIdentity=()=>{};export const captureAuthEvent=()=>{};';
 }
},react(),{name:'alpha-entry',configureServer(vite){vite.middlewares.use((req,res,next)=>{if(!req.url?.startsWith('/alpha-fixture'))return next();void vite.transformIndexHtml('/alpha-fixture','<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tests/alpha-layout-entry.tsx"></script></html>').then(html=>{res.setHeader('Content-Type','text/html');res.end(html);});});}}],server:{host:'127.0.0.1',port,strictPort:true}});
await server.listen();console.log(`LOCAL ONLY: http://127.0.0.1:${port}/alpha-fixture`);
