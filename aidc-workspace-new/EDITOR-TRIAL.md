# Test research editor experiment

Only item `r5cdb8f30-5b91-4ec8-9d7b-038aeca21001` uses the floating selection toolbar in research-editor-trial.js. The title may be changed without enabling the toolbar elsewhere.

The build injects this isolated file after the normal scripts. All other records keep the existing editor. No Worker/schema/sync changes are made.

Rollback: remove the three trial injection lines from build-shared.mjs, run the normal build and deploy. Existing saved HTML stays readable with the ordinary editor. The Test record is intentionally retained for user review.
