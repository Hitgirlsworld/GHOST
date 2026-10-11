function ghostScan() {
 const main=document.querySelector('main');
 const counts={author:document.querySelectorAll('[data-message-author-role]').length,turn:document.querySelectorAll('[data-testid^="conversation-turn-"]').length,blue:0,assistant:0};
 const stableRole=(node)=>{for(let p=node,i=0;p&&i<8;p=p.parentElement,i++){
  const role=p.getAttribute?.('data-message-author-role')||p.getAttribute?.('data-author-role');if(role==='user'||role==='assistant')return {role,evidence:'author attribute',confidence:'verified'};
  const t=p.getAttribute?.('data-testid')||'';const m=t.match(/(?:conversation-turn|message)-(user|assistant)(?:$|-)/);if(m)return {role:m[1],evidence:'message test ID',confidence:'verified'};
 }return null;};
 const blue=(node)=>{for(let p=node,i=0;p&&i<8&&p!==main;p=p.parentElement,i++){
  if(!(p instanceof HTMLElement))continue;
  const c=getComputedStyle(p),v=c.backgroundColor.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
  if(!v)continue;const r=+v[1],g=+v[2],b=+v[3],a=v[4]===undefined?1:+v[4];
  if(a<0.8||b<110||b-r<35||b-g<14||b<r*1.3||b<g*1.08)continue;
  const rect=p.getBoundingClientRect(),mrect=main?.getBoundingClientRect();
  if(rect.width<35||rect.height<14||rect.width>innerWidth*0.88||!mrect||rect.right<mrect.left+mrect.width*.60)continue;
  if((parseFloat(c.borderTopLeftRadius)||0)<6)continue;
  return {role:'user',evidence:`right-aligned blue bubble rgb(${r},${g},${b})`,confidence:'visual'};
 }return null;};
 const assistant=(node)=>{
  // Assistant replies often expose one action toolbar; require an action control
  // near a non-blue text block and refuse containers containing user bubbles.

  // Only trust an assistant role when a reply wrapper owns message-action controls.
  for(let p=node,i=0;p&&i<6&&p!==main;p=p.parentElement,i++){
   if(!(p instanceof HTMLElement))continue;
   const buttons=[...p.querySelectorAll('button[aria-label],button[data-testid]')];
   const actions=buttons.map(b=>((b.getAttribute('aria-label')||'')+' '+(b.getAttribute('data-testid')||'')).toLowerCase());
   const matched=actions.filter(x=>/\b(copy|good response|bad response|read aloud|regenerate|retry|share)\b/.test(x)).length;
   if(matched>=1 && !p.querySelector('[data-message-author-role="user"],[data-testid="conversation-turn-user"]'))return {role:'assistant',evidence:'assistant response action buttons',confidence:'visual'};
  }return null;
 };
 // ChatGPT's observed 2026 interface: explicit user bubble and DIL assistant root.
 // Unlike CSS colors, these are structural role clues supplied by the page.
 const userRoots=[...document.querySelectorAll('[data-user-message-bubble="true"]')];
 const assistantRoots=[...document.querySelectorAll('[data-dil-message-id]')].filter(n=>
   n.matches('[data-d-inline-reveal], .DilResponseRoot-HfQrEh, [class*="DilResponseRoot"]') &&
   !n.closest('[data-user-message-bubble="true"]'));
 counts.userBubble=userRoots.length;
 counts.dilAssistant=assistantRoots.length;
 if(userRoots.length||assistantRoots.length){
  const roots=[...userRoots.map(n=>({node:n,role:'user',kind:'user bubble'})),
               ...assistantRoots.map(n=>({node:n,role:'assistant',kind:'DIL response root'}))];
  roots.sort((a,b)=>{const pos=a.node.compareDocumentPosition(b.node);return pos&Node.DOCUMENT_POSITION_FOLLOWING?-1:pos&Node.DOCUMENT_POSITION_PRECEDING?1:0;});
  const entries=[],seenNodes=new Set();
  for(const {node,role,kind} of roots){
   if(seenNodes.has(node))continue;seenNodes.add(node);
   // If a DIL response ever appears nested in a user bubble, reject that role.
   if(role==='assistant'&&node.closest('[data-user-message-bubble="true"]'))continue;
   const clone=node.cloneNode(true);
   clone.querySelectorAll('button,nav,form,textarea,script,style,[contenteditable="true"], [aria-hidden="true"]').forEach(el=>el.remove());
   const value=(clone.innerText||clone.textContent||'').trim().slice(0,20000);
   if(!value)continue;
   const msgId=role==='assistant'?node.getAttribute('data-dil-message-id'):null;
   entries.push({id:msgId?`dil:${msgId}`:`bubble:${entries.length}`,role,text:value,
      confirmed:true,proposed:false,autoEligible:true,evidence:kind,confidence:'verified'});
  }
  if(entries.length){return {page:location.href,conversationLoading:false,mainFound:!!main,
    mainTextLength:(main?.innerText||'').length,counts,blueFound:userRoots.length,items:entries.slice(0,150)};}
 }
 const seen=new Set(), items=[];
 // Do not treat arbitrary aria-busy nodes as proof the entire conversation is loading.
 // ChatGPT may keep aria-busy on input or background UI elements indefinitely.
 // Navigation consistency is checked by URL and a short settle delay in the popup.
 const isConversationLoading = !main || !location.pathname.match(/^\/c\/[\w-]+/) ? false :
   (!((main.innerText || '').trim()) && !!main.querySelector('[data-testid="conversation-loading"],[data-testid="loading-spinner"]'));
 const nodes=main?[...main.querySelectorAll('[data-message-author-role],[data-testid^="conversation-turn-"],.markdown,[class*="whitespace-pre-wrap"],p')]:[];
 for(const node of nodes.slice(0,350)){
  if(node.closest('nav,header,footer,aside,form,button,[contenteditable="true"]'))continue;
  if(node.matches('p')&&node.closest('.markdown,[class*="whitespace-pre-wrap"]'))continue;
  const body=node.matches('[data-message-author-role],[data-testid^="conversation-turn-"]')?(node.querySelector('.markdown,[class*="whitespace-pre-wrap"],[data-message-content]')||node):node;
  const text=(body.innerText||body.textContent||'').trim().slice(0,20000);
  if(!text||seen.has(text))continue;
  seen.add(text);
  const strong=stableRole(body)||stableRole(node), b=blue(body), a=assistant(body);
  let found=strong||b||a;
  if((b&&a)||(strong&&((b&&strong.role!==b.role)||(a&&strong.role!==a.role))))found=null;
  const role=found?.role||'unknown',confidence=found?.confidence||'unknown';
  if(b)counts.blue++;if(a)counts.assistant++;
  items.push({id:`text:${items.length}`,role,text,confirmed:confidence==='verified',proposed:confidence==='visual',autoEligible:!!found,evidence:found?.evidence||'no reliable author evidence',confidence});
 }
 return {page:location.href,conversationLoading:isConversationLoading,mainFound:!!main,mainTextLength:(main?.innerText||'').length,counts,blueFound:counts.blue,items:items.slice(0,150)};
}
ghostScan();
