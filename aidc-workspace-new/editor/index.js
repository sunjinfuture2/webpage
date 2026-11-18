// Entry of the body editor bundle. The app talks to window.AIDCEditor only.
import { create, closeFloating, escHandled, hydrate, upgrade } from './editor.js';
import { jumpTo } from './legacy.js';
import { configure, SCHEMA_VERSION } from './host.js';

window.AIDCEditor = { version: SCHEMA_VERSION, create, configure, hydrate, upgrade, closeFloating, escHandled, jump: jumpTo };
