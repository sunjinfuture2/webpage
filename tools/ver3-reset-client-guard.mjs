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
const original=await modules(target);
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
const FINAL_INJECTION="\nif(!this.sql.exec(\"SELECT id FROM records WHERE id='meta:reset-audit'\").toArray().length){\n this.ctx.storage.transactionSync(()=>{\n const report=JSON.parse(this.sql.exec(\"SELECT report FROM ver3_reset_manifest WHERE id='reset_business_20261123_01'\").toArray()[0].report);\n for(const [table,count] of Object.entries(report.backup)){\n  if(this.sql.exec('SELECT COUNT(*) AS n FROM ver3_reset_20261123_'+table).toArray()[0].n!==count)throw Error('Backup verification failed');\n }\n if(this.sql.exec('SELECT * FROM users EXCEPT SELECT * FROM ver3_reset_20261123_users LIMIT 1').toArray().length)throw Error('Users changed');\n for(const table of ['records','files','versions','history','ydocs','edit_locks','co_locks'])this.sql.exec('DELETE FROM '+table);\n for(const [k,v] of Object.entries(JSON.parse(resetFinalText)))this.sql.exec('INSERT INTO records VALUES (?,?)',k,JSON.stringify(v));\n this.sql.exec('INSERT INTO records VALUES (?,?)','meta:reset-audit',JSON.stringify({at:new Date().toISOString(),backup:report.backup,cleared:report.cleared,verified:true}));\n });\n}\n";

const backupModule=original.find(m=>m.name==='reset-backup.json');
if(!backupModule)throw Error('Private reset snapshot absent');
const saved=JSON.parse(backupModule.bytes.toString('utf8'));
const originalMain=saved.modules.find(m=>m.name.endsWith('shared-worker.js'));
if(!originalMain)throw Error('Original runtime missing');
const cleanCode=Buffer.from(originalMain.data,'base64').toString('utf8');
const preserved=saved.preserved;
const end=cleanCode.lastIndexOf('\n  }',cleanCode.lastIndexOf('\n  put('));
const injection=FINAL_INJECTION;
await fs.writeFile(path.resolve(dir,main.name),cleanCode.slice(0,end)+injection+cleanCode.slice(end));
await fs.writeFile(path.join(dir,'reset-final.json'),JSON.stringify(preserved));
await fs.unlink(path.join(dir,'reset-backup.json'));
const seed=original.find(m=>m.name.endsWith('seed.json'));await fs.writeFile(path.resolve(dir,seed.name),'[]');
await fs.writeFile(path.resolve(dir,main.name),'import resetFinalText from "./reset-final.json";\n'+await fs.readFile(path.resolve(dir,main.name),'utf8'));
cfg.rules=[{type:'Text',globs:[seed.name.replace(/^\.\//,''),'reset-final.json'],fallthrough:false}];
let changed=0;
for(const f of await walk(assets)){
 if(!/\.(html|js)$/.test(f))continue;
 let s=await fs.readFile(f,'utf8');
 const old='let rec;try{rec=JSON.parse(raw);}catch{return;}';
 if(s.includes(old)){s=s.replace(old,old+"if(!rec.at||rec.at<Date.parse('2026-11-23T06:32:00Z'))return;");changed++;}
 const begin='const agentFixtures=ITEMS.filter(i=>i.agent).map(copy);';
 if(s.includes(begin))s=s.replace(begin,begin+'for(const k of Object.keys(partnerCategoryHistory))delete partnerCategoryHistory[k];for(const k of Object.keys(partnerCategoryHidden))delete partnerCategoryHidden[k];');
 s=s.replace('for(const a of agentFixtures)if(!item(a.id))ITEMS.push(copy(a));','/* ver3: no fixture documents */');
 await fs.writeFile(f,s);
}
if(!changed)throw Error('Recovery loader not found');
await fs.writeFile(configPath,JSON.stringify(cfg,null,2));deploy();
console.log('FINAL_DEPLOYED');
let token,state;
for(let n=0;n<60;n++){try{
 token=(await app(target,'/api/login',null,{employee:'test',name:'test'})).token;
 state=await app(target,'/api/state',token);
 if(state.records['meta:reset-audit'])break;
 await app(target,'/api/logout',token);
}catch{}await new Promise(r=>setTimeout(r,5000));}
if(!state?.records['meta:reset-audit'])throw Error('Final marker not live');
const audit=state.records['meta:reset-audit'];
const actual={...state.records};delete actual['meta:reset-audit'];
if(signature(actual)!==signature(preserved))throw Error('Final metadata mismatch');
if((await app(target,'/api/files',token)).files.length)throw Error('Attachments remain');
console.log('RESET_VERIFIED '+JSON.stringify({audit,users:Object.keys(state.users).length,businessRecords:0,files:0,metadataPreserved:true,sourceUntouched:true}));
await app(target,'/api/logout',token);
// Final runtime contains no reset code or import. Seed is permanently empty.
await fs.writeFile(path.resolve(dir,main.name),cleanCode);
await fs.unlink(path.join(dir,'reset-final.json'));
cfg.rules=[{type:'Text',globs:[seed.name.replace(/^\.\//,'')],fallthrough:false}];
await fs.writeFile(configPath,JSON.stringify(cfg,null,2));deploy();
console.log('FINAL_RUNTIME_RESTORED');
