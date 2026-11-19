import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
out=Path('docs/release-20261201/evidence');out.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  results=[]
  for width in [375,390,412,768,1280]:
   page=await browser.new_page(viewport={'width':width,'height':844});page.on('pageerror',lambda e:print('PAGE ERROR',e,flush=True));captured=[]
   async def handler(route):
    req=route.request
    if '/api/camellia/billing' in req.url:
     if 'analytics=stop' in req.url:return await route.fulfill(json={'stopped':True})
     b=req.post_data_json
     if b['operation']=='status':return await route.fulfill(json={'ready':True,'customer':False,'priceYen':500,'termsVersion':'local-terms','disclosureVersion':'local-disclosure','termsUrl':'http://127.0.0.1:4188/terms.html','disclosureUrl':'http://127.0.0.1:4188/billing.html'})
     captured.append(b);return await route.fulfill(status=503,json={'error':'BILLING_UNAVAILABLE'})
    if req.url.startswith('http://127.0.0.1:4188'):return await route.continue_()
    return await route.abort()
   await page.route('**/*',handler)
   await page.goto('http://127.0.0.1:4188/fixture');dialog=page.get_by_role('dialog');await dialog.wait_for()
   purchase=page.get_by_role('button',name='月額500円の支払い手続きへ');await purchase.wait_for();assert await purchase.is_disabled()
   await page.get_by_role('checkbox').check();assert await purchase.is_enabled();await purchase.click();await page.get_by_role('alert').wait_for();await purchase.click()
   assert len(captured)==2 and captured[0]['input']['requestId']==captured[1]['input']['requestId']
   assert captured[0]['input']['consent'] and 'uid' not in captured[0]['input']
   await page.locator('summary',has_text='支払い完了の計測').click();await page.get_by_role('button',name='支払い完了の計測を止める').click();await page.get_by_text('このIDの支払い完了の計測を停止しました。',exact=True).wait_for()
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert await dialog.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
   assert (await page.evaluate('window.events')).count('plus_start')==1
   await page.screenshot(path=str(out/f'billing-analytics-{width}.png'))
   await page.keyboard.press('Escape');assert await page.locator('body').get_attribute('data-closed')=='true'
   results.append({'width':width,'consent_required':True,'retry_same_intent':True,'start_event_once':True,'overflow':False,'escape':True,'explicit_payment_analytics_stop':True})
   await page.close()
  # Actual disabled/unconfigured and Portal management states, independent of paid flags in browser.
  for mode in ['disabled','portal']:
   page=await browser.new_page(viewport={'width':390,'height':844})
   async def disabled(route):
    if '/api/camellia/billing' in route.request.url:return await route.fulfill(json={'ready':False,'customer':mode=='portal','priceYen':500})
    if route.request.url.startswith('http://127.0.0.1:4188'):return await route.continue_()
    return await route.abort()
   await page.route('**/*',disabled);await page.goto('http://127.0.0.1:4188/fixture?mode='+mode)
   if mode=='disabled':await page.get_by_role('button',name='支払い受付は準備中').wait_for();assert await page.get_by_role('button',name='支払い受付は準備中').is_disabled()
   else:await page.get_by_role('button',name='支払い履歴・解約を確認する').wait_for()
   results.append({'mode':mode,'passed':True});await page.close()
  await browser.close()
 out.joinpath('billing-analytics-browser.json').write_text(json.dumps({'date':'2026-11-19','kind':'Local real Chromium with injected Auth/payment fixtures; no real login, Stripe call, charge or Preview/Production acceptance','results':results},ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(results))
asyncio.run(main())
