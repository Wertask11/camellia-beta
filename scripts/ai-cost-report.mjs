/** Read-only operator report. Never reconciles or fabricates a provider invoice. */
import {createServer} from 'vite';
const [from,to]=process.argv.slice(2);
if(!/^\d{4}-\d{2}-\d{2}$/.test(from??'')||!/^\d{4}-\d{2}-\d{2}$/.test(to??'')||from>to)throw new Error('Usage: node scripts/ai-cost-report.mjs <from JST date> <to JST date>');
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
try{
 const {serverAdmin,SERVER_ROOT}=await server.ssrLoadModule('/lib/server/admin.ts'),{db}=serverAdmin();
 const rows=await db.collection(`${SERVER_ROOT}/ai_attempt_days`).where('date','>=',from).where('date','<=',to).limit(1000).get();
 const days=rows.docs.map(d=>d.data()),sum=key=>days.reduce((n,d)=>n+Number(d[key]??0),0),config=(await db.doc(`${SERVER_ROOT}/config/ai_observation`).get()).data();
 console.log(JSON.stringify({periodJst:{from,to},rows:days.length,truncated:days.length===1000,observationApproved:config?.approved===true,attempts:sum('attempts'),incompleteAttempts:sum('incomplete'),success:sum('success'),errors:sum('error'),aborted:sum('aborted'),safetyBlocks:sum('safety_block'),observedInputTokens:sum('inputTokens'),observedOutputTokens:sum('outputTokens'),observedThinkingTokens:sum('thinkingTokens'),estimatedYen:sum('estimatedYen'),invoiceVerified:false,coverage:'approved observations only; unknown attempts are not assumed free',alertThresholds:'operator decision required; not configured by this report'},null,2));
}finally{await server.close();}
