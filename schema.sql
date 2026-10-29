-- =====================================================================
-- Student Project Finder & Originality Checker
-- Normalized MySQL Database Schema
-- =====================================================================

CREATE DATABASE IF NOT EXISTS student_project_finder
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE student_project_finder;

-- 1. Users Table (Student and Admin Only)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Student Profiles Table
CREATE TABLE IF NOT EXISTS student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    semester INT NOT NULL DEFAULT 1,
    section VARCHAR(50) DEFAULT '',
    bio TEXT,
    interests TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Student Skills Table (Normalized individual skill records)
CREATE TABLE IF NOT EXISTS student_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_skill (user_id, skill_name),
    INDEX idx_skill_name (skill_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    domain VARCHAR(100) NOT NULL,
    max_members INT NOT NULL DEFAULT 4,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project_status (status),
    INDEX idx_project_domain (domain),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Project Required Skills Table (Normalized individual requirements)
CREATE TABLE IF NOT EXISTS project_required_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_project_skill (project_id, skill_name),
    INDEX idx_req_skill (skill_name),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Team Members Table (Owner counts as 1 member)
CREATE TABLE IF NOT EXISTS team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    student_id INT NOT NULL,
    role ENUM('owner', 'member') NOT NULL DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_project_member (project_id, student_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Invitations Table
CREATE TABLE IF NOT EXISTS invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    message TEXT,
    status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME NULL,
    INDEX idx_inv_recipient (recipient_id, status),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user (user_id, is_read),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INT NULL,
    status ENUM('to_do', 'in_progress', 'completed') NOT NULL DEFAULT 'to_do',
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_task_project (project_id),
    INDEX idx_task_assigned (assigned_to),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Project Applications Table
CREATE TABLE IF NOT EXISTS project_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    applicant_id INT NOT NULL,
    owner_id INT NOT NULL,
    message TEXT,
    status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME NULL,
    INDEX idx_app_project (project_id),
    INDEX idx_app_owner (owner_id, status),
    INDEX idx_app_applicant (applicant_id, status),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 11. Project Originality Checks Table (Automatic & Manual similarity runs)
CREATE TABLE IF NOT EXISTS project_originality_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    checked_by INT NOT NULL,
    trigger_event VARCHAR(50) NOT NULL DEFAULT 'team_formed',
    compared_count INT NOT NULL DEFAULT 0,
    highest_similarity FLOAT NOT NULL DEFAULT 0.0,
    closest_project_id INT NULL,
    closest_project_title VARCHAR(255) NULL,
    similarity_category VARCHAR(50) NOT NULL DEFAULT 'Low Similarity',
    results_json TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_orig_project (project_id),
    INDEX idx_orig_event (trigger_event),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (closest_project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
