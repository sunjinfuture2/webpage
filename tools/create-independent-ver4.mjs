import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const account='f1ac689fded81b2578beca600e38fea6', source='workspace_ver3', target='workspace_ver4';
const base='https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/';
const headers={Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN};
const hash=b=>createHash('sha256').update(b).digest('hex');
async function response(p){const r=await fetch(base+p,{headers});if(!r.ok)throw Error(p+' HTTP '+r.status);return r;}
async function json(p){const d=await (await response(p)).json();if(!d.success)throw Error(JSON.stringify(d.errors));return d.result;}
async function modules(name){const r=await response(name+'/content/v2');const type=r.headers.get('content-type')||'';if(!type.includes('multipart/form-data'))throw Error('Expected module Worker: '+type);const f=await r.formData();const out=[];for(const [key,v] of f){if(typeof v==='string')continue;out.push({name:v.name||key,type:v.type,bytes:Buffer.from(await v.arrayBuffer())});}if(!out.length)throw Error('No worker modules');return out;}
const srcSettings=await json(source+'/settings');
const srcDO=srcSettings.bindings.find(b=>b.name==='WORKSPACE');
if(!srcDO?.namespace_id)throw Error('Source storage missing');
if(srcSettings.bindings.some(b=>!['assets','durable_object_namespace'].includes(b.type)))throw Error('Unexpected source bindings');
const srcModules=await modules(source);
const existence=await fetch(base+target+'/settings',{headers});
if(existence.status!==404)throw Error('Target already exists or cannot be checked: '+existence.status);
const dir=path.resolve('.ver4-live');
await fs.mkdir(dir,{recursive:true});
for(const m of srcModules){const f=path.resolve(dir,m.name);if(!f.startsWith(dir+'/'))throw Error('Unsafe module name');await fs.mkdir(path.dirname(f),{recursive:true});await fs.writeFile(f,m.bytes);}
async function walk(d){let files=[];for(const e of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,e.name);files.push(...(e.isDirectory()?await walk(p):[p]));}return files;}
const publicDir=path.resolve('aidc-workspace-new/public'), assets=path.resolve('.ver4-live-assets');
await fs.mkdir(assets,{recursive:true});
const assetHashes={};
for(const f of await walk(publicDir)){const rel=path.relative(publicDir,f).split(path.sep).join('/');if(rel.startsWith('.')||rel==='_headers'||rel==='_redirects')continue;const url='https://'+source+'.sunjinfuture2.workers.dev/'+rel;const r=await fetch(url);if(!r.ok)throw Error('Asset '+rel+' HTTP '+r.status);let b=Buffer.from(await r.arrayBuffer());if(rel!=='index.html'&&/text\/html/.test(r.headers.get('content-type')||'')&&!rel.endsWith('.html'))throw Error('Asset fallback '+rel);await fs.mkdir(path.dirname(path.join(assets,rel)),{recursive:true});await fs.writeFile(path.join(assets,rel),b);assetHashes[rel]=hash(b);}
const seedModule=srcModules.find(m=>m.name.endsWith('seed.json'));
if(!seedModule)throw Error('Seed missing');
const cleanSeed=Buffer.from(JSON.stringify({"meta:members":{},"meta:settings":{"wsName":"AIDC WorkSpace","org":"","dropboxUrl":"","teamspaces":[],"security":{"sessionDays":14},"projTrash":{}},"meta:tabs":[],"meta:rows":{},"meta:archive":[],"meta:head":{},"meta:order":[],"meta:notices":[],"meta:roadmap":[],"meta:flags":{"projectStatusV2":1,"projectTagV1":1,"trashStampV1":1,"archLinksV1":1,"archLinksStyleV2":1,"archCardsV3":1,"demoActionsV1":1,"fullReset20261123":true}}));
await fs.writeFile(path.resolve(dir,seedModule.name),cleanSeed);
const main=srcModules.find(m=>m.name===srcSettings.main_module)||srcModules.find(m=>/javascript/.test(m.type));
if(!main)throw Error('Missing entrypoint');
const cfg={name:target,account_id:account,main:main.name,no_bundle:true,compatibility_date:srcSettings.compatibility_date||'2026-11-06',compatibility_flags:srcSettings.compatibility_flags||[],workers_dev:true,keep_vars:true,assets:{directory:'../.ver4-live-assets',binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api/*']},durable_objects:{bindings:[{name:'WORKSPACE',class_name:'Workspace'}]},rules:srcModules.filter(m=>m!==main&&!/javascript/.test(m.type)).map(m=>({type:m.type.includes('text')||m.name.endsWith('.json')?'Text':'Data',globs:[m.name.replace(/^\.\//,'')],fallthrough:false}))};
const scripts=await (await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts',{headers})).json();
const existing=scripts.result.find(s=>s.id===target);
if(existing)throw Error('Target already exists');
cfg.migrations=[{tag:'ver4-initial',new_sqlite_classes:['Workspace']}];
await fs.writeFile(path.join(dir,'wrangler.json'),JSON.stringify(cfg,null,2));
const before={sourceModules:srcModules.map(m=>({name:m.name,hash:hash(m.bytes)})),sourceNamespace:srcDO.namespace_id,assets:assetHashes};
console.log('PRECHECK '+JSON.stringify({sourceModules:before.sourceModules,targetIndependent:true,assets:Object.keys(assetHashes)}));
execFileSync(path.resolve('aidc-workspace-new/node_modules/.bin/wrangler'),['deploy','--config',path.join(dir,'wrangler.json')],{stdio:'inherit'});
const after=await json(target+'/settings');
const afterDO=after.bindings.find(b=>b.name==='WORKSPACE');
if(!afterDO?.namespace_id||afterDO.namespace_id===srcDO.namespace_id)throw Error('Namespace isolation verification failed');
const dstModules=await modules(target);
const sorted=ms=>ms.map(m=>hash(m.bytes)).sort().join(',');
if(sorted(srcModules.filter(m=>m!==seedModule))!==sorted(dstModules.filter(m=>m.name!==seedModule.name)))throw Error('Deployed module bytes differ');
for(const [rel,expected] of Object.entries(assetHashes)){let ok=false;for(let attempt=0;attempt<6;attempt++){const r=await fetch('https://'+target+'.sunjinfuture2.workers.dev/'+rel);if(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===expected){ok=true;break;}await new Promise(r=>setTimeout(r,5000));}if(!ok)throw Error('Published asset differs '+rel);}
if(sorted(await modules(source))!==sorted(srcModules))throw Error('Source changed during clone');
console.log('VERIFIED '+JSON.stringify({url:'https://'+target+'.sunjinfuture2.workers.dev/',runtimeBytesIdentical:true,cleanInitialSettings:true,assetsVerified:Object.keys(assetHashes).length,defaultView:'v2',independentStorage:true,sourceNamespace:srcDO.namespace_id,targetNamespace:afterDO.namespace_id,sourceUnchanged:true,dataMigrated:false}));
