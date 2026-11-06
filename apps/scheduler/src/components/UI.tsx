import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, LoaderCircle } from 'lucide-react';

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const id = useId(), ref = useRef<HTMLDivElement>(null), closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>('input,select,button,textarea')?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopImmediatePropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, textarea, a[href], [tabindex="0"]') || []);
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
        if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener('keydown', listener, true);
    return () => { document.removeEventListener('keydown', listener, true); previous?.focus?.(); };
  }, []);
  return createPortal(<div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} className={'modal ' + (wide ? 'modal-wide' : '')} role="dialog" aria-modal="true" aria-labelledby={id}>
      <div className="modal-header"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="창 닫기" onClick={onClose}><X size={18} /></button></div>
      {children}
    </div>
  </div>, document.body);
}
export function Badge({ children, kind = 'muted' }: { children: ReactNode; kind?: string }) {
  return <span className={'badge badge-' + kind}>{children}</span>;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><span className="empty-mark">↗</span><h3>{title}</h3>{children && <p>{children}</p>}</div>;
}
export function Loading({ text = '일정을 불러오고 있습니다' }: { text?: string }) {
  return <div className="loading"><LoaderCircle className="spin" size={22} /><p>{text}</p></div>;
}
export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="form-error" role="alert"><AlertTriangle size={15} />{children}</p>;
}
