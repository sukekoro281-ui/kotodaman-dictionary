import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,doc,getDocs,getDoc,setDoc,deleteDoc,addDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig={
 apiKey:'AIzaSyBld1h1Fo2i0EVznYPiPiER0xohjpXdl9o',
 authDomain:'kotodaman-dictionary.firebaseapp.com',
 projectId:'kotodaman-dictionary',
 storageBucket:'kotodaman-dictionary.firebasestorage.app',
 messagingSenderId:'849932608558',
 appId:'1:849932608558:web:d990ef54bc4640dd29ebbf'
};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
const $=id=>document.getElementById(id),bridge=window.kotodamanCloudBridge;
let user=null,cloudDecks=new Map(),shared=null;
function notice(msg){$('cloudMessage').textContent=msg}
function docId(name){return encodeURIComponent(name)}
function validDeck(d){return d&&typeof d.name==='string'&&d.name.length<=100&&Array.isArray(d.slots)&&d.slots.length===12&&d.slots.every(x=>x&&typeof x==='object')}
function cleanDeck(d){return {name:String(d.name||'デッキ1').slice(0,100),slots:d.slots.map(x=>({name:String(x.name||'').slice(0,100),chars:String(x.chars||'').slice(0,120),attribute:String(x.attribute||'').slice(0,30),image:String(x.image||'').slice(0,1200),url:String(x.url||'').slice(0,1200),version:String(x.version||'').slice(0,100)}))}}
async function listCloud(){
 if(!user)return;
 const snapshot=await getDocs(collection(db,'users',user.uid,'decks'));
 cloudDecks=new Map();
 for(const row of snapshot.docs){const d=row.data();if(validDeck(d))cloudDecks.set(row.id,d)}
 const select=$('cloudDecks');select.replaceChildren();
 const first=document.createElement('option');first.value='';first.textContent='クラウドデッキを選択';select.append(first);
 for(const [id,deck] of [...cloudDecks.entries()].sort((a,b)=>a[1].name.localeCompare(b[1].name,'ja'))){const option=document.createElement('option');option.value=id;option.textContent=deck.name;select.append(option)}
 notice(`クラウド保存済み ${cloudDecks.size}件。端末内のデッキは引き続き保存されています。`);
}
async function run(fn){try{await fn()}catch(e){console.error(e);notice('エラー：'+(e.code||e.message||String(e))+'。Firebaseの認証・ルール・通信状態を確認してください。')}}
$('cloudLogin').onclick=()=>run(async()=>{await signInWithPopup(auth,provider)});
$('cloudLogout').onclick=()=>run(async()=>{await signOut(auth)});
onAuthStateChanged(auth,async u=>{
 user=u;$('cloudLogin').hidden=!!u;$('cloudLogout').hidden=!u;$('cloudControls').hidden=!u;
 $('cloudUser').textContent=u?'ログイン中：'+(u.email||'Googleアカウント'):'未ログイン（端末内保存は利用できます）';
 if(u){await run(listCloud)}else{cloudDecks.clear();notice('Googleログインすると、デッキをクラウド保存できます。')}
});
$('cloudSave').onclick=()=>run(async()=>{
 if(!user)throw Error('ログインしてください');const deck=cleanDeck(bridge.getDraft());
 if(!validDeck(deck))throw Error('デッキ形式が正しくありません');
 await setDoc(doc(db,'users',user.uid,'decks',docId(deck.name)),{...deck,updatedAt:serverTimestamp()});
 await listCloud();$('cloudDecks').value=docId(deck.name);notice('「'+deck.name+'」をクラウドに保存しました。');
});
$('cloudMigrate').onclick=()=>run(async()=>{
 if(!user)throw Error('ログインしてください');const local=bridge.getLocal();const entries=Object.entries(local).filter(([name,slots])=>Array.isArray(slots)&&slots.length===12);
 if(!entries.length){notice('移行できる端末内デッキがありません。');return}
 if(!confirm(`${entries.length}件をクラウドへコピーします。クラウドに同名デッキがある場合は上書きします。端末内データは残ります。続けますか？`))return;
 let done=0;for(const [name,slots] of entries){const deck=cleanDeck({name,slots});await setDoc(doc(db,'users',user.uid,'decks',docId(deck.name)),{...deck,updatedAt:serverTimestamp()});done++}
 await listCloud();notice(`端末内の${done}件をクラウドへコピーしました。元データは削除していません。`);
});
$('cloudRefresh').onclick=()=>run(listCloud);
$('cloudLoad').onclick=()=>run(async()=>{const d=cloudDecks.get($('cloudDecks').value);if(!d)throw Error('デッキを選択してください');bridge.applyDeck(d);notice('「'+d.name+'」を編集欄に読み込みました。編集後は「クラウド保存」で保存してください。')});
$('cloudDelete').onclick=()=>run(async()=>{const id=$('cloudDecks').value,d=cloudDecks.get(id);if(!d)throw Error('デッキを選択してください');if(!confirm(`クラウド保存の「${d.name}」を削除しますか？ 端末内保存は削除されません。`))return;await deleteDoc(doc(db,'users',user.uid,'decks',id));await listCloud()});
$('cloudShare').onclick=()=>run(async()=>{
 const d=cloudDecks.get($('cloudDecks').value);if(!d||!user)throw Error('共有するクラウドデッキを選択してください');
 const deck=cleanDeck(d),newDoc=await addDoc(collection(db,'sharedDecks'),{...deck,ownerId:user.uid,createdAt:serverTimestamp()});
 const url=new URL(location.href);url.hash='shared='+encodeURIComponent(newDoc.id);
 if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);notice('共有URLをコピーしました。URLを知っている人が閲覧できます。')}
 else{window.prompt('共有URLをコピーしてください',url.href);notice('共有リンクを発行しました。')}
});
async function showShare(){
 if(!location.hash.startsWith('#shared='))return;
 const id=decodeURIComponent(location.hash.slice(8));
 const snap=await getDoc(doc(db,'sharedDecks',id));
 if(!snap.exists()||!validDeck(snap.data())){notice('共有デッキが見つかりません。');return}
 shared=cleanDeck(snap.data());$('cloudShared').hidden=false;
 $('cloudSharedInfo').textContent=`共有デッキ「${shared.name}」（12体）。「コピー」を押すと現在の編集欄に読み込みます。`;
 $('cloudShared').scrollIntoView({behavior:'smooth',block:'center'});
}
$('cloudSharedCopy').onclick=()=>{if(shared)bridge.applyDeck(shared)};
run(showShare);
