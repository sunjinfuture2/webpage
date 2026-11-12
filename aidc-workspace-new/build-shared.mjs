import fs from 'node:fs/promises';
import vm from 'node:vm';
// original.html is the app source (markup, styles, data and UI code). This build only
// 1) regenerates seed.json from the demo fixtures in the first <script>,
// 2) injects shared-client.js where the LOGIN marker is, and
// 3) syntax-checks every script before writing public/index.html.
const root=new URL('./',import.meta.url);
let html=(await fs.readFile(new URL('original.html',root),'utf8')).replace(/\r\n/g,'\n');
const data=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const seed=vm.runInNewContext(data+`; const out={}; ITEMS.filter(x=>x.status!=='new'&&x.status!=='draft').forEach(x=>out['item:'+x.id]=x);Object.entries(PROJECTS).forEach(([k,v])=>out['project:'+k]=v);PARTNERS.forEach(x=>out['partner:'+x.id]=x);Object.assign(out,{'meta:order':PROJ_ORDER,'meta:roadmap':ROADMAP,'meta:head':PHEAD,'meta:archive':ARCH_SECTIONS,'meta:tabs':ARCH_TABS,'meta:rows':ARCH_ROWS});JSON.stringify(out);`);
await fs.writeFile(new URL('seed.json',root),seed);
const marker=/\/\* ===================== LOGIN ===================== \*\/[\s\S]*?(?=<\/script>)/;
if((html.match(marker)||[]).length!==1)throw new Error('build-shared: LOGIN marker not found exactly once in original.html');
const sharedClient=await fs.readFile(new URL('shared-client.js',root),'utf8');
html=html.replace(marker,()=>sharedClient);
for(const [i,s] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries())new vm.Script(s[1],{filename:'script-'+i});
await fs.writeFile(new URL('public/index.html',root),html);
console.log(`Built and syntax checked. Seed records: ${Object.keys(JSON.parse(seed)).length}`);
