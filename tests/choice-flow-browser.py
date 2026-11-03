"""Local real Chromium, synthetic auth/sync. No real account, payment or external transmission."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect
OUT=Path('/workspace/outputs/camellia-choice-20261103');OUT.mkdir(parents=True,exist_ok=True)
ORIGIN='http://127.0.0.1:4173'
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [375,390,412,768,1280]:
  ctx=browser.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tokyo')
  ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(ORIGIN+'/') else r.abort())
  page=ctx.new_page();page.set_default_timeout(20000);errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
  page.goto(ORIGIN)
  page.get_by_role('button',name='今日のわたしをCheckする',exact=True).click()
  page.locator('.moods button').nth(2).click();page.get_by_role('button',name='今日の私を見てみる',exact=True).click()
  page.get_by_role('button',name='メリィと、どうしたいか話す',exact=True).wait_for()
  assert not page.get_by_role('button',name='Googleで記録を残す',exact=True).count()
  page.get_by_role('button',name='メリィと、どうしたいか話す',exact=True).click()
  page.get_by_label('Camelliaへのメッセージ').fill('今日は何かしたい')
  page.get_by_role('button',name='送信',exact=True).click();page.locator('.bubble.assistant').wait_for()
  assert not any('/api/camellia/chat' in r for r in requests),'Guest chat must never call Gemini'
  page.get_by_role('button',name='したいことをDiscoverで探す →',exact=True).click()
  page.locator('.action-card--whole').first.click()
  dialog=page.get_by_role('dialog');dialog.get_by_role('button',name='あとで',exact=True).first.click();dialog.get_by_role('button',name='保存だけ',exact=True).click()
  page.get_by_role('heading',name='今日、選んだこと',exact=True).wait_for()
  personal=lambda:page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))")
  assert not personal()['checkins'];assert not personal()['savedActions'];assert not personal()['aiConversations']
  page.get_by_role('button',name='Discover',exact=True).click()
  page.get_by_role('button',name='Placeで、今日の選択肢を見る →',exact=True).click()
  page.locator('.place-card').first.click()
  before=len([r for r in requests if '/api/' in r])
  page.get_by_role('button',name='パートナーに伝える',exact=True).click()
  partner=page.get_by_role('dialog',name='パートナーに伝える',exact=True)
  expect(partner).to_contain_text('現在はプレビューのみ')
  partner.get_by_label('誰に伝えますか').select_option('partner')
  partner.get_by_label('いつの希望ですか').select_option('someday')
  expect(partner.get_by_role('button',name='共有の送信は準備中',exact=True)).to_be_disabled()
  assert not partner.get_by_role('button',name='この内容で共有URLを作る',exact=True).count()
  partner.get_by_role('button',name='Camellia Plusを見る · 月500円',exact=True).click()
  plus=page.get_by_role('dialog',name='Camellia Plus',exact=True)
  expect(plus).to_contain_text('月額500円')
  expect(plus.get_by_role('button',name='支払い受付は準備中',exact=True)).to_be_disabled()
  assert page.evaluate('document.activeElement.closest("dialog").getAttribute("aria-labelledby")')=='plus-title'
  page.screenshot(path=str(OUT/f'plus-preview-{width}.png'),full_page=True)
  page.keyboard.press('Escape');expect(plus).to_have_count(0);expect(partner).to_be_visible()
  page.keyboard.press('Escape');expect(partner).to_have_count(0)
  assert len([r for r in requests if '/api/' in r])==before,'No share or payment request during a preview'
  page.get_by_role('button',name='こんな体験をしてみたい',exact=True).click()
  page.get_by_role('heading',name='今日、選んだこと',exact=True).wait_for()
  draft=page.evaluate("JSON.parse(sessionStorage.getItem('camellia-guest-check-v1'))")
  assert len(draft['savedActions'])==1;assert len(draft['placeChoices'])==1
  assert '今日は何かしたい' not in json.dumps(draft,ensure_ascii=False),'Conversation never enters OAuth bridge'
  assert not any('/__ux/' in r or '/api/' in r for r in requests),'No protected request before save'
  page.screenshot(path=str(OUT/f'guest-my-{width}.png'),full_page=True)
  page.get_by_role('button',name='今日のあなたを残す',exact=True).click()
  method='LINE' if width in [375,768] else 'Google'
  page.get_by_role('button',name=f'{method}で記録を残す',exact=True).click()
  page.get_by_label('名前／ニックネーム').fill('Journey QA');page.get_by_label('生年月日').fill('1995-01-01');page.get_by_label('私は女性です（自己申告）').check()
  page.get_by_role('button',name='記録を残して続ける',exact=True).click()
  page.get_by_role('heading',name='My Camellia',exact=True).wait_for()
  saved=personal();assert len(saved['checkins'])==1 and saved['checkins'][0]['id']==draft['check']['id']
  assert len(saved['savedActions'])==1 and len(saved['placeChoices'])==1
  assert not saved['aiConversations'],'Explicit save excludes trial chat'
  page.reload()
  try: page.locator('.today').wait_for()
  except Exception:
   (OUT/'failure.json').write_text(json.dumps({'body':page.locator('body').inner_text(),'errors':errors,'state':personal()},ensure_ascii=False,indent=2));page.screenshot(path=str(OUT/'failure.png'),full_page=True);raise
  assert len(personal()['checkins'])==1 and len(personal()['placeChoices'])==1
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  assert not errors,errors
  results.append({'width':width,'guestCheckMellyDiscoverPlaceMy':'PASS','saveOnlyOnIdentity':'PASS','selectedChoicesRestoredOnce':'PASS','syntheticAuthMethod':method,'noChatBridge':'PASS','noGuestProviderRequest':'PASS','sharingAndPlusPreviewOnly':'PASS','nativeDialogsEscapeFocus':'PASS','overflow':False,'pageErrors':errors})
  ctx.close()
 # Safety must override both guest styles and must never trigger a provider call.
 ctx=browser.new_context(viewport={'width':390,'height':900},timezone_id='Asia/Tokyo')
 ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(ORIGIN+'/') else r.abort())
 page=ctx.new_page();page.set_default_timeout(20000);requests=[];page.on('request',lambda r:requests.append(r.url))
 page.goto(ORIGIN);page.get_by_role('button',name='今日のわたしをCheckする',exact=True).click();page.locator('.moods button').nth(2).click();page.get_by_role('button',name='今日の私を見てみる',exact=True).click();page.get_by_role('button',name='メリィと、どうしたいか話す',exact=True).click()
 cases=['死にたい','私はうつ病ですか？','薬をやめたい','暴力を受けている','虐待されている','息ができない']
 for model in ['YURA','Lactone']:
  page.locator('.model-selector-trigger').click();page.get_by_role('menuitemradio').filter(has_text=model).click()
  for message in cases:
   expected=page.evaluate("async text=>(await import('/lib/conversation/safety.ts')).immediateSafetyReply(text)",message)
   assert expected,'The policy must recognize the test boundary'
   before=page.locator('.bubble.assistant').count()
   page.get_by_label('Camelliaへのメッセージ').fill(message);page.get_by_role('button',name='送信',exact=True).click()
   expect(page.locator('.bubble.assistant')).to_have_count(before+1)
   expect(page.locator('.bubble.assistant').last).to_contain_text(expected)
 assert not any('/api/' in r for r in requests)
 results.append({'case':'guest Safety','styles':['yura','lactone'],'boundariesPerStyle':6,'commonSafety':'PASS','providerRequest':'NONE'})
 ctx.close()
 browser.close()
(OUT/'browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
