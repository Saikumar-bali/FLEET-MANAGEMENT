export function AccountNotLinkedPage() {
  return (
    <div className="centered-state" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚛</div>
      <h2>Account Not Linked</h2>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '1rem auto' }}>
        Your login is not linked to a driver profile. Please contact your administrator to set up account linking.
      </p>
    </div>
  );
}
