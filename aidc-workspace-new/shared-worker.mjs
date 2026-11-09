import seedText from './seed.json';
const seed=JSON.parse(seedText);
const json=(v,status=200,headers={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
const MAX_FILE=1887436; // 1.8 MB per attachment (SQLite row limit)
// Downloads and inline images are plain browser navigations, so they authenticate with this cookie instead of the Bearer token.
const fileCookie=(req,token,maxAge)=>`aidc_file=${token}; Path=/api/file; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(req.url).protocol==='https:'?'; Secure':''}`;
export default {async fetch(req,env){
 if(new URL(req.url).pathname.startsWith('/api/'))return env.WORKSPACE.get(env.WORKSPACE.idFromName('team')).fetch(req);
 return env.ASSETS.fetch(req);
}};
export class Workspace {
 constructor(ctx){this.ctx=ctx;this.sql=ctx.storage.sql;
 this.sql.exec('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
 this.sql.exec('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, employee TEXT, expires INTEGER)');
 this.sql.exec('CREATE TABLE IF NOT EXISTS users (employee TEXT PRIMARY KEY, name TEXT NOT NULL)');
 this.sql.exec('CREATE TABLE IF NOT EXISTS active_sessions (token TEXT PRIMARY KEY, employee TEXT UNIQUE, expires INTEGER)');
 this.sql.exec('CREATE TABLE IF NOT EXISTS edit_locks (id TEXT PRIMARY KEY, token TEXT, employee TEXT, expires INTEGER)');
 this.sql.exec('CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, employee TEXT, changed TEXT, at TEXT)');
 this.sql.exec('CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT, size INTEGER, item TEXT, employee TEXT, at TEXT, data BLOB)');
 if(!this.sql.exec('SELECT id FROM records LIMIT 1').toArray().length){for(const [id,v] of Object.entries(seed))this.put(id,v);}
 }
 put(id,v){this.sql.exec('INSERT OR REPLACE INTO records VALUES (?,?)',id,JSON.stringify(v));}
 get(id){const r=this.sql.exec('SELECT data FROM records WHERE id=?',id).toArray()[0];return r?JSON.parse(r.data):null;}
 users(){return Object.fromEntries(this.sql.exec('SELECT * FROM users').toArray().map(u=>[u.employee,u.name]));}
 locks(){return Object.fromEntries(this.sql.exec('SELECT l.id,l.employee,u.name,l.expires FROM edit_locks l LEFT JOIN users u ON l.employee=u.employee WHERE l.expires>? AND l.token IN (SELECT token FROM active_sessions WHERE expires>?)',Date.now(),Date.now()).toArray().map(l=>[l.id,l]));}
 broadcast(data){for(const ws of this.ctx.getWebSockets()){try{const a=ws.deserializeAttachment();if(a&&this.sql.exec('SELECT token FROM active_sessions WHERE token=? AND expires>?',a.token,Date.now()).toArray().length)ws.send(JSON.stringify(data));else ws.close(4001,'Session ended');}catch{}}}
 cleanup(){this.sql.exec('DELETE FROM edit_locks WHERE expires<? OR token NOT IN (SELECT token FROM active_sessions WHERE expires>?)',Date.now(),Date.now());this.sql.exec('DELETE FROM active_sessions WHERE expires<?',Date.now());}
 async fetch(req){try{
 const path=new URL(req.url).pathname;
 if(req.method==='POST'&&req.headers.get('Origin')&&req.headers.get('Origin')!==new URL(req.url).origin)return json({error:'요청 출처 오류'},403);
 if(path==='/api/login'&&req.method==='POST'){
 const {employee,name}=await req.json();const id=String(employee||'').trim().normalize('NFKC').toUpperCase();
 if(!/^[A-Z0-9_-]{1,40}$/.test(id))return json({error:'사번은 영문·숫자·하이픈·밑줄로 입력하세요.'},400);
 this.cleanup();if(this.sql.exec('SELECT token FROM active_sessions WHERE employee=?',id).toArray().length)return json({error:'이미 접속 중인 사용자입니다. 동시 로그인할 수 없습니다. 기존 화면에서 로그아웃한 뒤 다시 로그인하세요.'},409);
 const saved=this.sql.exec('SELECT name FROM users WHERE employee=?',id).toArray()[0];const display=String(saved?.name||name||'').trim();if(!display||display.length>40)return json({error:'처음 로그인할 때 이름을 입력하세요. (40자 이내)'},400);
 const token=crypto.randomUUID();this.sql.exec('INSERT OR IGNORE INTO users VALUES (?,?)',id,display);this.sql.exec('INSERT INTO active_sessions VALUES (?,?,?)',token,id,Date.now()+120000);
 this.broadcast({users:this.users()});return json({employee:id,name:display,token},200,{'Set-Cookie':fileCookie(req,token,86400)});
 }
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'')||(path==='/api/live'?new URL(req.url).searchParams.get('token'):'')||(path.startsWith('/api/file/')&&req.method==='GET'?((req.headers.get('Cookie')||'').match(/(?:^|;\s*)aidc_file=([^;]+)/)?.[1]||''):'');
 const session=this.sql.exec('SELECT employee FROM active_sessions WHERE token=? AND expires>?',token||'',Date.now()).toArray()[0];
 if(!session)return json({error:'로그인이 필요합니다.'},401);
 this.sql.exec('UPDATE active_sessions SET expires=? WHERE token=?',Date.now()+120000,token);
 if(path==='/api/logout'){this.sql.exec('DELETE FROM active_sessions WHERE token=?',token);this.sql.exec('DELETE FROM edit_locks WHERE token=?',token);this.broadcast({locks:this.locks()});return json({ok:true},200,{'Set-Cookie':fileCookie(req,'',0)});}
 if(path==='/api/heartbeat'){this.cleanup();return json({locks:this.locks()});}
 if(path==='/api/state')return json({employee:session.employee,name:this.users()[session.employee],users:this.users(),locks:this.locks(),records:Object.fromEntries(this.sql.exec('SELECT * FROM records').toArray().map(r=>[r.id,JSON.parse(r.data)]))},200,{'Set-Cookie':fileCookie(req,token,86400)});
 if(path==='/api/file'&&req.method==='POST'){
 const {name,type,size,item,data}=await req.json();const nm=String(name||'').trim().slice(0,200);if(!nm||typeof data!=='string')return json({error:'잘못된 파일 요청'},400);
 let bytes;try{bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));}catch{return json({error:'파일 데이터를 읽지 못했습니다.'},400);}
 if(bytes.byteLength>MAX_FILE)return json({error:'파일은 1.8MB까지 첨부할 수 있습니다. ('+nm+')'},413);
 const id=crypto.randomUUID();this.sql.exec('INSERT INTO files VALUES (?,?,?,?,?,?,?,?)',id,nm,String(type||'application/octet-stream').slice(0,120),bytes.byteLength,String(item||'').slice(0,120),session.employee,new Date().toISOString(),bytes.buffer);
 return json({id,name:nm,size:bytes.byteLength,type:String(type||'')});
 }
 if(path==='/api/files')return json({files:this.sql.exec('SELECT id,name,type,size,item,employee,at FROM files ORDER BY at DESC').toArray()});
 if(path.startsWith('/api/file/')){
 const id=path.slice(10);const r=this.sql.exec('SELECT * FROM files WHERE id=?',id).toArray()[0];if(!r)return json({error:'파일을 찾을 수 없습니다.'},404);
 if(req.method==='DELETE'){this.sql.exec('DELETE FROM files WHERE id=?',id);return json({ok:true});}
 const inline=new URL(req.url).searchParams.get('inline')==='1';
 return new Response(r.data,{headers:{'Content-Type':r.type||'application/octet-stream','Content-Disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(r.name)}`,'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
 }
 if(path==='/api/live'&&req.headers.get('Upgrade')==='websocket'){const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({token,employee:session.employee});return new Response(null,{status:101,webSocket:pair[0]});}
 if(path==='/api/lock'&&req.method==='POST'){
 const {id,action}=await req.json();if(!/^(item:|project:)/.test(id))return json({error:'잘못된 항목'},400);this.cleanup();
 const old=this.sql.exec('SELECT * FROM edit_locks WHERE id=?',id).toArray()[0];
 if(old&&old.token!==token)return json({error:(this.users()[old.employee]||old.employee)+'님이 수정 중입니다',locks:this.locks()},423);
 if(action==='release')this.sql.exec('DELETE FROM edit_locks WHERE id=? AND token=?',id,token);
 else {if(!this.get(id))return json({error:'항목을 찾을 수 없습니다.'},404);this.sql.exec('INSERT OR REPLACE INTO edit_locks VALUES (?,?,?,?)',id,token,session.employee,Date.now()+1800000);}
 const locks=this.locks();this.broadcast({locks});return json({locks,record:this.get(id)});
 }
 if(path==='/api/change'&&req.method==='POST'){
 const {changes}=await req.json();if(!Array.isArray(changes)||changes.length>200)return json({error:'잘못된 변경 요청'},400);
 const applied={};let conflict=null;
 this.cleanup();for(const c of changes){const lockId=c.id==='meta:head'&&c.field?'project:'+c.field:c.id;const lock=this.sql.exec('SELECT * FROM edit_locks WHERE id=?',lockId).toArray()[0];if(lock&&lock.token!==token)return json({error:(this.users()[lock.employee]||lock.employee)+'님이 수정 중입니다',locks:this.locks()},423);}
 this.ctx.storage.transactionSync(()=>{
 for(const c of changes){if(!/^(item:|project:|partner:|meta:)/.test(c.id)||['__proto__','constructor','prototype'].includes(c.field)){conflict='잘못된 항목';break;}
 const old=this.get(c.id);const value=c.field?(old||{})[c.field]:old;
 if(JSON.stringify(value??null)!==JSON.stringify(c.before??null)&&JSON.stringify(value??null)!==JSON.stringify(c.after??null)){conflict=c.id;break;}}
 if(conflict)return;
 for(const c of changes){let v=this.get(c.id);if(c.field){v=v||{};v[c.field]=c.after;}else v=c.after;
 if(v&&(c.id.startsWith('item:')||c.id.startsWith('project:'))){v.authorId=this.get(c.id)?.authorId||session.employee;v.authorName=this.users()[v.authorId]||this.get(c.id)?.authorName||v.authorId;v.updatedBy=session.employee;v.updatedAt=new Date().toISOString();delete v.editing;delete v._editOriginal;delete v.snap;delete v.dirty;delete v.sessionNew;}
 if(v===null)this.sql.exec('DELETE FROM records WHERE id=?',c.id);else this.put(c.id,v);applied[c.id]=v;}
 this.sql.exec('INSERT INTO history(employee,changed,at) VALUES (?,?,?)',session.employee,JSON.stringify(changes),new Date().toISOString());
 });
 if(conflict)return json({error:'다른 사용자의 변경과 겹칩니다. 작성 내용은 이 브라우저에 보관했습니다.',conflict},409);
 this.broadcast({records:applied,users:this.users(),locks:this.locks()});
 return json({records:applied});
 }
 return json({error:'Not found'},404);
 }catch(e){return json({error:'서버 처리에 실패했습니다.'},500);}}
 webSocketMessage(ws,message){if(message==='ping'){const a=ws.deserializeAttachment();if(a){this.sql.exec('UPDATE active_sessions SET expires=? WHERE token=? AND expires>?',Date.now()+120000,a.token,Date.now());}ws.send('pong');}}
 webSocketClose(ws){const a=ws.deserializeAttachment();if(a&&!this.ctx.getWebSockets().some(other=>other!==ws&&other.deserializeAttachment()?.token===a.token))this.sql.exec('UPDATE active_sessions SET expires=MIN(expires,?) WHERE token=?',Date.now()+15000,a.token);ws.close();}
}

