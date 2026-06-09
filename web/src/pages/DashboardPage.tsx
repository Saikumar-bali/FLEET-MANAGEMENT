import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const auth = useAuth();
  const [healthLabel, setHealthLabel] = useState('Checking backend health...');

  useEffect(() => {
    const run = async () => {
      try {
        const response = await getHealth();
        setHealthLabel(`API ${response.data.status}, database ${response.data.database}`);
      } catch {
        setHealthLabel('Backend health check is currently unavailable.');
      }
    };

    void run();
  }, []);

  return (
    <section className="page-grid">
      <article className="card hero-card">
        <p className="eyebrow">Current user</p>
        <h3>{auth.user?.name}</h3>
        <p>{auth.user?.email}</p>
        <p>{auth.user?.role.name}</p>
      </article>

      <article className="card stat-card">
        <p className="eyebrow">Permission count</p>
        <strong>{auth.permissions.length}</strong>
      </article>

      <article className="card stat-card">
        <p className="eyebrow">Auth status</p>
        <strong>{auth.accessToken ? 'Authenticated' : 'Signed out'}</strong>
      </article>

      <article className="card wide-card">
        <p className="eyebrow">Backend status</p>
        <strong>{healthLabel}</strong>
      </article>
    </section>
  );
}
