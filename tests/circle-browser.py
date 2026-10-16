"""Local component fixture only; NOT two-user or live API acceptance."""
import pathlib,json
from playwright.sync_api import sync_playwright
out=pathlib.Path('work/phase2a/browser');out.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(375,812),(390,844),(412,915),(768,1024),(1280,900)]:
  ctx=b.new_context(viewport={'width':width,'height':height});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4176/') else r.abort())
  page.goto('http://127.0.0.1:4176/circle-fixture');page.locator('.circle-card').first.wait_for();assert page.locator('.circle-card').count()==6
  page.screenshot(path=str(out/f'{width}-list.png'))
  page.locator('.circle-card').first.click();page.get_by_role('textbox',name='Circleだけの表示名（本名は使わないでください）').fill('テスト表示名')
  page.get_by_role('checkbox').check();page.get_by_role('button',name='参加する',exact=True).click();page.locator('.circle-post').first.wait_for()
  page.get_by_role('button',name='そっと応援',exact=True).first.click();page.wait_for_timeout(100);assert page.get_by_role('button',name='そっと応援',exact=True).first.get_attribute('aria-pressed')=='true'
  page.get_by_role('button',name='さらに投稿を読む').click();page.get_by_role('button',name='コメント',exact=True).first.click();page.get_by_text('そっと読んでいます。',exact=True).wait_for()
  page.get_by_role('button',name='通報',exact=True).first.click();page.get_by_role('group',name='通報する理由').wait_for();assert page.locator(':focus').count()==1
  page.get_by_role('button',name='その他',exact=True).click();page.get_by_text('通報を受け付けました。相手に通報者は通知しません。').wait_for()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'{width}-detail.png'),full_page=True)
  page.get_by_role('button',name='← Circle一覧へ',exact=True).click();page.get_by_role('button',name='運営：通報を確認する',exact=True).click();page.get_by_role('heading',name='通報の確認').wait_for()
  page.on('dialog',lambda d:d.accept());page.get_by_role('button',name='削除せず対応済みにする').click();page.get_by_text('未対応の通報はありません。').wait_for();page.get_by_role('button',name='対応履歴',exact=True).click();page.get_by_role('heading',name='運営の対応履歴').wait_for();page.screenshot(path=str(out/f'{width}-audit.png'))
  assert not errors,errors
  results.append({'width':width,'component_ui':'PASS','live_auth_api':'NOT TESTED','horizontal_overflow':False,'errors':errors});ctx.close()
 b.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2))
