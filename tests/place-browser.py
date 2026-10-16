"""Fictional local fixture only: never published as a real place."""
import pathlib,json
from playwright.sync_api import sync_playwright
out=pathlib.Path('work/phase2c/browser');out.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(375,812),(390,844),(412,915),(768,1024),(1280,900)]:
  ctx=b.new_context(viewport={'width':width,'height':height});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4178/') else r.abort())
  page.goto('http://127.0.0.1:4178/place-fixture');page.locator('.place-card').wait_for();page.get_by_label('過ごし方').select_option('quiet');page.get_by_label('カテゴリ').select_option('本屋');page.locator('.place-card').click();page.locator('.place-detail').wait_for()
  assert page.get_by_role('link',name='公式サイト ↗').get_attribute('rel')=='noopener noreferrer'
  page.get_by_role('button',name='この場所を保存する',exact=True).click();page.get_by_role('button',name='保存を外す',exact=True).wait_for();assert page.get_by_role('button',name='保存を外す',exact=True).get_attribute('aria-pressed')=='true'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  page.screenshot(path=str(out/f'{width}-detail.png'),full_page=True);results.append({'width':width,'fixture_filters_detail_save':'PASS','real_published_place':'NOT TESTED','errors':errors});ctx.close()
 b.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2))
