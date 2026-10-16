"""Public demo in real app entry; no auth or API fixtures. Remote networking blocked."""
import pathlib,json
from playwright.sync_api import sync_playwright
out=pathlib.Path('work/phase2c/demo-browser');out.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(375,812),(390,844),(412,915),(768,1024),(1280,900)]:
  ctx=b.new_context(viewport={'width':width,'height':height});page=ctx.new_page();errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url) if '/api/camellia/place' in r.url else None)
  ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4181/') else r.abort())
  page.goto('http://127.0.0.1:4181/?open=place-demo',wait_until='domcontentloaded');page.locator('.place-card').first.wait_for();assert page.locator('.place-card').count()==3
  page.wait_for_timeout(1000)
  assert page.evaluate("sessionStorage.getItem('camellia-welcome-view')") is None
  assert page.evaluate("sessionStorage.getItem('camellia-login-view')") is None
  page.get_by_role('note',name='Placeデモについて').wait_for();page.get_by_label('カテゴリ').select_option('本屋');assert page.locator('.place-card').count()==1
  page.locator('.place-card').click();page.locator('.place-detail').wait_for();assert page.get_by_role('link').count()==0;assert page.get_by_role('button',name='この場所を保存する',exact=True).count()==0
  assert not requests,requests;assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(out/f'{width}.png'),full_page=True)
  page.reload(wait_until='domcontentloaded');page.locator('.place-detail').wait_for();assert not requests,requests
  results.append({'width':width,'public_demo_no_login':'PASS','no_false_auth_funnel':'PASS','filter_detail_deep_link':'PASS','place_api_requests':len(requests),'no_external_or_save_controls':'PASS','remote_photos':'NOT TESTED','errors':errors});ctx.close()
 b.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2))
