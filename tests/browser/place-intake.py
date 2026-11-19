import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 out=Path('docs/release-20261201/evidence');results=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [375,390,412,768,1280]:
   page=await b.new_page(viewport={'width':width,'height':844});rows=[];posts=[]
   async def handle(route):
    req=route.request
    if '/api/camellia/place?applications=1' in req.url:
     if 'status=1' in req.url:return await route.fulfill(json={'enabled':True})
     if req.method=='POST':
      v=req.post_data_json;posts.append(v)
      if v['operation']=='submit':rows.append({'id':'a'*64,'status':'submitted','revision':1,'fields':v['fields'],'createdAt':'2026-11-19T00:00:00Z','updatedAt':'2026-11-19T00:00:00Z'})
      elif v['operation']=='review':rows[0].update(status='reviewing',revision=2)
      elif v['operation']=='approve':rows[0].update(status='approved',revision=3,placeSlug=v['slug'],scopeGranted=True)
      elif v['operation']=='revokeScope':rows[0].update(revision=4,scopeGranted=False)
      return await route.fulfill(json={'application':rows[0]})
     return await route.fulfill(json={'applications':rows,'nextCursor':None})
    if req.url.startswith('http://127.0.0.1:4185'):return await route.continue_()
    return await route.abort()
   await page.route('**/*',handle);await page.goto('http://127.0.0.1:4185/fixture');await page.get_by_label('店舗・施設名',exact=True).fill('LOCAL SYNTHETIC CAFE')
   for label,value in [('地域','福岡'),('エリア','LOCAL AREA'),('所在地','LOCAL ADDRESS'),('公式サイトURL','https://example.test/local'),('担当者名（非公開）','PRIVATE CONTACT'),('連絡先メール（非公開）','local@example.test'),('ここでできる体験・紹介したいこと','LOCAL SYNTHETIC EXPERIENCE')]:await page.get_by_label(label,exact=True).fill(value)
   await page.get_by_role('combobox').select_option(label='カフェ');assert len(posts)==0
   await page.get_by_role('checkbox').check();await page.get_by_role('button',name='運営へ申請する').click();await page.get_by_text('申請を受け付けました。審査状況はこの画面で確認できます。店舗はまだ公開していません。',exact=True).wait_for();assert posts[0]['fields']['consent'] is True
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth');await page.screenshot(path=str(out/f'place-intake-{width}.png'))
   await page.goto('http://127.0.0.1:4185/fixture?review=1');await page.get_by_role('button',name='運営確認を始める').click();await page.get_by_label('下書きの公開URL名',exact=True).fill('local-cafe');await page.get_by_role('button',name='非公開の下書き・担当権限を作る').click();await page.get_by_text('非公開の下書きと、この店舗だけの担当権限を作成しました。公開はまだ行っていません。',exact=True).wait_for();await page.get_by_role('button',name='この店舗の担当権限を解除する').click();await page.get_by_role('button',name='この店舗の担当権限を付与する').wait_for();assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth');results.append({'width':width,'explicit_submit':True,'review_and_nonpublic_assignment':True,'scope_revocation':True,'no_overflow':True});await page.close()
  await b.close()
 out.joinpath('place-intake-browser.json').write_text(json.dumps({'date':'2026-11-19','kind':'Local Chromium with injected Auth and API fixtures. Synthetic cafe only; no actual submission, rights assignment, real login or published store. Firestore authorization tested separately.','results':results},ensure_ascii=False,indent=2)+'\n');print(json.dumps(results))
asyncio.run(main())
