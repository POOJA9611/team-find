import os
import functools
import datetime
import jwt
import bcrypt
from flask import request, jsonify, g
from backend.database import get_db

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret_college_portal_jwt_token_key_2026!")


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: int, role: str) -> str:
    payload = {
        "userId": user_id,
        "role": role,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str):
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


def create_reset_token(user_id: int, email: str) -> str:
    payload = {
        "userId": user_id,
        "email": email,
        "purpose": "password_reset",
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_reset_token(token: str) -> dict:
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    if payload.get("purpose") != "password_reset":
        raise ValueError("Invalid reset token purpose.")
    return payload


def authenticate_token(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authentication required. No token provided."}), 401

        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Authentication required. Invalid header format."}), 401

        token = parts[1]
        try:
            payload = decode_token(token)
            user_id = payload.get("userId")
        except Exception:
            return jsonify({"error": "Invalid or expired token."}), 403

        db = get_db()
        user = db.get("SELECT id, role, name, email, avatar, created_at FROM users WHERE id = ?", [user_id])
        if not user:
            return jsonify({"error": "User no longer exists or invalid token."}), 401

        g.user = user
        return f(*args, **kwargs)

    return decorated


def require_role(*allowed_roles):
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, "user", None)
            if not user:
                return jsonify({"error": "Authentication required."}), 401

            if user.get("role") not in allowed_roles:
                roles_str = " or ".join(allowed_roles)
                return jsonify({"error": f"Forbidden: Access restricted to {roles_str}."}), 403

            return f(*args, **kwargs)

        return decorated
    return decorator
