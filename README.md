# GHOST — Local Chat Memory (prototype v1.3)

An experimental, opt-in Brave/Chromium browser extension that captures text from conversations displayed on ChatGPT and saves it locally in browser extension storage. It identifies user messages using `data-user-message-bubble="true"` and assistant response blocks using DIL markup when present.

> **Prototype — not production-ready.** Capture can become stale during conversation switching and may miss older chats. Do not treat extracted decision signals as reliable judgments or personality data. Not affiliated with OpenAI.

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
- [ ] Machine-readable export format for a separate decision-model experiment

## License

Licensed under the [MIT License](LICENSE). Copyright (c) 2026 Hitgirlsworld.

