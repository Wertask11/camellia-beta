"""Actual screens/storage; local fake mail/Auth/cloud receipts, no real mail or account."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,re
out=Path('/workspace/outputs/camellia-free-id-20261117/email');out.mkdir(parents=True,exist_ok=True)
origin='http://127.0.0.1:4173';free='camellia-free-device-v1';primary='camellia-prototype-v3';results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tokyo');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort());page=c.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(origin);page.locator('.today').wait_for();page.get_by_role('button',name='普通',exact=True).click();page.get_by_role('button',name='今日の私を見てみる',exact=True).click()
  source=page.evaluate("JSON.parse(localStorage.getItem('camellia-free-device-v1'))");source_id=source['checkins'][0]['id'];page.get_by_role('button',name='My',exact=True).click();page.get_by_role('button',name='Camellia IDで引き継ぐ（無料）',exact=True).click()
  page.get_by_label('メールアドレス',exact=True).fill('local@example.test');page.get_by_role('checkbox').check();page.get_by_role('button',name='確認メールを受け取る',exact=True).click();expect(page.get_by_role('heading',name='確認メールの送信を受け付けました')).to_be_visible()
  req=page.evaluate("JSON.parse(sessionStorage.getItem('ux-email-request'))");assert req['settings']['url']==origin+'/?auth=email';assert page.evaluate("localStorage.getItem('camellia-prototype-v3')")==None
  page.goto(origin+'/?auth=email&mode=signIn&oobCode=ux-email&apiKey=LOCAL');page.get_by_role('heading',name='登録前の記録を引き継ぐ').wait_for();expect(page.get_by_role('button',name='確認した記録を、このIDへ引き継ぐ')).to_be_visible();assert 'oobCode' not in page.url
  assert page.evaluate("JSON.parse(localStorage.getItem('camellia-free-device-v1')).checkins.length")==1
  page.get_by_role('button',name='確認した記録を、このIDへ引き継ぐ',exact=True).click();page.wait_for_function("JSON.parse(localStorage.getItem('camellia-free-transfer-v1')).stage==='applied'")
  assert page.evaluate("localStorage.getItem('camellia-free-device-v1')")==None
  saved=page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))");assert saved['profile']['emailIdSetup'] and not saved['profile'].get('birthDate');assert any(x['id']==source_id for x in saved['checkins']);assert page.evaluate("localStorage.getItem('camellia-free-transfer-v1')")
  page.evaluate("sessionStorage.setItem('ux-cloud-confirm','1')");page.get_by_role('button',name='IDへの保存を確認する',exact=True).click();expect(page.get_by_role('status').filter(has_text='記録をCamellia IDへ引き継ぎ、保存を確認しました。')).to_be_visible();assert page.evaluate("localStorage.getItem('camellia-free-transfer-v1')")==None
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors
  page.screenshot(path=str(out/f'{width}.png'),full_page=True)
  # A later unregistered session must never reopen the migrated journal as local Free data.
  page.evaluate("sessionStorage.removeItem('ux-signed-in');sessionStorage.removeItem('ux-auth-uid');sessionStorage.removeItem('ux-auth-provider')");page.goto(origin);page.locator('.today').wait_for();assert not page.evaluate("JSON.parse(localStorage.getItem('camellia-free-device-v1')).checkins.length");assert any(x['id']==source_id for x in page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))")['checkins'])
  results.append({'width':width,'emailFlow':'PASS synthetic mail/Auth','explicitMigration':'PASS','noBirthdateFabrication':'PASS','backupUntilCloudProof':'PASS synthetic receipt','logoutIsolation':'PASS','overflow':False,'pageErrors':errors});c.close()
 b.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
