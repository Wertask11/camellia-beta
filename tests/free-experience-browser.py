"""Actual Free screens/storage, intercepted auth/sync/provider. No cloud operations."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,re
out=Path('/workspace/outputs/camellia-free-id-20261116/free');out.mkdir(parents=True,exist_ok=True);results=[]
origin='http://127.0.0.1:4173';key='camellia-free-device-v1'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tokyo');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort());page=c.new_page();page.set_default_timeout(20000);errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r) if r.method=='POST' and r.url.endswith('/api/camellia/free-chat') else None)
  page.goto(origin);page.locator('.today').wait_for();assert not page.get_by_role('button',name='LINEで続ける',exact=True).count()
  page.evaluate("localStorage.setItem('camellia-prototype-v3','PRIVATE_ACCOUNT_ORIGINAL');localStorage.setItem('camellia-cache-owner','private-account-owner')")
  page.get_by_role('button',name='普通',exact=True).click();page.get_by_role('button',name='今日の私を見てみる',exact=True).click()
  page.get_by_role('button',name=re.compile('一枚引く')).click();page.get_by_role('button',name='一枚引く',exact=True).click();page.wait_for_function("JSON.parse(localStorage.getItem('camellia-free-device-v1')).fortunes.length===1")
  page.get_by_role('button',name='My',exact=True).click();expect(page.get_by_role('heading',name='この端末に残る記録',exact=True)).to_be_visible();page.get_by_role('button',name=re.compile('My Tree')).click();page.get_by_role('button',name='人を追加',exact=True).click();page.get_by_label('名前／ニックネーム',exact=True).fill('FREE PRIVATE PERSON');page.get_by_label('自分のための一言',exact=True).fill('FREE PRIVATE NOTE');page.get_by_role('button',name='木に追加する',exact=True).click()
  page.get_by_role('button',name='Camellia',exact=True).click();page.get_by_role('button',name='新しい会話を始める').click();box=page.get_by_role('textbox',name='Camelliaへのメッセージ');box.fill('今日は少し話したい');page.get_by_role('button',name='送信',exact=True).click();page.wait_for_function("JSON.parse(localStorage.getItem('camellia-free-device-v1')).aiConversations[0]?.messages.some(m=>m.role==='assistant')")
  assert requests and 'authorization' not in requests[0].headers;assert 'FREE PRIVATE' not in requests[0].post_data
  page.get_by_role('button',name='この一言を残す',exact=True).click();page.get_by_role('button',name='この一言を覚えておく',exact=True).click()
  page.get_by_role('button',name='Discover',exact=True).click();page.get_by_role('button',name='Placeで、今日の選択肢を見る →',exact=True).click();page.locator('.place-card').first.click();page.get_by_role('button',name='こんな体験をしてみたい',exact=True).click();page.get_by_role('button',name='My',exact=True).click();page.get_by_role('button',name='この体験を振り返る',exact=True).click();dialog=page.get_by_role('dialog',name='この体験を、自分のために振り返る',exact=True);dialog.get_by_label('残したい一言（任意）',exact=True).fill('FREE PRIVATE REFLECTION');dialog.get_by_role('button',name='この振り返りを残す',exact=True).click()
  page.reload();page.locator('.bottom-nav').wait_for();saved=page.evaluate("JSON.parse(localStorage.getItem('camellia-free-device-v1'))");assert len(saved['checkins'])==len(saved['fortunes'])==len(saved['treeLeaves'])==len(saved['personalMemories'])==len(saved['placeExperiences'])==1;assert saved['aiConversations'][0]['messages']
  assert page.evaluate("localStorage.getItem('camellia-prototype-v3')")=='PRIVATE_ACCOUNT_ORIGINAL';assert page.evaluate("localStorage.getItem('camellia-cache-owner')")=='private-account-owner';assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors
  page.get_by_role('button',name='My',exact=True).click();page.screenshot(path=str(out/f'{width}.png'),full_page=True)
  if width==390:
   second=c.new_page();second.goto(origin);second.locator('.today').wait_for();second.get_by_role('button',name='選び直す',exact=True).click();second.get_by_role('button',name='良い',exact=True).click();second.get_by_role('button',name='今日の私を見てみる',exact=True).click();second.wait_for_function("JSON.parse(localStorage.getItem('camellia-free-device-v1')).checkins.length===2")
   page.get_by_role('button',name='Today',exact=True).click();expect(page.get_by_role('heading',name='記録を守るため、確認が必要です')).to_be_visible();assert page.evaluate("JSON.parse(localStorage.getItem('camellia-free-device-v1')).checkins.length")==2;second.close()
  results.append({'width':width,'unregisteredCheckFortuneTreeMemoryReflectionConversationReload':'PASS','foreignAccountCacheUntouched':'PASS','privateTreeNotTransmitted':'PASS','staleTabProtection':'PASS' if width==390 else 'not repeated','overflow':False,'pageErrors':errors});c.close()
 b.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
