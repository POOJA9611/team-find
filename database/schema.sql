-- ===================================================================
-- SMART REAL-TIME PROJECT TEAM FINDER SYSTEM - MySQL Schema
-- ===================================================================

CREATE DATABASE IF NOT EXISTS college_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE college_portal;

-- Disable foreign key checks during creation to allow clean ordering
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('hod', 'faculty', 'student') NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(500) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Student profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id INT PRIMARY KEY,
  reg_no VARCHAR(100) NOT NULL,
  department VARCHAR(255) NOT NULL,
  semester INT NOT NULL,
  cgpa DECIMAL(4, 2) NOT NULL,
  bio TEXT DEFAULT NULL,
  strength ENUM('frontend', 'backend', 'fullstack') NOT NULL,
  languages TEXT NOT NULL,
  linkedin_url VARCHAR(500) DEFAULT NULL,
  github_url VARCHAR(500) DEFAULT NULL,
  faculty_id INT NULL DEFAULT NULL,
  username VARCHAR(100) DEFAULT NULL,
  location VARCHAR(255) DEFAULT NULL,
  website_url VARCHAR(500) DEFAULT NULL,
  headline VARCHAR(255) DEFAULT NULL,
  technical_skills TEXT DEFAULT NULL,
  frameworks TEXT DEFAULT NULL,
  experience_level VARCHAR(50) DEFAULT 'Intermediate',
  college VARCHAR(255) DEFAULT 'Department of Computer Science & Engineering',
  education TEXT DEFAULT NULL,
  interests TEXT DEFAULT NULL,
  achievements TEXT DEFAULT NULL,
  availability_status VARCHAR(50) DEFAULT 'available',
  INDEX idx_student_faculty (faculty_id),
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_faculty FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Faculty profiles
CREATE TABLE IF NOT EXISTS faculty_profiles (
  user_id INT PRIMARY KEY,
  designation VARCHAR(150) NOT NULL,
  department VARCHAR(255) NOT NULL,
  bio TEXT DEFAULT NULL,
  subjects TEXT NOT NULL,
  languages TEXT NOT NULL,
  linkedin_url VARCHAR(500) DEFAULT NULL,
  CONSTRAINT fk_faculty_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Teams
CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  faculty_id INT NULL DEFAULT NULL,
  leader_id INT NULL DEFAULT NULL,
  created_by INT NOT NULL,
  project_title VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  domain VARCHAR(150) DEFAULT NULL,
  technologies TEXT DEFAULT NULL,
  required_skills TEXT DEFAULT NULL,
  max_members INT DEFAULT 4,
  objectives TEXT DEFAULT NULL,
  target_date VARCHAR(50) DEFAULT NULL,
  status ENUM('pending_approval', 'modification_requested', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  hod_remarks TEXT DEFAULT NULL,
  is_accepting_members TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_teams_faculty (faculty_id),
  INDEX idx_teams_leader (leader_id),
  CONSTRAINT fk_team_faculty FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_team_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Team members
CREATE TABLE IF NOT EXISTS team_members (
  team_id INT NOT NULL,
  student_id INT NOT NULL,
  role ENUM('leader', 'member') DEFAULT 'member',
  role_title VARCHAR(150) DEFAULT NULL,
  responsibilities TEXT DEFAULT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, student_id),
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Team join requests
CREATE TABLE IF NOT EXISTS team_join_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  student_id INT NOT NULL,
  message TEXT DEFAULT NULL,
  status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL DEFAULT NULL,
  INDEX idx_tjr_team (team_id),
  INDEX idx_tjr_student (student_id),
  CONSTRAINT fk_tjr_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tjr_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6b. Team tasks (My Teams Workspace)
CREATE TABLE IF NOT EXISTS team_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  assigned_to INT NULL DEFAULT NULL,
  deadline DATE NULL DEFAULT NULL,
  status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tasks_team (team_id),
  INDEX idx_tasks_assigned (assigned_to),
  CONSTRAINT fk_task_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Projects
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  status ENUM('ongoing', 'completed') NOT NULL DEFAULT 'ongoing',
  team_id INT NULL DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_projects_team (team_id),
  CONSTRAINT fk_project_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Project members
CREATE TABLE IF NOT EXISTS project_members (
  project_id INT NOT NULL,
  student_id INT NOT NULL,
  PRIMARY KEY (project_id, student_id),
  CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Faculty assignments history
CREATE TABLE IF NOT EXISTS faculty_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  faculty_id INT NOT NULL,
  assigned_by INT NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  note TEXT DEFAULT NULL,
  INDEX idx_fa_student (student_id),
  INDEX idx_fa_faculty (faculty_id),
  CONSTRAINT fk_fa_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fa_faculty FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fa_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Change requests
CREATE TABLE IF NOT EXISTS change_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  current_faculty_id INT NOT NULL,
  requested_faculty_id INT NULL DEFAULT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  hod_remark TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL DEFAULT NULL,
  INDEX idx_cr_student (student_id),
  INDEX idx_cr_current_fac (current_faculty_id),
  CONSTRAINT fk_cr_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cr_curr_faculty FOREIGN KEY (current_faculty_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cr_req_faculty FOREIGN KEY (requested_faculty_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  audience ENUM('students', 'faculty', 'both', 'user') NOT NULL,
  posted_by INT NOT NULL,
  target_user_id INT NULL DEFAULT NULL,
  deadline DATETIME NULL DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_target (target_user_id),
  INDEX idx_notif_audience (audience),
  CONSTRAINT fk_notif_posted_by FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Notification reads
CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  CONSTRAINT fk_nr_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_nr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Chat groups
CREATE TABLE IF NOT EXISTS chat_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  team_id INT NULL DEFAULT NULL,
  faculty_id INT NULL DEFAULT NULL,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cg_team (team_id),
  INDEX idx_cg_faculty (faculty_id),
  CONSTRAINT fk_cg_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cg_faculty FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cg_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Chat group members
CREATE TABLE IF NOT EXISTS chat_group_members (
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id),
  INDEX idx_cgm_user (user_id),
  CONSTRAINT fk_cgm_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_cgm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Messages
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  sender_id INT NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_group (group_id),
  INDEX idx_messages_sender (sender_id),
  CONSTRAINT fk_msg_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
