"""Chromium checks for tests/phase1-layout.mjs. Component layout only; no auth/API mocks.
Start `node tests/phase1-layout.mjs`, then `python tests/phase1-browser.py`.
Python Playwright and Chromium are optional local verification dependencies.
"""
import json
import pathlib
from playwright.sync_api import sync_playwright
out=pathlib.Path('work/browser');out.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height in [(375,812),(390,844),(412,915),(768,1024),(1280,900)]:
        context=browser.new_context(viewport={'width':width,'height':height},timezone_id='Asia/Tokyo',reduced_motion='reduce')
        context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:4175/') else route.abort())
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:4175/layout');page.locator('main.screen').wait_for()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'Today overflow {width}'
        page.screenshot(path=str(out/f'{width}-today.png'),full_page=True)
        page.get_by_role('button',name='Discover fixture',exact=True).click();page.get_by_role('heading',name='Discover',exact=True).wait_for()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'Discover overflow {width}'
        assert page.locator('.action-card').count()>=60
        page.screenshot(path=str(out/f'{width}-discover.png'),full_page=True)
        page.get_by_role('button',name='窓辺で空を見る（休む · 2分）',exact=True).click();page.get_by_role('dialog').wait_for()
        page.get_by_role('button',name='やってみる',exact=True).click();assert page.locator('.runner li').count()>=2
        page.screenshot(path=str(out/f'{width}-action.png'))
        page.get_by_role('button',name='できた',exact=True).click();assert page.get_by_role('dialog').count()==0
        assert not errors,errors
        results.append({'width':width,'scope':'local real components; auth/API acceptance excluded','Today':'PASS','Discover':'PASS','action_steps':'PASS','overflow':'none','pageerrors':errors});context.close()
    browser.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2))
