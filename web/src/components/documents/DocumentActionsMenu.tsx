import { useState, useRef, useEffect, useCallback } from 'react';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  document: DocumentRecord;
  onView: (doc: DocumentRecord) => void;
  onDownload: (doc: DocumentRecord) => void;
  onArchive?: (doc: DocumentRecord) => void;
  onDelete?: (doc: DocumentRecord) => void;
  onVerify?: (doc: DocumentRecord, status: string) => void;
  canArchive?: boolean;
  canDelete?: boolean;
  canVerify?: boolean;
};

export function DocumentActionsMenu({ document: doc, onView, onDownload, onArchive, onDelete, onVerify, canArchive, canDelete, canVerify }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const calcPos = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const menuHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight;
    setPos({
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handler);
      calcPos();
      window.addEventListener('resize', calcPos);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', calcPos);
    };
  }, [open, calcPos]);

  return (
    <div className="doc-action-menu" ref={ref}>
      <button className="doc-action-menu-trigger" onClick={() => setOpen(!open)} aria-label="Actions">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="doc-action-menu-dropdown" style={{ position: 'fixed', top: pos.top, right: pos.right }}>
          <button className="doc-action-menu-item" onClick={() => { setOpen(false); onView(doc); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </button>
          <button className="doc-action-menu-item" onClick={() => { setOpen(false); onDownload(doc); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Download
          </button>
          {canVerify && doc.verificationStatus !== 'VERIFIED' && (
            <button className="doc-action-menu-item doc-action-verify" onClick={() => { setOpen(false); onVerify?.(doc, 'VERIFIED'); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              Verify
            </button>
          )}
          {canArchive && doc.documentStatus === 'ACTIVE' && (
            <button className="doc-action-menu-item doc-action-archive" onClick={() => { setOpen(false); onArchive?.(doc); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>
              Archive
            </button>
          )}
          {canDelete && (
            <button className="doc-action-menu-item doc-action-delete" onClick={() => { setOpen(false); onDelete?.(doc); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
