import os
import sys
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from db import db

load_dotenv()

def setup_admin(email=None, password=None):
    admin_accounts = [
        {
            "email": os.getenv("ADMIN_EMAIL", "bharadwajpoojar@gmail.com").strip().lower(),
            "password": os.getenv("ADMIN_PASSWORD", "Pooja_@ranganath9611")
        },
        {
            "email": "admin@college.edu",
            "password": "AdminSecure@2026"
        }
    ]

    if email and password:
        admin_accounts.insert(0, {"email": email.strip().lower(), "password": password})

    for acct in admin_accounts:
        target_email = acct["email"]
        target_pw = acct["password"]
        pw_hash = generate_password_hash(target_pw)

        existing = db.query_one("SELECT id, email, role, status FROM users WHERE LOWER(email) = %s", (target_email,))
        if existing:
            db.execute(
                "UPDATE users SET password_hash = %s, role = 'admin', status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (pw_hash, existing['id'])
            )
            print(f"[+] Admin account verified/updated: {target_email} (Role: admin, Status: approved)")
        else:
            admin_id = db.execute(
                "INSERT INTO users (email, password_hash, role, status) VALUES (%s, %s, 'admin', 'approved')",
                (target_email, pw_hash)
            )
            print(f"[+] Administrator account created successfully: {target_email} (ID: {admin_id}, Role: admin, Status: approved)")

if __name__ == "__main__":
    setup_admin()
