import asyncio,json,hashlib
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 out=Path('docs/release-20261201/evidence');rows=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [375,390,412,768,1280]:
   page=await b.new_page(viewport={'width':width,'height':844});calls=[];links=[];id=hashlib.sha256(('Q'*43).encode()).hexdigest()
   await page.add_init_script("Object.defineProperty(navigator,'share',{value:async data=>{window.shared=data;}})")
   async def handler(route):
    req=route.request
    if '/api/camellia/referral' in req.url:
     if req.method=='GET':return await route.fulfill(json={'enabled':True})
     body=req.post_data_json;calls.append(body)
     if body['operation']=='history':return await route.fulfill(json={'links':links})
     if body['operation']=='revoke':
      links[0]['revoked']=True
      return await route.fulfill(json={'revoked':True})
     links.append({'id':id,'createdAt':1795132800000,'revoked':False})
     return await route.fulfill(json={'token':'Q'*43})
    if req.url.startswith('http://127.0.0.1:4183'):return await route.continue_()
    return await route.abort()
   await page.route('**/*',handler);await page.goto('http://127.0.0.1:4183/fixture');await page.locator('summary').click()
   issue=page.get_by_role('button',name='紹介リンクを作る');await issue.wait_for();assert not any(c['operation']=='issue' for c in calls)
   await issue.click();field=page.get_by_label('紹介リンク',exact=True);await field.wait_for();url=await field.input_value();assert url.endswith('?referral='+'Q'*43)
   assert await page.evaluate('window.shared===undefined')
   await page.get_by_role('button',name='送り先を選ぶ・コピーする').click();assert (await page.evaluate('window.shared.url'))==url
   page.once('dialog',lambda d:d.accept())
   await page.get_by_role('button',name='紹介リンク1を取り消す',exact=True).click()
   await page.get_by_text('取消済み',exact=False).wait_for()
   assert not await page.get_by_label('紹介リンク',exact=True).count()
   assert sum(c['operation']=='revoke' for c in calls)==1
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   await page.screenshot(path=str(out/f'referral-{width}.png'))
   await page.goto('http://127.0.0.1:4183/decorations/preview.html');await page.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert await page.get_by_role('img').count()==3
   await page.screenshot(path=str(out/f'decorations-{width}.png'));rows.append({'width':width,'explicit_issue':True,'explicit_native_share':True,'owner_history_and_revoke':True,'no_automatic_send':True,'no_overflow':True,'draft_assets_loaded':3});await page.close()
  await b.close()
 out.joinpath('referral-browser.json').write_text(json.dumps({'date':'2026-11-20','kind':'Local Chromium; Auth/referral/native-share are fixtures. Catalog remains unapproved. No actual referral, new user, reward or send.','results':rows},ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows))
asyncio.run(main())
