"""Actual screens and storage; synthetic account, Circle and Place HTTP. Server authorization is tested separately in the emulator."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('/workspace/outputs/camellia-completion-20261110');OUT.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tokyo');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:4173/') else r.abort());page=c.new_page();page.set_default_timeout(20000);errors=[];posts=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:posts.append(r.post_data_json) if r.method=='POST' and '/api/camellia/circle' in r.url else None)
  page.goto('http://127.0.0.1:4173');page.get_by_role('button',name='今日のわたしをCheckする',exact=True).wait_for();page.request.get('http://127.0.0.1:4173/__ux/quality-reset')
  page.evaluate('''() => {const s=JSON.parse(localStorage.getItem('camellia-prototype-v3')),at=new Date().toISOString();s.profile={...s.profile,id:'synthetic-ux-user',name:'Experience QA',birthDate:'1995-01-01',womanSelfDeclared:true,agreedAt:at};s.onboardingComplete=true;s.placeChoices=[{id:crypto.randomUUID(),slug:'quality-ui-place',title:'LOCAL TEST PLACE',demo:false,createdAt:at,updatedAt:at}];localStorage.setItem('camellia-prototype-v3',JSON.stringify(s));sessionStorage.setItem('ux-signed-in','1');sessionStorage.setItem('ux-auth-uid','synthetic-ux-user');}''')
  page.reload();page.locator('.today').wait_for();page.get_by_role('button',name='My',exact=True).click();page.get_by_role('button',name='この体験を振り返る',exact=True).click();d=page.get_by_role('dialog',name='この体験を、自分のために振り返る',exact=True)
  expect(d.get_by_role('checkbox',name='この一言をMemoryにも残す',exact=False)).not_to_be_checked();d.get_by_label('体験の感想',exact=True).select_option('helpful');d.get_by_label('残したい一言（任意）',exact=True).fill('PRIVATE REFLECTION');d.get_by_role('checkbox',name='実際に体験した（自己申告）',exact=False).check()
  remembered=width in [390,1280]
  if remembered:d.get_by_role('checkbox',name='この一言をMemoryにも残す',exact=False).check()
  d.get_by_role('button',name='この振り返りを残す',exact=True).click();expect(d).to_have_count(0)
  saved=page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))");assert saved['version']==4;assert len(saved['placeExperiences'])==1 and saved['placeExperiences'][0]['status']=='self_reported';assert len(saved['personalMemories'])==int(remembered);assert page.evaluate("JSON.parse(localStorage.getItem('camellia-local-backup:synthetic-ux-user:pre-v4')).version")==3;assert not posts
  page.reload();page.locator('.today').wait_for();page.get_by_role('button',name='My',exact=True).click();expect(page.locator('body')).to_contain_text('PRIVATE REFLECTION')
  before=page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))");backup=json.dumps(before,ensure_ascii=False).encode();page.on('dialog',lambda dialog:dialog.accept());page.get_by_role('button',name='この振り返りを削除する',exact=True).click()
  page.get_by_text('その他',exact=True).click();upload=page.get_by_label('個人記録のファイル',exact=True);upload.set_input_files({'name':'own-backup.json','mimeType':'application/json','buffer':backup});page.get_by_role('button',name='確認した記録を追加する（現在の控えも残す）',exact=True).click()
  state=page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))");assert state['placeExperiences'][0]['status']=='removed' and state['placeExperiences'][0]['text']==''
  extra={**before,'personalMemories':before['personalMemories']+[{'id':'restore-unique','text':'RESTORED TEST RECORD','source':'explicit_place','createdAt':before['createdAt']}],'analyticsEvents':[{'id':'imported-should-not-deliver','name':'check_complete','createdAt':before['createdAt']}]}
  upload.set_input_files({'name':'own-additional-backup.json','mimeType':'application/json','buffer':json.dumps(extra).encode()});page.get_by_role('button',name='確認した記録を追加する（現在の控えも残す）',exact=True).click();expect(page.locator('body')).to_contain_text('RESTORED TEST RECORD');state=page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))");assert not any(e['id']=='imported-should-not-deliver' for e in state['analyticsEvents']);assert page.evaluate("Object.keys(localStorage).some(k=>k.includes(':restore-'))")
  bad={**extra,'profile':{**extra['profile'],'id':'other-owner'}};upload.set_input_files({'name':'wrong-owner.json','mimeType':'application/json','buffer':json.dumps(bad).encode()});expect(page.get_by_role('alert')).to_contain_text('原本は変更していません');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors;results.append({'width':width,'restoreTombstonePreserved':'PASS','sameOwnerAdditiveImport':'PASS','noAnalyticsReplay':'PASS','foreignOwnerRejected':'PASS','pageErrors':errors});c.close()
 b.close()
(OUT/'completion-data-browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
