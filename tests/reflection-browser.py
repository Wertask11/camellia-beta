"""Local fixtures, no authentication or sync acceptance."""
import pathlib,json
from playwright.sync_api import sync_playwright
out=pathlib.Path('work/phase2d/browser');out.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(375,812),(390,844),(412,915),(768,1024),(1280,900)]:
  ctx=b.new_context(viewport={'width':width,'height':height});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4179/') else r.abort())
  page.goto('http://127.0.0.1:4179/layout');page.get_by_role('heading',name='最近の私').wait_for();assert page.locator('.insight-card').count()>0;assert page.get_by_text('事実',exact=True).count()>0;page.screenshot(path=str(out/f'{width}-my.png'),full_page=True)
  page.locator('.my-tree-entry').click();page.locator('.leaf-list button').first.click();page.get_by_role('dialog',name='葉の振り返り').wait_for();page.get_by_label('振り返るきっかけ（任意）').select_option('この関係で大切にしたいこと');page.get_by_role('textbox',name='この関係で大切にしたいこと').fill('自分のペースを大切にしたい');page.get_by_role('button',name='一言を残す',exact=True).click();page.get_by_role('dialog',name='葉の振り返り').get_by_text('この関係で大切にしたいこと：自分のペースを大切にしたい',exact=True).wait_for()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'{width}-reflection.png'));page.keyboard.press('Escape');page.get_by_role('dialog').wait_for(state='hidden');assert page.get_by_role('dialog').count()==0;assert not errors,errors
  results.append({'width':width,'my_facts_tree_reflection_keyboard':'PASS','live_sync':'NOT TESTED','errors':errors});ctx.close()
 b.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2))
