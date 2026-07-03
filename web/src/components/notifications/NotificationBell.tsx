import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyNotificationCount, getMyNotifications, markAllNotificationsRead, markNotificationRead, type NotificationItem } from '../../services/notifications';

export function NotificationBell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);

  async function refresh() {
    if (!auth.accessToken) return;
    const [list, unread] = await Promise.all([
      getMyNotifications(auth.accessToken),
      getMyNotificationCount(auth.accessToken),
    ]);
    setItems(list.data.items || []);
    setCount(unread.data.unreadCount || 0);
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    return () => window.clearInterval(timer);
  }, [auth.accessToken]);

  async function openItem(item: NotificationItem) {
    if (!auth.accessToken) return;
    await markNotificationRead(auth.accessToken, item.id);
    await refresh();
    if (item.actionUrl) navigate(item.actionUrl);
  }

  async function markAll() {
    if (!auth.accessToken) return;
    await markAllNotificationsRead(auth.accessToken);
    await refresh();
  }

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="sidebar-icon-bar-button" title="Notifications" onClick={() => { setOpen((value) => !value); void refresh(); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 999, background: 'var(--color-danger)', color: 'white', fontSize: 10, display: 'grid', placeItems: 'center' }}>{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', bottom: 42, left: 0, width: 320, maxHeight: 420, overflow: 'auto', padding: 12, border: '1px solid var(--color-border)', borderRadius: 16, background: 'var(--color-surface)', boxShadow: '0 20px 50px rgba(0,0,0,.18)', zIndex: 50 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <strong>Notifications</strong>
            <button type="button" className="btn-ghost" onClick={markAll}>Mark all read</button>
          </div>
          {items.length === 0 && <p style={{ color: 'var(--color-text-tertiary)' }}>No notifications yet.</p>}
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => void openItem(item)} style={{ width: '100%', textAlign: 'left', padding: '10px 8px', border: 0, borderBottom: '1px solid var(--color-border)', background: item.readAt ? 'transparent' : 'rgba(59,130,246,.08)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.message}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>{item.category} • {item.severity}</div>
            </button>
          ))}
          <button type="button" className="btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate('/notifications')}>View all</button>
        </div>
      )}
    </div>
  );
}
