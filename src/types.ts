export type UserRole = 'admin' | 'congregation' | 'public';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  lastFourDigits?: string;
  phone?: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  description: string;
  imageUrl: string;
}

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  roomName: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'rejected';
  purpose: string;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  description: string;
  category: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  userId: string;
  userName: string;
  lastFourDigits: string;
  status: 'present' | 'absent';
  createdAt: string;
}

export interface WorksheetEntry {
  id: string;
  lastFourDigits: string;
  name: string;
  userId?: string;
}
