// Entry of the body editor bundle. The app talks to window.AIDCEditor only.
import { create, closeFloating, escHandled, hydrate, upgrade } from './editor.js';
import { jumpTo } from './legacy.js';
import { configure, SCHEMA_VERSION } from './host.js';
import { exportDoc, toMarkdown, mdToHtml } from './io.js';
import { docMenu } from './docmenu.js';
import { openHistory } from './history.js';

window.AIDCEditor = { version: SCHEMA_VERSION, create, configure, hydrate, upgrade, closeFloating, escHandled, jump: jumpTo, docMenu, exportDoc, toMarkdown, mdToHtml, history: openHistory };
