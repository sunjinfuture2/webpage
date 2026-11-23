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
const srcSettings=await settings(source),dstSettings=await settings(target);
const srcNS=srcSettings.bindings.find(b=>b.name==='WORKSPACE')?.namespace_id,dstNS=dstSettings.bindings.find(b=>b.name==='WORKSPACE')?.namespace_id;
if(!srcNS||!dstNS||srcNS===dstNS)throw Error('Storage not independent');
const sourceModules=await modules(source),original=await modules(target);
let sourceToken,targetToken;
const dir=path.resolve('.ver3-data-transfer'),assets=path.resolve('.ver3-data-assets');
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
const cfg={name:target,account_id:account,main:main.name,no_bundle:true,compatibility_date:dstSettings.compatibility_date,compatibility_flags:dstSettings.compatibility_flags||[],workers_dev:true,keep_vars:true,assets:{directory:'../.ver3-data-assets',binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api/*']},durable_objects:{bindings:[{name:'WORKSPACE',class_name:'Workspace'}]},migrations:[{tag,new_sqlite_classes:['Workspace']}],rules:original.filter(m=>m!==main&&!/javascript/.test(m.type)).map(m=>({type:m.type.includes('text')||m.name.endsWith('.json')?'Text':'Data',globs:[m.name.replace(/^\.\//,'')],fallthrough:false}))};
const configPath=path.join(dir,'wrangler.json');
const deploy=()=>execFileSync(path.resolve('aidc-workspace-new/node_modules/.bin/wrangler'),['deploy','--config',configPath],{stdio:'inherit'});
let tempDeployed=false;
try{
 sourceToken=(await app(source,'/api/login',null,{employee:'test',name:'test'})).token;
 targetToken=(await app(target,'/api/login',null,{employee:'test',name:'test'})).token;
 const state=await app(source,'/api/state',sourceToken),before=await app(target,'/api/state',targetToken);
 if(Object.keys(state.locks||{}).length||Object.keys(before.locks||{}).length)throw Error('Active edit lock; stopping without transfer');
 const listing=(await app(source,'/api/files',sourceToken)).files;
 const files=[];
 for(const f of listing){const r=await fetch(root(source)+'/api/file/'+encodeURIComponent(f.id),{headers:{Authorization:'Bearer '+sourceToken,'X-AIDC-Client':'4'}});if(!r.ok)throw Error('Source file denied '+f.id);const b=Buffer.from(await r.arrayBuffer());if(b.length!==f.size)throw Error('Source size mismatch');files.push({...f,data:b.toString('base64'),sha256:hash(b)});}
 const snapshot={records:state.records,users:state.users,files,capturedAt:new Date().toISOString()};
 if(Object.keys(snapshot.records).length<200||!snapshot.records['project:pangyo'])throw Error('Incomplete source snapshot');
 const latest=await app(source,'/api/state',sourceToken);if(signature(latest.records)!==signature(snapshot.records))throw Error('Source edited during capture; retry required');
 const id='copy-v2-'+signature({records:snapshot.records,files:files.map(f=>({id:f.id,sha256:f.sha256}))}).slice(0,20);
 const moduleName='ver3-transfer.json';
 await fs.writeFile(path.join(dir,moduleName),JSON.stringify(snapshot));
 const injection=`
    this.sql.exec("CREATE TABLE IF NOT EXISTS ver3_copy_runs (id TEXT PRIMARY KEY, at TEXT NOT NULL, record_count INTEGER, file_count INTEGER)");
    if (!this.sql.exec("SELECT id FROM ver3_copy_runs WHERE id=?", ${JSON.stringify(id)}).toArray().length) {
      const transfer = JSON.parse(ver3TransferText);
      const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0)).buffer;
      this.ctx.storage.transactionSync(() => {
        for (const table of ["records", "files", "users", "versions"]) {
          this.sql.exec("CREATE TABLE IF NOT EXISTS ver3_backup_" + table + " AS SELECT * FROM " + table + " WHERE 0");
          if (this.sql.exec("SELECT id FROM ver3_copy_runs LIMIT 1").toArray().length === 0) this.sql.exec("INSERT INTO ver3_backup_" + table + " SELECT * FROM " + table);
        }
        this.sql.exec("DELETE FROM records");
        this.sql.exec("DELETE FROM files");
        this.sql.exec("DELETE FROM versions");
        for (const [key,value] of Object.entries(transfer.records)) this.sql.exec("INSERT INTO records(id,data) VALUES (?,?)",key,JSON.stringify(value));
        for (const [employee,name] of Object.entries(transfer.users)) this.sql.exec("INSERT OR REPLACE INTO users(employee,name) VALUES (?,?)",employee,name);
        for (const f of transfer.files) this.sql.exec("INSERT INTO files(id,name,type,size,item,employee,at,data) VALUES (?,?,?,?,?,?,?,?)",f.id,f.name,f.type,f.size,f.item,f.employee,f.at,bytes(f.data));
        this.sql.exec("DELETE FROM ydocs");
        this.sql.exec("DELETE FROM edit_locks");
        this.sql.exec("DELETE FROM co_locks");
        this.sql.exec("INSERT INTO ver3_copy_runs VALUES (?,?,?,?)",${JSON.stringify(id)},transfer.capturedAt,Object.keys(transfer.records).length,transfer.files.length);
      });
    }
`;
 const code=main.bytes.toString('utf8'),method=code.lastIndexOf('\n  put('),end=code.lastIndexOf('\n  }',method);
 if(method<0||end<0||!code.slice(0,end).includes('CREATE TABLE IF NOT EXISTS records'))throw Error('Unexpected Worker constructor layout');
 const patched='import ver3TransferText from "./'+moduleName+'";\n'+code.slice(0,end)+injection+code.slice(end);
 await fs.writeFile(path.resolve(dir,main.name),patched);
 execFileSync(process.execPath,['--check',path.resolve(dir,main.name)],{stdio:'inherit'});
 const tempCfg=structuredClone(cfg);const textRule=tempCfg.rules.find(r=>r.type==='Text');if(textRule)textRule.globs.push(moduleName);else tempCfg.rules.push({type:'Text',globs:[moduleName],fallthrough:false});
 await fs.writeFile(configPath,JSON.stringify(tempCfg,null,2));
 console.log('CAPTURED '+JSON.stringify({id,records:Object.keys(snapshot.records).length,files:files.length,fileBytes:files.reduce((s,f)=>s+f.size,0),capturedAt:snapshot.capturedAt,backup:'ver3_backup_* in target SQLite only'}));
 deploy();tempDeployed=true;
 let copied=null;
 for(let n=0;n<40;n++){try{copied=await app(target,'/api/state',targetToken);if(signature(copied.records)===signature(snapshot.records))break;}catch{}await new Promise(r=>setTimeout(r,10000));}
 if(!copied||signature(copied.records)!==signature(snapshot.records))throw Error('Record verification failed');
 const targetFiles=(await app(target,'/api/files',targetToken)).files;
 if(signature(targetFiles.slice().sort((a,b)=>a.id.localeCompare(b.id)))!==signature(listing.slice().sort((a,b)=>a.id.localeCompare(b.id))))throw Error('Attachment metadata differs');
 for(const f of files){const r=await fetch(root(target)+'/api/file/'+encodeURIComponent(f.id),{headers:{Authorization:'Bearer '+targetToken,'X-AIDC-Client':'4'}});if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==f.sha256)throw Error('Attachment bytes differ '+f.id);}
 await writeModules();await fs.writeFile(configPath,JSON.stringify(cfg,null,2));deploy();tempDeployed=false;
 const hashes=ms=>ms.map(m=>hash(m.bytes)).sort().join(',');
 if(hashes(await modules(target))!==hashes(original))throw Error('Original target code not restored');
 if(hashes(await modules(source))!==hashes(sourceModules))throw Error('Source code changed');
 const finalSettings=await settings(target);if(finalSettings.bindings.find(b=>b.name==='WORKSPACE').namespace_id!==dstNS)throw Error('Target namespace changed');
 const finalState=await app(target,'/api/state',targetToken);if(signature(finalState.records)!==signature(snapshot.records))throw Error('Final state differs');
 const sourceEnd=await app(source,'/api/state',sourceToken);
 console.log('VERIFIED '+JSON.stringify({records:Object.keys(snapshot.records).length,projects:Object.keys(snapshot.records).filter(k=>k.startsWith('project:')).length,files:files.length,fileBytes:files.reduce((s,f)=>s+f.size,0),allFileHashesMatch:true,recordHash:signature(snapshot.records),independentStorage:true,originalTargetCodeRestored:true,sourceDataUnchanged:signature(sourceEnd.records)===signature(snapshot.records),capturedAt:snapshot.capturedAt,backup:'ver3_backup_records/files/users/versions'}));
}finally{
 if(tempDeployed){await writeModules();await fs.writeFile(configPath,JSON.stringify(cfg,null,2));deploy();}
 for(const [n,t] of [[source,sourceToken],[target,targetToken]])if(t)try{await app(n,'/api/logout',t);}catch{}
}
