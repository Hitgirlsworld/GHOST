(() => {
  if (window.__ghostCaptureV4) return;
  window.__ghostCaptureV4 = true;
  let timer, lastFingerprint = '';
  const rules = [
    ['role-attribute', '[data-message-author-role]'],
    ['conversation-turn', '[data-testid^="conversation-turn-"]'],
    ['message-id', '[data-message-id]'],
    ['chat-message', '[data-testid="chat-message"]'],
    ['group-turn', 'article[data-testid]'],
  ];
  const key = () => location.pathname.match(/\/c\/([\w-]+)/)?.[1] || `page:${location.pathname}`;
  const diagnostics = async p => {
    const existing = (await chrome.storage.local.get('ghostDiagnostics')).ghostDiagnostics || {};
    await chrome.storage.local.set({ghostDiagnostics: {...existing,...p,page:location.origin+location.pathname,updatedAt:new Date().toISOString()}});
  };
  const textFor = node => {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('button,nav,form,textarea,[contenteditable],script,style,[aria-hidden="true"]').forEach(x=>x.remove());
    return (clone.innerText || clone.textContent || '').trim().slice(0,20000);
  };
  function choose() {
    const counts = Object.fromEntries(rules.map(([name,selector])=>[name,document.querySelectorAll(selector).length]));
    const [method,selector] = rules.find(([name])=>counts[name]>0) || [];
    return {nodes:selector?[...document.querySelectorAll(selector)]:[],method:method||'none',counts};
  }
  async function scan() {
    try {
      const {ghostEnabled=false}=await chrome.storage.local.get('ghostEnabled');
      const {nodes,method,counts}=choose();
      const items=nodes.map((node,index)=>{
        const attrRole=node.getAttribute('data-message-author-role');
        const turn=node.getAttribute('data-testid')||'';
        const role=attrRole || (turn.match(/conversation-turn-(user|assistant)/)?.[1]) ||
          node.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role') ||
          node.querySelector('[data-testid^="conversation-turn-"]')?.getAttribute('data-testid')?.match(/conversation-turn-(user|assistant)/)?.[1];
        if(!['user','assistant'].includes(role))return null;
        const body=node.querySelector('[data-message-content]')||node.querySelector('.markdown')||node;
        const value=textFor(body); if(!value)return null;
        return {id:node.getAttribute('data-message-id')||node.querySelector('[data-message-id]')?.getAttribute('data-message-id')||`${role}:${index}`,role,text:value};
      }).filter(Boolean);
      await diagnostics({phase:ghostEnabled?'scanning':'paused',detectedNodes:nodes.length,readableMessages:items.length,detector:method,selectorCounts:counts,lastError:''});
      if(!ghostEnabled || !items.length) return {ok:true,count:items.length,method};
      const fingerprint=key()+':'+items.map(x=>`${x.id}:${x.text}`).join('|');
      if(lastFingerprint===fingerprint)return {ok:true,count:items.length,method};
      const response=await chrome.runtime.sendMessage({type:'GHOST_CAPTURE',thread:key(),items});
      if(!response?.ok)throw new Error(response?.error||'No worker response');
      lastFingerprint=fingerprint;
      await diagnostics({phase:'saved',lastSavedAt:new Date().toISOString(),lastSent:items.length});
      return {ok:true,count:items.length,method};
    }catch(e){try{await diagnostics({phase:'error',lastError:String(e)});}catch(_){}return {ok:false,error:String(e)};}
  }
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(scan,850);};
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.ghostEnabled)schedule();});
  chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
    if(msg?.type==='GHOST_SCAN_NOW'){scan().then(respond);return true;}
  });
  diagnostics({phase:'injected',detectedNodes:0,readableMessages:0,lastError:''}).then(schedule);
})();
