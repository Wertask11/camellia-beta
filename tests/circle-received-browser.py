"""Real Circle UI with explicit local data; not real two-account acceptance."""
import json,pathlib
from playwright.sync_api import sync_playwright
out=pathlib.Path('work/circle-reactions/browser');out.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(375,812),(390,844),(412,915),(768,1024),(1280,900)]:
  print(f'Checking received reactions at {width}px',flush=True)
  ctx=b.new_context(viewport={'width':width,'height':height});ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4176/') else r.abort());page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4176/circle-fixture#received');page.locator('.circle-card').first.click();page.get_by_role('textbox',name='Circleだけの表示名（本名は使わないでください）').fill('検証の葉');page.get_by_role('checkbox').check();page.get_by_role('button',name='参加する',exact=True).click();page.locator('.circle-post').first.wait_for()
  assert page.get_by_text('届いた気持ちは、ここに表示されます。',exact=True).count()==1
  page.get_by_role('button',name='コメント',exact=True).first.click();page.get_by_text('そっと読んでいます。',exact=True).wait_for();composer=page.get_by_role('textbox',name='コメントを書く');composer.fill('書きかけのコメント')
  def receive(kind,counts):page.evaluate('(detail)=>window.dispatchEvent(new CustomEvent("fixture:received",{detail}))',{'kind':kind,'counts':counts})
  receive('post',{'わかる':1,'そっと応援':2,'参考になった':0});page.get_by_text('届いた気持ち：わかる 1 ／ そっと応援 2',exact=True).wait_for(timeout=8000)
  receive('comment',{'わかる':0,'そっと応援':0,'参考になった':1});page.locator('.circle-post').filter(has_text='そっと読んでいます。').get_by_text('届いた気持ち：参考になった 1',exact=True).wait_for(timeout=8000)
  assert composer.input_value()=='書きかけのコメント';assert composer.evaluate('(e)=>document.activeElement===e')
  assert page.get_by_role('status').filter(has_text='届いた気持ち：').count()==2;assert page.locator('.circle-received').first.get_attribute('aria-atomic')=='true'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'{width}-received.png'),full_page=True)
  receive('post',{'わかる':0,'そっと応援':1,'参考になった':1});page.get_by_text('届いた気持ち：そっと応援 1 ／ 参考になった 1',exact=True).wait_for(timeout=8000)
  receive('post',{'わかる':0,'そっと応援':0,'参考になった':0})
  try:page.locator('.circle-post').first.get_by_text('届いた気持ちは、ここに表示されます。',exact=True).wait_for(timeout=8000)
  except Exception:
   page.screenshot(path=str(out/f'{width}-cancel-failure.png'),full_page=True)
   print(page.locator('body').inner_text(),flush=True)
   print(page.evaluate('async()=>({visibility:document.visibilityState,stats:(await import("/tests/circle-ui-fixture.ts")).stats})'),flush=True)
   raise
  own=ctx.new_page();own.goto('http://127.0.0.1:4176/circle-fixture');own.get_by_role('button',name='自分の投稿・コメント',exact=True).click();own.get_by_text('届いた気持ち：わかる 1 ／ そっと応援 2',exact=True).wait_for();own.get_by_role('button',name='コメント',exact=True).click();own.get_by_text('自分のコメントです。',exact=True).wait_for();assert own.get_by_text('届いた気持ち：わかる 1 ／ そっと応援 2',exact=True).count()==1
  assert not errors,errors;results.append({'width':width,'post_and_comment_received':'PASS','live_switch_cancel':'PASS','draft_and_focus_preserved':'PASS','own_history':'PASS','horizontal_overflow':False,'scope':'explicit local fixture; real user acceptance remains required'});ctx.close()
 b.close()
(out/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False));print(json.dumps(results,indent=2,ensure_ascii=False))
