// SAFE TEST BUILD: Firestore is read-only. Never mutate shared decks here.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getFirestore,collection,onSnapshot} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const config={apiKey:'AIzaSyBld1h1Fo2i0EVznYPiPiER0xohjpXdl9o',authDomain:'kotodaman-dictionary.firebaseapp.com',projectId:'kotodaman-dictionary',storageBucket:'kotodaman-dictionary.firebasestorage.app',messagingSenderId:'849932608558',appId:'1:849932608558:web:d990ef54bc4640dd29ebbf'};
const db=getFirestore(initializeApp(config));
const col=collection(db,'publicDecks');
const $=id=>document.getElementById(id);
const bridge=window.kotodamanCloudBridge;
const selectionKey='kotodaman-stage1-last-selected-deck-v1';
let decks=new Map(), selected='', initialSnapshot=true;
function status(message){$('publicDeckStatus').textContent='【検証版】'+message}
function valid(d){return d&&typeof d.name==='string'&&Array.isArray(d.slots)&&d.slots.length===12}
function remembered(){try{return localStorage.getItem(selectionKey)||''}catch(e){return ''}}
function remember(id){try{if(id)localStorage.setItem(selectionKey,id);else localStorage.removeItem(selectionKey)}catch(e){console.warn('検証版の選択状態を保存できません',e)}}
function loadSelected(id){
 const deck=decks.get(id);
 if(!deck)return false;
 // This updates the *staging draft* only. It does NOT save anything to Firestore.
 bridge.applyDeck(deck,{scroll:false});
 selected=id;
 $('savedDecks').value=id;
 remember(id);
 status('「'+deck.name+'」を表示しています。再読み込み後もこのデッキを復元します。');
 return true;
}
function rebuild(){
 const list=$('savedDecks');
 const id=initialSnapshot?remembered():selected;
 list.replaceChildren();
 const blank=document.createElement('option');blank.value='';blank.textContent='みんなの保存済みデッキを選択';list.append(blank);
 for(const [key,d] of [...decks].sort((a,b)=>a[1].name.localeCompare(b[1].name,'ja'))){
  const option=document.createElement('option');option.value=key;option.textContent=d.name;list.append(option);
 }
 if(id&&decks.has(id)){
  if(initialSnapshot){
   // First snapshot only: never overwrite the newly imported OCR board.
   loadSelected(id);
  }else{
   selected=id;list.value=id;
  }
 }else{
  if(id){remember('');selected='';}
  list.value='';
  status('共有デッキ '+decks.size+'件を読み込みました。デッキを選ぶと次回から復元します。');
 }
 initialSnapshot=false;
}
$('savedDecks').addEventListener('change',()=>{
 const id=$('savedDecks').value;
 if(id&&!loadSelected(id))status('選択したデッキを読み込めませんでした。');
 else if(!id){selected='';remember('');status('選択を解除しました。');}
});
onSnapshot(col,snapshot=>{
 decks.clear();
 snapshot.forEach(d=>{if(valid(d.data()))decks.set(d.id,d.data())});
 try{rebuild()}catch(error){console.error(error);status('復元エラー：'+(error?.message||error))}
},error=>{console.error(error);status('共有デッキの読み込みエラー：'+(error?.code||error?.message||error))});
// No setDoc, addDoc or deleteDoc in this staging bundle.
$('saveDeck').disabled=true;
$('deleteDeck').disabled=true;
$('loadDeck').onclick=()=>{
 const id=$('savedDecks').value;
 if(!id){status('編集するデッキを選択してください。');return}
 loadSelected(id);
 $('deckName').focus();
 status('検証版の編集欄です。共有デッキへの保存は無効です。');
};
