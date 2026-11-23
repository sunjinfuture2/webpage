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
const INJECTION="\nthis.sql.exec(\"CREATE TABLE IF NOT EXISTS ver3_reset_manifest (id TEXT PRIMARY KEY,at TEXT,report TEXT)\");\nif(!this.sql.exec(\"SELECT id FROM ver3_reset_manifest WHERE id='reset_business_20261123_01'\").toArray().length){\n this.ctx.storage.transactionSync(()=>{\n const tables=this.sql.exec(\"SELECT name FROM sqlite_master WHERE type='table'\").toArray().map(x=>x.name).filter(n=>!n.startsWith('sqlite_')&&!n.startsWith('_cf_')&&!n.startsWith('ver3_'));\n const report={backup:{},cleared:{}};\n for(const table of tables){\n  if(!/^[a-z_]+$/.test(table))throw Error('Unexpected table');\n  const backup='ver3_reset_20261123_'+table;\n  this.sql.exec('CREATE TABLE '+backup+' AS SELECT * FROM '+table);\n  const count=this.sql.exec('SELECT COUNT(*) AS n FROM '+table).toArray()[0].n;\n  const copied=this.sql.exec('SELECT COUNT(*) AS n FROM '+backup).toArray()[0].n;\n  if(count!==copied||this.sql.exec('SELECT * FROM '+table+' EXCEPT SELECT * FROM '+backup+' LIMIT 1').toArray().length)throw Error('Backup mismatch '+table);\n  report.backup[table]=count;\n }\n this.sql.exec(\"CREATE TABLE ver3_reset_20261123_code (name TEXT PRIMARY KEY,data TEXT)\");\n const snapshot=JSON.parse(ver3ResetBackup);\n for(const m of [...snapshot.modules,...snapshot.assets])for(let offset=0;offset<m.data.length;offset+=500000)this.sql.exec(\"INSERT INTO ver3_reset_20261123_code VALUES (?,?)\",m.name+\":\"+offset,m.data.slice(offset,offset+500000));\n for(const table of ['records','files','versions','history','ydocs','edit_locks','co_locks']){\n  if(!tables.includes(table))throw Error('Missing table '+table);\n  this.sql.exec('DELETE FROM '+table);\n  report.cleared[table]=this.sql.exec('SELECT COUNT(*) AS n FROM '+table).toArray()[0].n;\n  if(report.cleared[table]!==0)throw Error('Reset failed');\n }\n for(const [k,v] of Object.entries(snapshot.preserved))this.sql.exec(\"INSERT INTO records(id,data) VALUES (?,?)\",k,JSON.stringify(v));\n this.sql.exec(\"INSERT INTO ver3_reset_manifest VALUES (?,?,?)\",'reset_business_20261123_01',new Date().toISOString(),JSON.stringify(report));\n });\n}\n";

const resetId='reset_business_20261123_01';
targetToken=(await app(target,'/api/login',null,{employee:'test',name:'test'})).token;
const before=await app(target,'/api/state',targetToken);
if(Object.keys(before.locks||{}).length)throw Error('Active editing; reset stopped');
const preserved={};
for(const [k,v] of Object.entries(before.records)){
 if(['meta:settings','meta:members','meta:tabs','meta:flags'].includes(k))preserved[k]=structuredClone(v);
 if(k.startsWith('meta:inbox:'))preserved[k]={read:[],checked:[],seenInit:{},prefs:v.prefs||{}};
}
preserved['meta:settings'].projTrash={};
Object.assign(preserved,{'meta:order':[],'meta:roadmap':[],'meta:head':{},'meta:archive':[],'meta:rows':Object.fromEntries((preserved['meta:tabs']||[]).map(k=>[k,[]])),'meta:notices':[]});
Object.assign(preserved['meta:flags'],{projectStatusV2:1,projectTagV1:1,trashStampV1:1,archLinksV1:1,archLinksStyleV2:1,archCardsV3:1,demoActionsV1:1,businessReset:resetId});
const backupCode={preserved,modules:original.map(m=>({name:'module:'+m.name,data:m.bytes.toString('base64')})),assets:[]};
for(const f of await walk(assets))backupCode.assets.push({name:'asset:'+path.relative(assets,f),data:(await fs.readFile(f)).toString('base64')});
await fs.writeFile(path.join(dir,'reset-backup.json'),JSON.stringify(backupCode));
let clientPatches=0;
for(const f of await walk(assets)){
 if(!/\.(html|js)$/.test(f))continue;
 let s=await fs.readFile(f,'utf8');
 const old='for(const a of agentFixtures)if(!item(a.id))ITEMS.push(copy(a));';
 if(s.includes(old)){s=s.replace(old,'/* ver3: do not recreate default agent documents after reset */');clientPatches++;await fs.writeFile(f,s);}
}
if(!clientPatches)throw Error('Could not identify client fixture recreation');
const code=main.bytes.toString('utf8'),method=code.lastIndexOf('\n  put('),end=code.lastIndexOf('\n  }',method);
if(method<0||end<0)throw Error('Constructor not found');
const patched='import ver3ResetBackup from "./reset-backup.json";\n'+code.slice(0,end)+INJECTION+code.slice(end);
await fs.writeFile(path.resolve(dir,main.name),patched);
const tempCfg=structuredClone(cfg);tempCfg.rules.find(r=>r.type==='Text').globs.push('reset-backup.json');
await fs.writeFile(configPath,JSON.stringify(tempCfg,null,2));
execFileSync(process.execPath,['--check',path.resolve(dir,main.name)],{stdio:'inherit'});
console.log('RESET_START '+JSON.stringify({records:Object.keys(before.records).length,users:Object.keys(before.users).length,backup:'ver3_reset_20261123_*',clientPatches}));
deploy();
let after;
for(let n=0;n<30;n++){try{after=await app(target,'/api/state',targetToken);if(after.records['meta:flags']?.businessReset===resetId)break;}catch{}await new Promise(r=>setTimeout(r,5000));}
if(!after||signature(after.records)!==signature(preserved))throw Error('Reset state mismatch');
if(signature(after.users)!==signature(before.users))throw Error('Users changed');
if((await app(target,'/api/files',targetToken)).files.length)throw Error('Files remain');
await writeModules();
const seed=original.find(m=>m.name.endsWith('seed.json'));if(!seed)throw Error('Seed module missing');
await fs.writeFile(path.resolve(dir,seed.name),'[]');
await fs.unlink(path.join(dir,'reset-backup.json'));
await fs.writeFile(configPath,JSON.stringify(cfg,null,2));deploy();
if((await settings(target)).bindings.find(b=>b.name==='WORKSPACE').namespace_id!==dstNS)throw Error('Namespace changed');
for(let i=0;i<3;i++){
 const final=await app(target,'/api/state',targetToken);
 if(signature(final.records)!==signature(preserved)||signature(final.users)!==signature(before.users))throw Error('Persistence failed');
}
console.log('RESET_VERIFIED '+JSON.stringify({records:Object.keys(preserved).length,businessRecords:0,files:0,users:Object.keys(before.users).length,settingsPreservedExceptProjectTrash:true,backupTables:'ver3_reset_20261123_*',backupVerifiedBySqlEquality:true,refreshChecks:3,sourceUntouched:true}));
await app(target,'/api/logout',targetToken);
