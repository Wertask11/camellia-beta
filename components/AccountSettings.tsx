'use client';
import{useEffect,useState}from'react';
import{onAuthStateChanged,type User}from'firebase/auth';
import{schoolParkAuth}from'@/lib/schoolpark/firebase';
import{getLinkedCamelliaMethods,logoutCamellia,startLineLogin,startSchoolParkLogin,type LinkedCamelliaMethods}from'@/lib/auth/camellia';

/* どのログイン方法がこの Camellia アカウントにつながっているかを見せる。
   つながっていない方だけ「つなぐ」を出す。つないだ方法なら、どちらで入っても同じ記録に戻る。
   つながりを確かめられなかったとき（通信できないなど）は「つながっていない」とは言わず、
   両方の「つなぐ」を出す。すでにつながっている方を押しても、同じアカウントのまま戻るだけ。 */
export function AccountSettings(){
  const[user,setUser]=useState<User|null>(schoolParkAuth.currentUser);
  const[linked,setLinked]=useState<LinkedCamelliaMethods|null>(null);
  const[unknown,setUnknown]=useState(false);
  const[error,setError]=useState('');
  useEffect(()=>onAuthStateChanged(schoolParkAuth,next=>{
    setUser(next);setLinked(null);setUnknown(false);
    if(!next||next.isAnonymous)return;
    getLinkedCamelliaMethods().then(setLinked).catch(()=>setUnknown(true));
  }),[]);
  const connect=(method:'line'|'schoolpark')=>{
    setError('');
    try{if(method==='line')startLineLogin();else startSchoolParkLogin()}
    catch{setError('うまくつながりませんでした。もう一度試してください。')}
  };
  const leave=async()=>{
    try{await logoutCamellia();setError('ログアウトしました。保存済みデータはこの端末に残っています。')}
    catch{setError('ログアウトできませんでした。もう一度お試しください。')}
  };
  const account=Boolean(user&&!user.isAnonymous);
  const state=(on:boolean|undefined)=>on===undefined?(unknown?'確認できませんでした':'確認しています…'):on?'つながっています':'まだつながっていません';
  return <section className="panel"><h2>アカウント</h2>
    {account?<p>✓ Camelliaアカウントに接続中</p>:<p className="empty">ログアウト中です。保存済みデータはこの端末に残っています。</p>}
    {account&&<ul className="linked-methods"><li><span>LINE</span><b>{state(linked?.line)}</b></li><li><span>SchoolPark Passport</span><b>{state(linked?.schoolpark)}</b></li></ul>}
    {account&&(unknown||linked&&!linked.schoolpark)&&<button className="settings-link" onClick={()=>connect('schoolpark')}>SchoolPark Passportもつなぐ</button>}
    {account&&(unknown||linked&&!linked.line)&&<button className="settings-link" onClick={()=>connect('line')}>LINEもつなぐ</button>}
    {account&&<button className="settings-link" onClick={()=>void leave()}>ログアウト</button>}
    {error&&<p className="auth-error" role="alert">{error}</p>}
    <small>つないだ方法なら、どちらでログインしても同じ記録に戻ります。別のCamelliaアカウントで使っている方法は、記録を守るため自動ではつなぎません。ログアウトしても保存済みデータは削除されません。</small>
  </section>
}
