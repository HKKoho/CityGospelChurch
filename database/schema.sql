-- Ecclesia Manager: MySQL Schema (On-Premise)
-- For deployment on shared hosting with PHP + MySQL

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================
-- TABLES
-- ============================================================

-- Users (standalone auth, no Supabase dependency)
CREATE TABLE IF NOT EXISTS users (
  uid VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL DEFAULT '',
  role ENUM('admin', 'congregation', 'public') NOT NULL DEFAULT 'public',
  last_four_digits CHAR(4) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capacity INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  room_name VARCHAR(255) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  purpose TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Media
CREATE TABLE IF NOT EXISTS media (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type ENUM('video', 'audio', 'image') NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(36) PRIMARY KEY,
  date DATE NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  last_four_digits CHAR(4) NOT NULL,
  status ENUM('present', 'absent') NOT NULL DEFAULT 'present',
  session_id VARCHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Worksheet (4-digit code to name mapping for roll call)
CREATE TABLE IF NOT EXISTS worksheet (
  id VARCHAR(36) PRIMARY KEY,
  last_four_digits CHAR(4) NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100) DEFAULT NULL,
  user_id VARCHAR(36) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions (roll call sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL DEFAULT (CURRENT_DATE),
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_by VARCHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_session_id ON attendance(session_id);
CREATE INDEX idx_worksheet_last_four ON worksheet(last_four_digits);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

-- ============================================================
-- DEFAULT ADMIN ACCOUNT
-- Password: admin123 (change immediately after first login)
-- ============================================================
INSERT INTO users (uid, username, password_hash, name, email, role) VALUES (
  'admin-default-001',
  'admin',
  '$2y$10$default_hash_replace_on_first_run',
  'Administrator',
  'admin@church.local',
  'admin'
);
