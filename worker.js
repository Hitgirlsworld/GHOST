const MAX_MESSAGES = 10000;
const clip = (s, n) => String(s || '').slice(0, n);
function inferDecision(text) {
  // Experimental heuristics. Suggestions, not statements about motive/personality.
  const patterns = [
    [/\b(?:i (?:prefer|like|love|want|choose|chose|picked)|let'?s (?:use|go with)|make it)\b/i, 'positive_or_choice'],
    [/\b(?:i (?:hate|dislike|don'?t like|reject|rejected)|no[,!. ]|not that|too (?:small|big|bright|dark))\b/i, 'negative_or_correction']
  ];
  const labels = patterns.filter(([re]) => re.test(text)).map(([, label]) => label);
  return labels.length ? { labels, evidence: clip(text, 320), confidence: 'low', reason: 'Not inferred' } : null;
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['GHOST_CAPTURE','GHOST_CAPTURE_DIRECT'].includes(message.type)) return;
  if (message.type === 'GHOST_CAPTURE' && (!sender.url || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(sender.url))) return;
  (async () => {
    const { ghostEnabled = false, ghostMessages = {}, ghostDecisions = {} } = await chrome.storage.local.get(['ghostEnabled', 'ghostMessages', 'ghostDecisions']);
    if (!ghostEnabled) { sendResponse({ ok:false, error:'Capture disabled' }); return; }
    const now = new Date().toISOString();
    const thread = clip(message.thread, 120);
    for (const item of (Array.isArray(message.items) ? message.items : []).slice(0, 200)) {
      if (!['user', 'assistant'].includes(item.role) || typeof item.text !== 'string') continue;
      const key = `${thread}:${clip(item.id, 120)}`;
      const previous = ghostMessages[key];
      const text = clip(item.text, 20000);
      if (previous?.text === text) continue;
      ghostMessages[key] = { thread, id: clip(item.id, 120), role: item.role, text, firstSeen: previous?.firstSeen || now, updatedAt: now };
      // Only user choices are candidates; assistant suggestions aren't treated as user's decisions.
      if (item.role === 'user') {
        const found = inferDecision(text);
        if (found) ghostDecisions[key] = { thread, messageKey: key, ...found, updatedAt: now };
        else delete ghostDecisions[key];
      }
    }
    const ids = Object.keys(ghostMessages);
    if (ids.length > MAX_MESSAGES) {
      ids.sort((a, b) => ghostMessages[a].updatedAt.localeCompare(ghostMessages[b].updatedAt));
      for (const key of ids.slice(0, ids.length - MAX_MESSAGES)) { delete ghostMessages[key]; delete ghostDecisions[key]; }
    }
    await chrome.storage.local.set({ ghostMessages, ghostDecisions });
  })().then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, error: String(e) }));
  return true;
});
