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

const main=original.find(m=>/javascript/.test(m.type));
const s=main.bytes.toString('utf8'),at=s.indexOf('ver3_reset_manifest');
console.log('MODULES',original.map(m=>({name:m.name,type:m.type,size:m.bytes.length})));
console.log('CONTEXT',s.slice(at-500,at+160));
const {spawn}=await import('node:child_process');
const child=spawn(path.resolve('aidc-workspace-new/node_modules/.bin/wrangler'),['tail',target,'--format','json'],{env:process.env});
let out='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>out+=b);
await new Promise(r=>setTimeout(r,6000));
try{const l=await app(target,'/api/login',null,{employee:'test',name:'test'});const st=await app(target,'/api/state',l.token);console.log('STATE',Object.keys(st.records).length,st.records['meta:flags']);await app(target,'/api/logout',l.token);}catch(e){console.log('APP_ERROR',e.message)}
await new Promise(r=>setTimeout(r,6000));child.kill();
console.log('TAIL',out.slice(-16000));
