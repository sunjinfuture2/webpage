const assert=require('node:assert/strict');const{chromium,newUser,waitApp}=require('./h.cjs');
(async()=>{const b=await chromium.launch();try{const{page:p}=await newUser(b,'test','test',{url:'https://sunjin-aidc-workspace-demo.sunjinfuture2.workers.dev/'});
const snapshot=await p.evaluate(()=>({partners:PARTNERS.map(x=>({id:x.id,body:x.body,desc:x.desc})),marker:sharedBase['meta:migration:partner-description-body-20261125']}));
assert.ok(snapshot.marker);console.log('Migrated partners:',snapshot.marker.count,'Total partners:',snapshot.partners.length);
const targets=snapshot.partners.filter(x=>x.body);assert.ok(targets.length);
for(const target of targets){await p.evaluate(id=>openPanel(id),target.id);assert.equal(await p.locator('#panel-pin .partner-body-text').innerText(),target.body);await p.evaluate(()=>closePanel());}
await p.reload();await waitApp(p);const after=await p.evaluate(()=>PARTNERS.map(x=>({id:x.id,body:x.body,desc:x.desc})));assert.deepEqual(after,snapshot.partners);console.log('LIVE READ ONLY: migrated partner bodies displayed and retained after reload');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
