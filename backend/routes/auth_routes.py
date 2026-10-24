import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify, g
from backend.database import get_db
from backend.middleware.auth import (
    hash_password,
    check_password,
    create_token,
    create_reset_token,
    decode_reset_token,
    authenticate_token
)
from backend.utils.validators import (
    validate_email,
    validate_faculty_email_domain,
    validate_linkedin_url,
    validate_github_url,
    validate_strength
)

auth_bp = Blueprint("auth", __name__)


def send_password_reset_email(to_email: str, recipient_name: str, reset_token: str, origin: str) -> bool:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")
    sender = os.getenv("SMTP_FROM", user or "no-reply@college.edu")

    if not host or not user or not password:
        return False

    reset_url = f"{origin.rstrip('/')}/?reset_token={reset_token}#reset-password"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Password Reset Request - College Academic Portal"
    msg["From"] = sender
    msg["To"] = to_email

    text_body = f"""Hello {recipient_name},

We received a request to reset your password for the College Academic Portal.
Use the link below to set a new password (valid for 15 minutes):

{reset_url}

If you did not request this, please ignore this email.
"""
    html_body = f"""<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
    <h2 style="color: #4338ca; margin-top: 0;">College Academic Portal</h2>
    <p>Hello <strong>{recipient_name}</strong>,</p>
    <p>A password reset was requested for your account. Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="{reset_url}" style="background-color: #4338ca; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Reset My Password</a>
    </p>
    <p style="font-size: 12px; color: #64748b;">Or copy this link into your browser:<br/>{reset_url}</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 12px; color: #94a3b8;">If you did not request a password reset, you can safely ignore this message.</p>
  </div>
</body>
</html>"""
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        server = smtplib.SMTP(host, port, timeout=10)
        use_ssl = os.getenv("SMTP_SSL", "false").lower() in ("true", "1", "yes")
        if not use_ssl:
            server.starttls()
        server.login(user, password)
        server.sendmail(sender, [to_email], msg.as_string())
        server.quit()
        return True
    except Exception as err:
        print(f"SMTP send failed: {err}")
        return False


