import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyNotificationCount, getMyNotifications, type NotificationItem } from '../../services/notifications';

export function NotificationBell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);

  async function refresh() {
    if (!auth.accessToken) return;
    const list = await getMyNotifications(auth.accessToken);
    const unread = await getMyNotificationCount(auth.accessToken);
    setItems(list.data.items || []);
    setCount(unread.data.unreadCount || 0);
  }

  useEffect(() => {
    void refresh();
  }, [auth.accessToken]);

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="btn-secondary" data-testid="alerts-bell" onClick={() => { setOpen(!open); void refresh(); }}>
        Alerts {count > 0 ? `(${count})` : ''}
      </button>
      {open && (
        <div data-testid="notification-drawer" style={{ position: 'absolute', right: 0, top: 40, width: 300, padding: 12, border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)', zIndex: 50 }}>
          <strong>Notifications</strong>
          {items.length === 0 && <p>No notifications yet.</p>}
          {items.map((item) => (
            <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700 }}>{item.title}</div>
              <div style={{ fontSize: 12 }}>{item.message}</div>
            </div>
          ))}
          <button type="button" className="btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate('/alerts')}>
            View all alerts
          </button>
        </div>
      )}
    </div>
  );
}
