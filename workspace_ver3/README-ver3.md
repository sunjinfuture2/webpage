# workspace_ver3
Independent Cloudflare Worker requested on 2026-11-23.

- shared-worker.mjs: supplied bundled server code.
- Frontend/build sources: snapshot of aidc-workspace-new at 0eb6b49e53a8894f2c6e79b4f1aeab848b76431e.
- prepare-seed.mjs supplies the imported seed text module from the build-generated seed.json.
- WORKSPACE is a new SQLite Durable Object namespace owned by this Worker. No script_name or existing namespace is referenced.
- Existing live posts, files, and user sessions are not migrated.
- The dedicated workflow refuses to overwrite a Worker already named workspace_ver3.
- Normal local deployment: npm ci; npm run build; node prepare-seed.mjs; npx wrangler deploy.
