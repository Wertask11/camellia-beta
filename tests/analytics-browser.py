# Local synthetic audit only. All external transport is intercepted; no cloud login/ingestion claims.
from playwright.sync_api import sync_playwright,expect
import json,pathlib,urllib.parse,os
out=pathlib.Path(os.environ.get('CAMELLIA_ANALYTICS_EVIDENCE_DIR','/tmp/camellia-analytics-browser'));out.mkdir(parents=True,exist_ok=True);origin='http://127.0.0.1:4330';evidence=[]
core=['session_start','check_view','check_start','check_complete']
def metadata(request,status):
 try:payload=json.loads(request.post_data or '{}')
 except Exception:return []
 assert 'QA_PRIVATE' not in (request.post_data or ''), 'private UI content escaped analytics boundary'
 return [{'model_id':e.get('properties',{}).get('model_id'),'from_model':e.get('properties',{}).get('from_model'),'to_model':e.get('properties',{}).get('to_model'),'event':e.get('event'),'timestamp':e.get('timestamp'),'insert_id':e.get('properties',{}).get('$insert_id'),'uuid':e.get('uuid'),'distinct_id_present':bool(e.get('properties',{}).get('distinct_id')),'app_version':e.get('properties',{}).get('app_version'),'event_schema':e.get('properties',{}).get('event_schema'),'httpStatus':status} for e in payload.get('batch',[])]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [375,390,412,768,1280]:
  responses=[];failure={'on':width==390}
  c=b.new_context(viewport={'width':width,'height':844},timezone_id='Asia/Tokyo')
  def route(r):
   if r.request.url==origin+'/api/camellia/chat':
    if r.request.method=='GET':data={'enabled':True}
    else:data={'reply':'これはローカル検証の返答です。','provider':'gemini','modelId':json.loads(r.request.post_data)['modelId'],'responseTimeMs':1}
    r.fulfill(status=200,json=data);return
   if r.request.url.startswith(origin+'/'):r.continue_();return
   if r.request.method=='POST' and urllib.parse.urlsplit(r.request.url).hostname=='us.i.posthog.com':
    status=503 if failure['on'] else 200;responses.extend(metadata(r.request,status));r.fulfill(status=status,body=json.dumps({'status':0 if status==503 else 1}),content_type='application/json',headers={'Access-Control-Allow-Origin':origin});return
   r.fulfill(status=200,body='{}',content_type='application/json',headers={'Access-Control-Allow-Origin':origin})
  c.route('**/*',route);page=c.new_page();page.goto(origin+'/analytics-fixture',wait_until='domcontentloaded')
  page.get_by_role('button',name='普通',exact=True).click();page.get_by_role('button',name='今日の私を見てみる',exact=True).click()
  page.wait_for_function('analyticsAudit.state.analyticsEvents.some(e=>e.name==="check_complete")')
  if failure['on']:
   page.wait_for_function('window.__CAMELLIA_ANALYTICS_DEBUG__?.entries.some(e=>e.status==="http_503")')
   pending=page.evaluate('analyticsAudit.state.analyticsEvents.filter(e=>["session_start","check_view","check_start","check_complete"].includes(e.name)).map(e=>({id:e.id,event:e.name,forwardedAt:e.forwardedAt??null}))')
   assert len(pending)==4 and all(e['forwardedAt'] is None for e in pending)
   originals={e['id'] for e in pending}
   page.reload(wait_until='domcontentloaded');page.wait_for_function('analyticsAudit.state?.checkins.length===1')
   failure['on']=False;page.evaluate('window.dispatchEvent(new Event("online"))')
   page.wait_for_function('(ids)=>ids.every(id=>analyticsAudit.state.analyticsEvents.find(e=>e.id===id)?.forwardedAt)',arg=list(originals))
   success=[e for e in responses if e['httpStatus']==200 and e['insert_id'] in originals]
   assert {e['insert_id'] for e in success}==originals
   assert [e['event'] for e in success]==core
   evidence.append({'case':'503→reload→online→200','width':width,'beforeRecovery':pending,'transport':responses.copy(),'pass':True})
  else:
   page.wait_for_function('analyticsAudit.state.analyticsEvents.filter(e=>["session_start","check_view","check_start","check_complete"].includes(e.name)).length===4&&analyticsAudit.state.analyticsEvents.filter(e=>["session_start","check_view","check_start","check_complete"].includes(e.name)).every(e=>e.forwardedAt)')
   assert [e['event'] for e in responses if e['event'] in core]==core, json.dumps({'width':width,'responses':responses})
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'overflow {width}'
  page.screenshot(path=str(out/f'analytics-{width}.png'),full_page=True)
  if width in [390,1280]:
   nav=page.get_by_role('navigation',name='Local audit screens')
   nav.get_by_role('button',name='fortune',exact=True).click();page.get_by_role('button',name='一枚引く',exact=True).click()
   page.wait_for_function('analyticsAudit.state.fortunes.length===1')
   actions=page.locator('.fortune-actions button')
   if actions.count():actions.first.click()
   nav.get_by_role('button',name='discover',exact=True).click();page.get_by_role('heading',name='Discover',exact=True).wait_for()
   nav.get_by_role('button',name='tree',exact=True).click();page.get_by_role('button',name='人を追加',exact=True).click();page.get_by_label('名前／ニックネーム',exact=True).fill('QA_PRIVATE_NAME');page.get_by_label('自分のための一言',exact=True).fill('QA_PRIVATE_NOTE');page.get_by_role('button',name='木に追加する',exact=True).click()
   nav.get_by_role('button',name='conversation',exact=True).click();page.get_by_role('button',name='新しい会話を始める').click()
   message=page.get_by_role('textbox',name='Camelliaへのメッセージ');message.fill('QA_PRIVATE_MESSAGE');page.get_by_role('button',name='送信',exact=True).click()
   page.wait_for_function('analyticsAudit.state.aiConversations[0]?.messages.filter(m=>m.role==="assistant").length===1')
   page.get_by_role('button',name='話し方を選ぶ（現在：YURA）',exact=True).click();page.get_by_role('menuitemradio',name='Lactone',exact=False).click()
   message.fill('QA_PRIVATE_SECOND_MESSAGE');page.get_by_role('button',name='送信',exact=True).click()
   page.wait_for_function('analyticsAudit.state.aiConversations[0]?.messages.filter(m=>m.role==="assistant").length===2')
   required=['fortune_open','fortune_draw','fortune_complete','discover_view','tree_open','tree_add_complete','conversation_open','conversation_message_sent','conversation_response_received','conversation_model_selected','conversation_model_switched']
   page.wait_for_function('(required)=>required.every(name=>analyticsAudit.state.analyticsEvents.some(e=>e.name===name&&e.forwardedAt))',arg=required)
   sent=[e for e in responses if e['event']=='conversation_message_sent'];assert [e['model_id'] for e in sent]==['yura','lactone']
  evidence.append({'case':'core Today UI + real SDK + intercepted HTTP','width':width,'transport':responses,'overflow':False,'pass':True})
  c.close()
 # DNT and tracker-blocking scenarios are actual Chromium cases; other browser engines are not implied.
 for case in ['DNT','tracker_block','corrupt_storage','quota_storage']:
  responses=[];c=b.new_context(viewport={'width':390,'height':844})
  if case=='DNT':c.add_init_script('Object.defineProperty(navigator,"doNotTrack",{get:()=>"1"})')
  if case=='quota_storage':c.add_init_script('const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==="camellia-prototype-v3")throw new DOMException("synthetic quota","QuotaExceededError");return original.call(this,key,value)}')
  if case=='corrupt_storage':c.add_init_script('localStorage.setItem("camellia-prototype-v3","{broken")')
  def blockedroute(r):
   if r.request.url.startswith(origin+'/'):r.continue_();return
   if r.request.method=='POST' and urllib.parse.urlsplit(r.request.url).hostname=='us.i.posthog.com':
    responses.extend(metadata(r.request,0 if case=='tracker_block' else 200))
    if case=='tracker_block':r.abort('blockedbyclient');return
   r.fulfill(status=200,body='{}',content_type='application/json',headers={'Access-Control-Allow-Origin':origin})
  c.route('**/*',blockedroute);page=c.new_page();page.goto(origin+'/analytics-fixture',wait_until='domcontentloaded')
  if case!='corrupt_storage':
   page.get_by_role('button',name='普通',exact=True).click();page.get_by_role('button',name='今日の私を見てみる',exact=True).click();page.wait_for_function('analyticsAudit.state.analyticsEvents.some(e=>e.name==="check_complete")')
  page.wait_for_timeout(350)
  rows=page.evaluate('analyticsAudit.state.analyticsEvents.map(e=>({event:e.name,forwardedAt:e.forwardedAt??null,suppressed:e.deliverySuppressed??null}))')
  if case in ['DNT','corrupt_storage','quota_storage']:assert len(responses)==0
  if case=='DNT':assert all(e['suppressed'] in ['dnt','opt_out'] for e in rows)
  if case=='tracker_block':assert responses and all(e['forwardedAt'] is None for e in rows)
  if case=='quota_storage':c.add_init_script('const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==="camellia-prototype-v3")throw new DOMException("synthetic quota","QuotaExceededError");return original.call(this,key,value)}')
  if case=='corrupt_storage':assert page.evaluate('localStorage.getItem("camellia-prototype-v3")')=='{broken'
  evidence.append({'case':case,'transport':responses,'internal':rows,'pass':True});c.close()
 evidence.append({'case':'other engines','webkitInstalled':os.path.exists(p.webkit.executable_path),'firefoxInstalled':os.path.exists(p.firefox.executable_path),'realSamsungInternet':'not available; prior baseline used Samsung UA on Chromium only'})
 b.close()
result={'scope':'LOCAL real React UI/store/PostHog SDK. All external transport intercepted. NO real cloud login or PostHog ingestion/UI.','cases':evidence}
(out/'fixed-browser-evidence.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
