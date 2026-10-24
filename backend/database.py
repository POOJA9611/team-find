import os
import sys
import re
import sqlite3

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")
import pymysql
from pymysql.cursors import DictCursor
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "college_portal")
DB_TYPE_CONFIG = os.getenv("DB_TYPE", "mysql").lower()
SQLITE_FILE = os.getenv("DB_FILE", "portal.sqlite")


class ExecResult:
    def __init__(self, lastID=None, changes=0):
        self.lastID = lastID
        self.changes = changes
        self.lastrowid = lastID
        self.rowcount = changes


class Database:
    def __init__(self):
        self.mode = None
        self._mysql_conn = None
        self._sqlite_conn = None
        self._detect_and_connect()

    def _detect_and_connect(self):
        if DB_TYPE_CONFIG == "sqlite":
            self.mode = "sqlite"
            self._connect_sqlite()
            return

        # Try MySQL first
        try:
            # First connect without database in case database needs to be created
            tmp_conn = pymysql.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                connect_timeout=1,
                cursorclass=DictCursor,
                autocommit=True
            )
            with tmp_conn.cursor() as cur:
                cur.execute(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            tmp_conn.close()

            # Now connect to target database
            self._mysql_conn = pymysql.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                database=MYSQL_DATABASE,
                connect_timeout=1,
                cursorclass=DictCursor,
                autocommit=True
            )
            self.mode = "mysql"
            print(f"✅ Connected to MySQL database '{MYSQL_DATABASE}' at {MYSQL_HOST}:{MYSQL_PORT}")
        except Exception as e:
            print(f"⚠️ MySQL connection to '{MYSQL_DATABASE}' failed ({e}).")
            print(f"🔄 Activating local SQLite persistence fallback for development & verification.")
            self.mode = "sqlite"
            self._connect_sqlite()

    def _connect_sqlite(self):
        db_path = SQLITE_FILE
        if not os.path.isabs(db_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, db_path)
        self._sqlite_path = db_path
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        self._sqlite_conn = conn
        print(f"📁 SQLite database connected at: {db_path}")

    def _get_connection(self):
        if self.mode == "mysql":
            try:
                self._mysql_conn.ping(reconnect=True)
            except Exception:
                self._mysql_conn = pymysql.connect(
                    host=MYSQL_HOST,
                    port=MYSQL_PORT,
                    user=MYSQL_USER,
                    password=MYSQL_PASSWORD,
                    database=MYSQL_DATABASE,
                    cursorclass=DictCursor,
                    autocommit=True
                )
            return self._mysql_conn
        else:
            return self._sqlite_conn

    def _adapt_query(self, query: str) -> str:
        if self.mode == "mysql":
            # Translate '?' placeholders to '%s'
            # (only when not inside string literals)
            adapted = ""
            in_quote = False
            quote_char = ""
            for char in query:
                if char in ("'", '"'):
                    if not in_quote:
                        in_quote = True
                        quote_char = char
                    elif quote_char == char:
                        in_quote = False
                    adapted += char
                elif char == "?" and not in_quote:
                    adapted += "%s"
                else:
                    adapted += char

            # MySQL uses 'INSERT IGNORE INTO' instead of 'INSERT OR IGNORE INTO'
            adapted = re.sub(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", "INSERT IGNORE INTO", adapted, flags=re.IGNORECASE)
            return adapted
        else:
            # SQLite uses 'INSERT OR IGNORE INTO'
            adapted = re.sub(r"\bINSERT\s+IGNORE\s+INTO\b", "INSERT OR IGNORE INTO", query, flags=re.IGNORECASE)
            return adapted

    def get(self, query: str, params=None):
        if params is None:
            params = []
        elif not isinstance(params, (list, tuple)):
            params = [params]

        adapted_sql = self._adapt_query(query)
        conn = self._get_connection()

        if self.mode == "mysql":
            with conn.cursor() as cur:
                cur.execute(adapted_sql, params)
                row = cur.fetchone()
                return dict(row) if row else None
        else:
            cur = conn.cursor()
            cur.execute(adapted_sql, params)
            row = cur.fetchone()
            return dict(row) if row else None

    def all(self, query: str, params=None):
        if params is None:
            params = []
        elif not isinstance(params, (list, tuple)):
            params = [params]

        adapted_sql = self._adapt_query(query)
        conn = self._get_connection()

        if self.mode == "mysql":
            with conn.cursor() as cur:
                cur.execute(adapted_sql, params)
                rows = cur.fetchall()
                return [dict(r) for r in rows] if rows else []
        else:
            cur = conn.cursor()
            cur.execute(adapted_sql, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows] if rows else []

    def run(self, query: str, params=None):
        if params is None:
            params = []
        elif not isinstance(params, (list, tuple)):
            params = [params]

        adapted_sql = self._adapt_query(query)
        conn = self._get_connection()

        if self.mode == "mysql":
            with conn.cursor() as cur:
                cur.execute(adapted_sql, params)
                last_id = cur.lastrowid
                changes = cur.rowcount
                return ExecResult(lastID=last_id, changes=changes)
        else:
            cur = conn.cursor()
            cur.execute(adapted_sql, params)
            conn.commit()
            return ExecResult(lastID=cur.lastrowid, changes=cur.rowcount)

    @contextmanager
    def transaction(self):
        conn = self._get_connection()
        if self.mode == "mysql":
            conn.autocommit(False)
            try:
                yield self
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.autocommit(True)
        else:
            try:
                yield self
                conn.commit()
            except Exception:
                conn.rollback()
                raise


_db_singleton = None


def get_db():
    global _db_singleton
    if _db_singleton is None:
        _db_singleton = Database()
    return _db_singleton


def initialize_database():
    db = get_db()
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    if db.mode == "mysql":
        schema_path = os.path.join(base_dir, "database", "schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_script = f.read()

        conn = db._get_connection()
        # Execute statement by statement
        statements = sql_script.split(";")
        with conn.cursor() as cur:
            for stmt in statements:
                stmt_clean = stmt.strip()
                if stmt_clean and not stmt_clean.startswith("--"):
                    try:
                        cur.execute(stmt_clean)
                    except Exception as err:
                        print(f"Warning executing schema statement: {err}")
        print("✅ MySQL schema initialized successfully.")
    else:
        # SQLite schema initialization
        # Look for existing SQLite schema in team/server/db/schema.sql
        sqlite_schema_path = os.path.join(base_dir, "team", "server", "db", "schema.sql")
        if not os.path.exists(sqlite_schema_path):
            sqlite_schema_path = os.path.join(base_dir, "database", "schema.sql")

        with open(sqlite_schema_path, "r", encoding="utf-8") as f:
            schema_content = f.read()

        conn = db._get_connection()
        conn.executescript(schema_content)
        conn.commit()
        print("✅ SQLite database schema initialized successfully.")
