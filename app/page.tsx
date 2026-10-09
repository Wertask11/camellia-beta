/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, react-hooks/exhaustive-deps -- modal backdrop is pointer-dismissable; auth callback intentionally runs once */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheet } from '@/components/ActionSheet';
import { BottomNav, type MainTab } from '@/components/BottomNav';
import { ACTIONS } from '@/data/actions';
import { useCamelliaStore } from '@/hooks/useCamelliaStore';
import {useCurrentTime} from '@/hooks/useCurrentTime';
import { recommend } from '@/lib/recommendation';
import { CamelliaScreen } from '@/screens/CamelliaScreen';
import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { MyScreen } from '@/screens/MyScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { profileComplete } from '@/lib/profile';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { PrivacyScreen } from '@/screens/PrivacyScreen';
import { FortuneScreen } from '@/screens/FortuneScreen';
import { TreeScreen } from '@/screens/TreeScreen';
import { SecondaryScreen } from '@/screens/SecondaryScreen';
import { TodayScreen } from '@/screens/TodayScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { welcomeTheme } from '@/lib/welcome/time';
import { schoolParkAuth } from '@/lib/schoolpark/firebase';
import { finishAuthCallback, logoutCamellia } from '@/lib/auth/camellia';
import { LIVE_DESTINATIONS } from '@/lib/features';
import type { Category, Recommendation, TreeLeaf } from '@/types';

/* ログインの戻り（LINE / SchoolPark）で起きたことを、その人に分かる言葉にする。
   記録の食い違い（accountError）とは別物。止めるのはログインだけで、記録には触れない。 */
function authNoticeFor(code:string,signedIn=false){
  // signedIn: the person was adding a login method to the account they are using, not logging in.
  if(code==='IDENTITY_LINKED_TO_OTHER')return signedIn?'このログイン方法は、すでに別のCamelliaアカウントにつながっています。記録を守るため、自動ではまとめません。今のアカウントは、このまま使えます。':'このログイン方法は、別のCamelliaアカウントで使われています。記録を守るため、自動ではつなぎません。前に使っていた方法でログインしてください。';
  if(code.startsWith('TICKET_')||code==='MISSING_TICKET')return 'SchoolParkでの確認の有効期限が切れました。もう一度お試しください。';
  if(code==='LINE_CANCELLED')return 'LINEでのログインをキャンセルしました。もう一度試すか、別のログイン方法を選んでください。';
  if(code==='STATE_MISMATCH'||code.startsWith('LINE_'))return 'LINEでの確認を完了できませんでした。もう一度お試しください。';
  if(code==='AUTH_UNAVAILABLE')return 'いまログインを受け付けられません。少し時間をおいてお試しください。';
  return 'ログインを完了できませんでした。通信を確認して、もう一度お試しください。';
}

