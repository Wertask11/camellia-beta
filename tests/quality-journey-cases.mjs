import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {Window} from 'happy-dom';
const window=new Window({url:'http://localhost/'});for(const key of ['window','document','Event','sessionStorage','localStorage'])globalThis[key]=key==='window'?window:window[key];
const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:false},plugins:[{name:'pure-journey',enforce:'pre',resolveId(id){if(id.includes('analytics/posthog'))return '\0analytics';if(id.includes('schoolpark/sync'))return '\0sync';},load(id){if(id==='\0analytics')return 'export const forwardEvent=()=>false;export const resetAnalyticsIdentity=()=>{};export const setAnalyticsDeliveryAllowed=()=>{};';if(id==='\0sync')return 'export const syncToSchoolPark=()=>{};export const prepareSchoolParkAccount=async s=>s;export const deleteSyncedCamelliaData=async()=>{};';}}]});
try{
 const {emptyState}=await server.ssrLoadModule('/hooks/useCamelliaStore.ts');
 const {ACTIONS}=await server.ssrLoadModule('/data/actions.ts');
 const {adjustedRecommendations}=await server.ssrLoadModule('/lib/recommendation/adjustments.ts');
 const {mergeJourney,containsJourney}=await server.ssrLoadModule('/lib/journey/adoption.ts');
 const guest=await server.ssrLoadModule('/lib/onboarding/guest-check.ts');
 const at=new Date().toISOString(),action=ACTIONS[0],choice={id:crypto.randomUUID(),actionId:action.id,title:action.title,category:action.category,status:'started',createdAt:at,updatedAt:at};
 guest.clearGuestCheck();const draft=guest.createGuestExploration();assert.equal(draft.version,2);assert.equal(guest.readGuestCheck(),undefined);assert.ok(!('check' in draft));
 guest.updateGuestJourney({actions:[choice],conversation:'PRIVATE',check:{mood:5}});
 assert.ok(!JSON.stringify(guest.readGuestDraft()).includes('PRIVATE'));assert.ok(!('check' in guest.readGuestDraft()));
 guest.armGuestLogin('line');guest.bridgeGuestOAuth('safe-no-check-oauth-state');assert.equal(localStorage.getItem(guest.GUEST_OAUTH_KEY),null,'old clients never inspect the new bridge');assert.ok(localStorage.getItem(guest.GUEST_JOURNEY_OAUTH_KEY));assert.equal(guest.completeGuestOAuth('wrong-no-check-state','A'),false);assert.equal(guest.readGuestDraft().phase,'preview');
 guest.armGuestLogin('line');guest.bridgeGuestOAuth('safe-no-check-oauth-state');assert.equal(guest.completeGuestOAuth('safe-no-check-oauth-state','A'),true);assert.equal(guest.journeyForAccount('B'),undefined);assert.equal(guest.guestForAccount('A'),undefined);
 const bound=guest.journeyForAccount('A');const state=emptyState();state.profile.id='profile-A';const adopted=mergeJourney(state,bound);assert.equal(adopted.checkins.length,0);assert.equal(adopted.actions.length,1);assert.equal(mergeJourney(adopted,bound).actions.length,1);assert.ok(containsJourney(adopted,bound,'profile-A'));assert.ok(!containsJourney(adopted,bound,'profile-B'));assert.equal(guest.finishGuestTransfer(bound.journeyId,'B'),false);assert.equal(guest.finishGuestTransfer(bound.journeyId,'A'),true);
 const current=guest.createGuestExploration();guest.updateGuestJourney({actions:[choice]});const check=guest.createGuestCheck({mood:3});assert.equal(check.actions.length,1);assert.equal(check.version,1);assert.ok(check.check);assert.equal(guest.parseGuestDraft(current,Date.now()+31*60000),undefined);
 const filtered=adjustedRecommendations(state,{maxMinutes:2});assert.ok(filtered.every(r=>r.action.minutes<=2));assert.equal(adjustedRecommendations(state,{maxMinutes:-1}).length,0);assert.ok(adjustedRecommendations(state,{category:'REST'}).every(r=>r.action.category==='REST'));assert.ok(!JSON.stringify(state).includes('PRIVATE'));
 console.log('PASS catalog-only no-Check journey, nonce/account binding, additive one-time adoption, expiry, upgrade to real Check, and strict manual recommendation constraints.');

}finally{await server.close();await window.happyDOM.close();}
