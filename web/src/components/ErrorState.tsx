type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="state-panel">
      <div>
        <h3>Something needs attention</h3>
        <div className="error-banner">{message}</div>
        {onRetry ? (
          <button type="button" className="secondary-button" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
