import { useToast, type Toast } from '../../context/ToastContext';

const toastIcons: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t: Toast) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          role="alert"
          onClick={() => dismissToast(t.id)}
        >
          <span className="toast-icon">{toastIcons[t.type]}</span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => dismissToast(t.id)} type="button">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
