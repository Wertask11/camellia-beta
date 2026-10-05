'use client';
import{useEffect,useState}from'react';
import{onAuthStateChanged,type User}from'firebase/auth';
import{schoolParkAuth}from'@/lib/schoolpark/firebase';
import{ensureGuestSession,logoutCamellia,startLineLogin,startSchoolParkLogin}from'@/lib/auth/camellia';

export function AccountSettings(){
  const[user,setUser]=useState<User|null>(schoolParkAuth.currentUser);
  const[provider,setProvider]=useState('');
  const[error,setError]=useState('');
  useEffect(()=>onAuthStateChanged(schoolParkAuth,async next=>{
    setUser(next);
    if(!next){setProvider('');return}
    const result=await next.getIdTokenResult().catch(()=>null);
    setProvider(typeof result?.claims.provider==='string'?result.claims.provider:'');
  }),[]);
  const connect=(method:'line'|'schoolpark')=>{
    setError('');
    try{if(method==='line')startLineLogin();else startSchoolParkLogin()}
    catch{setError('うまくつながりませんでした。もう一度試してください。')}
  };
  const leave=async()=>{
    await logoutCamellia();
    await ensureGuestSession();
  };
  const guest=Boolean(user?.isAnonymous)||provider==='guest';
  return <section className="panel"><h2>アカウント</h2>
    {user?<p>{guest?'✓ ゲストとして記録を保存中':'✓ Camelliaアカウントに接続中'}</p>:<p className="empty">保存の準備をしています。</p>}
    <button className="settings-link" onClick={()=>connect('schoolpark')}>SchoolPark Passportをつなぐ</button>
    <button className="settings-link" onClick={()=>connect('line')}>LINEをつなぐ</button>
    {!guest&&user&&<button className="settings-link" onClick={()=>void leave()}>ログアウト</button>}
    {error&&<p className="auth-error" role="alert">{error}</p>}
    <small>{guest?'今の記録を保ったまま、あとからLINEまたはSchoolParkと連携できます。':'ログアウトしても保存済みデータは削除されません。'}</small>
  </section>
}
