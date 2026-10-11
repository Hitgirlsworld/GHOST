const $=id=>document.getElementById(id);
let pending=[], page='',scannedTabId=null;
async function refresh(){
 const {ghostEnabled=false,ghostMessages={},ghostDecisions={},ghostDiagnostics={},ghostAutoStatus={}}=await chrome.storage.local.get(['ghostEnabled','ghostMessages','ghostDecisions','ghostDiagnostics']);
 $('enabled').checked=ghostEnabled;
 $('stats').textContent=`${Object.keys(ghostMessages).length} messages captured · ${Object.keys(ghostDecisions).length} possible decision signals`;
 const d=ghostDiagnostics;
 $('diagnostics').textContent=[`Capture: ${ghostEnabled?'ON':'OFF'}`,`Phase: ${d.phase||'waiting'}`,`Main container found: ${d.mainFound??'?'}`,`Main text length: ${d.mainTextLength??'?'}`,`Texts found: ${d.found??'?'}`,`Authors verified by page: ${d.verified??'?'}` ,`Blue-bubble suggestions: ${d.blueFound??'?'}`,`Awaiting author review: ${d.unknown??'?'}`,`Selector matches: ${JSON.stringify(d.counts||{})}`,`Auto captured: ${ghostAutoStatus.savedCandidates??'?'} candidates`, `Auto unidentified: ${ghostAutoStatus.unidentified??'?'}`, `Auto last error: ${ghostAutoStatus.error||'none'}`, `Last error: ${d.error||'none'}`].join('\n');
}
$('enabled').onchange=async e=>{await chrome.storage.local.set({ghostEnabled:e.target.checked});await refresh()};
function render(items){
 const box=$('preview');box.textContent='';
 if(!items.length){box.textContent='No candidate messages found.';return;}
 items.forEach((item,index)=>{
  const wrapper=document.createElement('div');wrapper.className='candidate';
  const heading=document.createElement('div');heading.textContent=item.confirmed?`Verified by page: ${item.role}`:item.proposed?`Message ${index+1}: possible ${item.role==='assistant'?'ChatGPT':'Me'}`:`Message ${index+1}: author unverified`;
  wrapper.append(heading); const evidence=document.createElement('small'); evidence.textContent=`Signal: ${item.evidence||'none'}`; wrapper.append(evidence);
  const select=document.createElement('select');select.setAttribute('aria-label',`Author of message ${index+1}`);
  for(const [value,label] of [['unknown','Skip / uncertain'],['user','Me (user)'],['assistant','ChatGPT (assistant)']]){
   const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);
  }
  select.value=item.role;
  select.onchange=()=>{item.role=select.value;item.reviewed=true;updateSave()};
  wrapper.append(select);
  const txt=document.createElement('div');txt.className='snippet';txt.textContent=item.text.slice(0,500)+(item.text.length>500?'…':'');wrapper.append(txt);
  box.append(wrapper);
 });
}
function eligible(){return pending.filter(x=>(x.role==='user'||x.role==='assistant')&&(x.confirmed||x.proposed||x.reviewed));}
function updateSave(){const count=eligible().length;$('save').disabled=count===0;$('save').textContent=`Save ${count} labeled`}
$('check').onclick=async()=>{
 $('status').textContent='Scanning page…';$('preview').textContent='';$('save').disabled=true;pending=[];
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url||''))throw Error('Open a ChatGPT conversation tab first.');
  const expectedUrl=tab.url;
  // Wait for single-page navigation to settle before scanning DOM.
  await new Promise(resolve=>setTimeout(resolve,800));
  const [latest]=await chrome.tabs.query({active:true,currentWindow:true});
  if(latest?.id!==tab.id || latest.url!==expectedUrl)throw Error('Conversation changed while scanning. Click Check now again after it loads.');
  const res=await chrome.scripting.executeScript({target:{tabId:tab.id},files:['scanner.js']});
  const data=res?.[0]?.result;if(!data)throw Error('Page scanner returned no data');
  if(new URL(data.page).pathname!==new URL(expectedUrl).pathname)throw Error('Page is still switching chats; scan again once loaded.');
  if(data.conversationLoading)throw Error('Conversation is still loading; wait a second and try again.');
  page=data.page;scannedTabId=tab.id;pending=data.items||[];
  render(pending);updateSave();
  const verified=pending.filter(x=>x.confirmed).length;const blueFound=pending.filter(x=>x.proposed).length;
  $('status').textContent=`Chat: ${new URL(page).pathname}. Found ${pending.length} text blocks. ${verified} with verified authors; ${pending.length-verified} need review (${blueFound} blue-bubble suggestions). Confident blue bubbles are eligible to save.`;
  await chrome.storage.local.set({ghostDiagnostics:{phase:'review',mainFound:data.mainFound,mainTextLength:data.mainTextLength,found:pending.length,verified,blueFound,unknown:pending.length-verified,counts:data.counts,error:null}});
 }catch(e){$('status').textContent=`SCAN ERROR: ${String(e)}`;await chrome.storage.local.set({ghostDiagnostics:{phase:'error',error:String(e)}})}
 await refresh();
};
$('save').onclick=async()=>{
 const items=eligible();if(!items.length)return;
 const {ghostEnabled=false}=await chrome.storage.local.get('ghostEnabled');if(!ghostEnabled){$('status').textContent='Turn Capture ON first.';return;}
 try{
  const [active]=await chrome.tabs.query({active:true,currentWindow:true});
  if(active?.id!==scannedTabId || new URL(active.url).pathname!==new URL(page).pathname)throw Error('You switched chats after scanning. Run Check now on the current chat before saving.');
  const path=new URL(page).pathname;const thread=path.match(/\/c\/([\w-]+)/)?.[1]||`page:${path}`;
  // IDs stable for re-scan: text hash + occurrence index, to reduce accidental duplication.
  const entries=items.map((x,i)=>({...x,id:x.id?.startsWith('dil:')?x.id:`v13:${x.role}:${hash(x.text)}`,text:x.text}));
  const response=await chrome.runtime.sendMessage({type:'GHOST_CAPTURE_DIRECT',thread,items:entries});
  if(!response?.ok)throw Error(response?.error||'Worker did not confirm save');
  $('status').textContent=`Saved ${items.length} labeled messages locally. Uncertain text skipped.`;
  pending=[];$('save').disabled=true;await refresh();
 }catch(e){$('status').textContent=`SAVE ERROR: ${String(e)}`}
};
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16)}
$('export').onclick=async()=>{
 const {ghostMessages={},ghostDecisions={}}=await chrome.storage.local.get(['ghostMessages','ghostDecisions']);
 const blob=new Blob([JSON.stringify({version:'1.3.0',exportedAt:new Date().toISOString(),messages:Object.values(ghostMessages),decisionSignals:Object.values(ghostDecisions)},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ghost-export-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);$('status').textContent='Exported. Keep this file private.';
};
$('erase').onclick=async()=>{if(!confirm('Erase locally saved messages and decision signals?'))return;await chrome.storage.local.remove(['ghostMessages','ghostDecisions']);await refresh()};
refresh();
