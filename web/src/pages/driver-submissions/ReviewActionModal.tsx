import { useState } from 'react';

type Props = {
  open: boolean;
  title: string;
  actionLabel: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

export function ReviewActionModal({ open, title, actionLabel, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ background: 'var(--color-bg-surface)', borderRadius: '8px', padding: '1.5rem', width: '90%', maxWidth: '480px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem' }}>{title}</h3>
        <div className="form-group">
          <label htmlFor="review-reason">Reason / Comments (optional)</label>
          <textarea
            id="review-reason"
            className="form-input"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Enter reason or comments..."
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-button" onClick={() => { onSubmit(reason); setReason(''); }}>{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}
