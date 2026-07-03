export async function listNotifications(_userId: string) {
  return { items: [] };
}

export async function unreadCount(_userId: string) {
  return { unreadCount: 0 };
}

export async function markRead(_userId: string, id: string) {
  return { id, read: true };
}

export async function markAllRead(_userId: string) {
  return { updated: 0 };
}
