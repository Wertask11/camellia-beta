"""Current components in Chromium with local-only synthetic state. Not live auth acceptance."""
import json,pathlib,os
from playwright.sync_api import sync_playwright,expect
out=pathlib.Path(os.environ.get('ALPHA_BROWSER_OUTPUT','work/alpha-browser'));out.mkdir(parents=True,exist_ok=True)
origin='http://127.0.0.1:'+os.environ.get('ALPHA_PORT','4311');results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(375,812),(390,844),(412,915),(768,1024),(1280,900)]:
  ctx=b.new_context(viewport={'width':width,'height':height},timezone_id='Asia/Tokyo',accept_downloads=True);page=ctx.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort());page.set_default_timeout(15000);page.set_default_navigation_timeout(60000)
  for broken in ['treeLeaves','checkins','aiConversations','actions','json']:
   page.goto(origin+'/alpha-fixture?case=storage&broken='+broken,wait_until='domcontentloaded');page.get_by_role('heading',name='記録を守るため、確認が必要です').wait_for()
   assert 'QuotaExceededError' not in page.inner_text('body');assert 'LOCAL_DATA' not in page.inner_text('body')
   with page.expect_download() as download:page.get_by_role('button',name='記録の控えをファイルに保存する').click()
   exported=json.loads(pathlib.Path(download.value.path()).read_text());assert exported['originals']['camellia-prototype-v3']
   if broken not in ['checkins','json']:assert len(exported['recovered']['checkins'])==1
   page.get_by_role('button',name='もう一度読み込む').click();page.get_by_role('heading',name='記録を守るため、確認が必要です').wait_for()
   page.evaluate('window.alphaFixture.repair()');page.get_by_role('button',name='もう一度読み込む').click();page.get_by_text('記録を表示できます',exact=True).wait_for()
  page.evaluate('''()=>{const original=Storage.prototype.setItem;window.alphaQuota=true;Storage.prototype.setItem=function(key,value){if(this===localStorage&&key==='camellia-prototype-v3'&&window.alphaQuota)throw new DOMException('synthetic audit quota','QuotaExceededError');return original.call(this,key,value);};window.alphaFixture.update();}''')
  page.get_by_role('heading',name='記録を守るため、確認が必要です').wait_for()
  with page.expect_download() as download:page.get_by_role('button',name='記録の控えをファイルに保存する').click()
  assert json.loads(pathlib.Path(download.value.path()).read_text())['recovered']['profile']['name']=='保存前の変更'
  page.screenshot(path=str(out/f'{width}-quota.png'));page.evaluate('window.alphaQuota=false');page.get_by_role('button',name='もう一度保存する').click();page.get_by_text('記録を表示できます',exact=True).wait_for()
  assert page.evaluate('JSON.parse(localStorage.getItem("camellia-prototype-v3")).profile.name')=='保存前の変更'
  page.goto(origin+'/alpha-fixture?case=dialog',wait_until='domcontentloaded');page.get_by_text('その他',exact=True).click();trigger=page.get_by_role('button',name='保存データを削除する',exact=True);trigger.click()
  dialog=page.get_by_role('dialog',name='保存データを削除しますか？');expect(dialog).to_be_visible();cancel=dialog.get_by_role('button',name='キャンセル',exact=True);expect(cancel).to_be_focused()
  page.keyboard.press('Shift+Tab');expect(dialog.get_by_role('button',name='削除する',exact=True)).to_be_focused();page.keyboard.press('Tab');expect(cancel).to_be_focused()
  trigger.evaluate('(e)=>e.focus()');assert page.evaluate('document.activeElement.closest("dialog")!==null')
  assert dialog.get_attribute('aria-modal')=='true';assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'{width}-delete-dialog.png'))
  page.keyboard.press('Escape');expect(dialog).to_have_count(0);expect(trigger).to_be_focused()
  trigger.click();page.get_by_role('dialog').get_by_role('button',name='キャンセル',exact=True).click();expect(trigger).to_be_focused()
  page.goto(origin+'/alpha-fixture?case=fortune',wait_until='domcontentloaded');page.get_by_role('heading',name='今日の一枚',exact=True).wait_for();page.evaluate('window.alphaFixture.draw()')
  choice=page.get_by_role('button',name='重なる',exact=True);choice.wait_for();choice.click();expect(choice).to_have_attribute('aria-pressed','true');page.evaluate('window.alphaFixture.switchProfile()');expect(choice).to_have_attribute('aria-pressed','false')
  assert not errors,errors;results.append({'width':width,'storage_five_corruptions':'PASS','quota_export_retry':'PASS','dialog_focus_trap_escape_restore_background':'PASS','fortune_profile_switch':'PASS','scope':'LOCAL SYNTHETIC ONLY','pageerrors':errors});ctx.close()
 b.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
