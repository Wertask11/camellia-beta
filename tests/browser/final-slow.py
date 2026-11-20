"""Local Chromium throttling only. No physical keyboard, real Auth or provider."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,os
origin=os.environ.get('CAMELLIA_BROWSER_ORIGIN','http://127.0.0.1:4210')
out=Path(os.environ['CAMELLIA_BROWSER_OUTPUT']);out.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':844});c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort());page=c.new_page();page.set_default_timeout(45000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  cdp=c.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':150,'downloadThroughput':200000,'uploadThroughput':75000});cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
  page.goto(origin,wait_until='domcontentloaded',timeout=90000);page.locator('.today').wait_for();page.get_by_role('button',name='普通',exact=True).click();page.get_by_role('button',name='今日の私を見てみる',exact=True).click()
  page.get_by_role('button',name='Camellia',exact=True).click();page.get_by_role('button',name='新しい会話を始める').click();box=page.get_by_role('textbox',name='Camelliaへのメッセージ');box.fill('LOCAL NETWORK RETRY')
  failed={'once':False}
  def chat(r):
   if not failed['once']:failed['once']=True;return r.fulfill(status=503,json={'error':'UNAVAILABLE'})
   return r.continue_()
  page.route('**/api/camellia/free-chat',chat);page.get_by_role('button',name='送信',exact=True).click();retry=page.get_by_role('button',name='もう一度試す',exact=True);expect(retry).to_be_visible();retry.click();page.wait_for_function('JSON.parse(localStorage.getItem("camellia-free-device-v1")).aiConversations[0]?.messages.some(m=>m.role==="assistant"&&m.status!=="error")')
  trigger=page.get_by_role('button',name='話し方を選ぶ（現在：YURA）',exact=True);trigger.click();expect(trigger).to_have_attribute('aria-expanded','true');page.keyboard.press('Escape');expect(trigger).to_be_focused()
  page.set_viewport_size({'width':width,'height':500});box.focus();box.scroll_into_view_if_needed();expect(box).to_be_visible();rect=box.bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=501
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors
  page.screenshot(path=str(out/f'{width}.png'));rows.append({'width':width,'network':'150ms / down200kB/s / up75kB/s','cpuSlowdown':4,'api503ThenExplicitRetry':True,'selectorEscapeFocus':True,'height500ComposerVisible':True,'overflow':False,'pageErrors':errors});c.close();print('PASS slow',width,flush=True)
 b.close()
(out/'result.json').write_text(json.dumps({'kind':__doc__,'results':rows},ensure_ascii=False,indent=2)+'\n')
