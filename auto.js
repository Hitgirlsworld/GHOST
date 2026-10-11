(() => {
 let timer=null,last='',lastPage='',pageChangedAt=Date.now();
 const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16)};
 async function scan(){
  try{
   const {ghostEnabled=false}=await chrome.storage.local.get('ghostEnabled');if(!ghostEnabled)return;
   const currentPage=location.href;
   if(currentPage!==lastPage){lastPage=currentPage;pageChangedAt=Date.now();last='';schedule();return;}
   if(Date.now()-pageChangedAt<1800){schedule();return;}
   const data=ghostScan();
   if(data.page!==currentPage || data.conversationLoading)return;
   const items=data.items.filter(x=>x.autoEligible&&(x.role==='user'||x.role==='assistant'));
   const key=currentPage+'|'+items.map(x=>x.role+':'+hash(x.text)).join('|');
   if(key===last)return;
   const page=new URL(data.page).pathname,thread=page.match(/\/c\/([\w-]+)/)?.[1]||`page:${page}`;
   const entries=items.map(x=>({...x,id:x.id?.startsWith('dil:')?x.id:`v13:${x.role}:${hash(x.text)}`}));
   if(entries.length){const response=await chrome.runtime.sendMessage({type:'GHOST_CAPTURE',thread,items:entries});if(!response?.ok)throw Error(response?.error||'save failed');}
   last=key;
   await chrome.storage.local.set({ghostAutoStatus:{time:new Date().toISOString(),found:data.items.length,savedCandidates:items.length,unidentified:data.items.length-items.length,error:''}});
  }catch(e){try{await chrome.storage.local.set({ghostAutoStatus:{time:new Date().toISOString(),error:String(e)}})}catch{}}
 }
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(scan,1800)};
 setInterval(()=>{if(location.href!==lastPage)schedule()},1500);
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.ghostEnabled)schedule()});
 schedule();
})();
