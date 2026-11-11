import os
"""Real Chromium / actual app; synthetic auth and sync only. No production writes."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(os.environ.get('CAMELLIA_EVIDENCE_DIR','/workspace/outputs/camellia-quality-20261110'));OUT.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [375,390,412,768,1280]:
  ctx=browser.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tokyo');ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4173/') else r.abort())
  page=ctx.new_page();page.set_default_timeout(20000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4173');page.get_by_role('button',name='今日のわたしをCheckする',exact=True).click();page.get_by_role('button',name='Checkをせずに選択肢を見る',exact=True).click()
  expect(page.locator('#today-result')).to_have_count(0);page.get_by_label('使える時間',exact=True).select_option('2');page.get_by_role('button',name='この過ごし方を見る',exact=True).click()
  d=page.get_by_role('dialog');d.get_by_role('button',name='あとで',exact=True).first.click();d.get_by_role('button',name='保存だけ',exact=True).click();page.get_by_role('heading',name='今日、選んだこと',exact=True).wait_for()
  draft=page.evaluate("JSON.parse(sessionStorage.getItem('camellia-guest-check-v1'))");assert draft['version']==2 and 'check' not in draft;assert len(draft['savedActions'])==1
  assert not page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3')).checkins.length")
  page.get_by_role('button',name='今日のあなたを残す',exact=True).click();method='LINE' if width in [375,768] else 'Google';page.get_by_role('button',name=f'{method}で記録を残す',exact=True).click()
  page.get_by_label('名前／ニックネーム').fill('No Check QA');page.get_by_label('生年月日').fill('1995-01-01');page.get_by_label('私は女性です（自己申告）').check();page.get_by_role('button',name='記録を残して続ける',exact=True).click()
  page.get_by_role('heading',name='My Camellia',exact=True).wait_for()
  stored=lambda:page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))")
  assert not stored()['checkins'];assert len(stored()['savedActions'])==1;assert not page.evaluate("sessionStorage.getItem('camellia-guest-check-v1')")
  page.reload();page.locator('.today').wait_for();page.get_by_role('button',name='Camellia',exact=True).click();expect(page.get_by_role('heading',name='Camelliaに話す',exact=True)).to_be_visible()
  assert not stored()['checkins'] and len(stored()['savedActions'])==1
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors
  page.screenshot(path=str(OUT/f'phase1-{width}.png'),full_page=True);results.append({'width':width,'method':method,'noSyntheticCheck':True,'selectionSavedOnce':True,'reload':True,'overflow':False,'pageErrors':errors});ctx.close()
 browser.close()
(OUT/'phase1-browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
