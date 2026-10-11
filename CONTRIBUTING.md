# Contributing to GHOST

Thanks for helping improve the prototype. Please focus on deterministic fixes with reproducible tests.

## Getting started

1. Fork the repository and use a separate Brave/Chrome profile for testing.
2. Load the unpacked extension from the repo root.
3. Test with synthetic, non-sensitive chats and browser developer tools.
4. Open an issue with the extension version, browser version, exact steps, expected result, actual result, and sanitized diagnostics.
5. Submit a pull request describing the fix and how you tested it.

Do not include real chat transcripts, exports, screenshots containing personal information, cookies, tokens, or credentials in issues, commits, or PRs. Avoid adding telemetry, remote uploads, or new host permissions without explicit discussion and opt-in consent. Do not weaken author verification to make tests pass.

Known first tasks: navigation synchronization across conversation switches, lazy-loaded historical messages, stable IDs and deduplication, selector coverage and tests.
