"""Slower transport/CPU and reduced viewport usability; dev fixture, not a production speed benchmark."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('/workspace/outputs/camellia-quality-20261110');results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tokyo');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4173/') else r.abort());page=c.new_page();page.set_default_timeout(45000);cdp=c.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':150,'downloadThroughput':200000,'uploadThroughput':75000});cdp.send('Emulation.setCPUThrottlingRate',{'rate':4});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4173',wait_until='domcontentloaded',timeout=90000);page.get_by_role('button',name='今日のわたしをCheckする',exact=True).click();page.get_by_role('button',name='Checkをせずに選択肢を見る',exact=True).click();page.get_by_role('button',name='Discover',exact=True).click();page.get_by_role('button',name='Placeで、今日の選択肢を見る →',exact=True).click();expect(page.locator('.place-card')).to_have_count(3)
  for i in [0,1]:page.get_by_role('checkbox',name='候補を比べる',exact=True).nth(i).check()
  trigger=page.get_by_role('button',name='選んだ候補を比較する（2/3）',exact=True);trigger.click();d=page.get_by_role('dialog',name='候補を比べて、自分で選ぶ',exact=True);expect(d).to_be_visible();page.keyboard.press('Escape');expect(d).to_have_count(0);expect(trigger).to_be_focused()
  page.get_by_role('button',name='← デモを閉じる',exact=True).click();page.get_by_role('button',name='Camellia',exact=True).click();message=page.get_by_role('textbox',name='Camelliaへのメッセージ');page.set_viewport_size({'width':width,'height':520});message.focus();message.scroll_into_view_if_needed();expect(message).to_be_visible();page.wait_for_function('document.querySelector(".composer input").getBoundingClientRect().bottom<=document.querySelector(".bottom-nav").getBoundingClientRect().top+1',timeout=10000);assert message.bounding_box()['y']+message.bounding_box()['height']<=page.locator('.bottom-nav').bounding_box()['y']+1,(width,message.bounding_box());assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,page.evaluate('({innerWidth,scroll:document.documentElement.scrollWidth})'));assert not errors,errors
  page.screenshot(path=str(OUT/f'slow-{width}.png'));results.append({'width':width,'network':'150ms,200kB/s down,75kB/s up','CPU':'4x slowdown','journey':'PASS','dialogEscapeFocus':'PASS','height520Composer':'PASS (viewport simulation, not real OS keyboard)','errors':errors});print('PASS width',width,flush=True);c.close()
 b.close()
(OUT/'slow-browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
