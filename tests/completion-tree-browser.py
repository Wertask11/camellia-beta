"""Actual Tree, synthetic account and decoration API. Fixture artwork is not a final approved design."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('/workspace/outputs/camellia-completion-20261110/tree');OUT.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,412,768,1280]:
  c=b.new_context(viewport={'width':width,'height':900});page=c.new_page();page.set_default_timeout(20000);errors=[];state={'owned':[],'choices':[{'creditId':'a'*64,'options':[{'id':'fixture-one','label':'LOCAL TEST DESIGN','assetPath':'/decorations/local-test.svg'}]}],'active':None,'catalogReady':True,'moreCredits':False};posts=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   u=r.request.url
   if '/api/camellia/tree-decoration' in u:
    if r.request.method=='POST':
     v=r.request.post_data_json;posts.append(v)
     if v['operation']=='claim':
      option=state['choices'][0]['options'][0];state['owned']=[{'creditId':v['creditId'],'decorationId':option['id'],'decoration':option}];state['choices']=[]
     elif v['operation']=='equip':state['active']=state['owned'][0]['decoration'] if v['decorationId'] else None
    r.fulfill(json=state);return
   if '/decorations/local-test.svg' in u:r.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 330"><rect x="4" y="4" width="352" height="322" fill="none" stroke="#ad4566"/></svg>');return
   if u.startswith('http://127.0.0.1:4173/'):r.continue_()
   else:r.abort()
  c.route('**/*',route);page.goto('http://127.0.0.1:4173/');page.get_by_role('button',name='今日のわたしをCheckする',exact=True).wait_for()
  page.evaluate('''()=>{const s=JSON.parse(localStorage.getItem('camellia-prototype-v3'));s.profile={...s.profile,id:'synthetic-ux-user',name:'LOCAL TREE QA',birthDate:'1995-01-01',womanSelfDeclared:true,agreedAt:new Date().toISOString()};s.onboardingComplete=true;localStorage.setItem('camellia-prototype-v3',JSON.stringify(s));sessionStorage.setItem('ux-signed-in','1');sessionStorage.setItem('ux-auth-uid','synthetic-ux-user');}''');page.reload();page.locator('.today').wait_for();page.get_by_role('button',name='My',exact=True).click();page.get_by_role('button',name='My Tree',exact=False).click();page.get_by_text('My Treeの装飾',exact=True).click();page.on('dialog',lambda d:d.accept());page.get_by_role('button',name='LOCAL TEST DESIGNを選ぶ',exact=True).click();page.get_by_role('button',name='この装飾を使う',exact=True).click();expect(page.locator('.tree-decoration-art')).to_have_attribute('src','/decorations/local-test.svg')
  page.reload();page.locator('.today').wait_for();page.get_by_role('button',name='My',exact=True).click();page.get_by_role('button',name='My Tree',exact=False).click();expect(page.locator('.tree-decoration-art')).to_have_count(1);page.get_by_text('My Treeの装飾',exact=True).click();page.get_by_role('button',name='装飾を外す',exact=True).click();expect(page.locator('.tree-decoration-art')).to_have_count(0);assert len(state['owned'])==1;assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors,errors;assert all(set(v).issubset({'operation','creditId','decorationId'}) for v in posts);page.screenshot(path=str(OUT/f'{width}.png'),full_page=True);results.append({'width':width,'explicitClaim':'PASS','equipReloadRemove':'PASS','permanentOwnershipPreserved':'PASS','privateTreeNotSent':'PASS','errors':errors});c.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False));print(json.dumps(results,ensure_ascii=False))
