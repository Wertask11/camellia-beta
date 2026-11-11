import os
"""Local actual UI + synthetic auth. No real listing or analytics transmission."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect
OUT=Path(os.environ.get('CAMELLIA_EVIDENCE_DIR','/workspace/outputs/camellia-quality-20261110'));results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tokyo');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4173/') else r.abort());page=c.new_page();page.set_default_timeout(20000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4173');page.get_by_role('button',name='今日のわたしをCheckする',exact=True).click();page.get_by_role('button',name='Discover',exact=True).click();page.get_by_role('button',name='Placeで、今日の選択肢を見る →',exact=True).click()
  count=page.locator('.place-card').count();assert count==3
  for index in [0,1]:page.get_by_role('checkbox',name='候補を比べる',exact=True).nth(index).check()
  page.get_by_role('button',name='選んだ候補を比較する（2/3）',exact=True).click();d=page.get_by_role('dialog',name='候補を比べて、自分で選ぶ',exact=True);expect(d).to_be_visible();expect(d).to_contain_text('デモ・体験イメージ');page.keyboard.press('Escape');expect(d).to_have_count(0)
  page.get_by_text('条件を調整する（エリア・料金・時間など）',exact=True).click();page.get_by_label('表示料金の上限',exact=True).select_option('1000');expect(page.get_by_role('button',name='選んだ候補を比較する（0/3）',exact=True)).to_be_disabled();page.get_by_label('Placeの所要時間',exact=True).select_option('30');expect(page.locator('.place-card')).to_have_count(1)
  page.get_by_role('checkbox',name='登録された営業時間内の候補',exact=True).check();expect(page.locator('.place-card')).to_have_count(0);expect(page.get_by_text('条件は自動では緩めません。',exact=False)).to_be_visible()
  page.get_by_role('checkbox',name='登録された営業時間内の候補',exact=True).uncheck();expect(page.locator('.place-card')).to_have_count(1)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors
  page.screenshot(path=str(OUT/f'phase2-{width}.png'),full_page=True);results.append({'width':width,'comparisonDialogEscape':'PASS','strictBudgetAndTime':'PASS','unknownHoursExcluded':'PASS','noAutomaticRelaxation':'PASS','pageErrors':errors});c.close()
 b.close()
(OUT/'phase2-browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
