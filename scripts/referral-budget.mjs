/** Private operator command. Dry-run by default; no scheduler or automatic closure. */
import{createServer}from'vite';
const[id,digest,flag]=process.argv.slice(2);if(!/^[a-f0-9]{64}$/.test(id??'')||digest!==undefined&&!/^[a-f0-9]{64}$/.test(digest)||flag!==undefined&&flag!=='--apply'||process.argv.length>5)throw new Error('Usage: node scripts/referral-budget.mjs <grant hash> [dry-run digest] [--apply]');
const apply=flag==='--apply';if(apply&&process.env.CAMELLIA_OPERATOR_CHANGE_APPROVED!=='true')throw new Error('Explicit operator approval required');
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
try{const{serverAdmin}=await vite.ssrLoadModule('/lib/server/admin.ts'),{ReferralService}=await vite.ssrLoadModule('/lib/referral/service.ts');const{db,auth}=serverAdmin();console.log(JSON.stringify(await new ReferralService(db,auth).reconcileExpiredBudget(id,{apply,approvedDigest:digest})));}finally{await vite.close();}
