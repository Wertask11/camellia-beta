import asyncio,json,hashlib
from pathlib import Path
from playwright.async_api import async_playwright
INIT="""window.permissionCalls=0;window.subscriptionPosts=0;let sub=null;const endpoint='https://fcm.googleapis.com/fcm/send/LOCAL-UI-FIXTURE';const reg={pushManager:{getSubscription:async()=>sub,subscribe:async opts=>{if(!opts.userVisibleOnly||opts.applicationServerKey.length!==65)throw Error('bad opts');sub={endpoint,toJSON:()=>({endpoint,keys:{p256dh:'B'+'A'.repeat(86),auth:'Q'.repeat(22)}}),unsubscribe:async()=>{sub=null;return true;}};return sub;}}};Object.defineProperty(window,'Notification',{value:class{static permission='default';static requestPermission(){window.permissionCalls++;this.permission='granted';return Promise.resolve('granted');}}});Object.defineProperty(window,'PushManager',{value:class{}});Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>{window.swRegistered=true;return reg;},ready:Promise.resolve(reg),getRegistration:async()=>window.swRegistered?reg:undefined}});"""
async def main():
 out=Path('docs/release-20261201/evidence');results=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [375,390,412,768,1280]:
   page=await b.new_page(viewport={'width':width,'height':844});await page.add_init_script(INIT);registered=False;posts=[]
   async def handle(route):
    nonlocal registered
    req=route.request
    if '/api/camellia/push-subscription' in req.url:
     if req.method=='POST':posts.append(req.post_data_json);registered=True;return await route.fulfill(json={'registered':True})
     if req.method=='DELETE':registered=False;return await route.fulfill(json={'stopped':True})
     return await route.fulfill(json={'ready':True,'preferencesRequested':True,'publicKey':'B'+'A'*86,'registered':registered,'registrationId':hashlib.sha256(b'https://fcm.googleapis.com/fcm/send/LOCAL-UI-FIXTURE').hexdigest() if registered else None,'revision':1})
    if req.url.startswith('http://127.0.0.1:4184'):return await route.continue_()
    return await route.abort()
   await page.route('**/*',handle);await page.goto('http://127.0.0.1:4184/fixture');await page.locator('summary').click();enable=page.get_by_role('button',name='この端末で通知を許可する');await enable.wait_for();assert await page.evaluate('window.permissionCalls')==0
   await enable.click();stop=page.get_by_role('button',name='このIDの通知配信を停止する');await stop.wait_for();assert await page.evaluate('window.permissionCalls')==1;assert len(posts)==1 and posts[0]['consent'] is True
   await stop.click();await page.get_by_text('このアカウントの通知配信を停止しました。',exact=True).wait_for();assert not registered;assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   await page.screenshot(path=str(out/f'push-{width}.png'));results.append({'width':width,'no_permission_on_open':True,'explicit_permission_and_registration':True,'stop':True,'no_overflow':True});await page.close()
  page=await b.new_page(viewport={'width':390,'height':844});await page.add_init_script(INIT)
  async def off(route):
   if '/api/camellia/push-subscription' in route.request.url:return await route.fulfill(json={'ready':False,'registered':False,'revision':0})
   if route.request.url.startswith('http://127.0.0.1:4184'):return await route.continue_()
   return await route.abort()
  await page.route('**/*',off);await page.goto('http://127.0.0.1:4184/fixture');await page.locator('summary').click();await page.get_by_text('配信は準備中です。この画面を開いただけでは通知の許可を要求しません。').wait_for();assert await page.evaluate('window.permissionCalls')==0;results.append({'mode':'unconfigured','no_permission':True});await b.close()
 out.joinpath('push-browser.json').write_text(json.dumps({'date':'2026-11-19','kind':'Local Chromium UI with injected Auth, Notification/ServiceWorker/PushManager and server fixtures. No real permission, subscription, provider call or OS display.','results':results},ensure_ascii=False,indent=2)+'\n');print(json.dumps(results))
asyncio.run(main())
