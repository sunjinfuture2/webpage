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
const replacement="\nconst flagRow=this.sql.exec(\"SELECT data FROM records WHERE id='meta:flags'\").toArray()[0];\nconst resetFlags=JSON.parse(flagRow.data);\nif(!resetFlags.resetComplete){\n this.ctx.storage.transactionSync(()=>{\n  this.sql.exec(\"DELETE FROM records WHERE id LIKE 'meta:partner-category:%'\");\n  this.sql.exec(\"DELETE FROM history\");\n  this.sql.exec(\"DELETE FROM live_sessions\");\n  resetFlags.resetComplete=true;resetFlags.businessResetAt=new Date().toISOString();\n  this.sql.exec(\"UPDATE records SET data=? WHERE id='meta:flags'\",JSON.stringify(resetFlags));\n });\n}\n";

const code=main.bytes.toString('utf8');
const start=code.indexOf('\nif(!this.sql.exec("SELECT id FROM records WHERE id=\'meta:reset-audit\'")');
const end=code.lastIndexOf('\n  }',code.lastIndexOf('\n  put('));
if(start<0||end<start)throw Error('Final migration boundary missing');
const clean=code.slice(0,start)+code.slice(end);
const cleanCode=clean.replace('import resetFinalText from "./reset-final.json";\n','');
const insert=cleanCode.lastIndexOf('\n  }',cleanCode.lastIndexOf('\n  put('));
await fs.writeFile(path.resolve(dir,main.name),cleanCode.slice(0,insert)+replacement+cleanCode.slice(insert));
const seed=original.find(m=>m.name.endsWith('seed.json'));
await fs.unlink(path.join(dir,'reset-final.json'));
cfg.rules=[{type:'Text',globs:[seed.name.replace(/^\.\//,'')],fallthrough:false}];
for(const f of await walk(assets)){
 if(!/\.(html|js)$/.test(f))continue;
 let s=await fs.readFile(f,'utf8');
 s=s.replace("if(!rec.at||rec.at<Date.parse('2026-11-23T06:32:00Z'))return;","if(!rec.at||rec.at<Date.parse(META_FLAGS.businessResetAt||'2026-11-23T06:32:00Z'))return;");
 await fs.writeFile(f,s);
}
await fs.writeFile(configPath,JSON.stringify(cfg,null,2));deploy();
let token,state;
for(let n=0;n<150;n++){
 try{
 token=(await app(target,'/api/login',null,{employee:'test',name:'test'})).token;
 state=await app(target,'/api/state',token);
 if(state.records['meta:flags']?.resetComplete)break;
 await app(target,'/api/logout',token);
 }catch{}
 await new Promise(r=>setTimeout(r,5000));
}
if(!state?.records['meta:flags']?.resetComplete)throw Error('Completion not active');
if(Object.keys(state.records).some(k=>/^(item:|project:|partner:|meta:sched:|meta:partner-category:)/.test(k)))throw Error('Business records remain');
if((await app(target,'/api/files',token)).files.length)throw Error('Files remain');
console.log('RESET_VERIFIED '+JSON.stringify({users:Object.keys(state.users).length,businessRecords:0,files:0,audit:state.records['meta:reset-audit'],flags:state.records['meta:flags']}));
await app(target,'/api/logout',token);
await fs.writeFile(path.resolve(dir,main.name),cleanCode);deploy();
console.log('FINAL_RUNTIME_RESTORED');
