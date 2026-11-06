# Project handoff

Read README.txt. This is the source for the existing sunjin-aidc-workspace-demo Worker.

- Edit original.html, shared-client.js, shared-worker.mjs, and build-shared.mjs as appropriate. public/index.html is generated: run npm run build after changes.
- npm install installs the pinned project-local Wrangler. npm run dev runs local development. npm run login authenticates independently; npm run deploy builds and deploys.
- wrangler.jsonc uses a Text module rule for seed.json. Preserve this import behavior.
- Preserve account_id, Worker name, WORKSPACE binding, Workspace class, team Durable Object name and existing shared-v1 migration to retain the deployed database.
- Do not touch the separate sunjin-workspace Worker.
- seed.json contains original demo fixtures, NOT current production data. Never reset an existing database from it.
- Do not ask for credentials in chat or print tokens. No credentials are included in this handoff.
- Verify affected behavior in separate browser sessions, including server persistence and real-time display; clean up only your own test records.
- Known partial/demo areas: calendar date logic, real attachment upload/download, notifications, settings, member role management, AI roadmap and some related views still require implementation. Do not claim them complete merely because UI exists.
