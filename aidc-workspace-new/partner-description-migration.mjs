// One-time, atomic migration; future short descriptions remain separate from the body.
export function movePartnerDescriptions(db) {
  const key='migration:partner-description-body-20261125';
  if(db.get(key))return;
  db.ctx.storage.transactionSync(()=>{
    if(db.get(key))return;
    let count=0;
    for(const row of db.sql.exec("SELECT id,data FROM records WHERE id LIKE 'partner:%'").toArray()){
      const p=JSON.parse(row.data);
      if(typeof p.desc!=='string'||!p.desc.trim())continue;
      // Preserve existing body bytes and append the original description without rewriting it.
      const body=typeof p.body==='string'?p.body:'';
      if(p.body!=null&&typeof p.body!=='string')throw new Error('Unsupported partner body: '+row.id);
      p.body=body?body+'\n\n'+p.desc:p.desc;
      p.desc='';
      db.put(row.id,p);count++;
    }
    db.put(key,{at:new Date().toISOString(),count});
  });
}
