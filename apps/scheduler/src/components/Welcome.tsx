import { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CalendarDays, ChartNoAxesGantt, FileSpreadsheet, GitBranch, HardDrive, LoaderCircle } from 'lucide-react';
import { importFile } from '../core/files';
import type { Workspace } from '../core/types';

export function Welcome({ onOpen }: { onOpen: (workspace: Workspace) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const open = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); setError('');
    try { await onOpen(await importFile(file)); }
    catch (e) { setError(e instanceof Error ? e.message : '파일을 열지 못했습니다. 파일 형식을 확인해주세요.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return <div className="welcome-shell">
    <header className="welcome-header"><div className="brand"><div className="brand-symbol"><i /><i /><i /></div><div><strong>SUNJIN<span> Schedule</span></strong><small>AIDC PROJECT MANAGEMENT</small></div></div><span className="welcome-edition">독립 일정 작업공간 <span>v0.4</span></span></header>
    <main className="welcome-main">
      <section className="welcome-intro"><div className="eyebrow">EVERY MILESTONE, CONNECTED</div><h1>프로젝트의 흐름을,<br /><em>하나의 일정으로.</em></h1><p>업무와 선후행 관계, 조달과 승인게이트까지.<br />엑셀의 계획을 살아 있는 일정으로 연결하세요.</p><div className="welcome-features"><span><ChartNoAxesGantt size={16} />간트 차트</span><span><CalendarDays size={16} />캘린더</span><span><GitBranch size={16} />지연 시뮬레이션</span></div></section>
      <section className="welcome-import" aria-labelledby="welcome-title"><div className="welcome-file-icon"><FileSpreadsheet size={28} strokeWidth={1.5} /></div><div className="eyebrow">START YOUR WORKSPACE</div><h2 id="welcome-title">내 일정 파일로 시작하기</h2><p>판교 AIDC 마스터스케줄 엑셀 또는<br />이 앱에서 내보낸 백업을 열어주세요.</p><button className="button primary welcome-open" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle size={17} className="spin" /> : <FileSpreadsheet size={17} />}{busy ? '파일 검증 및 일정 계산 중' : '엑셀 · 백업 파일 열기'}{!busy && <ArrowRight size={16} />}</button><input ref={input} className="sr-only" type="file" aria-label="시작할 일정 파일 선택" accept=".xlsx,.json" disabled={busy} onChange={e => open(e.target.files?.[0])} /><span className="welcome-formats">XLSX · 일정 원본 JSON · 작업공간 백업 JSON</span>{error && <div className="welcome-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}<div className="welcome-local"><HardDrive size={17} /><p>파일은 서버로 전송하지 않습니다.<br /><span>이 브라우저에서 계산하고 이 기기에 저장합니다.</span></p></div></section>
    </main>
    <footer className="welcome-footer"><span>SUNJIN · PROJECT INTELLIGENCE</span><p>저장한 작업공간은 다음 방문에 이어서 열립니다.</p></footer>
  </div>;
}
