import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
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
// Body editor (editor/, Tiptap + ProseMirror, all MIT): bundled to public/editor.js, its stylesheet goes into the page.
// The licence texts of everything that ends up in the bundle are written next to it.
const here=fileURLToPath(root);
const bundle=await build({entryPoints:[path.join(here,'editor/index.js')],absWorkingDir:here,bundle:true,format:'iife',minify:true,target:['es2020'],legalComments:'none',write:false,metafile:true,
  banner:{js:'/*! AIDC WorkSpace body editor. Third-party licences: /editor.licenses.txt */'}});
const editorJs=bundle.outputFiles[0].text;
const pkgs=new Map();
for(const f of Object.keys(bundle.metafile.inputs)){const m=/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(f);if(m&&!pkgs.has(m[1]))pkgs.set(m[1],null);}
// Equations: KaTeX is not part of the bundle. It is copied as it is and loaded only by a page that shows an equation.
const katexDir=path.join(here,'node_modules/katex');
await fs.mkdir(new URL('public/katex/fonts/',root),{recursive:true});
await fs.copyFile(path.join(katexDir,'dist/katex.min.js'),new URL('public/katex/katex.min.js',root));
await fs.writeFile(new URL('public/katex/katex.min.css',root),(await fs.readFile(path.join(katexDir,'dist/katex.min.css'),'utf8')).replace(/,url\(fonts\/[^)]+\.(?:woff|ttf)\) format\("(?:woff|truetype)"\)/g,''));
for(const f of await fs.readdir(path.join(katexDir,'dist/fonts')))if(f.endsWith('.woff2'))await fs.copyFile(path.join(katexDir,'dist/fonts',f),new URL('public/katex/fonts/'+f,root));
pkgs.set('node_modules/katex',null);
let licences='Third-party software bundled in editor.js (and KaTeX, served from /katex/)\n';
for(const dir of [...pkgs.keys()].sort()){const abs=path.join(here,dir);const meta=JSON.parse(await fs.readFile(path.join(abs,'package.json'),'utf8'));
  const file=(await fs.readdir(abs)).find(n=>/^licen[sc]e(\.(md|txt))?$/i.test(n));
  licences+=`\n${'='.repeat(78)}\n${meta.name} ${meta.version} (${typeof meta.license==='string'?meta.license:'see below'})\n${'='.repeat(78)}\n${file?(await fs.readFile(path.join(abs,file),'utf8')).trim():'Licence: '+meta.license+' (no licence file in the package)'}\n`;}
await fs.writeFile(new URL('public/editor.js',root),editorJs);
await fs.writeFile(new URL('public/editor.licenses.txt',root),licences);
const editorCss=await fs.readFile(new URL('editor/editor.css',root),'utf8');
if(!html.includes('</style>'))throw new Error('build-shared: no </style> to attach the editor stylesheet to');
html=html.replace('</style>',()=>'</style>\n<style id="nb-style">\n'+editorCss+'</style>\n<script src="/editor.js?v='+createHash('sha256').update(editorJs).digest('hex').slice(0,12)+'"></script>');
// Schedule (schedule/): the calculation core (the SUNJIN Schedule app's engine) is bundled to public/schedule.js, the page code
// in schedule/ui/*.js becomes one inline script (it shares the page's globals, like shared-client.js) and schedule.css goes
// into the page. The source plans themselves are static files in public/schedule/ and are fetched when a schedule is shown.
const sched=await build({entryPoints:[path.join(here,'schedule/index.ts')],absWorkingDir:here,bundle:true,format:'iife',minify:true,target:['es2020'],legalComments:'none',write:false,
  banner:{js:'/*! AIDC WorkSpace schedule engine (SUNJIN Schedule core). */'}});
const schedJs=sched.outputFiles[0].text;
await fs.writeFile(new URL('public/schedule.js',root),schedJs);
const schedCss=await fs.readFile(new URL('schedule/schedule.css',root),'utf8');
let schedUi='';
for(const f of (await fs.readdir(new URL('schedule/ui/',root))).filter(n=>n.endsWith('.js')).sort())schedUi+='\n/* ---- schedule/ui/'+f+' ---- */\n'+await fs.readFile(new URL('schedule/ui/'+f,root),'utf8');
if(/<\/script/i.test(schedUi))throw new Error('build-shared: schedule/ui must not contain a closing script tag');
if(!html.includes('<style id="nb-style">'))throw new Error('build-shared: editor stylesheet anchor missing');
html=html.replace('<style id="nb-style">',()=>'<style id="sch-style">\n'+schedCss+'</style>\n<script src="/schedule.js?v='+createHash('sha256').update(schedJs).digest('hex').slice(0,12)+'"></script>\n<style id="nb-style">');
html=html.replace('</body>',()=>'<script>'+schedUi+'</script></body>');
// Isolated, removable toolbar experiment for the single Test research record.
const trial=await fs.readFile(new URL('research-editor-trial.js',root),'utf8');
html=html.replace('</body>',()=>'<script>'+trial+'</script></body>');
for(const [i,s] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries())new vm.Script(s[1],{filename:'script-'+i});
await fs.writeFile(new URL('public/index.html',root),html);
console.log(`Built and syntax checked. Seed records: ${Object.keys(JSON.parse(seed)).length}`);
