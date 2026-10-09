"""Real Chromium regression against tests/ux-preview.mjs only.
Auth/sync/analytics are synthetic, and every non-local HTTP request is blocked.
Usage: python tests/ux-browser.py --output /tmp/camellia-ux-browser
Requires Python Playwright and Chromium (CHROMIUM_PATH may override the binary).
"""
import argparse
import datetime
import json
import os
import pathlib
import re
import urllib.parse
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--output', default='/tmp/camellia-ux-browser')
args = parser.parse_args()
out = pathlib.Path(args.output)
out.mkdir(parents=True, exist_ok=True)
origin = 'http://127.0.0.1:4173'
now = datetime.datetime(2026, 10, 9, 3, 0, tzinfo=datetime.timezone.utc)
results = []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
    for width, height in [(375, 667), (390, 844), (412, 915), (768, 1024), (1280, 900)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, timezone_id='Asia/Tokyo', reduced_motion='reduce')
        blocked, errors = [], []
        def network(route):
            parsed = urllib.parse.urlparse(route.request.url)
            if parsed.scheme == 'http' and parsed.netloc == '127.0.0.1:4173':
                route.continue_()
            else:
                blocked.append(route.request.url)
                route.abort()
        context.route('**/*', network)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_default_timeout(10000)
        page.clock.install(time=now)
        def snapshot(name):
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'{width} {name}: horizontal overflow'
            page.screenshot(path=str(out / f'{width}-{name}-after.png'), full_page=True)
        def stored():
            return page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))")
        def button(name):
            return page.get_by_role('button', name=name, exact=True)
        def seed_history(offsets):
            state = stored()
            state['checkins'] = []
            for offset in offsets:
                at = (now + datetime.timedelta(days=offset)).isoformat()
                state['checkins'].append({'id': f'synthetic-{offset}', 'mood': 2 if offset else 4, 'sleep': 5 if offset else 7, 'createdAt': at, 'updatedAt': at})
            page.evaluate('(state)=>localStorage.setItem("camellia-prototype-v3",JSON.stringify(state))', state)
            page.reload()
            page.locator('.today').wait_for()
        page.goto(origin)
        cta = button('今日のわたしに会いにいく')
        expect(cta).to_be_visible()
        expect(page.locator('.welcome-value')).to_contain_text('1分のCheck')
        box = cta.bounding_box()
        assert box['y'] >= 0 and box['y'] + box['height'] <= height, f'{width}: Welcome CTA outside first viewport'
        assert box['height'] >= 44
        cta.focus()
        assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle') != 'none'
        snapshot('welcome')
        page.keyboard.press('Enter')
        expect(page.locator('.account-reason')).to_contain_text('昨日と今日の変化')
        expect(page.locator('.auth-choice').nth(0)).to_contain_text('LINEで続ける')
        expect(page.locator('.auth-choice').nth(1)).to_contain_text('あなた専用の共通ID')
        for auth in page.locator('.auth-choice').all():
            assert auth.bounding_box()['height'] >= 44
        snapshot('login')
        page.get_by_role('button', name='LINEで続ける').click()
        page.get_by_role('heading', name='はじめに、少しだけ。').wait_for()
        snapshot('profile')
        page.get_by_label('名前／ニックネーム').fill('テスト')
        page.get_by_label('生年月日').fill('2000-01-01')
        page.get_by_role('checkbox').nth(0).check()
        page.get_by_role('checkbox').nth(1).check()
        button('今日の私をCheckする').click()
        page.locator('.today--unchecked').wait_for()
        assert page.locator('.moods button').count() == 5
        assert page.locator('.daily-path').count() == 0
        assert page.locator('.daily-bridges').count() == 0, 'Fortune entrance cannot exist before Check'
        assert page.locator('.moods').bounding_box()['y'] + page.locator('.moods').bounding_box()['height'] < height - 76
        snapshot('today')
        with page.expect_popup() as popup:
            page.get_by_role('link', name='記録の取り扱いについて（別タブ）').click()
        legal = popup.value
        legal.wait_for_load_state()
        expect(legal.locator('body')).to_contain_text('運営担当者が閲覧できる場合があります')
        legal.close()
        button('普通').focus()
        page.keyboard.press('Space')
        expect(button('普通')).to_have_attribute('aria-pressed', 'true')
        button('睡眠や身体のことも添える（任意）').click()
        page.get_by_label('睡眠（時間）').fill('6.5')
        page.get_by_label('身体', exact=True).select_option('疲れ気味')
        page.get_by_label('ストレス', exact=True).select_option('やや高い')
        snapshot('check-input')
        button('今日の私を見てみる').click()
        page.locator('.today--checked').wait_for()
        expect(page.locator('#today-result')).to_be_focused()
        assert len(stored()['checkins']) == 1
        assert stored()['checkins'][0]['sleep'] == 6.5
        assert page.locator('.moods button').count() == 0
        expect(page.locator('.reflection-card')).to_contain_text('明日のあなたを知る手がかり')
        names = [event['name'] for event in stored()['analyticsEvents']]
        assert [n for n in names if n in ('check_view', 'check_start', 'check_complete')] == ['check_view', 'check_start', 'check_complete']
        snapshot('check-result')
        page.get_by_role('link', name='2 今日の過ごし方').click()
        expect(page.locator('#today-plans')).to_be_in_viewport()
        page.locator('.daily-path button').click()
        button('一枚引く').click()
        page.locator('.fortune-result').wait_for()
        first_card = stored()['fortunes'][0]
        snapshot('fortune')
        button('Todayで「今日どうする？」を考える').click()
        expect(page.locator('#today-intent')).to_be_focused()
        expect(page.locator('#today-intent')).to_be_in_viewport()
        button('Camelliaに話す').click()
        page.get_by_role('heading', name='Camellia', exact=True).wait_for()
        assert page.locator('.quick-inputs button').count() == 3
        for chip in page.locator('.quick-inputs button').all():
            assert chip.bounding_box()['height'] >= 44
        button('今日のCheckについて話したい').click()
        expect(page.locator('.bubble.assistant').last).to_contain_text('「普通」を選んで')
        assert stored()['personalMemories'] == [], 'Check conversation must not automatically become Memory'
        expect(page.get_by_label('Camelliaへのメッセージ')).to_have_value('')
        snapshot('conversation')
        page.get_by_label('Camelliaへのメッセージ').fill('頭の中を整理したい')
        page.keyboard.press('Enter')
        assert len(stored()['aiConversations'][0]['messages']) == 4
        button('My').click()
        page.get_by_role('button', name=re.compile('My Tree')).click()
        expect(page.locator('.tree-intro')).to_contain_text('自分のために残しておく場所')
        assert stored()['treeLeaves'] == []
        snapshot('tree')
        page.get_by_role('button', name='人を追加').click()
        page.get_by_label('名前／ニックネーム').fill('テストの友人')
        page.get_by_label('自分のための一言').fill('大切な思い出')
        button('木に追加する').click()
        assert len(stored()['treeLeaves']) == 1
        button('Myへ').click()
        button('Discover').click()
        expect(page.get_by_role('heading', name='今日のあなたに', exact=True)).to_be_visible()
        snapshot('discover')
        page.locator('.category-scroll').get_by_role('button', name='休む', exact=True).click()
        assert page.locator('.discover-today').count() == 0, 'explicit category takes precedence'
        assert page.locator('.category-scroll').get_by_role('button', name='休む', exact=True).get_attribute('aria-pressed') == 'true'
        button('Today').click()
        page.locator('.daily-path button').click()
        assert page.get_by_role('button', name='一枚引く', exact=True).count() == 0
        assert stored()['fortunes'][0]['cardId'] == first_card['cardId']
        assert len(stored()['fortunes']) == 1
        button('Todayへ').click()
        button('気分が変わったら、もう一度Check').click()
        assert button('今日の私を見てみる').count() == 0
        assert page.locator('.moods button[aria-pressed="true"]').count() == 0
        button('良い').click()
        button('今日の私を見てみる').click()
        assert len(stored()['checkins']) == 2
        assert len(stored()['fortunes']) == 1, 'recheck does not allow an extra card'
        seed_history([-1])
        expect(page.locator('.today--unchecked')).to_be_visible()
        expect(page.locator('.check-intro')).to_contain_text('昨日との違い')
        assert page.locator('.daily-path').count() == 0
        assert page.get_by_role('heading', name='今日のあなたに', exact=True).count() == 0
        button('Discover').click()
        assert page.locator('.discover-today').count() == 0, 'yesterday is not personalized as today'
        button('Camellia').click()
        assert button('今日のCheckについて話したい').count() == 0
        button('Today').click()
        button('良い').click()
        button('今日の私を見てみる').click()
        expect(page.locator('.yesterday-difference')).to_contain_text('昨日より')
        snapshot('day-two')
        seed_history([-2, -1, 0])
        expect(page.locator('#today-result')).to_have_text('最近のあなた')
        expect(page.locator('.yesterday-difference')).to_contain_text('昨日より')
        snapshot('recent')
        seed_history([-6, -5, -4, -3, -2, -1, 0])
        expect(page.locator('#today-result')).to_have_text('最近のあなたのパターン')
        expect(page.locator('.yesterday-difference')).to_contain_text('昨日より')
        assert '今週' not in page.locator('.today').inner_text()
        snapshot('seven-records')
        button('My').click()
        expect(page.get_by_role('heading', name='状態の履歴', exact=True)).to_be_visible()
        page.get_by_role('button', name='プロフィールを確認・編集する').click()
        expect(page.get_by_label('名前／ニックネーム')).to_have_value('テスト')
        button('変更を保存する').click()
        button('My').click()
        page.get_by_text('その他', exact=True).click()
        button('プライバシーと保存データ').click()
        expect(page.locator('.privacy')).to_contain_text('運営管理機能から確認できる場合があります')
        button('← Myへ戻る').click()
        before_logout = stored()['checkins']
        button('ログアウト').click()
        expect(page.locator('.account-card')).to_contain_text('前に使ったLINE')
        assert stored()['checkins'] == before_logout
        page.get_by_role('button', name='SchoolPark Passportで続ける').click()
        page.locator('.bottom-nav').wait_for()
        button('Today').click()
        page.locator('.today--checked').wait_for()
        assert stored()['checkins'] == before_logout
        assert len(stored()['treeLeaves']) == 1
        state = stored()
        state['fortunes'] = []
        page.evaluate('(state)=>localStorage.setItem("camellia-prototype-v3",JSON.stringify(state))', state)
        page.reload()
        page.locator('.daily-path button').click()
        button('今日は引かない').click()
        expect(page.locator('.fortune-skip')).to_be_visible()
        assert stored()['fortunes'][0]['status'] == 'skipped'
        assert button('一枚引く').count() == 0, 'skipping also preserves daily control'
        button('Todayで「今日どうする？」を考える').click()
        expect(page.locator('#today-intent')).to_be_focused()
        assert errors == [], errors
        results.append({'width': width, 'height': height, 'result': 'PASS', 'external_requests_blocked': len(blocked), 'page_errors': errors,
                        'coverage': 'Welcome/login/profile/Check/results/optional card/intent/conversation/Tree/Discover/2-day/recent/7-record/profile/history/privacy/logout/synthetic Passport return'})
        print(f'{width}x{height}: PASS', flush=True)
        context.close()
    # Night theme contrast/layout and legal assets are read without authentication.
    context = browser.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Asia/Tokyo')
    context.route('**/*', network)
    page = context.new_page()
    page.clock.install(time=datetime.datetime(2026, 10, 9, 13, 0, tzinfo=datetime.timezone.utc))
    page.goto(origin)
    expect(page.locator('.welcome--night')).to_be_visible()
    page.screenshot(path=str(out / '390-welcome-night-after.png'), full_page=True)
    page.get_by_role('button', name='今日のわたしに会いにいく').click()
    page.screenshot(path=str(out / '390-login-night-after.png'), full_page=True)
    page.goto(origin + '/terms.html')
    expect(page.get_by_role('heading', name='Camellia 利用規約', exact=True)).to_be_visible()
    browser.close()
    (out / 'browser-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print('Night theme and Terms: PASS. All authentication is synthetic; no production writes.', flush=True)
