import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const account='f1ac689fded81b2578beca600e38fea6',source='sunjin-aidc-workspace-demo',target='workspace_ver3';
const api='https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/';
const cfHeaders={Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN};
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const signature=v=>hash(JSON.stringify(canonical(v)));
const root=n=>'https://'+n+'.sunjinfuture2.workers.dev';
async function cf(p){const r=await fetch(api+p,{headers:cfHeaders});if(!r.ok)throw Error(p+' HTTP '+r.status);return r;}
async function settings(n){const j=await(await cf(n+'/settings')).json();if(!j.success)throw Error('Settings failed');return j.result;}
async function modules(n){const f=await(await cf(n+'/content/v2')).formData(),out=[];for(const [k,v]of f)if(typeof v!=='string')out.push({name:v.name||k,type:v.type,bytes:Buffer.from(await v.arrayBuffer())});if(!out.length)throw Error('No modules');return out;}
async function app(n,p,token,body){const r=await fetch(root(n)+p,{method:body?'POST':'GET',headers:{'X-AIDC-Client':'4',...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error(n+p+' HTTP '+r.status);return r.json();}
const dstSettings=await settings(target);
const dstNS=dstSettings.bindings.find(b=>b.name==='WORKSPACE')?.namespace_id;
if(!dstNS)throw Error('Missing target storage');
const sourceSettings=await settings(source);
const srcNS=sourceSettings.bindings.find(b=>b.name==='WORKSPACE')?.namespace_id;
if(!srcNS||srcNS===dstNS)throw Error('v2/ver3 storage not independent');
if(dstSettings.bindings.some(b=>b.script_name&&b.script_name!==target))throw Error('Cross-worker binding');
const original=await modules(target);
console.log('INDEPENDENCE '+JSON.stringify({v2Namespace:srcNS,ver3Namespace:dstNS,distinct:true,bindings:dstSettings.bindings.map(b=>({name:b.name,type:b.type,script_name:b.script_name||null}))}));
let sourceToken,targetToken;
const dir=path.resolve('.ver3-business-reset'),assets=path.resolve('.ver3-reset-assets');
await fs.mkdir(dir,{recursive:true});await fs.mkdir(assets,{recursive:true});
const main=original.find(m=>/javascript/.test(m.type));
if(!main)throw Error('No module entry');
const writeModules=async()=>{for(const m of original){const p=path.resolve(dir,m.name);if(!p.startsWith(dir+'/'))throw Error('Unsafe module path');await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,m.bytes);}};
await writeModules();
async function walk(d){let out=[];for(const e of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,e.name);out.push(...e.isDirectory()?await walk(p):[p]);}return out;}
const assetHashes={};
for(const f of await walk('aidc-workspace-new/public')){const rel=path.relative('aidc-workspace-new/public',f).split(path.sep).join('/');if(rel.startsWith('.')||rel==='_headers'||rel==='_redirects')continue;const r=await fetch(root(target)+'/'+rel);if(!r.ok)throw Error('Missing asset '+rel);const b=Buffer.from(await r.arrayBuffer());if(rel!=='index.html'&&!rel.endsWith('.html')&&/text\/html/.test(r.headers.get('content-type')||''))throw Error('Asset fallback');await fs.mkdir(path.dirname(path.join(assets,rel)),{recursive:true});await fs.writeFile(path.join(assets,rel),b);assetHashes[rel]=hash(b);}
const scripts=await(await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts',{headers:cfHeaders})).json();
const tag=scripts.result.find(s=>s.id===target)?.migration_tag;if(!tag)throw Error('No migration tag');
const cfg={name:target,account_id:account,main:main.name,no_bundle:true,compatibility_date:dstSettings.compatibility_date,compatibility_flags:dstSettings.compatibility_flags||[],workers_dev:true,keep_vars:true,assets:{directory:'../.ver3-reset-assets',binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api/*']},durable_objects:{bindings:[{name:'WORKSPACE',class_name:'Workspace'}]},migrations:[{tag,new_sqlite_classes:['Workspace']}],rules:original.filter(m=>m!==main&&!/javascript/.test(m.type)).map(m=>({type:m.type.includes('text')||m.name.endsWith('.json')?'Text':'Data',globs:[m.name.replace(/^\.\//,'')],fallthrough:false}))};
const configPath=path.join(dir,'wrangler.json');
const deploy=()=>execFileSync(path.resolve('aidc-workspace-new/node_modules/.bin/wrangler'),['deploy','--config',configPath],{stdio:'inherit'});
const BLANK={"meta:members":{},"meta:settings":{"wsName":"AIDC WorkSpace","org":"","dropboxUrl":"","teamspaces":[],"security":{"sessionDays":14},"projTrash":{}},"meta:tabs":[],"meta:rows":{},"meta:archive":[],"meta:head":{},"meta:order":[],"meta:notices":[],"meta:roadmap":[],"meta:flags":{"projectStatusV2":1,"projectTagV1":1,"trashStampV1":1,"archLinksV1":1,"archLinksStyleV2":1,"archCardsV3":1,"demoActionsV1":1,"fullReset20261123":true}};
const RESET_INJECTION="\nthis.sql.exec(\"CREATE TABLE IF NOT EXISTS ver3_full_reset_manifest (id TEXT PRIMARY KEY,report TEXT)\");\nif(!this.sql.exec(\"SELECT id FROM ver3_full_reset_manifest WHERE id='full_20261123'\").toArray().length){\n this.ctx.storage.transactionSync(()=>{\n const report={before:{},after:{}};\n const tables=this.sql.exec(\"SELECT name FROM sqlite_master WHERE type='table'\").toArray().map(x=>x.name).filter(n=>!n.startsWith('sqlite_')&&!n.startsWith('_cf_')&&!n.startsWith('ver3_'));\n for(const table of tables){\n  if(!/^[a-z_]+$/.test(table))throw Error('Unexpected table');\n  this.sql.exec('CREATE TABLE ver3_full_backup_20261123_'+table+' AS SELECT * FROM '+table);\n  report.before[table]=this.sql.exec('SELECT COUNT(*) AS n FROM '+table).toArray()[0].n;\n  if(this.sql.exec('SELECT COUNT(*) AS n FROM ver3_full_backup_20261123_'+table).toArray()[0].n!==report.before[table]||this.sql.exec('SELECT * FROM '+table+' EXCEPT SELECT * FROM ver3_full_backup_20261123_'+table+' LIMIT 1').toArray().length)throw Error('Backup differs');\n  this.sql.exec('DELETE FROM '+table);\n  report.after[table]=this.sql.exec('SELECT COUNT(*) AS n FROM '+table).toArray()[0].n;\n }\n for(const [k,v] of Object.entries({\"meta:members\":{},\"meta:settings\":{\"wsName\":\"AIDC WorkSpace\",\"org\":\"\",\"dropboxUrl\":\"\",\"teamspaces\":[],\"security\":{\"sessionDays\":14},\"projTrash\":{}},\"meta:tabs\":[],\"meta:rows\":{},\"meta:archive\":[],\"meta:head\":{},\"meta:order\":[],\"meta:notices\":[],\"meta:roadmap\":[],\"meta:flags\":{\"projectStatusV2\":1,\"projectTagV1\":1,\"trashStampV1\":1,\"archLinksV1\":1,\"archLinksStyleV2\":1,\"archCardsV3\":1,\"demoActionsV1\":1,\"fullReset20261123\":true}}))this.sql.exec('INSERT INTO records VALUES (?,?)',k,JSON.stringify(v));\n this.sql.exec(\"INSERT INTO ver3_full_reset_manifest VALUES ('full_20261123',?)\",JSON.stringify(report));\n });\n}\n";

const code=main.bytes.toString('utf8');
const method=code.lastIndexOf('\n  put('),end=code.lastIndexOf('\n  }',method);
if(method<0||end<0)throw Error('Unexpected constructor');
let patched=code.slice(0,end)+RESET_INJECTION+code.slice(end);
const fetchMatch=/async fetch\((\w+)\)\s*\{/.exec(patched.slice(patched.lastIndexOf('\n  put(')));
if(!fetchMatch)throw Error('DO fetch not identified');
const offset=patched.lastIndexOf('\n  put(')+fetchMatch.index+fetchMatch[0].length;
const proof=crypto.randomUUID(),param=fetchMatch[1];
const probe='if(new URL('+param+'.url).pathname==="/api/ver3-reset-check"&&'+param+'.headers.get("X-Ver3-Reset-Proof")==='+JSON.stringify(proof)+'){const report=JSON.parse(this.sql.exec("SELECT report FROM ver3_full_reset_manifest WHERE id=\\\'full_20261123\\\'").toArray()[0].report);const counts={};for(const t of ["users","live_sessions","files","versions","history","ydocs","edit_locks","co_locks","holidays"])counts[t]=this.sql.exec("SELECT COUNT(*) AS n FROM "+t).toArray()[0].n;return Response.json({report,counts,records:this.sql.exec("SELECT id FROM records").toArray().map(r=>r.id)});}';
patched=patched.slice(0,offset)+probe+patched.slice(offset);
await fs.writeFile(path.resolve(dir,main.name),patched);
execFileSync(process.execPath,['--check',path.resolve(dir,main.name)],{stdio:'inherit'});
const seed=original.find(m=>m.name.endsWith('seed.json'));await fs.writeFile(path.resolve(dir,seed.name),'{}');
let changed=0;
for(const f of await walk(assets)){
 if(!/\.(html|js)$/.test(f))continue;
 let s=await fs.readFile(f,'utf8');
 if(s.includes('const SETTINGS_DEFAULT=copy(SETTINGS);')){
  s=s.replace(/const PEOPLE\s*=\s*\{[^;]*\};/,'const PEOPLE = {};');
  s=s.replace('const SETTINGS_DEFAULT=copy(SETTINGS);','SETTINGS='+JSON.stringify(BLANK['meta:settings'])+';\nconst SETTINGS_DEFAULT=copy(SETTINGS);');
  s=s.replace("if(!ARCH_TABS.includes('기타')){","if(!META_FLAGS.fullReset20261123&&!ARCH_TABS.includes('기타')){");
  s=s.replace('function restoreLocal(){','function restoreLocal(){if(META_FLAGS.fullReset20261123&&!localStorage.getItem("ver3-full-recovery-cleared")){localStorage.removeItem(recoveryKey());localStorage.setItem("ver3-full-recovery-cleared","1");}');
  s=s.replace(/<head>/i,'<head><script>try{if(!localStorage.getItem("ver3-full-reset-20261123")){for(const k of Object.keys(localStorage))if(k.startsWith("aidc-"))localStorage.removeItem(k);localStorage.setItem("aidc-preview","1");localStorage.setItem("ver3-full-reset-20261123","1");}}catch(e){}</script>');
  changed++;
 }
 await fs.writeFile(f,s);
}
if(changed!==1)throw Error('Unexpected client matches '+changed);
await fs.writeFile(configPath,JSON.stringify(cfg,null,2));deploy();
let verified;
for(let n=0;n<180;n++){
 try{
 const r=await fetch(root(target)+'/api/ver3-reset-check',{headers:{'X-AIDC-Client':'4','X-Ver3-Reset-Proof':proof}});
 if(r.ok){verified=await r.json();break;}
 }catch{}
 await new Promise(r=>setTimeout(r,5000));
}
if(!verified||Object.values(verified.counts).some(n=>n!==0))throw Error('Full reset not empty');
console.log('FULL_RESET_VERIFIED '+JSON.stringify(verified));
await fs.writeFile(path.resolve(dir,main.name),code);deploy();
const afterSrc=await settings(source),afterDst=await settings(target);
if(signature(afterSrc)!==signature(sourceSettings))throw Error('Source configuration changed');
if(afterDst.bindings.find(b=>b.name==='WORKSPACE').namespace_id!==dstNS)throw Error('Target namespace changed');
console.log('COMPLETE '+JSON.stringify({sourceSettingsUnchanged:true,independentNamespaces:true,users:0,files:0,businessData:0,temporaryProbeRemoved:true}));
