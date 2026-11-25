import JSZip from 'jszip';
export async function read(file){
 if(file.size>10*1024*1024)throw Error('10MB 이하의 문서를 선택해주세요.');
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const slides=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>+a.match(/slide(\d+)/)[1]-+b.match(/slide(\d+)/)[1]);
 if(!slides.length)throw Error('PPTX 슬라이드를 찾지 못했습니다. PDF로 변환해주세요.');
 if(slides.length>150)throw Error('150장 이하로 나누어 올려주세요.');
 // Slide order follows presentation relationships, rather than file numbering.
 const readXml=async n=>{const entry=zip.file(n);if(!entry)return null;if(entry._data?.uncompressedSize>4*1024*1024)throw Error('슬라이드 데이터가 너무 큽니다. PDF로 변환해주세요.');const s=await entry.async('string');if(s.length>4*1024*1024)throw Error('슬라이드 데이터가 너무 큽니다.');const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('PPTX 내용을 읽지 못했습니다.');return d;};
 const p=await readXml('ppt/presentation.xml'), rel=await readXml('ppt/_rels/presentation.xml.rels');
 const map=new Map([...(rel?.getElementsByTagName('Relationship')||[])].map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
 const ordered=[...(p?.getElementsByTagNameNS('*','sldId')||[])].map(n=>{const target=map.get(n.getAttribute('r:id'));return target?(target.startsWith('/')?target.slice(1):'ppt/'+target.replace(/^\.\//,'')):'';}).filter(n=>slides.includes(n));
 if(ordered.length!==slides.length)throw Error('슬라이드 순서를 확인하지 못했습니다. PDF로 변환해주세요.');
 const out=[];let images=0;
 for(let i=0;i<ordered.length;i++){const d=await readXml(ordered[i]);images+=d.getElementsByTagNameNS('*','pic').length+d.getElementsByTagNameNS('*','chart').length;
  const ps=[...d.getElementsByTagNameNS('*','p')].map(p=>[...p.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('')).filter(Boolean);
  out.push('[슬라이드 '+(i+1)+']\n'+(ps.join('\n')||'(텍스트 없음)'));
 }
 const text=out.join('\n\n');if(text.length>160000)throw Error('문서가 너무 깁니다. 파일을 나누어주세요.');
 if(!out.some(x=>!x.endsWith('(텍스트 없음)')))throw Error('텍스트가 없는 PPTX입니다. PDF로 변환해 올리면 이미지도 분석할 수 있습니다.');
 return {kind:'text',name:file.name,text,notice:'PPTX는 텍스트를 분석합니다. 그림·도표·배치까지 분석하려면 PDF로 저장해 올려주세요.'+(images?' (이미지/차트 '+images+'개 감지)':'')};
}
window.AIDCAIDocuments={read};
