"""Actual conversation UI; injected account, exhausted basic quota and provider. No real login/Gemini/trial grant."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
origin='http://127.0.0.1:4191';out=Path('docs/release-20261201/evidence');results=[]
with sync_playwright()as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  context=browser.new_context(viewport={'width':width,'height':844});page=context.new_page();calls=[]
  def route(r):
   req=r.request
   if '/api/camellia/membership'in req.url:return r.fulfill(json={'plan':'plus','paid':False,'trial':True,'priceYen':500,'conversationTrialVersion':'referral_ai_v1','trialExtensionReady':True})
   if '/api/camellia/chat'in req.url:
    if req.method=='GET':return r.fulfill(json={'enabled':True})
    body=req.post_data_json;calls.append(body)
    if body.get('usageLane')!='referral_extension':return r.fulfill(status=429,json={'category':'daily_limited'})
    return r.fulfill(json={'reply':'LOCAL EXPLICIT TRIAL REPLY','provider':'gemini','modelId':body['modelId']})
   if req.url.startswith(origin+'/'):return r.continue_()
   return r.abort()
  context.route('**/*',route);page.goto(origin);page.locator('.today').wait_for();page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('camellia-free-device-v1'));s.profile={...s.profile,id:'12345678-1234-4234-8234-123456789012',name:'LOCAL',birthDate:'1995-01-01',womanSelfDeclared:true,agreedAt:new Date().toISOString()};s.onboardingComplete=true;localStorage.setItem('camellia-prototype-v3',JSON.stringify(s));sessionStorage.setItem('ux-signed-in','1');sessionStorage.setItem('ux-auth-uid','LOCAL-SYNTHETIC-TRIAL');}""");page.goto(origin);page.locator('.today').wait_for();page.get_by_role('button',name='Camellia',exact=True).click();page.get_by_role('button',name='新しい会話を始める').click();page.get_by_role('textbox',name='Camelliaへのメッセージ').fill('LOCAL EXHAUSTED FREE');page.get_by_role('button',name='送信',exact=True).click();button=page.get_by_role('button',name='紹介体験の会話枠で続ける',exact=True);button.wait_for();assert len(calls)==1 and 'usageLane'not in calls[0];button.click();
  try:page.locator('.bubble.assistant').filter(has_text='LOCAL EXPLICIT TRIAL REPLY').wait_for(timeout=8000)
  except Exception:
   print('DIAGNOSTIC',width,[{k:b.get(k)for k in ['usageLane','modelId']}for b in calls],page.locator('.chat-error').all_text_contents(),page.locator('.bubble').all_text_contents(),flush=True);raise
  assert len(calls)==2 and calls[1]['usageLane']=='referral_extension';state=page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))");assert len([m for m in state['aiConversations'][0]['messages']if m['role']=='user'])==1;assert calls[0]['modelId']==calls[1]['modelId'];assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(out/f'referral-ai-lanes-{width}.png'));results.append({'width':width,'no_automatic_extension':True,'explicit_trial_retry':True,'same_model_and_original_message':True,'no_overflow':True});context.close()
 browser.close()
out.joinpath('referral-ai-lanes-browser.json').write_text(json.dumps({'kind':'Local real Chromium with injected Auth/quota/provider; no real trial or Gemini','results':results},ensure_ascii=False,indent=2)+'\n');print(json.dumps(results))
