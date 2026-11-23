# ver3 business-data reset backup

Target: workspace_ver3 only. No v2 write operations.

The pre-reset snapshot is stored privately in the target Workspace Durable Object (object name `team`) in `ver3_reset_20261123_*` SQLite tables. These are backup tables, not live business data and are not served by application APIs.

Verified snapshot: records 431, users 8, files 10, versions 0, history 19, ydocs 0. Every source table was copied in the same transaction and checked for equal row count and SQL EXCEPT equality before clearing live business tables. File BLOBs were copied directly. `ver3_reset_manifest` contains the backup manifest. `ver3_reset_20261123_code` stores original deployed module/asset Base64 in numbered chunks (`name:offset`). Earlier `ver3_backup_*` tables are older snapshots and were not replaced.

Retained: users, member roles, workspace/security/teamspace settings, archive category labels and personal preferences. Removed: business records, project trash, notices, schedules, attachments, versions, collaborative document state and business history. Existing login sessions are invalidated during finalization to prevent stale clients resending deleted data.

Restore only on explicit request: first back up any new ver3 work, then restore selected live tables from the matching `ver3_reset_20261123_` tables inside a transaction. Do not restore old login sessions or editor locks. Reconcile attachment references and versions with restored records. Do not bind or write to the v2 namespace. Frontend automatic example insertion is disabled; the deployed server seed is empty.

Reset workflows are manual-only. Do not rerun them after users begin creating new data.
