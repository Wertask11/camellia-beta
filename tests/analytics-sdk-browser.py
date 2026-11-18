"""Real posthog-js + app store + browser, LOCAL ingestion endpoint only; no real project writes."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,os
from urllib.parse import urlparse
expected_sdk=json.loads(Path("node_modules/posthog-js/package.json").read_text())["version"]
def unexpected_analytics(url):
 parsed=urlparse(url)
 return "posthog.com" in (parsed.hostname or "") or parsed.path.startswith(("/flags", "/decide", "/e/", "/s/", "/i/v0", "/static/"))
origin='http://127.0.0.1:4183';out=Path(os.environ.get('CAMELLIA_BROWSER_OUTPUT','/workspace/outputs/camellia-free-id-20261117/analytics-sdk'));out.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':900},user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36');c.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false})");c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort());page=c.new_page();unexpected=[];page.on('request',lambda r:unexpected.append(r.url) if unexpected_analytics(r.url) else None);page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));before=page.request.get(origin+'/__ux/analytics-captures').json();page.goto(origin+'/?diagnostics=analytics');page.locator('.today').wait_for();page.get_by_role('button',name='普通',exact=True).click();page.get_by_role('button',name='今日の私を見てみる',exact=True).click();page.wait_for_function("JSON.parse(localStorage.getItem('camellia-free-device-v1')).analyticsEvents.some(e=>e.name==='check_complete'&&e.forwardedAt)");page.get_by_role('button',name='My',exact=True).click();page.get_by_role('button',name='状態を確認する',exact=True).click();report=json.loads(page.get_by_label('計測の確認結果',exact=True).inner_text());assert report['sdkReady'] and report['deliveryAllowed'] and not report['dnt'] and not report['optedOut'] and not report['automatedBrowser'];assert report['standardDestination']==False,'fixture deliberately uses only a local endpoint/test token';assert 'phc_' not in json.dumps(report) and not any(k in report for k in ['uid','email','token','distinct_id']);assert report['recent']
  events=page.request.get(origin+'/__ux/analytics-captures').json()[len(before):];assert any(e['event']=='check_complete' for e in events)
  for e in events:
   props=e['properties'];assert props['event_schema']==2 and props['experience_version']=='free_id_v1' and props['plan']=='free' and props['id_state']=='none';assert props['$lib']=='web' and props['$lib_version']==expected_sdk;assert props['$host']=='127.0.0.1:4183';assert '?' not in props['$current_url'];assert all(k not in props for k in ['mood','sleep','email','uid','text','name','token']);assert props['$insert_id']==e['uuid']
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors;assert not unexpected,unexpected;page.screenshot(path=str(out/f'{width}.png'));results.append({'width':width,'sdkVersion':expected_sdk,'noSdkSideChannelRequests':'PASS','realSdkEnvelopeAndLocalHttpReceipt':'PASS','privacyAndSchema2':'PASS','diagnosticNoKeysIdsBody':'PASS','scope':'Automation signal suppressed only in this fixture to simulate a normal browser. Real ingestion and user opt-out NOT bypassed.','pageErrors':errors});c.close()
 # Combine the real SDK with the synthetic email/handover flow, including callback URL scrubbing.
 c=b.new_context(user_agent='Mozilla/5.0 Chrome/143.0.0.0 Safari/537.36')
 c.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false})")
 c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort())
 page=c.new_page();page.set_default_timeout(15000)
 before=len(page.request.get(origin+'/__ux/analytics-captures').json())
 page.goto(origin);page.locator('.today').wait_for()
 page.get_by_role('button',name='普通',exact=True).click()
 page.get_by_role('button',name='今日の私を見てみる',exact=True).click()
 page.get_by_role('button',name='My',exact=True).click()
 page.get_by_role('button',name='Camellia IDで引き継ぐ（無料）',exact=True).click()
 page.get_by_label('メールアドレス',exact=True).fill('local@example.test')
 page.get_by_role('checkbox').check()
 page.get_by_role('button',name='確認メールを受け取る',exact=True).click()
 expect(page.get_by_role('heading',name='確認メールの送信を受け付けました')).to_be_visible()
 page.goto(origin+'/?auth=email&mode=signIn&oobCode=ux-email&apiKey=LOCAL')
 page.get_by_role('heading',name='登録前の記録を引き継ぐ').wait_for()
 page.get_by_role('button',name='確認した記録を、このIDへ引き継ぐ',exact=True).click()
 page.wait_for_function("JSON.parse(localStorage.getItem('camellia-free-transfer-v1')).stage==='applied'")
 page.evaluate("sessionStorage.setItem('ux-cloud-confirm','1')")
 page.get_by_role('button',name='IDへの保存を確認する',exact=True).click()
 expect(page.get_by_role('status').filter(has_text='記録をCamellia IDへ引き継ぎ、保存を確認しました。')).to_be_visible()
 # Wait on a local HTTP receipt, not just the client event ledger.
 page.wait_for_function("async(n)=>{const es=await(await fetch('/__ux/analytics-captures')).json();return es.slice(n).some(e=>e.event==='record_transfer_complete')}",arg=before)
 events=page.request.get(origin+'/__ux/analytics-captures').json()[before:]
 for name in ['check_complete','camellia_id_start','camellia_id_complete','record_transfer_complete']:
  assert any(e['event']==name for e in events),name
 assert any(e['event']=='check_complete' and e['properties']['id_state']=='none' for e in events)
 assert any(e['event']=='record_transfer_complete' and e['properties']['id_state']=='obtained' for e in events)
 assert all(e['properties']['$lib_version']==expected_sdk for e in events)
 raw=json.dumps(events)
 assert all(secret not in raw for secret in ['local@example.test','oobCode','apiKey','ux-email','synthetic-email-user'])
 assert all(e['properties']['event_schema']==2 for e in events)
 assert len([e for e in events if e['event']=='camellia_id_complete'])==1
 assert next(e for e in events if e['event']=='check_complete')['properties']['distinct_id']!=next(e for e in events if e['event']=='camellia_id_complete')['properties']['distinct_id']
 assert not any(e['event'] in ['$create_alias','$identify'] for e in events)
 assert page.evaluate("sessionStorage.getItem('camellia-id-completion-v1')")==None
 page.reload();page.locator('.bottom-nav').wait_for()
 assert page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3')).analyticsEvents.filter(e=>e.name==='camellia_id_complete').length")==1
 results.append({'case':'email ID and handover','sdkVersion':expected_sdk,'localHttpReceipts':'PASS','idStateTransition':'PASS','callbackAndIdentityPrivacy':'PASS','scope':'Real SDK and application; synthetic Auth/mail/cloud receipt only.'})
 c.close()
 # DNT is a real SDK/privacy condition; diagnostic reads it without overriding it.
 c=b.new_context(user_agent='Mozilla/5.0 Chrome/143.0.0.0 Safari/537.36');c.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false});Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'})");c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort());page=c.new_page();before=len(page.request.get(origin+'/__ux/analytics-captures').json());page.goto(origin+'/?diagnostics=analytics');page.locator('.today').wait_for();page.get_by_role('button',name='普通',exact=True).click();page.get_by_role('button',name='今日の私を見てみる',exact=True).click();page.get_by_role('button',name='My',exact=True).click();page.get_by_role('button',name='状態を確認する',exact=True).click();report=json.loads(page.get_by_label('計測の確認結果',exact=True).inner_text());assert report['dnt']==True;assert len(page.request.get(origin+'/__ux/analytics-captures').json())==before;results.append({'case':'Do Not Track','zeroHttpSends':'PASS','readOnlyDiagnostic':'PASS'});c.close();b.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
