"""Real root route and screens; local Auth/Stripe fixtures only. Never issues a real email or payment."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
origin='http://127.0.0.1:4191';out=Path('docs/release-20261201/evidence/billing-management');out.mkdir(exist_ok=True);results=[]
with sync_playwright()as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  context=browser.new_context(viewport={'width':width,'height':844});page=context.new_page();calls=[];errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script("sessionStorage.setItem('ux-signed-in','1');localStorage.setItem('camellia-prototype-v3','PRIVATE ORIGINAL RECORD SENTINEL');")
  context.add_cookies([{'name':'ux-access','value':'suspended','url':origin}])
  def route(r):
   req=r.request
   if '/api/camellia/billing' in req.url:
    b=req.post_data_json;calls.append(b['operation'])
    if b['operation']=='status':return r.fulfill(json={'ready':False,'customer':True,'priceYen':500})
    if b['operation']=='history':return r.fulfill(json={'invoices':[{'status':'paid','amountPaidYen':500,'createdAt':'2026-11-19T00:00:00Z'}],'more':False})
    return r.fulfill(status=503,json={'error':'BILLING_NOT_READY'})
   if req.url.startswith(origin):return r.continue_()
   return r.abort()
  page.route('**/*',route);page.goto(origin+'/?open=billing');expect(page.get_by_role('heading',name='支払い履歴・解約',exact=True)).to_be_visible();expect(page.get_by_text('500円の支払い',exact=False)).to_be_visible();button=page.get_by_role('button',name='支払い方法・解約を確認する',exact=True);button.click();expect(page.get_by_role('alert')).to_be_visible();expect(button).to_be_enabled();assert calls.count('portal')==1 and 'checkout'not in calls
  assert page.evaluate("localStorage.getItem('camellia-prototype-v3')")=='PRIVATE ORIGINAL RECORD SENTINEL'
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors
  page.screenshot(path=str(out/f'{width}.png'));page.get_by_role('button',name='支払い管理からログアウト',exact=True).click();expect(page.get_by_label('支払いに使ったメールアドレス',exact=True)).to_be_visible();assert page.evaluate("localStorage.getItem('camellia-prototype-v3')")=='PRIVATE ORIGINAL RECORD SENTINEL'
  results.append({'width':width,'missing_profile_and_suspended_access_still_manage':True,'portal_failure_keeps_history':True,'no_purchase_or_record_change':True,'logout_preserves_local_records':True,'overflow':False,'page_errors':errors});context.close()
 # A new email confirmation must not fabricate consumer eligibility/consent or transfer private records.
 for pending in [True,False]:
  context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();calls=[]
  def mailroute(r):
   req=r.request
   if '/api/camellia/billing' in req.url:
    b=req.post_data_json;calls.append(b['operation']);return r.fulfill(json={'ready':False,'customer':False,'priceYen':500}if b['operation']=='status'else{'invoices':[],'more':False})
   if req.url.startswith(origin):return r.continue_()
   return r.abort()
  page.route('**/*',mailroute);page.goto(origin+'/?open=billing');page.evaluate("localStorage.setItem('camellia-prototype-v3','MAIL ORIGINAL');localStorage.removeItem('camellia-email-id-verified-v1')")
  if pending:
   page.get_by_label('支払いに使ったメールアドレス',exact=True).fill('fixture@example.test');page.get_by_role('button',name='支払い管理の確認メールを受け取る',exact=True).click();expect(page.get_by_role('heading',name='確認メールの送信を受け付けました')).to_be_visible();request=page.evaluate("JSON.parse(sessionStorage.getItem('ux-email-request'))");assert request['settings']['url']==origin+'/?auth=email&open=billing'
  page.goto(origin+'/?auth=email&open=billing&oobCode=ux-email&apiKey=LOCAL_ONLY&mode=signIn')
  if not pending:page.get_by_label('支払いに使ったメールアドレス',exact=True).fill('fixture@example.test');page.get_by_role('button',name='メールを確認して支払い管理を開く',exact=True).click()
  expect(page.get_by_text('このIDに紐づく支払いは確認されていません。',exact=False)).to_be_visible();assert page.evaluate("localStorage.getItem('camellia-email-id-verified-v1')")is None;assert page.evaluate("localStorage.getItem('camellia-prototype-v3')")=='MAIL ORIGINAL';assert 'oobCode'not in page.url and 'apiKey'not in page.url and 'open=billing'in page.url;assert 'checkout'not in calls
  results.append({'email_pending_same_browser':pending,'other_device_email_entry':not pending,'no_consumer_consent_or_transfer':True,'callback_scrubbed':True,'unpaid_identity_no_portal_or_checkout':True});context.close()
 browser.close()
out.joinpath('result.json').write_text(json.dumps({'kind':'Local real Chromium, root route and screen; injected Auth/payment. No real email, Stripe or Preview acceptance.','results':results},ensure_ascii=False,indent=2)+'\n');print(json.dumps(results))