@auth_bp.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json(silent=True) or {}
        role = data.get("role")
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        avatar = data.get("avatar")

        # Student specific
        reg_no = data.get("reg_no")
        department = data.get("department")
        semester = data.get("semester")
        cgpa = data.get("cgpa")
        bio = data.get("bio")
        strength = data.get("strength")
        languages = data.get("languages")
        linkedin_url = data.get("linkedin_url")
        github_url = data.get("github_url")

        # Faculty specific
        designation = data.get("designation")
        subjects = data.get("subjects")

        # Strict check: HOD registration is completely forbidden via signup
        if not role or role not in ("student", "faculty"):
            return jsonify({
                "error": "Invalid role selection. Only Student and Faculty accounts can register. HOD accounts cannot be registered."
            }), 400

        if not name or not isinstance(name, str) or len(name.strip()) < 2:
            return jsonify({"error": "Name must be at least 2 characters."}), 400

        if not validate_email(email):
            return jsonify({"error": "Valid email address is required."}), 400

        clean_email = email.strip().lower()

        # Faculty college domain validation
        if role == "faculty":
            if not validate_faculty_email_domain(clean_email):
                domain = os.getenv("FACULTY_EMAIL_DOMAIN", "@college.edu")
                return jsonify({
                    "error": f"Faculty registration requires an official college domain email address (must end with {domain})."
                }), 400

        if not password or not isinstance(password, str) or len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long."}), 400

        confirm_password = data.get("confirm_password")
        if confirm_password is not None and confirm_password != password:
            return jsonify({"error": "Password and confirmation password do not match."}), 400

        if linkedin_url and not validate_linkedin_url(linkedin_url):
            return jsonify({"error": "Invalid LinkedIn URL format."}), 400

        if github_url and not validate_github_url(github_url):
            return jsonify({"error": "Invalid GitHub URL format."}), 400

        db = get_db()
        existing_user = db.get("SELECT id FROM users WHERE email = ?", [clean_email])
        if existing_user:
            return jsonify({"error": "An account with this email address already exists."}), 409

        password_hash = hash_password(password)
        default_avatar = avatar or (
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
            if role == "faculty" else
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
        )

        user_result = db.run(
            """INSERT INTO users (role, name, email, password_hash, avatar)
               VALUES (?, ?, ?, ?, ?)""",
            [role, name.strip(), clean_email, password_hash, default_avatar]
        )
        user_id = user_result.lastID

        if role == "student":
            student_strength = strength if validate_strength(strength) else "fullstack"
            try:
                sem_val = int(semester) if semester is not None else 6
            except (ValueError, TypeError):
                sem_val = 6
            try:
                cgpa_val = float(cgpa) if cgpa is not None else 8.0
            except (ValueError, TypeError):
                cgpa_val = 8.0

            db.run(
                """INSERT INTO student_profiles (
                    user_id, reg_no, department, semester, cgpa, bio, strength, languages, linkedin_url, github_url, faculty_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)""",
                [
                    user_id,
                    reg_no.strip() if reg_no else f"RA2026{str(user_id).zfill(4)}",
                    department.strip() if department else "Computer Science & Engineering",
                    sem_val,
                    cgpa_val,
                    bio.strip() if bio else "",
                    student_strength,
                    languages.strip() if languages else "JavaScript, Python",
                    linkedin_url.strip() if linkedin_url else "",
                    github_url.strip() if github_url else ""
                ]
            )
        elif role == "faculty":
            db.run(
                """INSERT INTO faculty_profiles (
                    user_id, designation, department, bio, subjects, languages, linkedin_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                [
                    user_id,
                    designation.strip() if designation else "Assistant Professor",
                    department.strip() if department else "Computer Science & Engineering",
                    bio.strip() if bio else "",
                    subjects.strip() if subjects else "Cloud Computing, Web Architecture",
                    languages.strip() if languages else "Python, JavaScript, Java",
                    linkedin_url.strip() if linkedin_url else ""
                ]
            )

        token = create_token(user_id, role)
        new_user = db.get("SELECT id, role, name, email, avatar, created_at FROM users WHERE id = ?", [user_id])

        return jsonify({
            "message": "Account successfully registered.",
            "token": token,
            "user": new_user
        }), 201

    except Exception as error:
        print("Signup error:", error)
        return jsonify({"error": "Server error during registration."}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json(silent=True) or {}
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        clean_email = email.strip().lower()
        db = get_db()
        user = db.get(
            "SELECT id, role, name, email, password_hash, avatar, created_at FROM users WHERE email = ?",
            [clean_email]
        )

        if not user or not check_password(password, user["password_hash"]):
            return jsonify({"error": "Invalid email or password."}), 401

        token = create_token(user["id"], user["role"])
        safe_user = {k: v for k, v in user.items() if k != "password_hash"}

        profile = None
        if user["role"] == "student":
            profile = db.get(
                """SELECT sp.*, u.name as faculty_name, u.email as faculty_email
                   FROM student_profiles sp
                   LEFT JOIN users u ON sp.faculty_id = u.id
                   WHERE sp.user_id = ?""",
                [user["id"]]
            )
        elif user["role"] == "faculty":
            profile = db.get("SELECT * FROM faculty_profiles WHERE user_id = ?", [user["id"]])

        return jsonify({
            "message": "Logged in successfully.",
            "token": token,
            "user": safe_user,
            "profile": profile
        })

    except Exception as error:
        print("Login error:", error)
        return jsonify({"error": "Server error during login."}), 500


@auth_bp.route("/me", methods=["GET"])
@authenticate_token
def get_me():
    try:
        db = get_db()
        user = g.user
        profile = None

        if user["role"] == "student":
            profile = db.get(
                """SELECT sp.*, u.name as faculty_name, u.email as faculty_email
                   FROM student_profiles sp
                   LEFT JOIN users u ON sp.faculty_id = u.id
                   WHERE sp.user_id = ?""",
                [user["id"]]
            )
        elif user["role"] == "faculty":
            profile = db.get("SELECT * FROM faculty_profiles WHERE user_id = ?", [user["id"]])

        return jsonify({
            "user": user,
            "profile": profile
        })
    except Exception as error:
        print("Me endpoint error:", error)
        return jsonify({"error": "Failed to fetch current user profile."}), 500


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    try:
        data = request.get_json(silent=True) or {}
        email = data.get("email")

        if not email or not isinstance(email, str) or not validate_email(email):
            return jsonify({"error": "Please provide a valid email address."}), 400

        clean_email = email.strip().lower()
        db = get_db()
        user = db.get("SELECT id, name, email, role FROM users WHERE email = ?", [clean_email])

        if not user:
            return jsonify({
                "error": "No account found registered with that email address. Please check your email or create a new account."
            }), 404

        token = create_reset_token(user["id"], user["email"])
        origin = request.headers.get("Origin") or request.host_url

        smtp_host = os.getenv("SMTP_HOST")
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASS")

        if smtp_host and smtp_user and smtp_pass:
            email_sent = send_password_reset_email(user["email"], user["name"], token, origin)
            if email_sent:
                return jsonify({
                    "message": "Password reset instructions have been sent to your email address.",
                    "email_sent": True
                })
            else:
                return jsonify({
                    "message": "Reset token generated, but failed to send email via SMTP server.",
                    "email_sent": False,
                    "token": token,
                    "reset_url": f"{origin.rstrip('/')}/?reset_token={token}",
                    "instructions": "SMTP connection failed. Check your SMTP server configuration or use the token directly."
                })

        # When SMTP is not configured, explicitly communicate this without false claims
        return jsonify({
            "message": "Password reset token generated successfully. (Email server is currently not configured).",
            "email_sent": False,
            "token": token,
            "reset_url": f"{origin.rstrip('/')}/?reset_token={token}",
            "instructions": "To enable real email sending, set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your .env file. For development testing, you can use the reset token or link directly."
        })

    except Exception as error:
        print("Forgot password error:", error)
        return jsonify({"error": "Server error processing password reset request."}), 500


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    try:
        data = request.get_json(silent=True) or {}
        token = data.get("token")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")

        if not token:
            return jsonify({"error": "Reset token is required."}), 400

        if not new_password or not isinstance(new_password, str) or len(new_password) < 6:
            return jsonify({"error": "New password must be at least 6 characters long."}), 400

        if confirm_password is not None and new_password != confirm_password:
            return jsonify({"error": "Passwords do not match."}), 400

        try:
            payload = decode_reset_token(token)
            user_id = payload.get("userId")
        except Exception:
            return jsonify({"error": "The password reset token is invalid or has expired (15-minute window). Please request a new link."}), 400

        db = get_db()
        user = db.get("SELECT id, email FROM users WHERE id = ?", [user_id])
        if not user:
            return jsonify({"error": "User account no longer exists."}), 404

        new_hash = hash_password(new_password)
        db.run("UPDATE users SET password_hash = ? WHERE id = ?", [new_hash, user_id])

        return jsonify({
            "message": "Password reset successfully! You can now log in with your new password."
        })

    except Exception as error:
        print("Reset password error:", error)
        return jsonify({"error": "Server error during password reset."}), 500
