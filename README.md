# GHOST — Local Chat Memory (prototype v1.3)

An experimental, opt-in Brave/Chromium browser extension that captures text from conversations displayed on ChatGPT and saves it locally in browser extension storage. It identifies user messages using `data-user-message-bubble="true"` and assistant response blocks using DIL markup when present.

> **Prototype — not production-ready.** Capture can become stale during conversation switching and may miss older chats. Do not treat extracted decision signals as reliable judgments or personality data. Not affiliated with OpenAI.

## Project vision

GHOST is the foundational capture prototype for a larger decision-making project. Its purpose is to develop a reliable, user-controlled way to preserve the decisions and context people explicitly express in conversations, so future tools can help them review choices, connect related ideas, and resume unfinished work. Chat capture and export are the starting point for that broader goal.

A central goal is to capture the decision-making process people express in conversations: the options they consider, choices they make, revisions, and reasons they explicitly share. Over time, GHOST could help users review how a project evolved, with links back to the original messages and control over what is retained. This is a proposed direction; the current prototype does not reliably reconstruct decisions or infer hidden motives, personality, or unspoken reasoning.

Today’s prototype focuses on local capture, manual review, and basic decision-signal heuristics. Cross-chat search, linked ideas, decision summaries, and project handoffs are future directions, not implemented features.

## Install locally

1. Download or clone this repository.
2. Visit `brave://extensions` (or `chrome://extensions`), enable Developer Mode, and choose **Load unpacked**.
3. Select this repository's root folder (containing `manifest.json`).
4. Open ChatGPT, then open GHOST and enable capture. Test with non-sensitive conversation text first.
5. Use the JSON export button to back up your captured messages. Treat exports as sensitive private files.

## What works (limited real-world testing)

- Detects user/assistant messages in some newly opened ChatGPT chats.
- Local opt-in capture, manual review, JSON export, and basic potential-decision keywords.
- Keeps source files independent of any conversation dataset.

## Known issues / contributions wanted

1. **Stale content after switching conversations.** Sometimes GHOST observes the previous conversation for a while after navigation.
2. **Older or long conversations.** Messages may load lazily or have different DOM structures, causing missed messages.
3. Reliability, duplicates, and privacy review need tests across Brave/Chrome versions and themes.

Please open an issue before a large refactor. A good fix includes reproduction steps and tests, not screenshots containing personal chats. See `CONTRIBUTING.md`.

## Privacy / limitations

- The code currently uses `chrome.storage.local` for message storage; it is **not separately encrypted**.
- It does not contain an intentional network upload mechanism, but no independent security audit has been performed.
- The extension requests access to ChatGPT sites and can read sensitive text present in those pages when capture is on.
- Do not commit chat exports, keys, screenshots showing private conversations, or user data.
- Storage is capped in code at 10,000 message records; content can be truncated to 20,000 characters per message.
- DOM attributes on ChatGPT are undocumented implementation details and may change.

## Roadmap

- [ ] Reliable conversation navigation handling and race-condition tests
- [ ] Support for scrolling/loading older conversation history
- [ ] Clear accuracy metrics for speaker labels and missed turns
- [ ] Safer storage and privacy model; explicit retention controls
