"""
Database initialization and migration utility for Student Project Finder & Originality Checker.
Safely creates the MySQL database, tables, relationships, and verifies schema synchronization.
"""
import os
import sys
from config import Config
from db import db
from seed_admin import setup_admin

def initialize_database():
    print("=" * 70)
    print(" Student Project Finder & Originality Checker - Database Initialization")
    print("=" * 70)
    print(f"Target Database Engine: MySQL")
    print(f"Host: {Config.MYSQL_HOST}:{Config.MYSQL_PORT}")
    print(f"Database Name: {Config.MYSQL_DB}")
    print(f"User: {Config.MYSQL_USER}")
    print("-" * 70)

    # Trigger schema verification & safe migration
    if db.is_mysql:
        print("[+] MySQL active: verifying and synchronizing schema...")
        db._ensure_mysql_schema()
        print("[+] MySQL tables verified:")
        tables = db.query_all("SHOW TABLES")
        for t in tables:
            t_name = list(t.values())[0]
            count = db.query_one(f"SELECT COUNT(*) as cnt FROM `{t_name}`")['cnt']
            print(f"    - {t_name}: {count} records")
    else:
        print(f"[*] Note: MySQL server is currently not reachable on {Config.MYSQL_HOST}:{Config.MYSQL_PORT}.")
        print(f"    Reason: {getattr(db, 'connection_error', 'Connection refused / port 3306 offline')}")
        print(f"    Local fallback storage initialized at: {Config.SQLITE_PATH}")
        tables = db.query_all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        print("[+] Tables initialized:")
        for t in tables:
            t_name = t['name']
            count = db.query_one(f"SELECT COUNT(*) as cnt FROM {t_name}")['cnt']
            print(f"    - {t_name}: {count} records")

    print("-" * 70)
    print("[*] Ensuring default administrator credentials exist...")
    setup_admin()
    print("=" * 70)
    print("[+] Database initialization routine completed successfully!")
    print("=" * 70)

if __name__ == "__main__":
    initialize_database()
