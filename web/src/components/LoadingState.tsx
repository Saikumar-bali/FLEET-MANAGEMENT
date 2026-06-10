export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return <div className="centered-state">{message}</div>;
}
