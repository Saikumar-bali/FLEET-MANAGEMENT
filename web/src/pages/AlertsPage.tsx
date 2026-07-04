import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { getMyNotifications, type NotificationItem } from '../services/notifications';
import './AlertsPage.css';

const REFRESH_MS = 12000;
type AlertFilter = 'all' | 'unread';

function relativeTime(value?: string) {
  if (!value) return 'Just now';
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 60_000) return 'Just now';
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), 'hour');
  return rtf.format(Math.round(diffMs / 86_400_000), 'day');
}

function severityClass(severity?: string) {
  const value = (severity || 'INFO').toLowerCase();
  if (value.includes('error') || value.includes('critical') || value.includes('danger')) return 'alert-tone-danger';
  if (value.includes('warn')) return 'alert-tone-warning';
  if (value.includes('success')) return 'alert-tone-success';
  return 'alert-tone-info';
}

async function ackOne(token: string, id: string) {
  const endpoint = ['/me/notifications/', id, '/ack'].join('');
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Failed to mark alert as read');
}

async function ackAll(token: string) {
  const endpoint = ['/me/notifications-', 'ack-all'].join('');
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Failed to mark alerts as read');
}

export function AlertsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!auth.accessToken) return;
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const response = await getMyNotifications(auth.accessToken);
      setItems(response.data.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!auth.accessToken) return;
    const timer = window.setInterval(() => void load(true), REFRESH_MS);
    const onFocus = () => void load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [auth.accessToken, load]);

  const unreadItems = useMemo(() => items.filter((item) => !item.readAt), [items]);
  const visibleItems = filter === 'unread' ? unreadItems : items;
  const latest = items[0]?.createdAt ? relativeTime(items[0].createdAt) : 'No alerts';

  const markOne = async (item: NotificationItem) => {
    if (!auth.accessToken || item.readAt) return;
    await ackOne(auth.accessToken, item.id);
    const now = new Date().toISOString();
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, readAt: now } : candidate));
  };

  const markAll = async () => {
    if (!auth.accessToken || unreadItems.length === 0) return;
    await ackAll(auth.accessToken);
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
  };

  return (
    <section className="alerts-page page-content">
      <div className="alerts-hero card">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Notifications</h1>
          <p className="page-header-copy">Operational alerts, trip events, reminders, and items that need your attention.</p>
        </div>
        <div className="alerts-actions">
          <button type="button" className="secondary-button" onClick={() => void load(true)} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh'}</button>
          <button type="button" className="primary-button" onClick={() => void markAll()} disabled={unreadItems.length === 0}>Mark all read</button>
        </div>
      </div>

      <div className="alerts-summary-grid">
        <div className="alerts-summary-card card"><span>Total alerts</span><strong>{items.length}</strong></div>
        <div className="alerts-summary-card card alerts-summary-unread"><span>Unread</span><strong>{unreadItems.length}</strong></div>
        <div className="alerts-summary-card card"><span>Latest update</span><strong>{latest}</strong></div>
      </div>

      <div className="alerts-panel card">
        <div className="alerts-toolbar">
          <div>
            <h2>Alert inbox</h2>
            <p>{unreadItems.length > 0 ? `${unreadItems.length} unread alert${unreadItems.length === 1 ? '' : 's'} need attention.` : 'You are all caught up.'}</p>
          </div>
          <div className="alerts-tabs" role="tablist" aria-label="Alert filters">
            <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Unread</button>
          </div>
        </div>

        {error && <div className="alerts-error">{error}</div>}
        {loading && <div className="alerts-empty">Loading alerts...</div>}
        {!loading && visibleItems.length === 0 && (
          <div className="alerts-empty">
            <div className="alerts-empty-icon">✓</div>
            <h3>{filter === 'unread' ? 'No unread alerts' : 'No alerts yet'}</h3>
            <p>{filter === 'unread' ? 'Everything has been read.' : 'New operational notifications will appear here.'}</p>
          </div>
        )}
        {!loading && visibleItems.length > 0 && (
          <div className="alerts-list">
            {visibleItems.map((item) => {
              const unread = !item.readAt;
              return (
                <article key={item.id} className={`alert-card ${unread ? 'alert-card-unread' : ''}`}>
                  <div className="alert-status-dot" />
                  <div className="alert-main">
                    <div className="alert-title-row">
                      <h3>{item.title}</h3>
                      <span className={`alert-badge ${severityClass(item.severity)}`}>{item.severity || 'INFO'}</span>
                    </div>
                    <p>{item.message}</p>
                    <div className="alert-meta-row">
                      <span>{item.category || 'SYSTEM'}</span><span>•</span><span>{relativeTime(item.createdAt)}</span>{unread && <span className="alert-new-pill">New</span>}
                    </div>
                  </div>
                  <div className="alert-card-actions">
                    {item.actionUrl && <button type="button" className="secondary-button" onClick={() => { window.location.href = item.actionUrl || '/alerts'; }}>Open</button>}
                    {unread && <button type="button" className="ghost-button" onClick={() => void markOne(item)}>Mark read</button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
