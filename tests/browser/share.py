import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 results=[];out=Path('docs/release-20261201/evidence')
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [375,390,412,768,1280]:
   page=await browser.new_page(viewport={'width':width,'height':844});calls=[]
   await page.add_init_script("Object.defineProperty(navigator,'share',{value:async data=>{window.nativeShares??=[];window.nativeShares.push(data);}})")
   async def route_handler(route):
    req=route.request
    if '/api/camellia/membership' in req.url:return await route.fulfill(json={'plan':'plus','paid':True,'trial':False,'expiresAt':'2027-12-31T00:00:00Z','priceYen':500,'sharingReady':True,'capabilitiesVersion':'partner_v1'})
    if '/api/camellia/share' in req.url:
     body=req.post_data_json;calls.append(body)
     if body['operation']=='list':return await route.fulfill(json={'shares':[]})
     if body['operation']=='create':return await route.fulfill(json={'token':'Q'*43,'id':'a'*64,'content':{'expiresAt':'2027-12-31T00:00:00Z'}})
     return await route.fulfill(json={'ok':True})
    if req.url.startswith('http://127.0.0.1:4182'):return await route.continue_()
    return await route.abort()
   await page.route('**/*',route_handler);await page.goto('http://127.0.0.1:4182/fixture');dialog=page.get_by_role('dialog');await dialog.wait_for()
   create=page.get_by_role('button',name='この内容で共有URLを作る');await create.wait_for();assert await create.is_disabled()
   await page.get_by_label('誰に伝えますか').select_option('partner');await page.get_by_role('checkbox').check();await create.click()
   await page.get_by_label('共有URL',exact=True).wait_for();url=await page.get_by_label('共有URL',exact=True).input_value();assert url.endswith('#'+'Q'*43);assert '今日は' not in url
   assert await page.evaluate('window.nativeShares===undefined'),'creating URL never opens native send UI'
   await page.get_by_role('button',name='送り先を選んで送る').click();await page.get_by_text('共有先の画面へ渡しました。').wait_for();assert await page.evaluate('window.nativeShares.length')==1
   await page.get_by_role('button',name='この共有を取り消す').click();await page.get_by_text('取り消し済み').wait_for()
   assert len([x for x in calls if x['operation']=='create'])==1
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert await dialog.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
   await page.screenshot(path=str(out/f'share-{width}.png'));await page.keyboard.press('Escape');assert await page.locator('body').get_attribute('data-closed')=='true'
   results.append({'width':width,'explicit_recipient_and_consent':True,'creation_does_not_send':True,'native_share_explicit_only':True,'revoke':True,'no_horizontal_overflow':True,'escape':True})
   await page.close()
  await browser.close()
 out.joinpath('share-browser.json').write_text(json.dumps({'date':'2026-11-19','kind':'Local real Chromium with injected Auth/membership/share/native-share fixtures. No actual login, recipient or Production URL. HTTP/Firestore issuance and third-party read are separately tested.','results':results},ensure_ascii=False,indent=2)+'\n');print(json.dumps(results))
asyncio.run(main())
