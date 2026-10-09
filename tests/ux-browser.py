"""Real Chromium regression against tests/ux-preview.mjs only (β2 Today one flow).
Auth/sync/analytics are synthetic, and every non-local HTTP request is blocked.
Record stages are seeded as mock state in this isolated harness only (never Production).
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
TERMS = '/terms.html'
PRIVACY = '/privacy.html'

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
        def no_overlap(selector):
            boxes = [b for b in page.eval_on_selector_all(selector, 'els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.top+scrollY,r.bottom+scrollY,e.className]})')]
            for (top_a, bottom_a, a), (top_b, bottom_b, b) in zip(boxes, boxes[1:]):
                assert bottom_a <= top_b + 0.5, f'{width}: {a} overlaps {b}'
        def snapshot(name):
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'{width} {name}: horizontal overflow'
            small = page.evaluate("""[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<12&&!e.closest('svg')).map(e=>e.className+':'+e.textContent.trim().slice(0,20))""")
            assert small == [], f'{width} {name}: text under 12px {small}'
            page.screenshot(path=str(out / f'{width}-{name}-after.png'), full_page=True)
        def stored():
            return page.evaluate("JSON.parse(localStorage.getItem('camellia-prototype-v3'))")
        def events():
            return [event['name'] for event in stored()['analyticsEvents']]
        def button(name):
            return page.get_by_role('button', name=name, exact=True)
        def mood(name):
            return page.locator('.moods').get_by_role('button', name=name, exact=True)
        def seed_history(offsets, keep_today=True):
            state = stored()
            state['checkins'] = []
            for offset in offsets:
                at = (now + datetime.timedelta(days=offset)).isoformat()
                state['checkins'].append({'id': f'synthetic-{offset}', 'mood': 3 if offset else 4, 'sleep': 6 if offset else 7, 'createdAt': at, 'updatedAt': at})
            page.evaluate('(state)=>localStorage.setItem("camellia-prototype-v3",JSON.stringify(state))', state)
            page.reload()
            page.locator('.today').wait_for()
        # Welcome
        page.goto(origin)
        cta = button('今日のわたしに会いにいく')
        expect(cta).to_be_visible()
        box = cta.bounding_box()
        assert box['y'] >= 0 and box['y'] + box['height'] <= height, f'{width}: Welcome CTA outside first viewport'
        assert box['height'] >= 44
        cta.focus()
        assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle') != 'none'
        snapshot('welcome')
        page.keyboard.press('Enter')
        # Login: one consent sentence; only the two words are links; nothing opens by itself.
        consent = page.locator('.account-consent')
        expect(consent).to_have_text('ログインまたは登録することで、利用規約・プライバシーポリシーに同意したものとみなします。')
        assert consent.locator('a').count() == 2
        expect(consent.get_by_role('link', name='利用規約', exact=True)).to_have_attribute('href', TERMS)
        expect(consent.get_by_role('link', name='プライバシーポリシー', exact=True)).to_have_attribute('href', PRIVACY)
        for link in consent.locator('a').all():
            assert link.get_attribute('target') == '_blank'
        assert page.get_by_text('次の画面で').count() == 0, 'no second, contradicting consent line'
        with page.expect_popup() as popup:
            consent.get_by_role('link', name='利用規約', exact=True).click()
        terms = popup.value
        terms.wait_for_load_state()
        expect(terms.get_by_role('heading', name='Camellia 利用規約', exact=True)).to_be_visible()
        terms.close()
        with page.expect_popup() as popup:
            consent.get_by_role('link', name='プライバシーポリシー', exact=True).click()
        privacy_page = popup.value
        privacy_page.wait_for_load_state()
        expect(privacy_page.locator('body')).to_contain_text('Camellia')
        privacy_page.close()
        expect(page.locator('.account-consent')).to_be_visible()
        expect(page.locator('.auth-choice').nth(1)).to_contain_text('SchoolParkを利用している方はこちら')
        for auth in page.locator('.auth-choice').all():
            assert auth.bounding_box()['height'] >= 44
        assert len(context.pages) == 1 and page.url.rstrip('/') == origin, 'no forced navigation to Terms/Privacy'
        snapshot('login')
        page.get_by_role('button', name='LINEで続ける').click()
        page.get_by_role('heading', name='はじめに、少しだけ。').wait_for()
        assert len(context.pages) == 1 and page.url.startswith(origin)
        assert page.get_by_text('に同意します').count() == 0, 'consent is given at login, not asked again'
        assert page.get_by_role('checkbox').count() >= 1
        snapshot('profile')
        page.wait_for_timeout(100)
        assert events().count('profile_view') == 1
        page.get_by_label('名前／ニックネーム').fill('テスト')
        page.get_by_label('生年月日').fill('2000-01-01')
        page.get_by_label('女性向けウェルビーイングサービスであることを確認しました（自己申告）').check()
        button('今日の私をCheckする').click()
        page.locator('.today--unchecked').wait_for()
        names = events()
        assert names.count('profile_view') == 1 and names.index('profile_view') < names.index('profile_complete')
        assert not any('テスト' in json.dumps(e.get('properties', {}), ensure_ascii=False) or '2000' in json.dumps(e.get('properties', {})) for e in stored()['analyticsEvents']), 'no personal data in events'
        # Today before Check: the Check is the hero; the rest is a quiet preview.
        expect(page.locator('.check-primary .eyebrow')).to_have_text('今日のCheck · 1分くらい')
        assert page.locator('.moods button').count() == 5
        expect(page.locator('.flow-preview')).to_contain_text('Checkすると、ここに返ってきます')
        assert page.locator('.flow-preview button, .flow-preview a').count() == 0
        assert page.locator('#today-intent').count() == 0 and page.locator('.fortune-entry').count() == 0
        assert page.locator('.yesterday-pill').count() == 0, 'first day has no made-up yesterday'
        assert page.locator('.moods').bounding_box()['y'] + page.locator('.moods').bounding_box()['height'] < height - 76
        snapshot('today')
        with page.expect_popup() as popup:
            page.get_by_role('link', name='記録の取り扱いについて（別タブ）').click()
        legal = popup.value
        legal.wait_for_load_state()
        expect(legal.locator('body')).to_contain_text('運営担当者が閲覧できる場合があります')
        legal.close()
        # Check: mood, then optional chips (✓ + aria-pressed, 44px).
        mood('普通').focus()
        page.keyboard.press('Space')
        expect(mood('普通')).to_have_attribute('aria-pressed', 'true')
        expect(mood('普通')).to_contain_text('✓')
        expect(page.locator('.check-details-title')).to_have_text('添えたいものだけ（任意）')
        expect(page.locator('.check-note')).to_have_text('気分だけでも、このまま見られます')
        group = lambda name: page.locator('.chip-group').filter(has=page.locator('legend', has_text=re.compile(f'^{name}$')))
        group('睡眠').get_by_role('button', name='6h').click()
        group('身体').get_by_role('button', name='疲れ気味').click()
        group('ストレス').get_by_role('button', name='やや高い').click()
        for chip in page.locator('.chip-group button').all():
            b = chip.bounding_box()
            assert b['height'] >= 44, f'{width}: chip under 44px'
        expect(group('睡眠').get_by_role('button', name='6h')).to_have_attribute('aria-pressed', 'true')
        snapshot('check-input')
        button('今日の私を見てみる').click()
        page.locator('.today--checked').wait_for()
        expect(page.locator('#today-result h2')).to_be_focused()
        saved = stored()['checkins'][0]
        assert (saved['sleep'], saved['body'], saved['stress']) == (6, '疲れ気味', 'やや高い')
        assert [n for n in events() if n in ('check_view', 'check_start', 'check_complete')] == ['check_view', 'check_start', 'check_complete']
        expect(page.locator('.check-folded')).to_contain_text('今日のCheck · 12:00 · 1日目')
        expect(page.locator('.check-folded')).to_contain_text('普通 · 睡眠 6h · 身体 疲れ気味 · ストレス やや高い')
        assert page.locator('.moods button').count() == 0
        expect(page.locator('#today-result h2')).to_have_text('今日のあなた')
        expect(page.locator('#today-result')).to_contain_text('Checkとこれまでの記録から。決めつけではありません。')
        expect(page.locator('#today-result .flow-step')).to_contain_text('✓ 済み')
        expect(page.locator('#today-plans .flow-step')).to_have_attribute('aria-current', 'step')
        assert page.get_by_text('今日は何もしない', exact=True).count() == 1
        assert page.locator('.plan-main').count() == 1 and page.locator('.plan-others li').count() == 2, (page.locator('.plan-main').count(), page.locator('.plan-others li').count())
        expect(page.locator('.tomorrow-card')).to_contain_text('明日またCheckすると、今日との違いが見えてきます。')
        no_overlap('.today-flow > section')
        snapshot('check-result')
        # 2/3: the main plan's label matches what it does.
        cta_label = page.locator('.plan-cta').inner_text()
        assert cta_label in ('これにする', 'やってみる', 'Camelliaに話す'), cta_label
        if cta_label == 'これにする':
            page.locator('.plan-cta').click()
            expect(page.locator('.plan-chosen')).to_contain_text('今日はこれにしました')
            expect(page.locator('#today-plans .flow-step')).to_contain_text('✓ 済み')
            assert page.locator('.flow-active .active-action').count() == 1
        elif cta_label == 'やってみる':
            # In-place action: やってみる → steps → できた / あとで / やめる (Escape closes, focus starts inside).
            page.locator('.plan-cta').click()
            expect(page.locator('.sheet')).to_be_visible()
            expect(page.locator('.sheet').get_by_role('button', name='やってみる', exact=True)).to_be_focused()
            page.keyboard.press('Escape')
            expect(page.locator('.sheet')).to_have_count(0)
            page.locator('.plan-cta').click()
            page.locator('.sheet').get_by_role('button', name='やってみる', exact=True).click()
            expect(page.locator('.runner li')).to_have_count(3)
            expect(page.locator('.runner')).to_contain_text('あとで')
            expect(page.locator('.runner')).to_contain_text('やめる')
            snapshot('runner')
            page.locator('.sheet').get_by_role('button', name='できた', exact=True).click()
            assert stored()['actions'][-1]['status'] == 'completed'
            expect(page.locator('.plan-chosen')).to_contain_text('できました')
            expect(page.locator('.reflection h2')).to_contain_text('はどうだった？')
        # 3/3: today's card, then the question, then back to decide.
        page.locator('.fortune-entry').click()
        button('一枚引く').click()
        page.locator('.fortune-result').wait_for()
        first_card = stored()['fortunes'][0]
        expect(page.locator('.fortune-question')).to_contain_text('という言葉に、今日のあなたと重なるところはありますか？')
        page.locator('.fortune-reflect').get_by_role('button', name='少し').click()
        expect(page.locator('.fortune-reflect').get_by_role('button', name=re.compile('少し'))).to_have_attribute('aria-pressed', 'true')
        assert page.evaluate(f"localStorage.getItem('camellia-fortune-reflect:2026-10-09')") == 'some'
        reflect = [e for e in stored()['analyticsEvents'] if e['name'] == 'fortune_reflect']
        assert len(reflect) == 1 and reflect[0]['properties']['value'] == 'some'
        assert page.locator('.fortune-actions button').count() == 2
        expect(page.locator('.fortune-try h2')).to_contain_text('を、小さく試すなら')
        assert page.get_by_text('今日は何もしない', exact=True).count() == 0
        decide = button('Todayに戻って、今日どうするか決める')
        expect(decide).to_have_class(re.compile('primary'))
        no_overlap('.fortune > section')
        snapshot('fortune')
        decide.click()
        expect(page.locator('#today-intent')).to_be_focused()
        expect(page.locator('#today-intent')).to_be_in_viewport()
        expect(page.locator('.fortune-entry')).to_contain_text('もう一度見る')
        # 今日どうする？ → Discover says what happens.
        page.get_by_role('button', name='休む過ごし方を見る').click()
        expect(page.get_by_role('heading', name='Discover', exact=True)).to_be_visible()
        assert page.locator('.category-scroll').get_by_role('button', name='休む', exact=True).get_attribute('aria-pressed') == 'true'
        assert page.locator('.category-scroll').bounding_box()['y'] < page.locator('.discover-rest').bounding_box()['y'], 'categories first'
        expect(page.locator('.discover-rest')).to_contain_text('Todayに出した')
        assert page.get_by_role('button', name='選ぶ', exact=True).count() == 0, 'whole card is the button'
        expect(page.locator('.coming-places')).to_contain_text('これから増える場所（準備中）')
        assert page.locator('.coming-places button, .coming-places a').count() == 0
        today_ids = [a['actionId'] for a in stored()['contextualMemory'] if a['event'] == 'proposed']
        snapshot('discover')
        # In-place action: やってみる → steps → できた (one completed record).
        breathing = page.locator('.action-card--whole', has_text='4回だけ深呼吸')
        if breathing.count():
            breathing.click()
            expect(page.locator('.sheet')).to_be_visible()
            expect(button('やってみる')).to_be_focused()
            page.keyboard.press('Escape')
            expect(page.locator('.sheet')).to_have_count(0)
            breathing.click()
            button('やってみる').click()
            expect(page.locator('.runner li')).to_have_count(3)
            snapshot('runner')
            button('できた').click()
            done = [a for a in stored()['actions'] if a['actionId'] == 'breathing']
            assert done and done[-1]['status'] == 'completed'
        else:
            page.locator('.action-card--whole').first.click()
            expect(button('これにする')).to_be_visible()
            page.keyboard.press('Escape')
        # Conversation: today's Check stays visible; tired → one question with choices.
        button('Camellia').click()
        page.get_by_role('heading', name='Camellia', exact=True).wait_for()
        expect(page.locator('.today-check-chip')).to_contain_text('今日のCheck：')
        expect(page.locator('.today-check-chip')).to_contain_text('普通')
        assert page.locator('.conversation-entry .quick-inputs button').count() == 3
        page.get_by_label('Camelliaへのメッセージ').fill('少し疲れていて、ゆっくりしたいです。')
        page.keyboard.press('Enter')
        expect(page.locator('.bubble.assistant').last).to_contain_text('今日は少し疲れてるんだね。今は「少し話したい」「静かに休みたい」どちらに近い？')
        assert page.locator('.conversation-choices button').count() == 2
        for chip in page.locator('.conversation-choices button').all():
            assert chip.bounding_box()['height'] >= 44
        snapshot('conversation')
        page.locator('.conversation-choices').get_by_role('button', name='静かに休みたい').click()
        replies = [m['text'] for m in stored()['aiConversations'][0]['messages'] if m['role'] == 'assistant']
        assert len(replies) == 2 and replies[0] != replies[1]
        page.get_by_label('Camelliaへのメッセージ').fill('なんか暇')
        page.keyboard.press('Enter')
        last = page.locator('.bubble.assistant').last.inner_text()
        if '置いておきます' in last:
            expect(page.locator('.conversation-action')).to_be_visible()
        assert stored()['personalMemories'] == []
        # My: calm top, folded account and records, labelled history, display setting.
        button('My').click()
        assert page.locator('.my-alert').count() == 0, 'no warning when nothing is wrong'
        expect(page.locator('.account-records summary')).to_contain_text('アカウントと記録')
        expect(page.get_by_role('heading', name='状態の履歴', exact=True)).to_be_visible()
        expect(page.locator('.history-row').filter(has_text='普通').first).to_be_visible()
        page.get_by_label('説明を少なめにする').check()
        assert page.evaluate("document.documentElement.classList.contains('less-explain')")
        page.get_by_label('説明を少なめにする').uncheck()
        snapshot('my')
        page.get_by_role('button', name=re.compile('My Tree')).click()
        expect(page.locator('.tree-intro')).to_contain_text('自分のために残しておく場所')
        page.get_by_role('button', name='人を追加').click()
        page.get_by_label('名前／ニックネーム').fill('冷蔵庫くん')
        page.get_by_label('自分のための一言').fill('大切な思い出')
        button('木に追加する').click()
        assert len(stored()['treeLeaves']) == 1
        expect(page.locator('.branch text tspan')).to_have_count(2)
        assert page.locator('.branch text').text_content() == '冷蔵庫くん', 'name no longer cut to 冷蔵…'
        expect(page.locator('.leaf-updated').first).to_have_text('今日')
        snapshot('tree')
        button('Myへ').click()
        # A second visit to the card on the same day keeps the same card.
        button('Today').click()
        page.locator('.fortune-entry').click()
        assert page.get_by_role('button', name='一枚引く', exact=True).count() == 0
        assert stored()['fortunes'][0]['cardId'] == first_card['cardId'] and len(stored()['fortunes']) == 1
        button('Todayへ').click()
        # 選び直す: a fresh mood is required, and no extra card.
        button('選び直す').click()
        assert button('今日の私を見てみる').count() == 0
        assert page.locator('.moods button[aria-pressed="true"]').count() == 0
        mood('良い').click()
        button('今日の私を見てみる').click()
        assert len(stored()['checkins']) == 2 and len(stored()['fortunes']) == 1
        # Record stages (mock state in this harness only).
        seed_history([-1])
        expect(page.locator('.today--unchecked')).to_be_visible()
        expect(page.locator('.yesterday-pill')).to_have_text('昨日は「普通」でした。今日は？')
        expect(page.locator('.check-primary h2')).to_have_text('昨日と今日、何が違う？')
        snapshot('day-two-before')
        mood('良い').click()
        button('今日の私を見てみる').click()
        expect(page.locator('#today-result h2')).to_have_text('昨日との違い')
        expect(page.locator('.yesterday-difference')).to_contain_text('昨日より')
        expect(page.locator('.tomorrow-card')).to_contain_text('明日でCheckが3回に。最近のあなたの流れが見えてきます。')
        titles = page.locator('.reflection h2').all_inner_texts()
        assert len(titles) == len(set(titles)), f'one feedback prompt per action: {titles}'
        no_overlap('.today-flow > section')
        snapshot('day-two')
        seed_history([-2, -1, 0])
        expect(page.locator('#today-result h2')).to_have_text('最近のあなた')
        expect(page.locator('.tomorrow-card')).to_contain_text('7回分のふり返りまで、あと4回です。')
        snapshot('recent')
        seed_history([-6, -5, -4, -3, -2, -1, 0])
        expect(page.locator('#today-result h2')).to_have_text('今週のあなた')
        expect(page.locator('.tomorrow-card')).to_contain_text('直近7回の流れ')
        snapshot('weekly')
        # Profile edit does not count as profile_view; logout keeps the records.
        button('My').click()
        page.get_by_text('アカウントと記録').click()
        page.get_by_role('button', name='プロフィールを確認・編集する').click()
        expect(page.get_by_label('名前／ニックネーム')).to_have_value('テスト')
        button('変更を保存する').click()
        assert events().count('profile_view') == 1
        button('My').click()
        page.get_by_text('その他', exact=True).click()
        button('プライバシーと保存データ').click()
        expect(page.locator('.privacy')).to_contain_text('運営管理機能から確認できる場合があります')
        button('← Myへ戻る').click()
        before_logout = stored()['checkins']
        page.get_by_text('アカウントと記録').click()
        button('ログアウト').click()
        expect(page.locator('.account-card')).to_contain_text('前に使ったLINE')
        assert stored()['checkins'] == before_logout
        page.get_by_role('button', name='SchoolPark Passportで続ける').click()
        page.locator('.bottom-nav').wait_for()
        button('Today').click()
        page.locator('.today--checked').wait_for()
        assert stored()['checkins'] == before_logout and len(stored()['treeLeaves']) == 1
        state = stored()
        state['fortunes'] = []
        page.evaluate('(state)=>localStorage.setItem("camellia-prototype-v3",JSON.stringify(state))', state)
        page.reload()
        page.locator('.fortune-entry').click()
        button('今日は引かない').click()
        expect(page.locator('.fortune-skip')).to_be_visible()
        assert stored()['fortunes'][0]['status'] == 'skipped'
        assert button('一枚引く').count() == 0, 'skipping also preserves daily control'
        button('Todayに戻って、今日どうするか決める').click()
        expect(page.locator('#today-intent')).to_be_focused()
        expect(page.locator('.fortune-entry')).to_contain_text('今日は引かない日')
        assert errors == [], errors
        results.append({'width': width, 'height': height, 'result': 'PASS', 'external_requests_blocked': len(blocked), 'page_errors': errors,
                        'coverage': 'Welcome/login consent/profile_view/Today before Check/chips/folded Check/1-2-3 flow/これにする/card+reflect/decide/Discover/in-place runner/conversation choices/My/Tree labels/stages first_day→weekly/logout+Passport return/skip'})
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
