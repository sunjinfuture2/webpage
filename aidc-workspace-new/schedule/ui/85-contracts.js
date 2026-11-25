// Project contracts are ordinary, independently typed items. Meetings keep their original cards and records.
function schProjectMeetSection(pid,PV=schPreview()){return PV&&schViewOf('meet')==='table'?schMeetTableSection(pid):`<div class="meet" style="margin-top:117.2px;height:${PV?441.7:352.1}px"><div class="sec-title ${PV?'sch-title':''}" style="top:0">${PV?schTitleIcon('meeting'):''}미팅${plusBtn('new-meeting','새 미팅')}<button class="sh-btn lib" data-lib="meeting">라이브러리</button><span class="car-cnt" id="meet-cnt"></span></div>${PV?schMeetTools():''}
     <div class="track" style="top:${PV?147:57.4}px"><div class="inner" id="meet-inner">${meetingCards(pid,PV?schMeetRows(pid):null)}</div></div>${PV?'<div class="fade l"></div><div class="fade r"></div>':''}
     <button class="circ l" data-car="meet:-1" title="이전">${svg('i-arr-l',6.6,13.2,'color:#8e8e8e;margin-left:-1px')}</button><button class="circ r" data-car="meet:1" title="다음">${svg('i-arr-r',6.6,13.2,'color:#8e8e8e;margin-left:2px')}</button></div>`;}
function schContractSection(pid){
 const rows=liveItems('contract',pid).sort(newestFirst);
 const th=t=>'<span><em>'+t+'</em></span>';
 return '<div class="sec contract-section" style="margin-top:117.2px"><div class="sec-title sch-title"><span class="sch-ic">'+pict('contract')+'</span>계약서'+plusBtn('new-contract','새 계약서')+'</div><div class="contract-scroll"><div class="tbl sch-proc contract-table"><div class="hd">'+['계약서명','날짜','상태','중요도','담당자','관련 미팅'].map(th).join('')+'</div>'+rows.map(it=>{
  const meetings=(it.meetings||[]).map(item).filter(x=>x&&x.type==='meeting'&&isLive(x)),ppl=it.people||[];
  return '<div class="rw" data-open="'+esc(it.id)+'"><div class="nm" title="'+esc(oneLine(it.title))+'"><span class="e">'+esc(oneLine(it.title)||'(제목 없음)')+'</span></div><div>'+esc(dateShow(it))+'</div><div>'+schStIcon(it.st==='done'?'완료':'진행')+'</div><div><span class="pri pri-'+esc(it.pri||'mid')+'">'+esc(priTxt[it.pri||'mid'])+'</span></div><div class="who">'+(ppl.length?ppl.map(k=>'<span data-user="'+esc(k)+'">'+av()+esc(userName(k))+'</span>').join(''):'<span class="sch-role none">미지정</span>')+'</div><div class="contract-meetings">'+meetings.map(m=>'<a data-open="'+esc(m.id)+'" title="'+esc(oneLine(m.title))+'">'+esc(oneLine(m.title)||'(제목 없음)')+'</a>').join('')+'</div></div>';
 }).join('')+(rows.length?'':'<div class="none">등록된 계약서가 없습니다.</div>')+'<div class="ft"></div></div></div></div>';
}
const schContractStyle=document.createElement('style');schContractStyle.textContent=`
.contract-section .contract-scroll{margin-top:34px;overflow-x:auto}
svg.pict:has(> use[href="#pic-contract"]){transform:scaleX(-1)}
svg.pict > use[href="#pic-contract"]{stroke:currentColor!important;stroke-width:.85;stroke-linejoin:round}
.contract-table .hd,.contract-table .rw{grid-template-columns:minmax(200px,1fr) 130px 90px 85px 180px minmax(190px,1fr)!important}
.contract-table{min-width:950px}.contract-table .rw{min-height:48px;height:auto}.contract-table .who,.contract-meetings{display:flex;flex-wrap:wrap;gap:6px}
.contract-meetings a{cursor:pointer;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
html.mob .contract-section .contract-scroll{max-width:calc(100vw - 32px)}
`;document.head.appendChild(schContractStyle);
