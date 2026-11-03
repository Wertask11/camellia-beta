import {serverAdmin,adminConfigured} from '../../lib/server/admin.js';
import {requireEligibleUser,EligibilityError} from '../../lib/server/eligibility.js';
import {memberStatus} from '../../lib/membership/server.js';
import {membershipFromRecord} from '../../lib/membership/model.js';
type Req={method?:string;headers:Record<string,string|string[]|undefined>};
type Res={setHeader:(name:string,value:string)=>void;status:(code:number)=>{json:(body:unknown)=>void}};
export default async function membership(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(503).json({error:'BILLING_NOT_READY'});
 const header=req.headers.authorization;
 if(typeof header!=='string'||!header.startsWith('Bearer '))return res.status(200).json(membershipFromRecord(undefined));
 if(!adminConfigured())return res.status(503).json({error:'MEMBERSHIP_UNAVAILABLE'});
 try{const deps=serverAdmin(),user=await requireEligibleUser(header.slice(7),deps);return res.status(200).json(await memberStatus(deps.db,user.uid));}
 catch(e){return res.status(e instanceof EligibilityError?e.status:503).json({error:e instanceof EligibilityError?e.code:'MEMBERSHIP_UNAVAILABLE'});}
}
