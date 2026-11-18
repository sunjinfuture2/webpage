// "This change is an undo step of its own": prosemirror-history is told through the transaction, the undo stack of a shared
// document (Yjs, while members edit together) is told directly.
import { closeHistory as pmCloseHistory } from '@tiptap/pm/history';
import { cutUndo } from './collab.js';

export const closeHistory = tr => { cutUndo(); return pmCloseHistory(tr); };
