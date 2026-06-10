export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="state-panel">
      <div>
        <h3>Loading</h3>
        <p>{message}</p>
      </div>
    </div>
  );
}