export default function Page() {
  const store = useCamelliaStore();
  const currentTime=useCurrentTime(store.state.checkins);
  const [entry, setEntry] = useState<'welcome' | 'account' | 'onboarding' | 'app'>('welcome');
  const [accountUser,setAccountUser]=useState<User|null>(null);
  const [accountReady,setAccountReady]=useState(false);
  const [accountError,setAccountError]=useState('');
  const [authNotice,setAuthNotice]=useState('');
  const [editingProfile,setEditingProfile]=useState(false);
  const callbackHandled=useRef(false);
  const [tab, setTab] = useState<MainTab>('today');
  const [category, setCategory] = useState<Category>();
  const [chosen, setChosen] = useState<Recommendation>();
  const [secondary, setSecondary] = useState<'circle' | 'place'>();
  const [privacy, setPrivacy] = useState(false);
  const [treeContext,setTreeContext]=useState<TreeLeaf>();
  const [feature, setFeature] = useState<'fortune' | 'tree'>();
  const [returnToIntent, setReturnToIntent] = useState(false);
  const [devNight, setDevNight] = useState(false);
  const recommendationDate = useMemo(() => {
    const value = new Date(currentTime.getTime());
    if (devNight) value.setHours(21, 0, 0, 0);
    return value;
  }, [devNight,currentTime]);
  const recs = useMemo(
    () => recommend(store.state, recommendationDate),
    [store.state, recommendationDate],
  );
  /* 戻ってきた人（オンボーディングを終えている人）は、Welcome を挟まずにログインへ。
     ログイン画面は、新しい人にも戻ってきた人にも login_view として数える
     （正式版のファネルの account_view にあたる。同じ意味のイベントは増やさない）。 */
  const returning = store.state.onboardingComplete;
  const showWelcome = !accountUser && entry === 'welcome' && !returning;
  const showAccount = !accountUser && !showWelcome;
  useEffect(() => {
    if (!store.ready || store.storageError || !accountReady) return;
    if (showWelcome && sessionStorage.getItem('camellia-welcome-view') !== '1') {
      sessionStorage.setItem('camellia-welcome-view', '1');
      store.track('welcome_view', { period: welcomeTheme().period });
    }
    if (showAccount && sessionStorage.getItem('camellia-login-view') !== '1') {
      sessionStorage.setItem('camellia-login-view', '1');
      store.track('login_view', { authenticated: Boolean(schoolParkAuth.currentUser) });
    }
  }, [showWelcome, showAccount, accountReady, store.ready, store.storageError, store.track]);
  /* Which user the screens were last prepared for ("uid:anonymous?"). A β guest that logs in keeps its
     uid, and onAuthStateChanged only fires when the uid changes, so the login return applies it itself. */
  const appliedUser=useRef<string|null>(null);
  const applyUser=useRef<(user:User|null)=>void>(()=>{});
  useEffect(() => {
    if(!store.ready||store.storageError)return;
    let generation=0;
    const apply=(user:User|null)=>{
      const request=++generation;
      appliedUser.current=user?`${user.uid}:${user.isAnonymous}`:'';
      setAccountReady(false);setAccountError('');setAccountUser(user?.isAnonymous?null:user);
      if(!user||user.isAnonymous){setAccountReady(true);return;}
      void store.prepareAccount(user.uid).then(()=>{if(request===generation)setAccountReady(true);}).catch(error=>{
        if(request!==generation)return;
        setAccountError(error instanceof Error?error.message:'SYNC_UNAVAILABLE');setAccountReady(true);
      });
    };
    applyUser.current=apply;
    const unsubscribe=onAuthStateChanged(schoolParkAuth,apply);
    return ()=>{generation++;unsubscribe();applyUser.current=()=>{};};
  },[store.ready,store.prepareAccount]);
  useEffect(() => {
    void finishAuthCallback().then(result=>{
      if(!result||callbackHandled.current)return;
      callbackHandled.current=true;
      store.track('login_success',{method:result.linked?'account_link':'login'});
      setEntry('app');
      const user=schoolParkAuth.currentUser;
      if(user&&appliedUser.current!==null&&appliedUser.current!==`${user.uid}:${user.isAnonymous}`)applyUser.current(user);
    }).catch(error=>{const user=schoolParkAuth.currentUser;setAuthNotice(authNoticeFor(error instanceof Error?error.message:'AUTH_FAILED',Boolean(user&&!user.isAnonymous)));setEntry('account');});
  },[store.track]);
  if(store.storageError)return <main className="screen"><h1>端末の記録を読み込めませんでした</h1><p>保存データを上書きせず、そのまま残しています。別の端末やアカウントへ切り替える前に、運営へお問い合わせください。</p></main>;
  if(!store.ready||!accountReady)return <output className="loading">Camelliaの記録を確認しています…</output>;
  if(accountError&&accountUser){
    const resolve=(choice:'remote'|'adopt'|'fresh')=>{setAccountReady(false);void store.prepareAccount(accountUser.uid,choice).then(()=>{setAccountError('');setAccountReady(true);}).catch(error=>{setAccountError(error instanceof Error?error.message:'RESTORE_FAILED');setAccountReady(true);});};
    // Always leave a way out: logging in with the method used before is often all that is needed.
    const leave=()=>{setAccountReady(false);void logoutCamellia().catch(()=>{}).finally(()=>{setAccountError('');setAccountUser(null);setEntry('account');setAccountReady(true);});};
    const empty=accountError==='IDENTITY_CONFLICT_EMPTY_ACCOUNT';
    const conflict=['IDENTITY_CONFLICT','SYNC_CONFLICT'].includes(accountError);
    return <main className="screen"><h1>記録を守るため、確認が必要です</h1><p>この端末とアカウントの記録を、自動で上書き・結合していません。</p>
      <p role="alert">{empty?'このアカウントには、まだ記録がありません。この端末には、別のアカウントで使っていた記録があります。':conflict?'別のアカウント、または別端末の記録が見つかりました。':'記録を確認できませんでした。通信を確認して再度お試しください。'}</p>
      {empty?<>
        <p>前に使ったLINEまたはSchoolPark Passportでログインし直すと、これまでの記録に戻れます。</p>
        <button className="primary" onClick={leave}>ログアウトして、前の方法でログインする</button>
        <button className="secondary-button" onClick={()=>resolve('adopt')}>この端末の記録を、このアカウントで使う</button>
        <button className="secondary-button" onClick={()=>resolve('fresh')}>このアカウントで、はじめから始める（この端末の記録は別に残す）</button>
      </>:<>
        <button className="primary" onClick={()=>location.reload()}>もう一度確認する</button>
        {conflict&&<button className="secondary-button" onClick={()=>resolve('remote')}>このアカウントの記録を開く（端末の記録は別に残す）</button>}
        <button className="secondary-button" onClick={leave}>ログアウトする</button>
      </>}
    </main>;
  }
  if(showWelcome)return <WelcomeScreen onContinue={()=>{store.track('welcome_continue',{period:welcomeTheme().period});setEntry('account');}}/>;
  if(!accountUser)return <AccountScreen returning={returning} notice={authNotice} onBack={returning?undefined:()=>setEntry('welcome')} onSelect={method=>{setAuthNotice('');store.track('auth_method_selected',{auth_method:method});}} onContinue={()=>setEntry('app')}/>;
  if(!profileComplete(store.state.profile)||editingProfile)return <div className="app-shell"><ProfileScreen profile={store.state.profile} existing={store.state.onboardingComplete} onBack={editingProfile?()=>setEditingProfile(false):undefined} onSave={patch=>{if(!profileComplete(store.state.profile))store.track('profile_complete');store.updateProfile(patch);store.completeOnboarding();setEditingProfile(false);setEntry('app');setTab('today');}}/></div>;
  const openAction = (r: Recommendation) => {
    if (r.action.opens === 'camellia') {
      setFeature(undefined);
      setTab('camellia');
      return;
    }
    // A place that is not live yet (β2: Circle, Place) never interrupts a doable action like a café visit.
    if (r.action.destination && LIVE_DESTINATIONS.has(r.action.destination)) {
      setSecondary(r.action.destination);
      return;
    }
    setChosen(r);
  };
  const intent = (x: string) => {
    if (x === '何もしない') {
      const a = ACTIONS.find((a) => a.id === 'do-nothing');
      if (a)
        setChosen({
          action: a,
          score: 0,
          reasons: ['何もしないことも、今日の大切な休息だから'],
        });
      return;
    }
    const map: Record<string, Category> = {
      整える: 'BODY',
      楽しむ: 'PLAY',
      学ぶ: 'LEARN',
      休む: 'REST',
    };
    setCategory(map[x]);
    setTab('discover');
  };
  if (secondary)
    return (
      <div className="app-shell">
        <SecondaryScreen
          kind={secondary}
          onBack={() => setSecondary(undefined)}
        />
      </div>
    );
  if (privacy)
    return (
      <div className="app-shell">
        <span className="beta-badge">Camellia β2</span>
        <PrivacyScreen onBack={() => setPrivacy(false)} />
      </div>
    );
  if (feature === 'fortune')
    return (
      <div className="app-shell">
        <span className="beta-badge">Camellia β2</span>
        <FortuneScreen
          state={store.state}
          recommendations={recs}
          onBack={() => setFeature(undefined)}
          onDecide={() => { setReturnToIntent(true); setFeature(undefined); }}
          onSave={store.setFortune}
          onTrack={store.track}
          onAction={openAction}
        />
        {chosen && (
          <ActionSheet
            action={chosen.action}
            onClose={() => setChosen(undefined)}
            onStart={() => {
              store.startAction(chosen.action);
              setChosen(undefined);
            }}
            onSave={(timing) => {
              store.saveAction(chosen.action, timing);
              setChosen(undefined);
            }}
            onSkip={(reason) => {
              store.skipAction(chosen.action, reason);
              setChosen(undefined);
            }}
          />
        )}
      </div>
    );
  if (feature === 'tree')
    return (
      <div className="app-shell">
        <span className="beta-badge">Camellia β2</span>
        <TreeScreen
          leaves={store.state.treeLeaves}
          onBack={() => setFeature(undefined)}
          onAdd={store.addTreeLeaf}
          onUpdate={store.updateTreeLeaf}
          onRemove={store.removeTreeLeaf}
          onTalk={leaf=>{setTreeContext(leaf);setFeature(undefined);setTab('camellia');}}
          onReflect={store.addTreeReflection}
          onTrack={store.track}
        />
      </div>
    );
  return (
    <div className="app-shell">
      <span className="beta-badge">Camellia β2</span>
      {authNotice && (
        <div className="app-notice-wrap"><p className="auth-error app-notice" role="alert">
          {authNotice}
          <button className="text-button" onClick={() => setAuthNotice('')}>閉じる</button>
        </p></div>
      )}
      {tab === 'today' && (
        <TodayScreen
          state={store.state}
          recommendations={recs}
          forceNight={devNight}
          onCheckView={store.viewCheck}
          onCheckStart={store.startCheck}
          onCheckin={store.addCheckin}
          onOpenAction={openAction}
          onIntent={intent}
          onTalk={() => setTab('camellia')}
          focusIntent={returnToIntent}
          onIntentFocused={() => setReturnToIntent(false)}
          onFortune={() => {
            store.track('fortune_open');
            setFeature('fortune');
          }}
          onTree={() => {
            store.track('tree_open');
            setFeature('tree');
          }}
          onComplete={store.completeAction}
          onFeedback={store.addFeedback}
          onProposals={store.recordProposals}
          onTrack={store.track}
        />
      )}
      {tab === 'camellia' && (
        <CamelliaScreen
          onRemember={store.remember}
          onTrack={store.track}
          treeContext={treeContext}
          onClearTreeContext={()=>setTreeContext(undefined)}
          onTree={()=>{setTreeContext(undefined);setFeature('tree');}}
          state={store.state}
          recommendations={recs}
          onSaveConversation={store.addConversation}
          onOpenAction={openAction}
          onNavigate={(x) => {
            if (x === 'discover') setTab('discover');
            else setSecondary(x);
          }}
        />
      )}
      {tab === 'discover' && (
        <DiscoverScreen
          state={store.state}
          category={category}
          onCategory={setCategory}
          onOpenAction={openAction}
          onOpenSecondary={setSecondary}
        />
      )}
      {tab === 'my' && (
        <MyScreen
          state={store.state}
          devNight={devNight}
          onForget={store.forget}
          onEditProfile={()=>setEditingProfile(true)}
          onReset={store.reset}
          onInsight={store.feedbackInsight}
          onPrivacy={() => setPrivacy(true)}
          onTree={() => {
            store.track('tree_open');
            setFeature('tree');
          }}
          onDevNight={setDevNight}
        />
      )}
      <BottomNav active={tab} onChange={setTab} />
      {chosen && (
        <ActionSheet
          action={chosen.action}
          onClose={() => setChosen(undefined)}
          onStart={() => {
            store.startAction(chosen.action);
            setChosen(undefined);
          }}
          onSave={(timing) => {
            store.saveAction(chosen.action, timing);
            setChosen(undefined);
          }}
          onSkip={(reason) => {
            store.skipAction(chosen.action, reason);
            setChosen(undefined);
          }}
        />
      )}
    </div>
  );
}
