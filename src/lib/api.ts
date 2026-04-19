/**
 * On-premise API client — replaces Supabase client.
 * All calls go to the PHP backend at /php-api/.
 */

const BASE = import.meta.env.VITE_API_BASE || '/php-api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include', // send PHP session cookie
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// ============================================================
// Auth
// ============================================================
export const auth = {
  login: (username: string, password: string) =>
    request<{ user: any }>('/auth/login.php', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request<{ ok: boolean }>('/auth/logout.php', { method: 'POST' }),

  session: () =>
    request<{ user: any | null }>('/auth/session.php'),

  register: (data: { username: string; password: string; name: string; role?: string; email?: string }) =>
    request<{ uid: string }>('/auth/register.php', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// Rooms
// ============================================================
export const rooms = {
  list: (limit?: number) =>
    request<any[]>(`/rooms.php${limit ? `?limit=${limit}` : ''}`),

  create: (room: { name: string; capacity: number; description: string; image_url: string }) =>
    request<{ id: string }>('/rooms.php', {
      method: 'POST',
      body: JSON.stringify(room),
    }),

  remove: (id: string) =>
    request<{ ok: boolean }>(`/rooms.php?id=${id}`, { method: 'DELETE' }),
};

// ============================================================
// Bookings
// ============================================================
export const bookings = {
  list: () =>
    request<any[]>('/bookings.php'),

  create: (booking: {
    room_id: string;
    user_name: string;
    room_name: string;
    start_time: string;
    end_time: string;
    purpose: string;
  }) =>
    request<{ id: string }>('/bookings.php', {
      method: 'POST',
      body: JSON.stringify(booking),
    }),

  updateStatus: (id: string, status: 'approved' | 'rejected') =>
    request<{ ok: boolean }>(`/bookings.php?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  remove: (id: string) =>
    request<{ ok: boolean }>(`/bookings.php?id=${id}`, { method: 'DELETE' }),
};

// ============================================================
// Media
// ============================================================
export const media = {
  list: (category?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return request<any[]>(`/media.php${qs ? `?${qs}` : ''}`);
  },

  create: (item: { title: string; type: string; url: string; description: string; category: string }) =>
    request<{ id: string }>('/media.php', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  remove: (id: string) =>
    request<{ ok: boolean }>(`/media.php?id=${id}`, { method: 'DELETE' }),
};

// ============================================================
// Attendance
// ============================================================
export const attendance = {
  list: (filters?: { session_id?: string; user_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.session_id) params.set('session_id', filters.session_id);
    if (filters?.user_id) params.set('user_id', filters.user_id);
    const qs = params.toString();
    return request<any[]>(`/attendance.php${qs ? `?${qs}` : ''}`);
  },

  create: (record: {
    date: string;
    user_name: string;
    last_four_digits: string;
    status: string;
    session_id?: string | null;
  }) =>
    request<{ id: string }>('/attendance.php', {
      method: 'POST',
      body: JSON.stringify(record),
    }),

  kioskCheckin: (data: { session_id: string; last_four_digits: string; name: string }) =>
    request<{ id: string }>('/attendance.php', {
      method: 'POST',
      body: JSON.stringify({ ...data, kiosk_checkin: true }),
    }),
};

// ============================================================
// Worksheet
// ============================================================
export const worksheet = {
  list: () =>
    request<any[]>('/worksheet.php'),

  lookup: (lastFour: string) =>
    request<any[]>(`/worksheet.php?last_four_digits=${lastFour}`),

  create: (entries: Array<{ name: string; last_four_digits: string; department?: string }> | { name: string; last_four_digits: string; department?: string }) =>
    request<{ ids: string[]; count: number }>('/worksheet.php', {
      method: 'POST',
      body: JSON.stringify(entries),
    }),

  remove: (id: string) =>
    request<{ ok: boolean }>(`/worksheet.php?id=${id}`, { method: 'DELETE' }),
};

// ============================================================
// Users
// ============================================================
export const users = {
  list: () =>
    request<any[]>('/users.php'),

  updateRole: (uid: string, role: string) =>
    request<{ ok: boolean }>(`/users.php?uid=${uid}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  remove: (uid: string) =>
    request<{ ok: boolean }>(`/users.php?uid=${uid}`, { method: 'DELETE' }),
};

// ============================================================
// Sessions (roll call)
// ============================================================
export const sessions = {
  getActive: () =>
    request<any[]>('/sessions.php'),

  start: (name: string) =>
    request<{ id: string }>('/sessions.php', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  stop: (id: string) =>
    request<{ ok: boolean }>(`/sessions.php?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    }),
};

// ============================================================
// Gemini AI (optional)
// ============================================================
export const gemini = {
  guidance: () =>
    request<{ text: string }>('/gemini.php', { method: 'POST' }),
};

// ============================================================
// Polling helper — replaces Supabase Realtime
// ============================================================
export function poll(fn: () => void, intervalMs: number = 5000): () => void {
  fn(); // initial fetch
  const id = setInterval(fn, intervalMs);
  return () => clearInterval(id);
}
