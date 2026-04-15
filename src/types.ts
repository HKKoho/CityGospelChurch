export type UserRole = 'admin' | 'congregation' | 'public';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  last_four_digits?: string;
  phone?: string;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  description: string;
  image_url: string;
}

export interface Booking {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  room_name: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected';
  purpose: string;
  created_at: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  description: string;
  category: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  user_id: string;
  user_name: string;
  last_four_digits: string;
  status: 'present' | 'absent';
  created_at: string;
}

export interface WorksheetEntry {
  id: string;
  last_four_digits: string;
  name: string;
  user_id?: string;
}
