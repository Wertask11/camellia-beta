# Controlled A/B with real HTTP/SSE, browser rendering and store. NOT real Gemini latency.
import json,os,statistics,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('CAMELLIA_SPEED_EVIDENCE','/tmp/camellia-speed-browser'));out.mkdir(parents=True,exist_ok=True)
results=[];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (390,1280):
  for mode in ('batch','stream'):
   c=b.new_context(viewport={'width':width,'height':844},timezone_id='Asia/Tokyo')
   c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4331/') else r.abort())
   page=c.new_page();page.goto('http://127.0.0.1:4331/speed-fixture?conversation-transport='+mode)
   page.get_by_role('button',name='新しい会話を始める').click()
   for i in range(6):
    before=page.evaluate('speedAudit.state.aiConversations.reduce((n,c)=>n+c.messages.filter(m=>m.role==="assistant").length,0)')
    page.get_by_label('Camelliaへのメッセージ',exact=True).fill('合成QAで気持ちを整理したい')
    t=time.perf_counter();page.get_by_role('button',name='送信',exact=True).click()
    page.wait_for_function('document.querySelectorAll(".bubble.user").length>0')
    if mode=='stream':
     page.locator('.stream-draft').wait_for();partial=page.evaluate('speedAudit.state.aiConversations.flatMap(c=>c.messages).filter(m=>m.role==="assistant").length')
     assert partial==before,'draft assistant was persisted before done'
     if i==0:page.screenshot(path=str(out/f'draft-{width}.png'))
    page.wait_for_function('(n)=>speedAudit.state.aiConversations.reduce((s,c)=>s+c.messages.filter(m=>m.role==="assistant").length,0)>n',arg=before)
    page.wait_for_function('(n)=>window.__CAMELLIA_CONVERSATION_PERFORMANCE__?.length>n',arg=i)
    assert not page.evaluate('speedAudit.state.aiConversations.flatMap(c=>c.messages).some(m=>m.role==="user"&&m.pending===true)'), 'successful reply left a pending user'
    sample=page.evaluate('window.__CAMELLIA_CONVERSATION_PERFORMANCE__.at(-1)')
    sample.update(width=width,mode=mode,iteration=i,totalWallMs=round((time.perf_counter()-t)*1000));results.append(sample)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   c.close()
 # Remaining widths are responsive smoke, no claim of a real mobile device engine.
 for width in (375,412,768):
  c=b.new_context(viewport={'width':width,'height':844});c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4331/') else r.abort());page=c.new_page();page.goto('http://127.0.0.1:4331/speed-fixture');page.get_by_role('button',name='新しい会話を始める').click();assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(out/f'layout-{width}.png'));c.close()
 # Real UI failure/reload/retry checks. Synthetic HTTP dependency; no cloud identities.
 for fault in ('QA_FAIL','QA_SAFETY_LATE','QA_SLOW'):
  c=b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Tokyo')
  c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4331/') else r.abort())
  page=c.new_page();page.goto('http://127.0.0.1:4331/speed-fixture');page.get_by_role('button',name='新しい会話を始める').click()
  page.get_by_label('Camelliaへのメッセージ',exact=True).fill(fault);page.get_by_role('button',name='送信',exact=True).click();page.locator('.stream-draft').wait_for()
  assert page.evaluate('speedAudit.state.aiConversations.flatMap(c=>c.messages).filter(m=>m.role==="assistant").length')==0
  if fault=='QA_SLOW':
   page.reload();page.get_by_role('button',name=fault,exact=False).first.click()
   assert page.evaluate('speedAudit.state.aiConversations.flatMap(c=>c.messages).filter(m=>m.role==="assistant").length')==0
   page.get_by_role('button',name='もう一度試す',exact=True).click()
   page.wait_for_function('speedAudit.state.aiConversations.flatMap(c=>c.messages).some(m=>m.role==="assistant"&&m.provider==="gemini")')
   assert page.evaluate('speedAudit.state.aiConversations.flatMap(c=>c.messages).filter(m=>m.role==="user").length')==1
   checks.append({'case':'reload mid-stream → explicit retry','pass':True,'partialAssistantPersisted':False,'duplicateUser':False})
  else:
   page.locator('.chat-error').wait_for();assert page.locator('.stream-draft').count()==0
   assert not page.evaluate('speedAudit.state.aiConversations.flatMap(c=>c.messages).some(m=>m.role==="assistant"&&m.text.includes("少しずつ"))')
   if fault=='QA_FAIL':
    page.get_by_role('button',name='もう一度試す',exact=True).click();page.wait_for_function('speedAudit.state.aiConversations.flatMap(c=>c.messages).some(m=>m.role==="assistant"&&m.provider==="gemini")')
    assert page.evaluate('speedAudit.state.aiConversations.flatMap(c=>c.messages).filter(m=>m.role==="user").length')==1
   checks.append({'case':fault,'pass':True,'partialAssistantPersisted':False})
  assert page.evaluate('speedAudit.state.personalMemories.length')==0
  c.close()
 b.close()
summary=[]
for width in (390,1280):
 for mode in ('batch','stream'):
  samples=[r['timing'] for r in results if r['width']==width and r['mode']==mode]
  def stats(k):
   values=sorted(s[k] for s in samples if k in s);return {'median':statistics.median(values),'p90':values[max(0,__import__('math').ceil(len(values)*.9)-1)],'n':len(values)}
  summary.append({'width':width,'mode':mode,'firstVisibleMs':stats('client_first_visible_ms'),'fullResponseMs':stats('client_full_response_ms'),'sendToRequestMs':stats('client_send_to_request_ms')})
(out/'synthetic-ab.json').write_text(json.dumps({'label':'Synthetic provider, real browser/HTTP/store; not live Gemini','samples':results,'summary':summary,'failureChecks':checks},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
