import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getFirestore,collection,doc,getDoc,onSnapshot,setDoc,addDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const config={apiKey:'AIzaSyBld1h1Fo2i0EVznYPiPiER0xohjpXdl9o',authDomain:'kotodaman-dictionary.firebaseapp.com',projectId:'kotodaman-dictionary',storageBucket:'kotodaman-dictionary.firebasestorage.app',messagingSenderId:'849932608558',appId:'1:849932608558:web:d990ef54bc4640dd29ebbf'};
const db=getFirestore(initializeApp(config));
const col=collection(db,'publicDecks');
const $=id=>document.getElementById(id);
const bridge=window.kotodamanCloudBridge;
let docs=new Map();let chosen='';let ready=false;
function status(s){$('publicDeckStatus').textContent=s}
function valid(deck){return deck&&typeof deck.name==='string'&&deck.name.length>0&&deck.name.length<=100&&Array.isArray(deck.slots)&&deck.slots.length===12}
function tidy(deck){return {name:String(deck.name||'デッキ1').slice(0,100),slots:deck.slots.map(s=>({name:String(s.name||'').slice(0,100),chars:String(s.chars||'').slice(0,120),attribute:String(s.attribute||'').slice(0,30),image:String(s.image||'').slice(0,1200),url:String(s.url||'').slice(0,1200),version:String(s.version||'').slice(0,100)}))}}
function report(e){console.error(e);status('接続エラー：'+(e.code||e.message||String(e))+'。Firestoreのルールとネット接続を確認してください。')}
function draw(){let select=$('savedDecks'),keep=chosen||select.value;select.replaceChildren();let option=document.createElement('option');option.value='';option.textContent='みんなの保存済みデッキを選択';select.append(option);for(const [id,d] of [...docs].sort((a,b)=>a[1].name.localeCompare(b[1].name,'ja'))){let o=document.createElement('option');o.value=id;o.textContent=d.name;select.append(o)};select.value=docs.has(keep)?keep:'';chosen=select.value;status('共通デッキ '+docs.size+'件。追加・変更は全員の画面に自動反映されます。削除機能はありません。')}
$('savedDecks').addEventListener('change',()=>{chosen=$('savedDecks').value});
onSnapshot(col,snap=>{docs.clear();snap.forEach(d=>{if(valid(d.data()))docs.set(d.id,d.data())});ready=true;draw()},report);
$('saveDeck').onclick=async()=>{if(!ready){status('接続処理中です。少し待ってから保存してください。');return}const data=tidy(bridge.getDraft());if(!valid(data))return alert('12体のデッキ情報を確認してください');let id=chosen;if(id&&docs.has(id)&&docs.get(id).name!==data.name){if(!confirm('選択中のデッキ名を変更して上書きしますか？'))return}try{if(id&&docs.has(id)){if(!confirm('「'+docs.get(id).name+'」を全員共通の一覧で上書きします。よろしいですか？'))return;await setDoc(doc(db,'publicDecks',id),{...data,updatedAt:serverTimestamp()})}else{const match=[...docs].find(([key,d])=>d.name===data.name);if(match){status('同名デッキがあります。編集する場合は一覧から選択して呼び出してください。');return}const added=await addDoc(col,{...data,updatedAt:serverTimestamp()});id=added.id}chosen=id;bridge.getDraft();window.kotodamanLocalDeckSave?.();status('「'+data.name+'」を全員共通の一覧に保存しました。')}catch(e){report(e)}};
$('loadDeck').onclick=()=>{const id=$('savedDecks').value,d=docs.get(id);if(!d)return alert('共通デッキを選択してください');chosen=id;bridge.applyDeck(d);status('「'+d.name+'」を読み込みました。変更後「全員に保存」で上書きできます。')};
$('deleteDeck').onclick=null;
$('migratePublicDecks').onclick=async()=>{let local=bridge.getLocal(),entries=Object.entries(local).filter(([k,v])=>Array.isArray(v)&&v.length===12);if(!entries.length){status('移行する端末内デッキはありません。');return}if(!confirm(entries.length+'件を誰でも閲覧・編集できる共通一覧に公開しますか？'))return;try{let num=0;for(const [name,slots] of entries){if([...docs.values()].some(d=>d.name===name))continue;await addDoc(col,{...tidy({name,slots}),updatedAt:serverTimestamp()});num++}status(num+'件を公開しました。既存のローカル保存は残しています。')}catch(e){report(e)}};
