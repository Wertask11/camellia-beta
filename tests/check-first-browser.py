"""Real Chromium / actual Page/store, synthetic auth/access/sync only. Non-local traffic blocked.
Start CHECK_FIRST_FIXTURE=on node tests/ux-preview.mjs separately; no production data is used.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path('/workspace/outputs/camellia-check-first-20261031')
OUT.mkdir(parents=True, exist_ok=True)
ORIGIN = 'http://127.0.0.1:4173'
KEY = 'camellia-prototype-v3'
DRAFT = 'camellia-guest-check-v1'
BRIDGE = 'camellia-guest-check-oauth-v1'
INIT = """(() => {
 const set=Storage.prototype.setItem;
 const append=event=>{const raw=sessionStorage.getItem('ux-qa-events');const events=raw?JSON.parse(raw):[];if(!events.some(e=>e.id===event.id)){events.push(event);set.call(sessionStorage,'ux-qa-events',JSON.stringify(events));}};
 Storage.prototype.setItem=function(key,value){if(this===localStorage&&key==='camellia-prototype-v3'){for(const event of JSON.parse(value).analyticsEvents??[])append(event);}return set.call(this,key,value);};
 window.addEventListener('ux-auth-event',event=>append({...event.detail,id:crypto.randomUUID()}));
})();"""
results = []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
    def start(width=390, seed=None):
        context = browser.new_context(viewport={'width': width, 'height': 900}, timezone_id='Asia/Tokyo')
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(ORIGIN + '/') else route.abort())
        context.add_init_script(INIT)
        if seed:
            context.add_init_script(seed)
        page = context.new_page()
        page.set_default_timeout(15000)
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        page.goto(ORIGIN)
        page.locator('.welcome-primary, .today').first.wait_for()
        return context, page, errors, requests

    def stored(page):
        return page.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")

    def trace(page):
        return page.evaluate("JSON.parse(sessionStorage.getItem('ux-qa-events')||'[]')")

    def check(page):
        page.get_by_role('button', name='今日のわたしをCheckする', exact=True).click()
        page.locator('.moods button').nth(2).click()
        page.get_by_role('button', name='今日の私を見てみる', exact=True).click()
        page.locator('#today-result h2').wait_for()
        page.get_by_role('button', name='Googleで記録を残す', exact=True).wait_for()
        assert page.locator('#today-plans').count() == 0
        assert not stored(page)['checkins'], 'Check before authentication is not a personal record'
        assert page.evaluate(f"localStorage.getItem('{BRIDGE}')") is None
        draft = page.evaluate(f"JSON.parse(sessionStorage.getItem('{DRAFT}'))")
        assert draft['phase'] == 'preview'
        assert not any(key in page.url for key in ['mood=', 'sleep=', 'body=', 'check='])
        return draft

    def profile(page):
        page.get_by_label('名前／ニックネーム').fill('QA user')
        page.get_by_label('生年月日').fill('1995-01-01')
        page.get_by_label('私は女性です（自己申告）').check()
        assert page.locator('.profile-screen details').count() == 0
        page.get_by_role('button', name='記録を残して続ける', exact=True).click()
        page.locator('#today-plans').wait_for()

    def saved(page, draft, expected=1, completions=1):
        expect(page.locator('.today--checked')).to_be_visible()
        current = stored(page)
        assert len(current['checkins']) == expected
        assert sum(check['id'] == draft['check']['id'] for check in current['checkins']) == 1
        assert page.evaluate(f"sessionStorage.getItem('{DRAFT}')") is None
        assert page.evaluate(f"localStorage.getItem('{BRIDGE}')") is None
        names = [event['name'] for event in trace(page)]
        assert names.count('check_complete') == completions
        assert names.count('guest_check_saved') == 1
        assert names.count('today_flow_resume') == 1
        assert names.index('daily_reflection_view') < names.index('save_prompt_view')
        assert names.index('check_complete') < names.index('guest_check_saved') < names.index('today_flow_resume')
        assert page.locator('.bottom-nav button').count() == 4
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        return current

    # A, F, I: both providers and real layouts; LINE uses a complete local page reload.
    for width in [375, 390, 412, 768, 1280]:
        context, page, errors, requests = start(width)
        draft = check(page)
        assert not any('/api/' in url or '/__ux/' in url for url in requests), 'no provider/Firestore/access request before login'
        page.screenshot(path=str(OUT / f'guest-result-{width}.png'), full_page=True)
        method = 'LINE' if width in [375, 768] else 'Google'
        page.get_by_role('button', name=f'{method}で記録を残す', exact=True).click()
        page.get_by_label('名前／ニックネーム').wait_for()
        assert page.evaluate(f"JSON.parse(sessionStorage.getItem('{DRAFT}')).check.id") == draft['check']['id']
        assert not stored(page)['checkins']
        profile(page)
        current = saved(page, draft)
        assert any(event['name'] == 'login_success' for event in trace(page))
        assert any(event['name'] == 'profile_complete' for event in trace(page))
        page.screenshot(path=str(OUT / f'resumed-today-{width}.png'), full_page=True)
        page.reload()
        page.locator('.today--checked').wait_for()
        assert len(stored(page)['checkins']) == 1
        assert [e['name'] for e in trace(page)].count('guest_check_saved') == 1
        assert not errors, errors
        results.append({'case': 'A/F/I', 'width': width, 'method': method, 'guestCheck': 'PASS', 'profile': 'PASS', 'resume': 'PASS', 'reloadOnce': 'PASS', 'pageErrors': errors})
        context.close()

    # B: restore an existing account with an unrelated old Check and another profile id.
    context, page, errors, _ = start()
    remote = stored(page)
    remote['profile'].update({'id': 'existing-profile-safe-id', 'name': 'Existing QA', 'birthDate': '1995-01-01', 'womanSelfDeclared': True, 'agreedAt': remote['createdAt']})
    remote['onboardingComplete'] = True
    remote['checkins'] = [{'id': 'existing-check', 'mood': 4, 'createdAt': '2026-10-30T00:00:00.000Z', 'updatedAt': '2026-10-30T00:00:00.000Z'}]
    page.evaluate("state=>sessionStorage.setItem('ux-account-state:synthetic-ux-user',JSON.stringify(state))", remote)
    draft = check(page)
    page.get_by_role('button', name='Googleで記録を残す', exact=True).click()
    page.locator('#today-plans').wait_for()
    saved(page, draft, expected=2)
    assert stored(page)['checkins'][0]['id'] == 'existing-check'
    assert not page.locator('.profile-screen').count()
    assert not errors, errors
    results.append({'case': 'B', 'existingHistoryRetained': 'PASS', 'noProfileRepeat': 'PASS'})
    context.close()

    # C: an already signed-in eligible user retains normal Today and Check.
    registered = remote
    registered['checkins'] = []
    seed = f"if(!sessionStorage.getItem('ux-registered-seeded')){{localStorage.setItem('{KEY}',{json.dumps(json.dumps(registered))});sessionStorage.setItem('ux-signed-in','1');sessionStorage.setItem('ux-registered-seeded','1');}}"
    context, page, errors, _ = start(seed=seed)
    page.locator('.today').wait_for()
    assert not page.get_by_role('button', name='今日のわたしをCheckする', exact=True).count()
    page.locator('.moods button').nth(3).click()
    page.get_by_role('button', name='今日の私を見てみる', exact=True).click()
    page.locator('#today-plans').wait_for()
    assert len(stored(page)['checkins']) == 1
    assert not page.locator('.guest-save-prompt').count()
    assert not errors, errors
    results.append({'case': 'C', 'registeredTodayCheck': 'PASS'})
    context.close()

    # D: leaving a partially answered Check is safe; it is not turned into a saved record.
    context, page, errors, _ = start()
    page.get_by_role('button', name='今日のわたしをCheckする', exact=True).click()
    page.locator('.moods button').nth(1).click()
    page.reload()
    page.get_by_role('button', name='今日のわたしをCheckする', exact=True).wait_for()
    assert not stored(page)['checkins']
    assert page.evaluate(f"sessionStorage.getItem('{DRAFT}')") is None
    assert not errors, errors
    results.append({'case': 'D', 'partialAbandon': 'PASS'})
    context.close()

    # E/G: cancelling or failing a popup preserves the preview, with a subsequent explicit retry.
    for mode in ['cancel', 'error']:
        context, page, errors, _ = start()
        draft = check(page)
        page.evaluate("mode=>sessionStorage.setItem('ux-auth-mode',mode)", mode)
        page.get_by_role('button', name='Googleで記録を残す', exact=True).click()
        page.get_by_role('alert').wait_for()
        assert page.evaluate(f"JSON.parse(sessionStorage.getItem('{DRAFT}')).phase") == 'preview'
        assert not stored(page)['checkins']
        page.reload()
        page.locator('#today-result h2').wait_for()
        assert page.evaluate(f"JSON.parse(sessionStorage.getItem('{DRAFT}')).check.id") == draft['check']['id']
        page.evaluate("sessionStorage.removeItem('ux-auth-mode')")
        page.get_by_role('button', name='Googleで記録を残す', exact=True).click()
        page.get_by_label('名前／ニックネーム').wait_for()
        profile(page)
        saved(page, draft)
        assert not errors, errors
        results.append({'case': 'E/G', 'mode': mode, 'noWrongSave': 'PASS', 'retry': 'PASS'})
        context.close()

    # H: logout clears a bound Check before a second account can receive it.
    context, page, errors, _ = start()
    draft = check(page)
    page.get_by_role('button', name='Googleで記録を残す', exact=True).click()
    page.get_by_label('名前／ニックネーム').wait_for()
    page.evaluate("async()=>{const auth=await import('/lib/auth/camellia.ts');await auth.logoutCamellia();}")
    assert page.evaluate(f"sessionStorage.getItem('{DRAFT}')") is None
    assert page.evaluate(f"localStorage.getItem('{BRIDGE}')") is None
    assert not stored(page)['checkins']
    page.evaluate("sessionStorage.setItem('ux-login-uid','synthetic-user-B')")
    if page.get_by_role('button', name='すでに記録のある方はログイン', exact=True).count():
        page.get_by_role('button', name='すでに記録のある方はログイン', exact=True).click()
    page.get_by_role('button', name='Googleで続ける', exact=True).click()
    page.get_by_label('名前／ニックネーム').wait_for()
    assert not stored(page)['checkins']
    assert not errors, errors
    results.append({'case': 'H', 'logoutBetweenAccounts': 'PASS', 'boundDraftCleared': 'PASS'})
    context.close()
    # Choosing again replaces the unsaved preview, including its impression guards.
    context, page, errors, _ = start()
    before = check(page)
    page.get_by_role('button', name='選び直す', exact=True).click()
    page.locator('.moods button').nth(4).click()
    page.get_by_role('button', name='今日の私を見てみる', exact=True).click()
    page.get_by_role('button', name='Googleで記録を残す', exact=True).wait_for()
    page.wait_for_function(f"JSON.parse(sessionStorage.getItem('{DRAFT}')).shown.includes('prompt')")
    draft = page.evaluate(f"JSON.parse(sessionStorage.getItem('{DRAFT}'))")
    assert draft['check']['id'] != before['check']['id']
    assert draft['check']['mood'] == 1
    assert [e['name'] for e in trace(page)].count('save_prompt_view') == 2
    page.get_by_role('button', name='Googleで記録を残す', exact=True).click()
    page.get_by_label('名前／ニックネーム').wait_for()
    profile(page)
    saved(page, draft, completions=2)
    assert not errors, errors
    results.append({'case': 'guest recheck', 'latestOnly': 'PASS', 'impressionsPerCheck': 'PASS'})
    context.close()
    # Registered access restrictions still apply before any adoption.
    for mode in ['invite', 'suspended', 'unavailable']:
        context, page, errors, _ = start()
        draft = check(page)
        if mode == 'unavailable':
            page.route('**/__ux/camellia-auth/access', lambda route: route.fulfill(status=503, content_type='application/json', body='{}'))
        else:
            context.add_cookies([{'name': 'ux-access', 'value': mode, 'url': ORIGIN}])
        page.get_by_role('button', name='Googleで記録を残す', exact=True).click()
        if mode == 'unavailable':
            page.get_by_role('heading', name='今日の記録を残す前に').wait_for()
        else:
            page.get_by_role('heading', name='招待コードを入力してください' if mode == 'invite' else 'このアカウントの利用を止めています').wait_for()
        assert not stored(page)['checkins'], mode
        assert not any(e['name'] == 'profile_view' for e in trace(page)), 'do not count a profile behind an access gate'
        assert page.evaluate(f"JSON.parse(sessionStorage.getItem('{DRAFT}')).check.id") == draft['check']['id']
        assert not errors, errors
        results.append({'case': 'access gate', 'mode': mode, 'noAdoption': 'PASS'})
        context.close()
    # Failed durable writes keep the guest draft until the existing storage recovery succeeds.
    context, page, errors, _ = start()
    draft = check(page)
    page.get_by_role('button', name='Googleで記録を残す', exact=True).click()
    page.get_by_label('名前／ニックネーム').fill('Quota QA')
    page.get_by_label('生年月日').fill('1995-01-01')
    page.get_by_label('私は女性です（自己申告）').check()
    page.evaluate("""()=>{const original=Storage.prototype.setItem;window.qaQuota=true;Storage.prototype.setItem=function(key,value){if(window.qaQuota&&this===localStorage&&key==='camellia-prototype-v3')throw new DOMException('Synthetic quota','QuotaExceededError');return original.call(this,key,value);};}""")
    page.get_by_role('button', name='記録を残して続ける', exact=True).click()
    page.get_by_role('heading', name='記録を守るため、確認が必要です').wait_for()
    assert page.evaluate(f"JSON.parse(sessionStorage.getItem('{DRAFT}')).check.id") == draft['check']['id']
    assert not stored(page)['checkins']
    page.evaluate('window.qaQuota=false')
    page.get_by_role('button', name='もう一度保存する', exact=True).click()
    page.locator('#today-plans').wait_for()
    saved(page, draft)
    assert not errors, errors
    results.append({'case': 'local storage failure', 'draftRetained': 'PASS', 'recovery': 'PASS', 'oneSave': 'PASS'})
    context.close()
    browser.close()

(OUT / 'browser-qa.json').write_text(json.dumps({'results': results, 'scope': 'Synthetic local auth/access/sync; real browser and actual Page/store. Not real OAuth/Firestore acceptance.'}, ensure_ascii=False, indent=2))
print(json.dumps(results, ensure_ascii=False, indent=2))
