import os
import re
import sqlite3
from contextlib import contextmanager
import pymysql
from pymysql.cursors import DictCursor
from config import Config

class TransactionContext:
    def __init__(self, cur, is_mysql, adapt_query_func):
        self.cur = cur
        self.is_mysql = is_mysql
        self.adapt_query = adapt_query_func

    def execute(self, sql, params=None):
        adapted = self.adapt_query(sql)
        self.cur.execute(adapted, params or ())
        return self.cur.lastrowid

    def query_one(self, sql, params=None):
        adapted = self.adapt_query(sql)
        self.cur.execute(adapted, params or ())
        row = self.cur.fetchone()
        if not self.is_mysql and row:
            return dict(row)
        return row

    def query_all(self, sql, params=None):
        adapted = self.adapt_query(sql)
        self.cur.execute(adapted, params or ())
        rows = self.cur.fetchall()
        if not self.is_mysql and rows:
            return [dict(r) for r in rows]
        return rows or []

class DatabaseManager:
    def __init__(self):
        self.is_mysql = False
        self.connection_error = None
        self._test_connection()

    def _test_connection(self):
        try:
            # Step 1: Connect to MySQL server (without specifying DB first to allow auto-creation if needed)
            server_conn = pymysql.connect(
                host=Config.MYSQL_HOST,
                port=Config.MYSQL_PORT,
                user=Config.MYSQL_USER,
                password=Config.MYSQL_PASSWORD,
                cursorclass=DictCursor,
                autocommit=True,
                connect_timeout=3
            )
            with server_conn.cursor() as cur:
                cur.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{Config.MYSQL_DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            server_conn.close()

            # Step 2: Connect directly to the application database
            conn = pymysql.connect(
                host=Config.MYSQL_HOST,
                port=Config.MYSQL_PORT,
                user=Config.MYSQL_USER,
                password=Config.MYSQL_PASSWORD,
                database=Config.MYSQL_DB,
                cursorclass=DictCursor,
                autocommit=True,
                connect_timeout=3
            )
            conn.close()
            self.is_mysql = True
            print(f"[+] Connected to MySQL database '{Config.MYSQL_DB}' on {Config.MYSQL_HOST}:{Config.MYSQL_PORT} successfully.")
            self._ensure_mysql_schema()
        except Exception as e:
            self.is_mysql = False
            self.connection_error = str(e)
            print(f"[*] MySQL Connection Status: Not active on {Config.MYSQL_HOST}:{Config.MYSQL_PORT} ({e}).")
            print(f"[*] Activating local storage fallback ({Config.SQLITE_PATH}) for uninterrupted testing.")
            self._init_sqlite()

    def _ensure_mysql_schema(self):
        """Initializes all MySQL tables from schema.sql and runs incremental migrations."""
        try:
            schema_file = os.path.join(os.path.dirname(__file__), "schema.sql")
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Execute schema.sql if tables are absent
                    if os.path.exists(schema_file):
                        with open(schema_file, "r", encoding="utf-8") as f:
                            sql_content = f.read()
                        statements = [s.strip() for s in sql_content.split(";") if s.strip()]
                        for stmt in statements:
                            if stmt.upper().startswith("CREATE DATABASE") or stmt.upper().startswith("USE "):
                                continue
                            try:
                                cur.execute(stmt)
                            except Exception:
                                pass

                    # 2. Incremental column and index migrations for existing databases
                    cur.execute("SHOW TABLES LIKE 'users'")
                    if cur.fetchone():
                        cur.execute("SHOW COLUMNS FROM users LIKE 'register_number'")
                        if not cur.fetchone():
                            cur.execute("ALTER TABLE users ADD COLUMN register_number VARCHAR(100) UNIQUE DEFAULT NULL AFTER email")
                            cur.execute("ALTER TABLE users ADD INDEX idx_user_register_number (register_number)")

                    cur.execute("SHOW TABLES LIKE 'projects'")
                    if cur.fetchone():
                        cur.execute("SHOW COLUMNS FROM projects LIKE 'is_published'")
                        if not cur.fetchone():
                            cur.execute("ALTER TABLE projects ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE")
                            cur.execute("ALTER TABLE projects ADD COLUMN published_at DATETIME NULL")
                            cur.execute("ALTER TABLE projects ADD INDEX idx_project_published (is_published)")

                    cur.execute("SHOW TABLES LIKE 'tasks'")
                    if cur.fetchone():
                        cur.execute("SHOW COLUMNS FROM tasks LIKE 'priority'")
                        if not cur.fetchone():
                            cur.execute("ALTER TABLE tasks ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'medium'")
                        cur.execute("SHOW COLUMNS FROM tasks LIKE 'deadline'")
                        if not cur.fetchone():
                            cur.execute("ALTER TABLE tasks ADD COLUMN deadline DATE NULL")

                    cur.execute("SHOW TABLES LIKE 'team_members'")
                    if cur.fetchone():
                        try:
                            cur.execute("ALTER TABLE team_members MODIFY COLUMN role VARCHAR(100) NOT NULL DEFAULT 'Member'")
                        except Exception:
                            pass
                conn.commit()
                print("[+] MySQL database schema verified and synchronized.")
        except Exception as e:
            print(f"[*] MySQL schema check warning: {e}")

    def _init_sqlite(self):
        conn = sqlite3.connect(Config.SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.executescript("""
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            register_number TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT CHECK(role IN ('student', 'admin')) NOT NULL DEFAULT 'student',
            status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS student_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            semester INTEGER NOT NULL DEFAULT 1,
            section TEXT DEFAULT '',
            bio TEXT,
            interests TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS student_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            skill_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, skill_name),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            domain TEXT NOT NULL,
            max_members INTEGER NOT NULL DEFAULT 4,
            status TEXT CHECK(status IN ('open', 'closed')) NOT NULL DEFAULT 'open',
            is_published INTEGER NOT NULL DEFAULT 0,
            published_at DATETIME NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_required_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            skill_name TEXT NOT NULL,
            UNIQUE(project_id, skill_name),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS team_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            role TEXT NOT NULL DEFAULT 'member',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, student_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS invitations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            recipient_id INTEGER NOT NULL,
            message TEXT,
            status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            decided_at DATETIME NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            assigned_to INTEGER NULL,
            status TEXT CHECK(status IN ('to_do', 'in_progress', 'completed')) NOT NULL DEFAULT 'to_do',
            priority TEXT NOT NULL DEFAULT 'medium',
            deadline DATE NULL,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            applicant_id INTEGER NOT NULL,
            owner_id INTEGER NOT NULL,
            message TEXT,
            status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            decided_at DATETIME NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_originality_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            checked_by INTEGER NOT NULL,
            trigger_event TEXT NOT NULL DEFAULT 'manual_check',
            compared_count INTEGER NOT NULL DEFAULT 0,
            highest_similarity REAL NOT NULL DEFAULT 0.0,
            closest_project_id INTEGER NULL,
            closest_project_title TEXT NULL,
            similarity_category TEXT NOT NULL DEFAULT 'Low Similarity',
            results_json TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (closest_project_id) REFERENCES projects(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS originality_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            project_id INTEGER NULL,
            submitted_title TEXT NOT NULL,
            submitted_description TEXT NOT NULL,
            highest_college_similarity INTEGER NOT NULL DEFAULT 0,
            highest_external_similarity INTEGER NOT NULL DEFAULT 0,
            status TEXT CHECK(status IN ('completed', 'partial', 'failed')) NOT NULL DEFAULT 'completed',
            checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS originality_check_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            check_id INTEGER NOT NULL,
            source_type TEXT CHECK(source_type IN ('college', 'external')) NOT NULL,
            matched_project_id INTEGER NULL,
            source_title TEXT NOT NULL,
            source_url TEXT NULL,
            source_description TEXT,
            similarity_percentage INTEGER NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (check_id) REFERENCES originality_checks(id) ON DELETE CASCADE,
            FOREIGN KEY (matched_project_id) REFERENCES projects(id) ON DELETE SET NULL
        );
        """)
        # Ensure updated_at exists on users
        try:
            cur.execute("ALTER TABLE users ADD COLUMN updated_at DATETIME")
        except Exception:
            pass
        # Ensure register_number exists on users
        try:
            cur.execute("ALTER TABLE users ADD COLUMN register_number TEXT")
            cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_register_number ON users(register_number)")
        except Exception:
            pass

        # Ensure is_published exists on projects
        try:
            cur.execute("PRAGMA table_info(projects)")
            cols = [c[1] for c in cur.fetchall()]
            if "is_published" not in cols:
                cur.execute("ALTER TABLE projects ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0")
            if "published_at" not in cols:
                cur.execute("ALTER TABLE projects ADD COLUMN published_at DATETIME NULL")
        except Exception:
            pass

        # Ensure priority & deadline exist on tasks
        try:
            cur.execute("PRAGMA table_info(tasks)")
            cols = [c[1] for c in cur.fetchall()]
            if "priority" not in cols:
                cur.execute("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'")
            if "deadline" not in cols:
                cur.execute("ALTER TABLE tasks ADD COLUMN deadline DATE NULL")
        except Exception:
            pass

        # Migrate team_members to remove CHECK constraint on role if present
        try:
            cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='team_members'")
            row = cur.fetchone()
            if row and ("CHECK(role IN" in row[0] or "CHECK (role IN" in row[0]):
                cur.execute("PRAGMA foreign_keys = OFF;")
                cur.execute("""
                    CREATE TABLE team_members_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id INTEGER NOT NULL,
                        student_id INTEGER NOT NULL,
                        role TEXT NOT NULL DEFAULT 'member',
                        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(project_id, student_id),
                        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                cur.execute("INSERT INTO team_members_new (id, project_id, student_id, role, joined_at) SELECT id, project_id, student_id, role, joined_at FROM team_members;")
                cur.execute("DROP TABLE team_members;")
                cur.execute("ALTER TABLE team_members_new RENAME TO team_members;")
                cur.execute("PRAGMA foreign_keys = ON;")
        except Exception as e:
            print(f"[*] SQLite team_members migration note: {e}")
        conn.commit()
        conn.close()

    def get_connection(self):
        if self.is_mysql:
            return pymysql.connect(
                host=Config.MYSQL_HOST,
                port=Config.MYSQL_PORT,
                user=Config.MYSQL_USER,
                password=Config.MYSQL_PASSWORD,
                database=Config.MYSQL_DB,
                cursorclass=DictCursor,
                autocommit=False
            )
        else:
            conn = sqlite3.connect(Config.SQLITE_PATH)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn

    def _adapt_query(self, sql):
        """Converts %s placeholders to ? if using SQLite, and adapts datetime."""
        if not self.is_mysql:
            # Replace %s with ?
            adapted = re.sub(r'(?<!%)(%s)', '?', sql)
            return adapted
        return sql

    def query_one(self, sql, params=None):
        conn = self.get_connection()
        try:
            adapted_sql = self._adapt_query(sql)
            if self.is_mysql:
                with conn.cursor() as cur:
                    cur.execute(adapted_sql, params or ())
                    row = cur.fetchone()
                    return row
            else:
                cur = conn.cursor()
                cur.execute(adapted_sql, params or ())
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def query_all(self, sql, params=None):
        conn = self.get_connection()
        try:
            adapted_sql = self._adapt_query(sql)
            if self.is_mysql:
                with conn.cursor() as cur:
                    cur.execute(adapted_sql, params or ())
                    return cur.fetchall() or []
            else:
                cur = conn.cursor()
                cur.execute(adapted_sql, params or ())
                rows = cur.fetchall()
                return [dict(r) for r in rows] if rows else []
        finally:
            conn.close()

    def execute(self, sql, params=None):
        conn = self.get_connection()
        try:
            adapted_sql = self._adapt_query(sql)
            if self.is_mysql:
                with conn.cursor() as cur:
                    cur.execute(adapted_sql, params or ())
                    last_id = cur.lastrowid
                    conn.commit()
                    return last_id
            else:
                cur = conn.cursor()
                cur.execute(adapted_sql, params or ())
                last_id = cur.lastrowid
                conn.commit()
                return last_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    @contextmanager
    def transaction(self):
        """Context manager for atomic multi-statement database transactions."""
        conn = self.get_connection()
        try:
            if self.is_mysql:
                with conn.cursor() as cur:
                    yield TransactionContext(cur, self.is_mysql, self._adapt_query)
                conn.commit()
            else:
                cur = conn.cursor()
                yield TransactionContext(cur, self.is_mysql, self._adapt_query)
                conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

db = DatabaseManager()
