type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="centered-state">
      <div>
        <div className="error-banner">{message}</div>
        {onRetry ? (
          <button type="button" className="secondary-button" onClick={onRetry} style={{ marginTop: '1rem' }}>
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
