// Editing one body together. A session is a Yjs document shared by the members who are editing the same item right now.
// It only lives while they edit: the first editor turns the document they have into the shared one when a second member
// joins, everybody's changes and carets travel through the app's own connection (opts.send / session.receive), and the
// stored body stays what "저장" writes. Nothing here runs while a member edits alone.
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import { Collaboration, isChangeOrigin } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { prosemirrorJSONToYDoc, yUndoPluginKey } from '@tiptap/y-tiptap';

const REMOTE = { remote: true };
const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = b => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const PALETTE = ['#2383e2', '#d9730d', '#1f8e00', '#c2187a', '#6940a5', '#b58a00', '#0b8f8f', '#d30000'];
export const colorFor = key => { let h = 0; for (const c of String(key || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
const sessions = new Set();
// every block command is its own undo step: with a shared document the undo stack is Yjs's, which groups by time
export function cutUndo() { sessions.forEach(s => { const um = s.undoManager(); if (um) um.stopCapturing(); }); }
export { isChangeOrigin };

/* opt: send(kind, base64)  — kind 'up' (document update) or 'aw' (carets)
        user {name, color}, onPeers(list of {name, color}), onSynced() */
export function makeSession(opt) {
  const ydoc = new Y.Doc(); const awareness = new Awareness(ydoc); const listeners = new Map(); let synced = false, closed = false, editor = null;
  const emit = ev => (listeners.get(ev) || []).slice().forEach(f => { try { f(); } catch { /* one listener must not stop the others */ } });
  const provider = { awareness, on(ev, f) { listeners.set(ev, (listeners.get(ev) || []).concat(f)); }, off(ev, f) { listeners.set(ev, (listeners.get(ev) || []).filter(x => x !== f)); } };
  ydoc.on('update', (u, origin) => { if (!closed && origin !== REMOTE) opt.send('up', toB64(u)); });
  awareness.on('update', ({ added, updated, removed }, origin) => { if (closed) return; if (origin !== REMOTE) opt.send('aw', toB64(encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]))); peers(); });
  const peers = () => { if (!opt.onPeers) return; const out = []; awareness.getStates().forEach((st, id) => { if (id !== ydoc.clientID && st && st.user) out.push({ name: st.user.name, color: st.user.color }); }); opt.onPeers(out); };
  const markSynced = () => { if (synced) return; synced = true; emit('synced'); opt.onSynced && opt.onSynced(); };
  const s = {
    ydoc, awareness, provider,
    get synced() { return synced; },
    extensions: () => [Collaboration.configure({ document: ydoc }), CollaborationCaret.configure({ provider, user: opt.user || { name: '멤버', color: PALETTE[0] },
      render: user => { const caret = document.createElement('span'); caret.className = 'nb-caret'; caret.style.borderColor = user.color || PALETTE[0]; const label = document.createElement('span'); label.className = 'nb-caret-name'; label.style.backgroundColor = user.color || PALETTE[0]; label.textContent = user.name || '멤버'; caret.append(label); return caret; } })],
    bind(ed) { editor = ed; },
    undoManager: () => { try { const st = editor && yUndoPluginKey.getState(editor.state); return st ? st.undoManager : null; } catch { return null; } },
    // the first editor: what they have on screen becomes the shared document
    seed(schema, json) { const tmp = prosemirrorJSONToYDoc(schema, json, 'default'); Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(tmp), REMOTE); tmp.destroy(); markSynced(); },
    fullState: () => toB64(Y.encodeStateAsUpdate(ydoc)),
    hasContent: () => ydoc.getXmlFragment('default').length > 0,
    // what the app hands over from the connection
    receive(d) { if (closed) return;
      if (d.y === 'state') { if (d.u) { Y.applyUpdate(ydoc, fromB64(d.u), REMOTE); if (s.hasContent()) markSynced(); } if (synced) { opt.send('up', s.fullState()); const st = awareness.getLocalState(); if (st) opt.send('aw', toB64(encodeAwarenessUpdate(awareness, [ydoc.clientID]))); } return; }
      if (d.y === 'up' && d.u) { try { Y.applyUpdate(ydoc, fromB64(d.u), REMOTE); } catch { return; } if (!synced && s.hasContent()) markSynced(); return; }
      if (d.y === 'hello') { if (awareness.getLocalState()) opt.send('aw', toB64(encodeAwarenessUpdate(awareness, [ydoc.clientID]))); return; }
      if (d.y === 'aw' && d.a) { try { applyAwarenessUpdate(awareness, fromB64(d.a), REMOTE); } catch { /* a broken caret message is dropped */ } return; }
      if (d.y === 'left') { const gone = []; awareness.getStates().forEach((st, id) => { if (id !== ydoc.clientID && st && st.cid === d.cid) gone.push(id); }); if (gone.length) removeAwarenessStates(awareness, gone, REMOTE); peers(); } },
    close() { if (closed) return; try { removeAwarenessStates(awareness, [ydoc.clientID], 'local'); } catch { /* already gone */ } closed = true; sessions.delete(s); awareness.destroy(); ydoc.destroy(); },
  };
  awareness.setLocalStateField('cid', opt.cid || '');
  sessions.add(s); return s;
}
