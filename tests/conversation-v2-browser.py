"""Real components + local history fixture. No live auth or API acceptance claim."""
import json,pathlib,re
from playwright.sync_api import sync_playwright
out=pathlib.Path('work/phase2b/browser');out.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(375,812),(390,844),(412,915),(768,1024),(1280,900)]:
  context=b.new_context(viewport={'width':width,'height':height},reduced_motion='reduce',timezone_id='Asia/Tokyo')
  context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:4177/') else route.abort())
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4177/layout-conversation',wait_until='domcontentloaded',timeout=60000);page.get_by_role('heading',name='Camelliaに話す',exact=True).wait_for()
  assert page.locator('.conversation-preview').count()==2
  page.get_by_role('searchbox',name='会話を探す').fill('週末');assert page.locator('.conversation-preview').count()==1
  page.get_by_role('searchbox',name='会話を探す').fill('');page.screenshot(path=str(out/f'{width}-library.png'))
  page.get_by_role('button',name=re.compile('仕事で気になっていること')).click();page.locator('.bubble').last.wait_for();page.wait_for_timeout(500)
  assert page.locator('.bubble').count()==40
  composer=page.locator('.composer').bounding_box();assert composer['y']>=0 and composer['y']+composer['height']<=height-76+2,(width,composer)
  starters=page.locator('.conversation-entry .quick-inputs').bounding_box();assert starters['y']+starters['height']<=composer['y']+1,(width,starters,composer)
  assert height-76-(composer['y']+composer['height'])<18
  assert page.locator('.chat').evaluate('(e)=>e.scrollHeight>e.clientHeight&&e.scrollTop>0')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.get_by_role('button',name='前の会話を読む',exact=True).click();assert page.locator('.bubble').count()==80
  page.screenshot(path=str(out/f'{width}-thread.png'))
  page.get_by_role('button',name='会話一覧へ戻る',exact=True).click();page.get_by_role('button',name=re.compile('週末の楽しみを考えたい')).click();assert page.locator('.bubble').count()==1
  assert page.locator('.bubble').bounding_box()['height']<150,'a single short message must not fill the viewport'
  page.get_by_role('button',name='新しい会話を始める',exact=True).click();assert page.locator('.bubble').count()==0
  page.goto('http://127.0.0.1:4177/layout-conversation?short=1',wait_until='domcontentloaded',timeout=60000);page.locator('.conversation-preview').click();page.locator('.bubble.assistant').wait_for()
  assert page.locator('.bubble.user').bounding_box()['height']<150
  assert page.locator('.bubble.assistant').bounding_box()['height']<150
  assert page.locator('.bubble.assistant').bounding_box()['y']-page.locator('.bubble.user').bounding_box()['y']-page.locator('.bubble.user').bounding_box()['height']<=12
  page.screenshot(path=str(out/f'{width}-short-thread.png'))
  assert not errors,errors
  results.append({'width':width,'library_search_switch_new':'PASS','legacy80messages_paged40':'PASS','composer_visible':'PASS','short_bubbles_fit_content':'PASS','errors':errors});context.close()
 b.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2))
