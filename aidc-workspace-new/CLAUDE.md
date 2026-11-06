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
- Deployment: every change to this folder must reach Cloudflare. After editing, run npm run build, commit, and push. The GitHub Actions workflow .github/workflows/deploy-cloudflare.yml (repo root) deploys pushes on main and claude/** to sunjin-aidc-workspace-demo. After pushing, check the workflow run result and report it. It needs the CLOUDFLARE_API_TOKEN repository secret; if a run fails because the secret is missing, tell the user how to add it (README.txt) and never ask for the token in chat.
- package-lock.json pins Wrangler for CI (npm ci). Keep it in sync whenever devDependencies change.
- Design source: original.html is a verbatim copy of aidc-workspace.html from the sunjinfuture2/simulator repository (main, merge commit c44e191 of PR #56). To take a newer design, copy that file over original.html and run npm run build. build-shared.mjs now fails loudly when one of its anchors is missing from the design; update the anchor (and shared-client.js if the page API changed) rather than skipping it, then re-verify login, server save, and edit locks in two browser sessions.
- Local runtime check: npm run dev with --compatibility-date 2026-10-13 (the pinned Wrangler ships an older workerd); do not lower the date in wrangler.jsonc.
