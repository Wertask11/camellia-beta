"""Actual app route/screens, synthetic Google/LINE and Place HTTP. No real auth or publication."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('/workspace/outputs/camellia-completion-20261110/operator');OUT.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':900});page=c.new_page();page.set_default_timeout(20000);requests=[];errors=[];state={'place':None}
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   u=r.request.url
   if '/api/camellia/place' in u:
    requests.append({'method':r.request.method,'url':u,'body':r.request.post_data_json if r.request.method=='POST' else None})
    if r.request.method=='POST':
     v=r.request.post_data_json
     if v['operation']=='save':state['place']={**v['place'],'id':v['place']['slug'],'status':'draft','createdAt':'2026-11-11T00:00:00Z','updatedAt':'2026-11-11T00:01:00Z'}
     elif v['operation']=='submit':state['place']['status']='review'
     r.fulfill(json={'ok':True});return
    if 'operatorStatus' in u:r.fulfill(json={'operator':True,'canPublish':False});return
    r.fulfill(json={'place':state['place']} if 'slug=' in u else {'places':[state['place']] if state['place'] else []});return
   if u.startswith('http://127.0.0.1:4173/'):r.continue_()
   else:r.abort()
  c.route('**/*',route)
  page.goto('http://127.0.0.1:4173/?open=place-operator');page.get_by_role('button',name='Googleで掲載管理を開く',exact=True).wait_for();assert not requests
  before=page.evaluate("localStorage.getItem('camellia-prototype-v3')")
  page.get_by_role('button',name='Googleで掲載管理を開く',exact=True).click();page.get_by_role('button',name='掲載候補を追加する',exact=True).click();form=page.get_by_role('form',name='掲載情報の下書き')
  for label,value in [('公開URL用の名前（半角英数字・ハイフン）','operator-fixture'),('店舗・施設名','LOCAL OPERATOR FIXTURE'),('地域','LOCAL REGION'),('エリア','LOCAL AREA'),('ここでできる体験','LOCAL EXPERIENCE'),('料金の案内','LOCAL PRICE'),('営業時間の案内','LOCAL HOURS'),('住所','LOCAL ADDRESS'),('公式URL','https://example.org/')]:form.get_by_label(label,exact=True).fill(value)
  form.get_by_label('カテゴリ',exact=True).select_option('カフェ');form.get_by_label('体験・サービス（1行に1件）',exact=True).fill('LOCAL SERVICE');form.get_by_label('利用許可を確認する写真のURL（1行に1件・最大5件）',exact=True).fill('https://example.org/fixture.jpg');form.get_by_role('button',name='下書きを保存する',exact=True).click()
  expect(page.get_by_text('運営プレビュー・掲載状態：draft',exact=True)).to_be_visible();assert page.get_by_role('button',name='確認済みとして公開する',exact=True).count()==0;page.get_by_role('button',name='reviewへ送る',exact=True).click();expect(page.get_by_text('運営プレビュー・掲載状態：review',exact=True)).to_be_visible()
  assert page.evaluate("localStorage.getItem('camellia-prototype-v3')")==before
  assert all('/api/camellia/place' in r['url'] for r in requests);assert all('operator=1' in r['url'] or 'operatorStatus=1' in r['url'] or r['method']=='POST' for r in requests)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors
  page.screenshot(path=str(OUT/f'{width}.png'),full_page=True);results.append({'width':width,'operatorEntryWithoutPersonalOnboarding':'PASS','noPersonalStorage':'PASS','scopedDraftReview':'PASS','noPublishForStaff':'PASS','noPublicMetrics':'PASS','errors':errors});c.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False));print(json.dumps(results,ensure_ascii=False))
