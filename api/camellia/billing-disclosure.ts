import {adminConfigured,serverAdmin,SERVER_ROOT} from '../../lib/server/admin.js';
import {billingDisclosure} from '../../lib/billing/disclosure.js';
type Res={setHeader:(n:string,v:string)=>void;status:(c:number)=>{json:(v:unknown)=>void}};
export default async function disclosure(req:{method?:string},res:Res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 if(!adminConfigured())return res.status(503).json({error:'BILLING_NOT_READY'});
 try{const cfg=(await serverAdmin().db.doc(`${SERVER_ROOT}/config/billing`).get()).data();const value=cfg?.disclosuresApproved===true?billingDisclosure(cfg.disclosure):undefined;
 if(!value)return res.status(503).json({error:'BILLING_NOT_READY'});
 return res.status(200).json(value);
 }catch{return res.status(503).json({error:'BILLING_UNAVAILABLE'});}
}
