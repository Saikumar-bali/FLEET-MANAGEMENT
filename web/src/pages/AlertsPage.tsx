import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyNotifications, type NotificationItem } from '../services/notifications';

export function AlertsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    async function load() {
      if (!auth.accessToken) return;
      const response = await getMyNotifications(auth.accessToken);
      setItems(response.data.items || []);
    }
    void load();
  }, [auth.accessToken]);

  return (
    <div className="page-shell">
      <div className="page-header-row">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Alerts</h1>
          <p className="page-subtitle">In-app alerts and reminder notices.</p>
        </div>
      </div>
      {items.length === 0 && <div className="surface-card">No alerts yet.</div>}
      {items.map((item) => (
        <div key={item.id} className="surface-card" style={{ marginBottom: 12 }}>
          <h3>{item.title}</h3>
          <p>{item.message}</p>
        </div>
      ))}
    </div>
  );
}
