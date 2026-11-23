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
if(dstNS!=='bd7f4e8b1b5d45f1bae724cdb666324f')throw Error('Unexpected ver3 storage');
const original=await modules(target);
let sourceToken,targetToken;
const dir=path.resolve('.ver3-editor-deploy'),assets=path.resolve('.ver3-editor-assets');
await fs.mkdir(dir,{recursive:true});await fs.mkdir(assets,{recursive:true});
const main=original.find(m=>/javascript/.test(m.type));
if(!main)throw Error('No module entry');
const writeModules=async()=>{for(const m of original){const p=path.resolve(dir,m.name);if(!p.startsWith(dir+'/'))throw Error('Unsafe module path');await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,m.bytes);}};
await writeModules();
async function walk(d){let out=[];for(const e of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,e.name);out.push(...e.isDirectory()?await walk(p):[p]);}return out;}
const assetHashes={};
for(const f of await walk('workspace_ver3/public')){const rel=path.relative('workspace_ver3/public',f).split(path.sep).join('/');if(rel.startsWith('.')||rel==='_headers'||rel==='_redirects')continue;const r=await fetch(root(target)+'/'+rel);if(!r.ok)throw Error('Missing asset '+rel);const b=Buffer.from(await r.arrayBuffer());if(rel!=='index.html'&&!rel.endsWith('.html')&&/text\/html/.test(r.headers.get('content-type')||''))throw Error('Asset fallback');await fs.mkdir(path.dirname(path.join(assets,rel)),{recursive:true});await fs.writeFile(path.join(assets,rel),b);assetHashes[rel]=hash(b);}
const scripts=await(await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts',{headers:cfHeaders})).json();
const tag=scripts.result.find(s=>s.id===target)?.migration_tag;if(!tag)throw Error('No migration tag');
const cfg={name:target,account_id:account,main:main.name,no_bundle:true,compatibility_date:dstSettings.compatibility_date,compatibility_flags:dstSettings.compatibility_flags||[],workers_dev:true,keep_vars:true,assets:{directory:'../.ver3-editor-assets',binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api/*']},durable_objects:{bindings:[{name:'WORKSPACE',class_name:'Workspace'}]},migrations:[{tag,new_sqlite_classes:['Workspace']}],rules:original.filter(m=>m!==main&&!/javascript/.test(m.type)).map(m=>({type:m.type.includes('text')||m.name.endsWith('.json')?'Text':'Data',globs:[m.name.replace(/^\.\//,'')],fallthrough:false}))};
const configPath=path.join(dir,'wrangler.json');
const deploy=()=>execFileSync(path.resolve('workspace_ver3/node_modules/.bin/wrangler'),['deploy','--config',configPath],{stdio:'inherit'});
const bytes=await fs.readFile('workspace_ver3/public/editor.js');
if(assetHashes['editor.js']!=='754c5fabf338f67f5edef10794b9206ea91dc496e1cae35e0310fbc5d6c8fbfb')throw Error('Live editor changed; review required');
await fs.writeFile(path.join(assets,'editor.js'),bytes);
let index=await fs.readFile(path.join(assets,'index.html'),'utf8');
if(!index.includes('/editor.js?v='))throw Error('Missing editor reference');
index=index.replace(/\/editor\.js\?v=[a-z0-9]+/g,'/editor.js?v='+hash(bytes).slice(0,12));
await fs.writeFile(path.join(assets,'index.html'),index);
await fs.writeFile(configPath,JSON.stringify(cfg,null,2));deploy();
const after=await settings(target);
if(after.bindings.find(b=>b.name==='WORKSPACE')?.namespace_id!==dstNS)throw Error('Storage changed');
const published=await modules(target);
for(const m of original)if(!published.some(n=>n.name===m.name&&hash(n.bytes)===hash(m.bytes)))throw Error('Runtime changed');
for(const [rel,prior] of Object.entries(assetHashes)){
const expected=rel==='editor.js'?hash(bytes):rel==='index.html'?hash(index):prior;
let ok=false;
for(let n=0;n<12;n++){const r=await fetch(root(target)+'/'+rel);if(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===expected){ok=true;break;}await new Promise(r=>setTimeout(r,5000));}
if(!ok)throw Error('Asset verification failed '+rel);
}
console.log('VERIFIED: ver3 editor updated; server modules, namespace and other assets unchanged');
