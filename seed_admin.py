import os
import sys
from werkzeug.security import generate_password_hash
from db import db

def setup_admin(email="admin@college.edu", password="AdminSecure@2026"):
    email = os.getenv("ADMIN_EMAIL", email).strip().lower()
    password = os.getenv("ADMIN_PASSWORD", password)

    existing = db.query_one("SELECT id, email, role, status FROM users WHERE email = %s", (email,))
    pw_hash = generate_password_hash(password)

    if existing:
        db.execute(
            "UPDATE users SET password_hash = %s, role = 'admin', status = 'approved' WHERE id = %s",
            (pw_hash, existing['id'])
        )
        print(f"[+] Admin account updated: {email}")
        print(f"   Role: admin | Status: approved")
    else:
        admin_id = db.execute(
            "INSERT INTO users (email, password_hash, role, status) VALUES (%s, %s, 'admin', 'approved')",
            (email, pw_hash)
        )
        print(f"[+] Initial Admin account created successfully!")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Role: admin | Status: approved (ID: {admin_id})")

if __name__ == "__main__":
    setup_admin()
