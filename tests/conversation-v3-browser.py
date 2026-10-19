"""Real Chromium/components with synthetic API/auth. Never count this as live Gemini/OAuth quality."""
import json,pathlib,os,re
from playwright.sync_api import sync_playwright,expect
origin='http://127.0.0.1:'+os.environ.get('CONVERSATION_V3_PORT','4323')
out=pathlib.Path(os.environ.get('CONVERSATION_V3_BROWSER_OUTPUT','work/conversation-v3-browser'));out.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(375,812),(390,844),(412,915),(768,1024),(1280,900)]:
  context=browser.new_context(viewport={'width':width,'height':height},timezone_id='Asia/Tokyo',reduced_motion='reduce');page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort())
  page.set_default_timeout(20000);page.set_default_navigation_timeout(60000)
  page.goto(origin+'/conversation-v3-fixture',wait_until='domcontentloaded');page.get_by_role('heading',name='Camelliaに話す',exact=True).wait_for()
  assert page.locator('.conversation-preview').count()==30
  page.get_by_role('button',name='さらに過去の会話を見る',exact=True).click();assert page.locator('.conversation-preview').count()==37
  search=page.get_by_role('searchbox',name='会話を探す');search.fill('以前の会話35');assert page.locator('.conversation-preview').count()==1
  page.locator('.conversation-preview').click();expect(page.locator('.message-model-label')).to_have_text('Camellia');expect(page.locator('.model-selector-trigger')).to_contain_text('YURA')
  page.get_by_role('button',name='会話一覧へ戻る',exact=True).click();search.fill('長い記録');page.locator('.conversation-preview').click()
  assert page.locator('.bubble').count()==40;page.get_by_role('button',name='前の会話を読む',exact=True).click();assert page.locator('.bubble').count()==80
  page.get_by_role('button',name='会話一覧へ戻る',exact=True).click();search.fill('');page.screenshot(path=str(out/f'{width}-library.png'))
  page.get_by_role('button',name=re.compile('^新しい会話を始める')).click();expect(page.locator('.model-selector-trigger')).to_contain_text('YURA');assert page.get_by_role('dialog').count()==0
  for turn in range(3):
   page.get_by_role('button',name='今日あったことを話したい',exact=True).click();expect(page.locator('.bubble.assistant')).to_have_count(turn+1)
  trigger=page.locator('.model-selector-trigger');trigger.click();dialog=page.get_by_role('dialog',name='話し方を選ぶ');expect(dialog).to_be_visible();expect(trigger).to_have_attribute('aria-expanded','true')
  yura=dialog.get_by_role('menuitemradio',name=re.compile('YURA'));lactone=dialog.get_by_role('menuitemradio',name=re.compile('Lactone'))
  expect(yura).to_be_focused();page.keyboard.press('ArrowDown');expect(lactone).to_be_focused();expect(lactone).to_have_attribute('aria-checked','false')
  page.keyboard.press('Tab');expect(dialog.get_by_role('button',name='閉じる',exact=True)).to_be_focused();page.keyboard.press('Shift+Tab');expect(lactone).to_be_focused()
  page.locator('.composer input').evaluate('(e)=>e.focus()');assert page.evaluate('document.activeElement.closest("dialog")!==null')
  for option in [yura,lactone]:
   rect=option.bounding_box();assert rect['width']<=width and rect['height']>=44
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'{width}-selector.png'))
  page.keyboard.press('Escape');expect(dialog).to_have_count(0);expect(trigger).to_be_focused();expect(trigger).to_have_attribute('aria-expanded','false')
  trigger.click();page.keyboard.press('ArrowDown');page.keyboard.press('Enter');expect(trigger).to_contain_text('Lactone');expect(trigger).to_be_focused();expect(page.locator('.model-switch-marker')).to_have_count(1)
  for turn in range(3):
   page.get_by_role('button',name='今日あったことを話したい',exact=True).click();expect(page.locator('.bubble.assistant')).to_have_count(4+turn)
  assert page.evaluate('v3Fixture.calls[3].history.length')==6
  assert page.evaluate('v3Fixture.calls.every(c=>c.history.length<=8&&!JSON.stringify(c.history).includes("system_model_switch"))')
  trigger.click();page.keyboard.press('Home');page.keyboard.press('Enter');expect(trigger).to_contain_text('YURA');expect(page.locator('.model-switch-marker')).to_have_count(2)
  assert page.locator('.message-model-label').all_text_contents()==['YURA']*3+['Lactone']*3
  composer=page.locator('.composer').bounding_box();assert composer['y']>=0 and composer['y']+composer['height']<=height-76+2,(width,composer)
  page.screenshot(path=str(out/f'{width}-thread.png'))
  page.set_viewport_size({'width':width,'height':520});page.get_by_role('textbox',name='Camelliaへのメッセージ').focus();composer=page.locator('.composer').bounding_box();assert composer['y']+composer['height']<=520-76+2,(width,composer);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.set_viewport_size({'width':width,'height':height});page.reload(wait_until='domcontentloaded');page.get_by_role('heading',name='Camelliaに話す',exact=True).wait_for();page.get_by_role('button',name=re.compile('今日あったことを話したい')).click();expect(page.locator('.model-selector-trigger')).to_contain_text('YURA');assert page.locator('.message-model-label').all_text_contents()==['YURA']*3+['Lactone']*3
  page.get_by_role('button',name=re.compile('^新しい会話を始める')).click();trigger=page.locator('.model-selector-trigger');trigger.click();page.get_by_role('menuitemradio',name=re.compile('Lactone')).click();page.get_by_role('button',name=re.compile('^新しい会話を始める')).click();expect(page.locator('.model-selector-trigger')).to_contain_text('Lactone')
  assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');results.append({'width':width,'Library_search_pagination_legacy':'PASS','YURA3_Lactone3_reverse':'PASS','selector_keyboard_focus_escape_inert':'PASS','reload_reopen_preference_attribution':'PASS','reduced_viewport_focus_composer':'PASS (simulation, not a physical OS keyboard)','scope':'SYNTHETIC LOCAL COMPONENTS; NOT live Gemini/OAuth/Firestore','pageerrors':errors});context.close()
 browser.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
