import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getFirestore,collection,doc,getDoc,onSnapshot,setDoc,addDoc,deleteDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const config={apiKey:'AIzaSyBld1h1Fo2i0EVznYPiPiER0xohjpXdl9o',authDomain:'kotodaman-dictionary.firebaseapp.com',projectId:'kotodaman-dictionary',storageBucket:'kotodaman-dictionary.firebasestorage.app',messagingSenderId:'849932608558',appId:'1:849932608558:web:d990ef54bc4640dd29ebbf'};
const db=getFirestore(initializeApp(config));
const col=collection(db,'publicDecks');
const $=id=>document.getElementById(id);
const bridge=window.kotodamanCloudBridge;
let docs=new Map();let chosen='';let ready=false;
// The saved selection is per browser/PWA, never shared via Firebase.
const lastSelectionKey='kotodaman-last-selected-public-deck-v1';
let restorePending=true;
function remembered(){try{return localStorage.getItem(lastSelectionKey)||''}catch(e){return ''}}
function remember(id){try{if(id)localStorage.setItem(lastSelectionKey,id);else localStorage.removeItem(lastSelectionKey)}catch(e){console.warn('デッキ選択状態を保存できません',e)}}
function status(s){$('publicDeckStatus').textContent=s}
function valid(deck){return deck&&typeof deck.name==='string'&&deck.name.length>0&&deck.name.length<=100&&Array.isArray(deck.slots)&&deck.slots.length===12}
function tidy(deck){return {name:String(deck.name||'デッキ1').slice(0,100),slots:deck.slots.map(s=>({name:String(s.name||'').slice(0,100),chars:String(s.chars||'').slice(0,120),attribute:String(s.attribute||'').slice(0,30),image:String(s.image||'').slice(0,1200),url:String(s.url||'').slice(0,1200),version:String(s.version||'').slice(0,100)}))}}
function report(e){console.error(e);status('接続エラー：'+(e.code||e.message||String(e))+'。Firestoreのルールとネット接続を確認してください。')}
function draw(){let select=$('savedDecks'),keep=chosen||select.value;select.replaceChildren();let option=document.createElement('option');option.value='';option.textContent='みんなの保存済みデッキを選択';select.append(option);for(const [id,d] of [...docs].sort((a,b)=>a[1].name.localeCompare(b[1].name,'ja'))){let o=document.createElement('option');o.value=id;o.textContent=d.name;select.append(o)};select.value=docs.has(keep)?keep:'';chosen=select.value;status('共通デッキ '+docs.size+'件。追加・変更・削除は全員の画面に自動反映されます。')}
function applySelected(){
 const id=$('savedDecks').value;chosen=id;remember(id);
 const d=docs.get(id);
 if(!d)return;
 bridge.applyDeck(d);
 status('「'+d.name+'」を反映しました。変更後は「全員に保存」で保存できます。');
}
$('savedDecks').addEventListener('change',()=>{try{applySelected()}catch(e){report(e)}});
onSnapshot(col,snap=>{
 docs.clear();snap.forEach(d=>{if(valid(d.data()))docs.set(d.id,d.data())});ready=true;draw();
 if(restorePending){
  const id=remembered();
  if(!id){restorePending=false;return}
  const deck=docs.get(id);
  if(deck){
   try{
    chosen=id;$('savedDecks').value=id;
    bridge.applyDeck(deck,{scroll:false});
    status('前回使用した「'+deck.name+'」を自動復元しました。');
    restorePending=false;
   }catch(e){console.error(e);status('デッキの自動復元に失敗しました：'+String(e.message||e));restorePending=false}
  }else if(snap.metadata?.fromCache===true){
   // Offline/empty cache may arrive before the actual server snapshot.
   status('前回のデッキを確認しています。');
  }else{
   // A previously selected deck has been removed from the shared list.
   remember('');chosen='';restorePending=false;
  }
 }
},report);
$('saveDeck').onclick=async()=>{if(!ready){status('接続処理中です。少し待ってから保存してください。');return}const data=tidy(bridge.getDraft());if(!valid(data))return alert('12体のデッキ情報を確認してください');let id=chosen;if(id&&docs.has(id)&&docs.get(id).name!==data.name){if(!confirm('選択中のデッキ名を変更して上書きしますか？'))return}try{if(id&&docs.has(id)){if(!confirm('「'+docs.get(id).name+'」を全員共通の一覧で上書きします。よろしいですか？'))return;await setDoc(doc(db,'publicDecks',id),{...data,updatedAt:serverTimestamp()})}else{const match=[...docs].find(([key,d])=>d.name===data.name);if(match){status('同名デッキがあります。編集する場合は一覧から選択して呼び出してください。');return}const added=await addDoc(col,{...data,updatedAt:serverTimestamp()});id=added.id}chosen=id;$('savedDecks').value=id;remember(id);bridge.getDraft();window.kotodamanLocalDeckSave?.();status('「'+data.name+'」を全員共通の一覧に保存しました。')}catch(e){report(e)}};
$('loadDeck').onclick=()=>{
 const id=$('savedDecks').value,d=docs.get(id);
 if(!d)return alert('編集するデッキを選択してください');
 chosen=id;remember(id);bridge.applyDeck(d);
 $('deckName').focus();
 status('「'+d.name+'」を編集中です。変更後「全員に保存」で上書きできます。');
};
$('deleteDeck').onclick=async()=>{
 const id=$('savedDecks').value,d=docs.get(id);
 if(!d)return alert('削除するデッキを選択してください');
 if(!confirm('共有デッキ「'+d.name+'」を削除しますか？\n全員の一覧から削除され、この操作は元に戻せません。'))return;
 try{
  await deleteDoc(doc(db,'publicDecks',id));
  chosen='';$('savedDecks').value='';remember('');
  status('「'+d.name+'」を共有デッキ一覧から削除しました。');
 }catch(e){report(e);alert('削除できませんでした。画面のエラーメッセージを確認してください。')}
};
// Legacy local decks are retained on each device; no migration control is displayed.
