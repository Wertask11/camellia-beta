import os
"""Actual screens and storage; synthetic account, Circle and Place HTTP. Server authorization is tested separately in the emulator."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(os.environ.get('CAMELLIA_EVIDENCE_DIR','/workspace/outputs/camellia-quality-20261110'));results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tokyo');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4173/') else r.abort());page=c.new_page();page.set_default_timeout(20000);errors=[];posts=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:posts.append(r.post_data_json) if r.method=='POST' and '/api/camellia/circle' in r.url else None)
  page.goto('http://127.0.0.1:4173');page.get_by_role('button',name='今日のわたしをCheckする',exact=True).wait_for();page.request.get('http://127.0.0.1:4173/__ux/quality-reset')
  page.evaluate('''() => {const s=JSON.parse(localStorage.getItem('camellia-prototype-v3')),at=new Date().toISOString();s.profile={...s.profile,id:'synthetic-ux-user',name:'Experience QA',birthDate:'1995-01-01',womanSelfDeclared:true,agreedAt:at};s.onboardingComplete=true;s.placeChoices=[{id:crypto.randomUUID(),slug:'quality-ui-place',title:'LOCAL TEST PLACE',demo:false,createdAt:at,updatedAt:at}];localStorage.setItem('camellia-prototype-v3',JSON.stringify(s));sessionStorage.setItem('ux-signed-in','1');sessionStorage.setItem('ux-auth-uid','synthetic-ux-user');}''')
  page.reload();page.locator('.today').wait_for();page.get_by_role('button',name='My',exact=True).click();page.get_by_text('通知の好み（配信は準備中）',exact=True).click()
  requested=page.get_by_role('checkbox',name='配信が始まったら通知を希望する',exact=True);expect(requested).not_to_be_checked();requested.check();save=page.get_by_role('button',name='通知の好みを保存する',exact=True);expect(save).to_be_disabled();page.get_by_role('checkbox',name='場所・体験との出会い',exact=True).check();page.get_by_label('希望する通知頻度',exact=True).select_option('weekly');save.click();expect(page.locator('output')).to_contain_text('通知配信は始まりません')
  state=page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))");assert state['profile']['notificationPreferences']['topics']==['place'] and state['profile']['notificationPreferences']['requested']
  page.reload();page.locator('.today').wait_for();page.get_by_role('button',name='My',exact=True).click();page.get_by_text('通知の好み（配信は準備中）',exact=True).click();expect(page.get_by_role('checkbox',name='配信が始まったら通知を希望する',exact=True)).to_be_checked();page.get_by_role('checkbox',name='配信が始まったら通知を希望する',exact=True).uncheck();page.get_by_role('button',name='通知の好みを保存する',exact=True).click()
  saved=page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))");assert saved['profile']['notificationPreferences']['requested']==False and saved['profile']['notificationPreferences']['topics']==[]
  page.get_by_text('紹介とPlus体験（準備中）',exact=True).click();expect(page.locator('body')).to_contain_text('紹介制度はまだ始まっていません');expect(page.locator('body')).to_contain_text('自動課金はありません');assert page.get_by_role('button',name='紹介リンクを作る',exact=True).count()==0
  page.route('**/api/camellia/share',lambda r:r.fulfill(status=404,json={'error':'SHARE_NOT_FOUND'}));page.goto('http://127.0.0.1:4173/?open=partner-share#'+'A'*43);expect(page.get_by_role('heading',name='伝えたいこと',exact=True)).to_be_visible();page.get_by_role('alert').wait_for();page.get_by_role('button',name='Camelliaを見てみる',exact=True).click();assert '#' not in page.url
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors;page.screenshot(path=str(OUT/f'phase5-{width}.png'),full_page=True);results.append({'width':width,'explicitPreferences':'PASS','reload':'PASS','optOut':'PASS','delivery':'OFF','referral':'STOPPED','publicShareUnavailable':'PASS','pageErrors':errors});c.close()
 b.close()
(OUT/'phase5-browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
