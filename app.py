import json
import os
import re
import secrets
import urllib.parse
import urllib.request
from functools import wraps
from flask import (
    Flask, render_template, request, redirect, url_for,
    session, flash, abort
)
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from db import db
from seed_admin import setup_admin

app = Flask(__name__)
app.config.from_object(Config)

# =====================================================================
# Security Helpers & Decorators (Section 15)
# =====================================================================

def get_csrf_token():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(24)
    return session["csrf_token"]

@app.context_processor
def inject_csrf():
    return dict(csrf_token=get_csrf_token, get_csrf_token=get_csrf_token)

@app.before_request
def csrf_protect():
    if request.method == "POST":
        # Check CSRF token on all POST requests
        token = request.form.get("csrf_token")
        expected = session.get("csrf_token")
        if not expected or token != expected:
            abort(403, description="CSRF validation failed. Please refresh and try again.")

def safe_int(val, default=0, min_val=None, max_val=None):
    """Safely parse integer inputs with optional min/max boundaries."""
    try:
        if val is None or val == "":
            return default
        num = int(val)
        if min_val is not None and num < min_val:
            num = min_val
        if max_val is not None and num > max_val:
            num = max_val
        return num
    except (ValueError, TypeError):
        return default

def safe_redirect_target(target, default_url):
    """Ensures redirect target is an internal relative path to prevent open redirects."""
    if not target or not isinstance(target, str):
        return default_url
    target = target.strip()
    if target.startswith("/") and not target.startswith("//") and not target.startswith("/\\"):
        return target
    return default_url

def student_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            flash("Please sign in to access this page.", "warning")
            return redirect(url_for("login"))
        if session.get("role") != "student":
            flash("Access denied: Student account required.", "danger")
            return redirect(url_for("admin_dashboard"))
        # Validate account status on every protected request (Section 6)
        user = db.query_one("SELECT status FROM users WHERE id = %s", (session["user_id"],))
        if not user or user["status"] != "approved":
            session.clear()
            if user and user["status"] == "pending":
                flash("Your account is awaiting Admin approval. You will be able to log in after your account is approved.", "warning")
            elif user and user["status"] == "rejected":
                flash("Your registration request was rejected by the Admin. Please contact the college project administrator for further information.", "error")
            else:
                flash("Account not found or access revoked.", "error")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            flash("Please sign in to access this page.", "warning")
            return redirect(url_for("admin_login"))
        if session.get("role") != "admin":
            flash("Access denied: Administrator permissions required.", "danger")
            return redirect(url_for("student_dashboard"))
        user = db.query_one("SELECT role, status FROM users WHERE id = %s", (session["user_id"],))
        if not user or user["role"] != "admin" or user.get("status") != "approved":
            session.clear()
            flash("Access denied: Unauthorized administrator session.", "danger")
            return redirect(url_for("admin_login"))
        return f(*args, **kwargs)
    return decorated


# =====================================================================
# Normalization & Utility Functions (Section 5 & 8)
# =====================================================================

SKILL_ALIASES = {
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "py": "Python",
    "python": "Python",
    "reactjs": "React",
    "react.js": "React",
    "react": "React",
    "vuejs": "Vue",
    "vue.js": "Vue",
    "vue": "Vue",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node": "Node.js",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mongo": "MongoDB",
    "mongodb": "MongoDB",
    "fast api": "FastAPI",
    "fastapi": "FastAPI",
    "cpp": "C++",
    "c++": "C++",
    "csharp": "C#",
    "c#": "C#",
    "golang": "Go",
    "go": "Go",
    "ml": "Machine Learning",
    "ai": "Artificial Intelligence",
    "nlp": "NLP",
    "sql": "SQL",
    "html": "HTML",
    "css": "CSS",
    "iot": "IoT",
    "docker": "Docker",
    "kubernetes": "Kubernetes"
}

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for",
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "if", "in", "into", "is", "it", "its", "itself", "just",
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
    "should", "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them",
    "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which",
    "while", "who", "whom", "why", "will", "with", "you", "your", "yours", "yourself",
    "system", "project", "based", "using", "application", "platform", "app"
}

def normalize_skill(name: str) -> str:
    """Normalize skill name: trim, lowercase check against aliases, proper title casing."""
    if not name:
        return ""
    clean = name.strip()
    key = clean.lower()
    return SKILL_ALIASES.get(key, clean.title())

def parse_and_normalize_skills(skills_input) -> list:
    """Parse comma/newline separated skills and normalize into a deduplicated list."""
    if isinstance(skills_input, list):
        items = skills_input
    else:
        items = re.split(r"[,;\n\r]+", str(skills_input or ""))
    seen = set()
    result = []
    for item in items:
        norm = normalize_skill(item)
        if norm and norm.lower() not in seen:
            seen.add(norm.lower())
            result.append(norm)
    return result

def tokenize_text(text: str) -> set:
    """Extract clean normalized unique word tokens for Jaccard similarity."""
    if not text:
        return set()
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w for w in words if len(w) > 1 and w not in STOPWORDS}


# =====================================================================
# Notification Helper (Section 12)
# =====================================================================

def create_notification(user_id: int, message: str):
    """Store real notification in database."""
    try:
        db.execute(
            "INSERT INTO notifications (user_id, message, is_read) VALUES (%s, %s, 0)",
            (user_id, message.strip())
        )
    except Exception as e:
        print(f"Notification create error: {e}")


def run_project_originality_check(project_id: int, trigger_event: str = "team_formed") -> dict:
    """
    Runs Jaccard originality check for a project against all other projects in MySQL/SQLite.
    Stores the result in project_originality_checks table.
    Notifies owner if high similarity (>= 70%) is found.
    """
    project = db.query_one("SELECT * FROM projects WHERE id = %s", (project_id,))
    if not project:
        return None

    # Exclude current project from comparisons (never compare project against itself)
    other_projects = db.query_all(
        """SELECT p.*, sp.name as owner_name
           FROM projects p
           JOIN users u ON p.owner_id = u.id
           JOIN student_profiles sp ON u.id = sp.user_id
           WHERE p.id != %s
           ORDER BY p.created_at DESC""",
        (project_id,)
    )

    combined_input = (project.get("title") or "") + " " + (project.get("description") or "")
    input_tokens = tokenize_text(combined_input)

    matches = []
    highest_score = 0
    closest_project_id = None
    closest_project_title = None
    similarity_category = "Low Similarity"

    for other in other_projects:
        other_combined = (other.get("title") or "") + " " + (other.get("description") or "")
        other_tokens = tokenize_text(other_combined)
        union_tokens = input_tokens.union(other_tokens)
        union_len = len(union_tokens)

        if union_len > 0:
            intersection_len = len(input_tokens.intersection(other_tokens))
            jaccard = intersection_len / union_len
        else:
            jaccard = 0.0

        score_pct = int(round(jaccard * 100))

        # Ratings:
        # 70-100%: High Similarity
        # 40-69%: Moderate Similarity
        # Below 40%: Low Similarity
        if score_pct >= 70:
            cat = "High Similarity"
        elif score_pct >= 40:
            cat = "Moderate Similarity"
        else:
            cat = "Low Similarity"

        matches.append({
            "project_id": other["id"],
            "title": other["title"],
            "owner_name": other["owner_name"],
            "domain": other["domain"],
            "similarity_percentage": score_pct,
            "category": cat
        })

        if score_pct > highest_score:
            highest_score = score_pct
            closest_project_id = other["id"]
            closest_project_title = other["title"]
            similarity_category = cat

    # Sort matches descending by score
    matches.sort(key=lambda m: -m["similarity_percentage"])
    results_json = json.dumps(matches)

    check_id = db.execute(
        """INSERT INTO project_originality_checks
           (project_id, checked_by, trigger_event, compared_count, highest_similarity,
            closest_project_id, closest_project_title, similarity_category, results_json)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            project_id,
            project["owner_id"],
            trigger_event,
            len(other_projects),
            float(highest_score),
            closest_project_id,
            closest_project_title,
            similarity_category,
            results_json
        )
    )

    if highest_score >= 70:
        create_notification(
            project["owner_id"],
            f"Originality Review Recommended: Your project '{project['title']}' shows {highest_score}% similarity ({similarity_category}) with '{closest_project_title}'. We recommend reviewing similar projects to refine your proposal."
        )
    elif trigger_event == "team_formed":
        create_notification(
            project["owner_id"],
            f"Team Formed & Originality Verified: Automatic originality check completed for '{project['title']}' ({highest_score}% similarity - {similarity_category})."
        )

    return {
        "id": check_id,
        "project_id": project_id,
        "trigger_event": trigger_event,
        "compared_count": len(other_projects),
        "highest_similarity": highest_score,
        "closest_project_id": closest_project_id,
        "closest_project_title": closest_project_title,
        "similarity_category": similarity_category,
        "matches": matches
    }


def check_and_trigger_team_formation_originality(project_id: int):
    """
    Verifies if project team has reached maximum capacity / required team size.
    If full, automatically ensures project idea is saved in MySQL and triggers
    originality check exactly once per team-formation event.
    """
    project = db.query_one("SELECT * FROM projects WHERE id = %s", (project_id,))
    if not project:
        return

    member_count_row = db.query_one(
        "SELECT COUNT(*) as count FROM team_members WHERE project_id = %s",
        (project_id,)
    )
    member_count = member_count_row["count"] if member_count_row else 0

    if member_count >= project["max_members"]:
        existing = db.query_one(
            "SELECT id FROM project_originality_checks WHERE project_id = %s AND trigger_event = 'team_formed'",
            (project_id,)
        )
        if not existing:
            run_project_originality_check(project_id, trigger_event="team_formed")


# =====================================================================
# 1. Authentication Routes (Module 1 & 2)
# =====================================================================

@app.route("/")
def index():
    if "user_id" in session:
        if session.get("role") == "admin":
            return redirect(url_for("admin_dashboard"))
        return redirect(url_for("student_dashboard"))
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("index"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        user = db.query_one("SELECT * FROM users WHERE email = %s", (email,))
        if not user or not check_password_hash(user["password_hash"], password):
            flash("Invalid email or password. Please verify your credentials.", "error")
            return render_template("login.html")

        # Approval Check (Section 3)
        if user["role"] == "student":
            if user["status"] == "pending":
                flash("Your account is awaiting Admin approval. You will be able to log in after your account is approved.", "warning")
                return render_template("login.html", pending_email=email)
            elif user["status"] == "rejected":
                flash("Your registration request was rejected by the Admin. Please contact the college project administrator for further information.", "error")
                return render_template("login.html", rejected_email=email)

        # Successful login: Establish session
        session.clear()
        session["user_id"] = user["id"]
        session["role"] = user["role"]
        session["email"] = user["email"]

        if user["role"] == "student":
            profile = db.query_one("SELECT name FROM student_profiles WHERE user_id = %s", (user["id"],))
            session["name"] = profile["name"] if profile else user["email"]
            flash(f"Welcome back, {session['name']}!", "success")
            return redirect(url_for("student_dashboard"))
        else:
            session["name"] = "Administrator"
            flash("Logged in successfully to Admin Dashboard.", "success")
            return redirect(url_for("admin_dashboard"))

    return render_template("login.html")

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    """Dedicated administrative login endpoint accessed via the discreet icon."""
    if "user_id" in session:
        if session.get("role") == "admin":
            return redirect(url_for("admin_dashboard"))
        else:
            flash("Access denied: You are signed in with a student account. Please sign out before accessing the Admin Portal.", "danger")
            return redirect(url_for("student_dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not email or not password:
            flash("Please enter both administrator email and password.", "error")
            return render_template("admin/login.html")

        user = db.query_one("SELECT * FROM users WHERE email = %s", (email,))
        if not user or not check_password_hash(user["password_hash"], password):
            flash("Invalid administrator credentials. Please verify your email and password.", "error")
            return render_template("admin/login.html")

        if user["role"] != "admin":
            flash("Access denied: This portal is restricted to authorized administrators.", "error")
            return render_template("admin/login.html")

        if user.get("status") != "approved":
            flash("Administrator account is inactive. Please contact system support.", "error")
            return render_template("admin/login.html")

        # Establish authenticated admin session
        session.clear()
        session["user_id"] = user["id"]
        session["role"] = "admin"
        session["email"] = user["email"]
        session["name"] = "Administrator"
        flash("Logged in successfully to Administrator Portal.", "success")
        return redirect(url_for("admin_dashboard"))

    return render_template("admin/login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if "user_id" in session:
        return redirect(url_for("index"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        register_number = request.form.get("register_number", "").strip().upper()
        password = request.form.get("password", "")
        department = request.form.get("department", "").strip()
        semester = safe_int(request.form.get("semester"), default=1, min_val=1, max_val=8)
        section = request.form.get("section", "").strip()
        bio = request.form.get("bio", "").strip()

        # Validate all required fields
        if not name or not email or not register_number or not password or not department:
            flash("Please fill in all required fields marked with an asterisk (*), including College Register Number.", "error")
            return render_template("register.html")

        if len(password) < 6:
            flash("Password must be at least 6 characters long.", "error")
            return render_template("register.html")

        # Prevent duplicate email
        existing_email = db.query_one("SELECT id FROM users WHERE LOWER(email) = %s", (email,))
        if existing_email:
            flash("An account request with this email address already exists. Please sign in or check your registration status.", "error")
            return render_template("register.html")

        # Prevent duplicate register number
        existing_reg = db.query_one("SELECT id FROM users WHERE UPPER(register_number) = %s", (register_number,))
        if existing_reg:
            flash(f"A registration request or account with College Register Number '{register_number}' already exists.", "error")
            return render_template("register.html")

        pw_hash = generate_password_hash(password)

        try:
            # Create user in 'pending' status awaiting manual admin verification
            user_id = db.execute(
                "INSERT INTO users (email, register_number, password_hash, role, status) VALUES (%s, %s, %s, 'student', 'pending')",
                (email, register_number, pw_hash)
            )
            # Create associated profile
            db.execute(
                """INSERT INTO student_profiles (user_id, name, department, semester, section, bio)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (user_id, name, department, semester, section, bio)
            )
            flash("Your registration request has been submitted successfully. Please wait for Admin approval.", "success")
            return redirect(url_for("login"))
        except Exception as e:
            flash("An error occurred during account registration. Please try again.", "error")
            print(f"Registration error: {e}")

    return render_template("register.html")

@app.route("/check-status", methods=["GET", "POST"])
def check_registration_status():
    if "user_id" in session:
        if session.get("role") == "student":
            return redirect(url_for("student_dashboard"))
        elif session.get("role") == "admin":
            return redirect(url_for("admin_dashboard"))

    searched = False
    status_info = None
    email_query = ""

    if request.method == "POST":
        email_query = request.form.get("email", "").strip().lower()
    else:
        email_query = request.args.get("email", "").strip().lower()

    if email_query:
        searched = True
        user = db.query_one(
            """SELECT u.id, u.email, u.register_number, u.status, u.created_at, u.updated_at, sp.name, sp.department
               FROM users u
               LEFT JOIN student_profiles sp ON u.id = sp.user_id
               WHERE LOWER(u.email) = %s AND u.role = 'student'""",
            (email_query,)
        )
        if user:
            status_info = {
                "email": user["email"],
                "register_number": user.get("register_number"),
                "name": user["name"] or user["email"],
                "department": user["department"] or "Student",
                "status": user["status"],
                "submitted_at": user["created_at"],
                "updated_at": user.get("updated_at")
            }
        else:
            flash("No registration request found for this email address. Please ensure you entered the exact student email or request an account.", "info")

    return render_template(
        "check_status.html",
        searched=searched,
        status_info=status_info,
        email_query=email_query
    )

@app.route("/logout", methods=["GET", "POST"])
def logout():
    session.clear()
    flash("You have been signed out.", "info")
    return redirect(url_for("login"))


# =====================================================================
# 2. Student Profile & Skills (Module 3 & Section 5)
# =====================================================================

@app.route("/student/profile", methods=["GET", "POST"])
@student_required
def student_profile():
    user_id = session["user_id"]

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        department = request.form.get("department", "").strip()
        semester = safe_int(request.form.get("semester"), default=1, min_val=1, max_val=8)
        section = request.form.get("section", "").strip()
        interests = request.form.get("interests", "").strip()
        bio = request.form.get("bio", "").strip()

        if not name or not department:
            flash("Name and department are required.", "error")
        else:
            db.execute(
                """UPDATE student_profiles
                   SET name = %s, department = %s, semester = %s, section = %s, interests = %s, bio = %s
                   WHERE user_id = %s""",
                (name, department, semester, section, interests, bio, user_id)
            )
            session["name"] = name
            flash("Profile details updated successfully.", "success")
            return redirect(url_for("student_profile"))

    user = db.query_one("SELECT * FROM users WHERE id = %s", (user_id,))
    profile = db.query_one("SELECT * FROM student_profiles WHERE user_id = %s", (user_id,))
    skills = db.query_all("SELECT * FROM student_skills WHERE user_id = %s ORDER BY skill_name ASC", (user_id,))

    # Published projects where this student participated (as leader or member)
    published_projects = db.query_all(
        """SELECT p.id, p.title, p.description, p.domain, p.status, p.published_at, p.owner_id,
                  tm.role as my_role
           FROM projects p
           JOIN team_members tm ON p.id = tm.project_id
           WHERE tm.student_id = %s AND p.is_published = 1
           ORDER BY p.published_at DESC, p.created_at DESC""",
        (user_id,)
    )
    for p in published_projects:
        # Full team roster with their assigned roles
        p["team"] = db.query_all(
            """SELECT tm.student_id, tm.role, sp.name, sp.department
               FROM team_members tm
               JOIN student_profiles sp ON tm.student_id = sp.user_id
               WHERE tm.project_id = %s
               ORDER BY (tm.student_id = %s) DESC, sp.name ASC""",
            (p["id"], p["owner_id"])
        )
        # Specific tasks assigned to this student
        p["my_tasks"] = db.query_all(
            """SELECT id, title, description, status, priority, deadline
               FROM tasks
               WHERE project_id = %s AND assigned_to = %s
               ORDER BY created_at DESC""",
            (p["id"], user_id)
        )
        s_rows = db.query_all("SELECT skill_name FROM project_required_skills WHERE project_id = %s", (p["id"],))
        p["required_skills"] = [s["skill_name"] for s in s_rows]

    return render_template(
        "student/profile.html",
        user=user,
        profile=profile,
        skills=skills,
        published_projects=published_projects
    )

@app.route("/student/skills/add", methods=["POST"])
@student_required
def add_student_skill():
    user_id = session["user_id"]
    skill_input = request.form.get("skill_name", "")
    normalized_list = parse_and_normalize_skills(skill_input)

    if not normalized_list:
        flash("Please enter a valid skill.", "warning")
        return redirect(url_for("student_profile"))

    added_count = 0
    for skill_name in normalized_list:
        try:
            db.execute(
                "INSERT INTO student_skills (user_id, skill_name) VALUES (%s, %s)",
                (user_id, skill_name)
            )
            added_count += 1
        except Exception:
            # Duplicate skill for this user ignored safely
            pass

    if added_count > 0:
        flash(f"Added {added_count} skill(s) to your profile.", "success")
    else:
        flash("Skill already exists in your profile.", "info")

    return redirect(url_for("student_profile"))

@app.route("/student/skills/<int:skill_id>/delete", methods=["POST"])
@student_required
def delete_student_skill(skill_id):
    user_id = session["user_id"]
    db.execute("DELETE FROM student_skills WHERE id = %s AND user_id = %s", (skill_id, user_id))
    flash("Skill removed from your profile.", "info")
    return redirect(url_for("student_profile"))


# =====================================================================
# 3. Project Management (Module 4 & Section 6)
# =====================================================================

@app.route("/projects/create", methods=["GET", "POST"])
@student_required
def create_project():
    user_id = session["user_id"]

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        domain = request.form.get("domain", "").strip()
        max_members = safe_int(request.form.get("max_members"), default=4, min_val=2, max_val=10)
        required_skills_input = request.form.get("required_skills", "")

        if len(title) < 3:
            flash("Project title must be at least 3 characters long.", "error")
            return render_template("student/project_create.html")

        if len(description) < 10:
            flash("Project description must be at least 10 characters long.", "error")
            return render_template("student/project_create.html")

        # Prevent duplicate project creation caused by repeated submissions (Section 3)
        existing_dup = db.query_one(
            "SELECT id, title FROM projects WHERE owner_id = %s AND LOWER(title) = %s",
            (user_id, title.lower())
        )
        if existing_dup:
            flash(f"You have already created a project titled '{existing_dup['title']}'.", "warning")
            return redirect(url_for("find_teammates", project_id=existing_dup["id"]))

        try:
            # 1. Insert Project record
            project_id = db.execute(
                """INSERT INTO projects (owner_id, title, description, domain, max_members, status)
                   VALUES (%s, %s, %s, %s, %s, 'open')""",
                (user_id, title, description, domain, max_members)
            )

            # 2. Add owner as member (creator counts as 1 team member)
            db.execute(
                "INSERT INTO team_members (project_id, student_id, role) VALUES (%s, %s, 'owner')",
                (project_id, user_id)
            )

            # 3. Insert required skills as normalized individual records
            skills_list = parse_and_normalize_skills(required_skills_input)
            for sk in skills_list:
                try:
                    db.execute(
                        "INSERT INTO project_required_skills (project_id, skill_name) VALUES (%s, %s)",
                        (project_id, sk)
                    )
                except Exception:
                    pass

            flash(f"Project '{title}' created successfully! You are now the project owner.", "success")
            return redirect(url_for("find_teammates", project_id=project_id))
        except Exception as e:
            flash(f"Failed to create project: {e}", "error")

    # Prefill from Originality Checker if passed
    prefill_title = request.args.get("title", "")
    prefill_desc = request.args.get("description", "")
    prefill_skills = request.args.get("skills", "")

    return render_template(
        "student/project_create.html",
        prefill_title=prefill_title,
        prefill_description=prefill_desc,
        prefill_skills=prefill_skills
    )

@app.route("/projects/<int:project_id>/edit", methods=["GET", "POST"])
@student_required
def edit_project(project_id):
    user_id = session["user_id"]
    project = db.query_one("SELECT * FROM projects WHERE id = %s", (project_id,))

    if not project:
        abort(404, description="Project not found.")

    # Strictly check ownership (Section 6)
    if project["owner_id"] != user_id:
        abort(403, description="Only the project owner can edit this project.")

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        domain = request.form.get("domain", "").strip()
        max_members = safe_int(request.form.get("max_members"), default=4, min_val=2, max_val=10)
        status = request.form.get("status", "open")
        required_skills_input = request.form.get("required_skills", "")

        if len(title) < 3 or len(description) < 10:
            flash("Please provide valid title and description lengths.", "error")
        else:
            db.execute(
                """UPDATE projects
                   SET title = %s, description = %s, domain = %s, max_members = %s, status = %s
                   WHERE id = %s""",
                (title, description, domain, max_members, status, project_id)
            )

            # Update required skills: clear and re-insert normalized
            db.execute("DELETE FROM project_required_skills WHERE project_id = %s", (project_id,))
            new_skills = parse_and_normalize_skills(required_skills_input)
            for sk in new_skills:
                try:
                    db.execute(
                        "INSERT INTO project_required_skills (project_id, skill_name) VALUES (%s, %s)",
                        (project_id, sk)
                    )
                except Exception:
                    pass

            flash("Project settings and required skills updated successfully.", "success")
            return redirect(url_for("find_teammates", project_id=project_id))

    req_skills = db.query_all("SELECT skill_name FROM project_required_skills WHERE project_id = %s", (project_id,))
    req_skills_str = ", ".join(s["skill_name"] for s in req_skills)

    return render_template(
        "student/project_edit.html",
        project=project,
        req_skills_str=req_skills_str
    )


# =====================================================================
# 4. Explore Projects (Module 5 & Section 7)
# =====================================================================

@app.route("/explore")
@student_required
def explore_projects():
    user_id = session["user_id"]
    query_search = request.args.get("q", "").strip()
    query_domain = request.args.get("domain", "").strip()

    sql = """
        SELECT p.*, sp.name as owner_name
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        JOIN student_profiles sp ON u.id = sp.user_id
        WHERE p.status = 'open'
    """
    params = []

    if query_search:
        sql += " AND (p.title LIKE %s OR p.description LIKE %s)"
        params.extend([f"%{query_search}%", f"%{query_search}%"])

    if query_domain:
        sql += " AND p.domain = %s"
        params.append(query_domain)

    sql += " ORDER BY p.created_at DESC"
    projects = db.query_all(sql, params)

    # Student's skills for calculating matching accuracy against projects
    my_skills_rows = db.query_all("SELECT skill_name FROM student_skills WHERE user_id = %s", (user_id,))
    my_skills_set = {s["skill_name"].lower() for s in my_skills_rows}

    # Attach required skills, members list, capacity, application status, and matching accuracy
    for p in projects:
        skills = db.query_all("SELECT skill_name FROM project_required_skills WHERE project_id = %s", (p["id"],))
        req_skills = [s["skill_name"] for s in skills]
        p["required_skills"] = req_skills

        members = db.query_all(
            """SELECT tm.*, sp.name, sp.department
               FROM team_members tm
               JOIN student_profiles sp ON tm.student_id = sp.user_id
               WHERE tm.project_id = %s
               ORDER BY tm.joined_at ASC""",
            (p["id"],)
        )
        p["members"] = members
        p["member_count"] = len(members)
        p["available_slots"] = max(0, p["max_members"] - len(members))
        p["is_full"] = (p["member_count"] >= p["max_members"])

        p["is_owner"] = (p["owner_id"] == user_id)
        p["is_member"] = any(m["student_id"] == user_id for m in members)

        # Pending application status
        app_row = db.query_one(
            "SELECT status FROM project_applications WHERE project_id = %s AND applicant_id = %s ORDER BY created_at DESC LIMIT 1",
            (p["id"], user_id)
        )
        p["application_status"] = app_row["status"] if app_row else None
        p["has_pending_application"] = (p["application_status"] == "pending")

        # Matching accuracy calculation:
        # Matching Accuracy = (Number of distinct required skills matched / Total number of distinct required skills) * 100
        total_req = len(req_skills)
        if total_req > 0:
            matched = [s for s in req_skills if s.lower() in my_skills_set]
            missing = [s for s in req_skills if s.lower() not in my_skills_set]
            match_pct = int(round((len(matched) / total_req) * 100))

            if match_pct >= 80:
                rating = "Excellent Match"
            elif match_pct >= 60:
                rating = "Good Match"
            elif match_pct >= 40:
                rating = "Partial Match"
            else:
                rating = "Low Match"

            p["matching_percentage"] = match_pct
            p["match_rating"] = rating
            p["matched_skills"] = matched
            p["missing_skills"] = missing
        else:
            p["matching_percentage"] = None
            p["match_rating"] = "N/A"
            p["matched_skills"] = []
            p["missing_skills"] = []

    # Sort projects by matching percentage from highest to lowest (Personalized Project Recommendations)
    projects.sort(key=lambda p: (-(p["matching_percentage"] or 0), p["title"]))

    return render_template(
        "student/explore.html",
        projects=projects,
        query_search=query_search,
        query_domain=query_domain
    )


@app.route("/projects/<int:project_id>")
@student_required
def view_project_details(project_id):
    user_id = session["user_id"]
    project = db.query_one("SELECT * FROM projects WHERE id = %s", (project_id,))
    if not project:
        abort(404, description="Project not found.")

    # Retrieve creator profile
    creator = db.query_one(
        """SELECT u.id as user_id, u.email, sp.name, sp.department, sp.semester, sp.section, sp.bio, sp.interests
           FROM users u
           JOIN student_profiles sp ON u.id = sp.user_id
           WHERE u.id = %s""",
        (project["owner_id"],)
    )
    if creator:
        creator_skills_rows = db.query_all(
            "SELECT skill_name FROM student_skills WHERE user_id = %s ORDER BY skill_name ASC",
            (project["owner_id"],)
        )
        creator["skills"] = [s["skill_name"] for s in creator_skills_rows]

    # Required skills
    req_skills_rows = db.query_all(
        "SELECT skill_name FROM project_required_skills WHERE project_id = %s ORDER BY skill_name ASC",
        (project_id,)
    )
    required_skills = [s["skill_name"] for s in req_skills_rows]

    # Members roster
    members = db.query_all(
        """SELECT tm.*, sp.name, sp.department, sp.semester, sp.section
           FROM team_members tm
           JOIN student_profiles sp ON tm.student_id = sp.user_id
           WHERE tm.project_id = %s
           ORDER BY tm.joined_at ASC""",
        (project_id,)
    )
    member_count = len(members)
    available_slots = max(0, project["max_members"] - member_count)
    is_full = (member_count >= project["max_members"])

    # Logged-in student's matching accuracy
    my_skills_rows = db.query_all(
        "SELECT skill_name FROM student_skills WHERE user_id = %s ORDER BY skill_name ASC",
        (user_id,)
    )
    my_skills_set = {s["skill_name"].lower() for s in my_skills_rows}

    total_req = len(required_skills)
    if total_req > 0:
        matched_skills = [s for s in required_skills if s.lower() in my_skills_set]
        missing_skills = [s for s in required_skills if s.lower() not in my_skills_set]
        match_pct = int(round((len(matched_skills) / total_req) * 100))
        if match_pct >= 80:
            match_rating = "Excellent Match"
        elif match_pct >= 60:
            match_rating = "Good Match"
        elif match_pct >= 40:
            match_rating = "Partial Match"
        else:
            match_rating = "Low Match"
    else:
        matched_skills = []
        missing_skills = []
        match_pct = None
        match_rating = "N/A"

    is_owner = (project["owner_id"] == user_id)
    is_member = any(m["student_id"] == user_id for m in members)

    my_application = db.query_one(
        "SELECT * FROM project_applications WHERE project_id = %s AND applicant_id = %s ORDER BY created_at DESC LIMIT 1",
        (project_id, user_id)
    )
    has_pending_application = bool(my_application and my_application["status"] == "pending")

    return render_template(
        "student/project_details.html",
        project=project,
        creator=creator,
        required_skills=required_skills,
        members=members,
        member_count=member_count,
        available_slots=available_slots,
        is_full=is_full,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        match_pct=match_pct,
        match_rating=match_rating,
        is_owner=is_owner,
        is_member=is_member,
        my_application=my_application,
        has_pending_application=has_pending_application
    )


@app.route("/students/<int:user_id>")
@student_required
def view_student_profile(user_id):
    student_user = db.query_one(
        "SELECT id, role, status, created_at FROM users WHERE id = %s AND role = 'student'",
        (user_id,)
    )
    if not student_user:
        abort(404, description="Student profile not found.")

    profile = db.query_one(
        "SELECT * FROM student_profiles WHERE user_id = %s",
        (user_id,)
    )
    if not profile:
        abort(404, description="Student profile details not available.")

    skills_rows = db.query_all(
        "SELECT skill_name FROM student_skills WHERE user_id = %s ORDER BY skill_name ASC",
        (user_id,)
    )
    skills = [s["skill_name"] for s in skills_rows]

    # Projects led by this student
    projects_led = db.query_all(
        """SELECT p.*,
                  (SELECT COUNT(*) FROM team_members WHERE project_id = p.id) as member_count
           FROM projects p
           WHERE p.owner_id = %s
           ORDER BY p.created_at DESC""",
        (user_id,)
    )
    for p in projects_led:
        s_rows = db.query_all("SELECT skill_name FROM project_required_skills WHERE project_id = %s", (p["id"],))
        p["required_skills"] = [s["skill_name"] for s in s_rows]

    from_project_id = request.args.get("from_project", type=int)
    from_project = None
    if from_project_id:
        from_project = db.query_one("SELECT id, title FROM projects WHERE id = %s", (from_project_id,))

    # Published projects where this student participated (as leader or member)
    published_projects = db.query_all(
        """SELECT p.id, p.title, p.description, p.domain, p.status, p.published_at, p.owner_id,
                  tm.role as member_role
           FROM projects p
           JOIN team_members tm ON p.id = tm.project_id
           WHERE tm.student_id = %s AND p.is_published = 1
           ORDER BY p.published_at DESC, p.created_at DESC""",
        (user_id,)
    )
    for p in published_projects:
        p["team"] = db.query_all(
            """SELECT tm.student_id, tm.role, sp.name, sp.department
               FROM team_members tm
               JOIN student_profiles sp ON tm.student_id = sp.user_id
               WHERE tm.project_id = %s
               ORDER BY (tm.student_id = %s) DESC, sp.name ASC""",
            (p["id"], p["owner_id"])
        )
        p["assigned_tasks"] = db.query_all(
            """SELECT id, title, description, status, priority, deadline
               FROM tasks
               WHERE project_id = %s AND assigned_to = %s
               ORDER BY created_at DESC""",
            (p["id"], user_id)
        )
        s_rows = db.query_all("SELECT skill_name FROM project_required_skills WHERE project_id = %s", (p["id"],))
        p["required_skills"] = [s["skill_name"] for s in s_rows]

    return render_template(
        "student/public_profile.html",
        student_user=student_user,
        profile=profile,
        skills=skills,
        projects_led=projects_led,
        published_projects=published_projects,
        from_project=from_project
    )


@app.route("/projects/<int:project_id>/apply", methods=["POST"])
@student_required
def apply_to_project(project_id):
    user_id = session["user_id"]
    fallback = url_for("view_project_details", project_id=project_id)
    next_page = safe_redirect_target(request.form.get("next") or request.referrer, fallback)
    project = db.query_one("SELECT * FROM projects WHERE id = %s", (project_id,))
    if not project:
        abort(404, description="Project not found.")

    # Student cannot apply to their own project
    if project["owner_id"] == user_id:
        flash("You cannot apply to join your own project.", "warning")
        return redirect(next_page)

    # Student cannot apply to closed project
    if project["status"] != "open":
        flash("This project is closed and not accepting applications.", "error")
        return redirect(next_page)

    # Student cannot apply to full project
    member_count_row = db.query_one(
        "SELECT COUNT(*) as count FROM team_members WHERE project_id = %s",
        (project_id,)
    )
    member_count = member_count_row["count"] if member_count_row else 0
    if member_count >= project["max_members"]:
        flash("This project team has reached maximum capacity.", "error")
        return redirect(next_page)

    # Existing team members cannot apply
    existing_member = db.query_one(
        "SELECT id FROM team_members WHERE project_id = %s AND student_id = %s",
        (project_id, user_id)
    )
    if existing_member:
        flash("You are already a member of this project team.", "info")
        return redirect(next_page)

    # Students cannot submit duplicate pending applications for the same project
    pending_app = db.query_one(
        "SELECT id FROM project_applications WHERE project_id = %s AND applicant_id = %s AND status = 'pending'",
        (project_id, user_id)
    )
    if pending_app:
        flash("You already have a pending application for this project.", "warning")
        return redirect(next_page)

    message = request.form.get("message", "").strip()[:1000]
    if not message:
        flash("Please provide a brief application message explaining your interest and relevant skills.", "warning")
        return redirect(next_page)

    # Save application in MySQL
    db.execute(
        """INSERT INTO project_applications (project_id, applicant_id, owner_id, message, status)
           VALUES (%s, %s, %s, %s, 'pending')""",
        (project_id, user_id, project["owner_id"], message)
    )

    applicant_name = session.get("name", "A student")
    create_notification(
        project["owner_id"],
        f"{applicant_name} applied to join your project '{project['title']}'."
    )
    flash(f"Application submitted successfully for '{project['title']}'. The project owner will review it.", "success")
    return redirect(next_page)


# =====================================================================
# 5. Project-Specific Find Teammates (Module 6 & Section 8)
# =====================================================================

@app.route("/projects/<int:project_id>/find-teammates")
@student_required
def find_teammates(project_id):
    user_id = session["user_id"]
    project = db.query_one("SELECT * FROM projects WHERE id = %s", (project_id,))

    if not project:
        abort(404, description="Project not found.")

    # Strictly check ownership (Section 8)
    if project["owner_id"] != user_id:
        abort(403, description="Only the project owner can find teammates for this project.")

    # 1. Retrieve project required skills
    req_skills_rows = db.query_all(
        "SELECT skill_name FROM project_required_skills WHERE project_id = %s",
        (project_id,)
    )
    required_skills = [s["skill_name"] for s in req_skills_rows]
    total_required = len(required_skills)

    # 2. Retrieve current members & check capacity
    members = db.query_all(
        """SELECT tm.*, sp.name, sp.department, sp.semester
           FROM team_members tm
           JOIN student_profiles sp ON tm.student_id = sp.user_id
           WHERE tm.project_id = %s""",
        (project_id,)
    )
    current_count = len(members)
    is_full = (current_count >= project["max_members"])

    # 3. Retrieve pending invitations for this project
    pending_invites = db.query_all(
        "SELECT recipient_id FROM invitations WHERE project_id = %s AND status = 'pending'",
        (project_id,)
    )
    pending_recipient_ids = {pi["recipient_id"] for pi in pending_invites}
    member_ids = {m["student_id"] for m in members}

    candidates = []

    # If project has required skills and is not closed/full, calculate match scores
    if total_required > 0 and not is_full and project["status"] == "open":
        # Retrieve all approved students (excluding owner and confirmed members)
        candidate_users = db.query_all(
            """SELECT u.id as user_id, sp.name, sp.department, sp.semester, sp.section, sp.bio
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student' AND u.status = 'approved' AND u.id != %s""",
            (user_id,)
        )

        req_set_lower = {s.lower(): s for s in required_skills}

        for cand in candidate_users:
            cid = cand["user_id"]
            if cid in member_ids:
                continue  # Exclude existing team members

            has_pending = cid in pending_recipient_ids

            # Retrieve candidate's saved skills
            cand_skills_rows = db.query_all(
                "SELECT skill_name FROM student_skills WHERE user_id = %s",
                (cid,)
            )
            cand_skills_set = {s["skill_name"].lower() for s in cand_skills_rows}

            # Calculate match: distinct required skills matched
            matched_skills = []
            missing_skills = []

            for r_lower, r_original in req_set_lower.items():
                if r_lower in cand_skills_set:
                    matched_skills.append(r_original)
                else:
                    missing_skills.append(r_original)

            matched_count = len(matched_skills)
            # Dynamic Formula (Section 8)
            match_pct = int(round((matched_count / total_required) * 100))

            # Match Categories
            if match_pct >= 80:
                match_category = "Excellent Match"
            elif match_pct >= 60:
                match_category = "Good Match"
            elif match_pct >= 40:
                match_category = "Partial Match"
            else:
                match_category = "Low Match"

            candidates.append({
                "user_id": cid,
                "name": cand["name"],
                "department": cand["department"],
                "semester": cand["semester"],
                "section": cand["section"],
                "bio": cand["bio"],
                "match_percentage": match_pct,
                "match_category": match_category,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "has_pending_invitation": has_pending
            })

        # Sort descending by match percentage, then candidate name
        candidates.sort(key=lambda c: (-c["match_percentage"], c["name"]))

    return render_template(
        "student/find_teammates.html",
        project=project,
        required_skills=required_skills,
        members=members,
        is_full=is_full,
        candidates=candidates
    )


# =====================================================================
# 6. Invitations & Team Membership (Module 7 & Section 9)
# =====================================================================

@app.route("/projects/<int:project_id>/invite", methods=["POST"])
@student_required
def send_invitation(project_id):
    user_id = session["user_id"]
    recipient_id = safe_int(request.form.get("recipient_id"), default=0)
    message = request.form.get("message", "").strip()[:1000]

    project = db.query_one("SELECT * FROM projects WHERE id = %s", (project_id,))
    if not project or project["owner_id"] != user_id:
        abort(403, description="Only the project owner can send invitations.")

    if project["status"] != "open":
        flash("Cannot invite: This project is currently closed.", "error")
        return redirect(url_for("find_teammates", project_id=project_id))

    # Check capacity
    member_count_row = db.query_one(
        "SELECT COUNT(*) as count FROM team_members WHERE project_id = %s",
        (project_id,)
    )
    member_count = member_count_row["count"] if member_count_row else 0
    if member_count >= project["max_members"]:
        flash("Cannot invite: Project team has reached maximum capacity.", "error")
        return redirect(url_for("find_teammates", project_id=project_id))

    # Check recipient eligibility
    recipient = db.query_one(
        "SELECT u.id, u.status, sp.name FROM users u JOIN student_profiles sp ON u.id = sp.user_id WHERE u.id = %s",
        (recipient_id,)
    )
    if not recipient or recipient["status"] != "approved":
        flash("Selected student account is not eligible.", "error")
        return redirect(url_for("find_teammates", project_id=project_id))

    # Check already member
    existing_member = db.query_one(
        "SELECT id FROM team_members WHERE project_id = %s AND student_id = %s",
        (project_id, recipient_id)
    )
    if existing_member:
        flash("Student is already a member of this project.", "warning")
        return redirect(url_for("find_teammates", project_id=project_id))

    # Reject duplicate pending invitations (Section 9)
    existing_inv = db.query_one(
        "SELECT id FROM invitations WHERE project_id = %s AND recipient_id = %s AND status = 'pending'",
        (project_id, recipient_id)
    )
    if existing_inv:
        flash("A pending invitation already exists for this student.", "warning")
        return redirect(url_for("find_teammates", project_id=project_id))

    # Insert invitation
    db.execute(
        """INSERT INTO invitations (project_id, sender_id, recipient_id, message, status)
           VALUES (%s, %s, %s, %s, 'pending')""",
        (project_id, user_id, recipient_id, message)
    )

    # Real notification (Section 12)
    owner_name = session.get("name", "Project Owner")
    create_notification(
        recipient_id,
        f"You have received an invitation from {owner_name} to join project '{project['title']}'."
    )

    flash(f"Invitation successfully sent to {recipient['name']}!", "success")
    return redirect(url_for("find_teammates", project_id=project_id))

@app.route("/invitations/<int:invitation_id>/respond", methods=["POST"])
@student_required
def respond_invitation(invitation_id):
    user_id = session["user_id"]
    action = request.form.get("action", "").strip().lower()
    fallback = url_for("received_invitations")
    next_page = safe_redirect_target(request.form.get("next") or request.referrer, fallback)

    if action not in ("accept", "reject"):
        flash("Invalid invitation response action.", "error")
        return redirect(next_page)

    invitation = db.query_one("SELECT * FROM invitations WHERE id = %s", (invitation_id,))
    if not invitation:
        abort(404, description="Invitation not found.")

    # A recipient can accept or reject only their own invitation (Section 9)
    if invitation["recipient_id"] != user_id:
        abort(403, description="Unauthorized response to this invitation.")

    if invitation["status"] != "pending":
        flash("This invitation has already been processed.", "info")
        return redirect(next_page)

    project = db.query_one("SELECT * FROM projects WHERE id = %s", (invitation["project_id"],))
    student_name = session.get("name", "Student")

    if action == "reject":
        db.execute(
            "UPDATE invitations SET status = 'rejected', decided_at = CURRENT_TIMESTAMP WHERE id = %s",
            (invitation_id,)
        )
        create_notification(
            invitation["sender_id"],
            f"{student_name} declined your invitation to join '{project['title']}'."
        )
        flash("Invitation rejected.", "info")
        return redirect(next_page)

    # Acceptance Workflow (Section 9: Recheck capacity, status, membership)
    if project["status"] != "open":
        flash("Cannot join: This project has been closed by the owner.", "error")
        return redirect(next_page)

    member_count_row = db.query_one(
        "SELECT COUNT(*) as count FROM team_members WHERE project_id = %s",
        (project["id"],)
    )
    member_count = member_count_row["count"] if member_count_row else 0
    if member_count >= project["max_members"]:
        flash("Cannot join: This project team has reached maximum capacity.", "error")
        return redirect(next_page)

    existing_member = db.query_one(
        "SELECT id FROM team_members WHERE project_id = %s AND student_id = %s",
        (project["id"], user_id)
    )
    if existing_member:
        flash("You are already a member of this project.", "info")
        return redirect(next_page)

    # Atomic creation of membership & invitation status update
    try:
        with db.transaction() as tx:
            tx.execute(
                "INSERT INTO team_members (project_id, student_id, role) VALUES (%s, %s, 'member')",
                (project["id"], user_id)
            )
            tx.execute(
                "UPDATE invitations SET status = 'accepted', decided_at = CURRENT_TIMESTAMP WHERE id = %s",
                (invitation_id,)
            )
        create_notification(
            invitation["sender_id"],
            f"{student_name} accepted your invitation and joined '{project['title']}'!"
        )
        flash(f"Success! You have joined '{project['title']}'.", "success")
    except Exception as e:
        flash(f"Error joining project: {e}", "error")

    return redirect(next_page)


@app.route("/invitations")
@app.route("/invitations/received")
@student_required
def received_invitations():
    user_id = session["user_id"]
    status_filter = request.args.get("status", "").strip().lower()
    if status_filter not in ("pending", "accepted", "rejected"):
        status_filter = "all"

    # Base query for invitations addressed to the logged-in student
    base_sql = """
        SELECT i.*, p.title as project_title, p.domain as project_domain,
               p.description as project_description, p.max_members, p.status as project_status,
               sp.name as owner_name, sp.department as owner_department,
               (SELECT COUNT(*) FROM team_members WHERE project_id = p.id) as current_member_count
        FROM invitations i
        JOIN projects p ON i.project_id = p.id
        JOIN users u ON i.sender_id = u.id
        JOIN student_profiles sp ON u.id = sp.user_id
        WHERE i.recipient_id = %s
    """
    params = [user_id]
    if status_filter in ("pending", "accepted", "rejected"):
        base_sql += " AND i.status = %s"
        params.append(status_filter)

    base_sql += " ORDER BY (CASE WHEN i.status = 'pending' THEN 1 ELSE 2 END), i.created_at DESC"
    invitations = db.query_all(base_sql, params)

    for inv in invitations:
        req_rows = db.query_all(
            "SELECT skill_name FROM project_required_skills WHERE project_id = %s",
            (inv["project_id"],)
        )
        inv["required_skills"] = [r["skill_name"] for r in req_rows]
        inv["available_slots"] = max(0, inv["max_members"] - inv["current_member_count"])
        inv["is_full"] = (inv["current_member_count"] >= inv["max_members"])

    # Query counts for all 3 filters + total
    counts_raw = db.query_all(
        """SELECT status, COUNT(*) as cnt
           FROM invitations
           WHERE recipient_id = %s
           GROUP BY status""",
        (user_id,)
    )
    counts = {"all": 0, "pending": 0, "accepted": 0, "rejected": 0}
    for r in counts_raw:
        st = r["status"]
        if st in counts:
            counts[st] = r["cnt"]
        counts["all"] += r["cnt"]

    return render_template(
        "student/received_invitations.html",
        invitations=invitations,
        status_filter=status_filter,
        counts=counts
    )


@app.route("/invitations/sent")
@student_required
def sent_invitations():
    user_id = session["user_id"]
    status_filter = request.args.get("status", "").strip().lower()
    if status_filter not in ("pending", "accepted", "rejected"):
        status_filter = "all"

    # Base query for invitations sent by the logged-in student
    base_sql = """
        SELECT i.*, p.title as project_title, p.domain as project_domain,
               p.description as project_description, p.max_members,
               sp.name as recipient_name, sp.department as recipient_department,
               sp.semester as recipient_semester, sp.section as recipient_section,
               sp.bio as recipient_bio,
               (SELECT COUNT(*) FROM team_members WHERE project_id = p.id) as current_member_count
        FROM invitations i
        JOIN projects p ON i.project_id = p.id
        JOIN users u ON i.recipient_id = u.id
        JOIN student_profiles sp ON u.id = sp.user_id
        WHERE i.sender_id = %s
    """
    params = [user_id]
    if status_filter in ("pending", "accepted", "rejected"):
        base_sql += " AND i.status = %s"
        params.append(status_filter)

    base_sql += " ORDER BY (CASE WHEN i.status = 'pending' THEN 1 ELSE 2 END), i.created_at DESC"
    invitations = db.query_all(base_sql, params)

    for inv in invitations:
        skills_rows = db.query_all(
            "SELECT skill_name FROM student_skills WHERE user_id = %s ORDER BY skill_name ASC",
            (inv["recipient_id"],)
        )
        inv["recipient_skills"] = [s["skill_name"] for s in skills_rows]

    # Query counts for all 3 filters + total
    counts_raw = db.query_all(
        """SELECT status, COUNT(*) as cnt
           FROM invitations
           WHERE sender_id = %s
           GROUP BY status""",
        (user_id,)
    )
    counts = {"all": 0, "pending": 0, "accepted": 0, "rejected": 0}
    for r in counts_raw:
        st = r["status"]
        if st in counts:
            counts[st] = r["cnt"]
        counts["all"] += r["cnt"]

    return render_template(
        "student/sent_invitations.html",
        invitations=invitations,
        status_filter=status_filter,
        counts=counts
    )


@app.route("/applications/<int:application_id>/decide", methods=["POST"])
@student_required
def decide_project_application(application_id):
    user_id = session["user_id"]
    action = request.form.get("action", "").strip().lower()

    if action not in ("accept", "reject"):
        flash("Invalid application decision.", "error")
        return redirect(url_for("student_dashboard"))

    app_record = db.query_one("SELECT * FROM project_applications WHERE id = %s", (application_id,))
    if not app_record:
        abort(404, description="Application not found.")

    # Only the project owner can accept or reject applications for their project
    if app_record["owner_id"] != user_id:
        abort(403, description="Only the project creator can accept or reject applications for this project.")

    if app_record["status"] != "pending":
        flash("This application has already been processed.", "info")
        return redirect(url_for("student_dashboard"))

    project = db.query_one("SELECT * FROM projects WHERE id = %s", (app_record["project_id"],))
    applicant_profile = db.query_one("SELECT * FROM student_profiles WHERE user_id = %s", (app_record["applicant_id"],))
    applicant_name = applicant_profile["name"] if applicant_profile else "Applicant"

    if action == "reject":
        db.execute(
            "UPDATE project_applications SET status = 'rejected', decided_at = CURRENT_TIMESTAMP WHERE id = %s",
            (application_id,)
        )
        create_notification(
            app_record["applicant_id"],
            f"Your application to join '{project['title']}' was declined by the project owner."
        )
        flash("Application rejected.", "info")
        return redirect(url_for("student_dashboard"))

    # Before accepting: verify project is open, sufficient capacity remains, student not already a member
    if project["status"] != "open":
        flash("Cannot accept applicant: This project is closed.", "error")
        return redirect(url_for("student_dashboard"))

    member_count_row = db.query_one(
        "SELECT COUNT(*) as count FROM team_members WHERE project_id = %s",
        (project["id"],)
    )
    member_count = member_count_row["count"] if member_count_row else 0
    if member_count >= project["max_members"]:
        flash("Cannot accept applicant: This project team has reached maximum capacity.", "error")
        return redirect(url_for("student_dashboard"))

    existing_member = db.query_one(
        "SELECT id FROM team_members WHERE project_id = %s AND student_id = %s",
        (project["id"], app_record["applicant_id"])
    )
    if existing_member:
        db.execute(
            "UPDATE project_applications SET status = 'accepted', decided_at = CURRENT_TIMESTAMP WHERE id = %s",
            (application_id,)
        )
        flash(f"{applicant_name} is already a member of this project.", "info")
        return redirect(url_for("student_dashboard"))

    # Accept applicant atomically using transaction
    try:
        with db.transaction() as tx:
            tx.execute(
                "INSERT INTO team_members (project_id, student_id, role) VALUES (%s, %s, 'member')",
                (project["id"], app_record["applicant_id"])
            )
            tx.execute(
                "UPDATE project_applications SET status = 'accepted', decided_at = CURRENT_TIMESTAMP WHERE id = %s",
                (application_id,)
            )

        create_notification(
            app_record["applicant_id"],
            f"Congratulations! Your application to join '{project['title']}' was accepted by the project owner!"
        )
        flash(f"Application accepted! {applicant_name} has been added to '{project['title']}'.", "success")
    except Exception as e:
        flash(f"Error accepting application: {e}", "error")

    return redirect(url_for("student_dashboard"))


@app.route("/projects/<int:project_id>/originality-check", methods=["GET", "POST"])
@student_required
def recheck_project_originality(project_id):
    user_id = session["user_id"]
    project = db.query_one("SELECT * FROM projects WHERE id = %s", (project_id,))
    if not project:
        abort(404, description="Project not found.")

    if project["owner_id"] != user_id:
        abort(403, description="Only the project owner can check originality for this project.")

    # Redirect to the main originality checker prefilled with this project, excluding it from self-comparison
    return redirect(url_for("originality_checker", project_id=project_id, title=project["title"], description=project["description"]))


# =====================================================================
# 7. Student Dashboard (Module 8 & Section 10)
# =====================================================================

@app.route("/student/dashboard")
@student_required
def student_dashboard():
    user_id = session["user_id"]
    profile = db.query_one("SELECT * FROM student_profiles WHERE user_id = %s", (user_id,))

    # 1. Projects I Lead
    projects_lead = db.query_all(
        """SELECT p.*,
                  (SELECT COUNT(*) FROM team_members WHERE project_id = p.id) as member_count
           FROM projects p
           WHERE p.owner_id = %s
           ORDER BY p.created_at DESC""",
        (user_id,)
    )
    for p in projects_lead:
        s_rows = db.query_all("SELECT skill_name FROM project_required_skills WHERE project_id = %s", (p["id"],))
        p["required_skills"] = [s["skill_name"] for s in s_rows]

    # 2. Projects I've Joined
    projects_joined = db.query_all(
        """SELECT p.*, sp.name as owner_name,
                  (SELECT COUNT(*) FROM team_members WHERE project_id = p.id) as member_count
           FROM team_members tm
           JOIN projects p ON tm.project_id = p.id
           JOIN users u ON p.owner_id = u.id
           JOIN student_profiles sp ON u.id = sp.user_id
           WHERE tm.student_id = %s AND tm.role = 'member'
           ORDER BY tm.joined_at DESC""",
        (user_id,)
    )

    # 3. Project Applications Received
    applications_received = db.query_all(
        """SELECT a.*, p.title as project_title, p.max_members,
                  sp.name as applicant_name, sp.department as applicant_department,
                  sp.semester as applicant_semester, sp.section as applicant_section,
                  (SELECT COUNT(*) FROM team_members WHERE project_id = p.id) as current_member_count
           FROM project_applications a
           JOIN projects p ON a.project_id = p.id
           JOIN users u ON a.applicant_id = u.id
           JOIN student_profiles sp ON u.id = sp.user_id
           WHERE a.owner_id = %s
           ORDER BY (CASE WHEN a.status = 'pending' THEN 1 ELSE 2 END), a.created_at DESC""",
        (user_id,)
    )
    for app_item in applications_received:
        app_skills_rows = db.query_all(
            "SELECT skill_name FROM student_skills WHERE user_id = %s ORDER BY skill_name ASC",
            (app_item["applicant_id"],)
        )
        app_skills = [s["skill_name"] for s in app_skills_rows]
        app_item["applicant_skills"] = app_skills
        app_skills_set = {s.lower() for s in app_skills}

        req_rows = db.query_all(
            "SELECT skill_name FROM project_required_skills WHERE project_id = %s",
            (app_item["project_id"],)
        )
        req_skills = [r["skill_name"] for r in req_rows]
        if req_skills:
            matched = [s for s in req_skills if s.lower() in app_skills_set]
            match_pct = int(round((len(matched) / len(req_skills)) * 100))
            if match_pct >= 80:
                m_rating = "Excellent Match"
            elif match_pct >= 60:
                m_rating = "Good Match"
            elif match_pct >= 40:
                m_rating = "Partial Match"
            else:
                m_rating = "Low Match"
            app_item["match_percentage"] = match_pct
            app_item["match_rating"] = m_rating
        else:
            app_item["match_percentage"] = 0
            app_item["match_rating"] = "N/A"

    # 4. My Submitted Applications
    my_applications = db.query_all(
        """SELECT a.*, p.title as project_title, sp.name as owner_name
           FROM project_applications a
           JOIN projects p ON a.project_id = p.id
           JOIN users u ON a.owner_id = u.id
           JOIN student_profiles sp ON u.id = sp.user_id
           WHERE a.applicant_id = %s
           ORDER BY a.created_at DESC""",
        (user_id,)
    )

    # 5. Invitations Received
    invitations = db.query_all(
        """SELECT i.*, p.title as project_title, sp.name as sender_name
           FROM invitations i
           JOIN projects p ON i.project_id = p.id
           JOIN users u ON i.sender_id = u.id
           JOIN student_profiles sp ON u.id = sp.user_id
           WHERE i.recipient_id = %s
           ORDER BY i.created_at DESC""",
        (user_id,)
    )

    # 6. Automatic Originality Check Results for Projects I Lead
    originality_checks = db.query_all(
        """SELECT oc.*, p.title as project_title
           FROM project_originality_checks oc
           JOIN projects p ON oc.project_id = p.id
           WHERE oc.checked_by = %s
           ORDER BY oc.created_at DESC""",
        (user_id,)
    )

    # 7. Notifications
    notifications = db.query_all(
        "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC LIMIT 15",
        (user_id,)
    )

    # 8. Task Progress for authorized projects
    my_tasks = db.query_all(
        """SELECT t.*, p.title as project_title, sp.name as assignee_name
           FROM tasks t
           JOIN projects p ON t.project_id = p.id
           JOIN team_members tm ON p.id = tm.project_id
           LEFT JOIN users u ON t.assigned_to = u.id
           LEFT JOIN student_profiles sp ON u.id = sp.user_id
           WHERE tm.student_id = %s
           ORDER BY t.created_at DESC LIMIT 10""",
        (user_id,)
    )

    return render_template(
        "student/dashboard.html",
        profile=profile,
        projects_lead=projects_lead,
        projects_joined=projects_joined,
        applications_received=applications_received,
        my_applications=my_applications,
        originality_checks=originality_checks,
        invitations=invitations,
        notifications=notifications,
        my_tasks=my_tasks
    )


# =====================================================================
# 8. Project Workspace & Tasks (Module 9 & Section 11)
# =====================================================================

@app.route("/projects/<int:project_id>/workspace")
@student_required
def project_workspace(project_id):
    user_id = session["user_id"]

    # Only authorized project members may view the workspace (Section 11)
    membership = db.query_one(
        "SELECT * FROM team_members WHERE project_id = %s AND student_id = %s",
        (project_id, user_id)
    )
    if not membership:
        abort(403, description="Access restricted: You are not an accepted member of this project.")

    project = db.query_one(
        """SELECT p.*, sp.name as owner_name
           FROM projects p
           JOIN users u ON p.owner_id = u.id
           JOIN student_profiles sp ON u.id = sp.user_id
           WHERE p.id = %s""",
        (project_id,)
    )
    if not project:
        abort(404, description="Project not found.")

    is_owner = (project["owner_id"] == user_id)

    # Team members
    members = db.query_all(
        """SELECT tm.*, sp.name, sp.department, sp.semester
           FROM team_members tm
           JOIN student_profiles sp ON tm.student_id = sp.user_id
           WHERE tm.project_id = %s
           ORDER BY (tm.student_id = %s) DESC, sp.name ASC""",
        (project_id, project["owner_id"])
    )

    # Required skills
    req_skills = [
        r["skill_name"] for r in
        db.query_all("SELECT skill_name FROM project_required_skills WHERE project_id = %s", (project_id,))
    ]

    # Tasks
    tasks = db.query_all(
        """SELECT t.*, sp.name as assignee_name
           FROM tasks t
           LEFT JOIN users u ON t.assigned_to = u.id
           LEFT JOIN student_profiles sp ON u.id = sp.user_id
           WHERE t.project_id = %s
           ORDER BY t.created_at DESC""",
        (project_id,)
    )

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t["status"] == "completed")
    progress_pct = int(round((completed_tasks / total_tasks) * 100)) if total_tasks > 0 else 0

    return render_template(
        "student/workspace.html",
        project=project,
        is_owner=is_owner,
        members=members,
        required_skills=req_skills,
        tasks=tasks,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        progress_pct=progress_pct
    )

@app.route("/projects/<int:project_id>/finalize-team", methods=["GET", "POST"])
@student_required
def finalize_team(project_id):
    user_id = session["user_id"]

    project = db.query_one(
        """SELECT p.*, sp.name as owner_name
           FROM projects p
           JOIN users u ON p.owner_id = u.id
           JOIN student_profiles sp ON u.id = sp.user_id
           WHERE p.id = %s""",
        (project_id,)
    )
    if not project:
        abort(404, description="Project not found.")

    if project["owner_id"] != user_id:
        flash("Only the project leader can finalize the team and assign roles.", "error")
        return redirect(url_for("project_workspace", project_id=project_id))

    if request.method == "POST":
        # 1. Team Completed: retrieve confirmed members belonging to this team
        member_rows = db.query_all(
            "SELECT student_id FROM team_members WHERE project_id = %s",
            (project_id,)
        )
        valid_member_ids = {m["student_id"] for m in member_rows}

        if not valid_member_ids:
            flash("No confirmed team members found for this project.", "error")
            return redirect(url_for("project_workspace", project_id=project_id))

        # 2. Assign Roles: validate and save role assignments to MySQL
        for s_id in valid_member_ids:
            role_choice = request.form.get(f"role_{s_id}", "").strip()
            custom_role = request.form.get(f"custom_role_{s_id}", "").strip()

            if role_choice == "Custom":
                assigned_role = custom_role if custom_role else "Specialist"
            elif role_choice:
                assigned_role = role_choice
            else:
                assigned_role = "Member"

            db.execute(
                "UPDATE team_members SET role = %s WHERE project_id = %s AND student_id = %s",
                (assigned_role, project_id, s_id)
            )

        # 3. Assign Tasks: validate and save new tasks with priority and deadline
        titles = request.form.getlist("new_task_title[]")
        assignees = request.form.getlist("new_task_assignee[]")
        priorities = request.form.getlist("new_task_priority[]")
        deadlines = request.form.getlist("new_task_deadline[]")
        descs = request.form.getlist("new_task_desc[]")

        created_tasks_count = 0
        for i in range(len(titles)):
            task_title = titles[i].strip() if i < len(titles) else ""
            if not task_title:
                continue

            assignee_val = assignees[i].strip() if i < len(assignees) else ""
            assignee_id = None
            if assignee_val:
                try:
                    aid = int(assignee_val)
                    if aid in valid_member_ids:
                        assignee_id = aid
                except (ValueError, TypeError):
                    assignee_id = None

            priority_val = priorities[i].strip().lower() if i < len(priorities) else "medium"
            if priority_val not in ("low", "medium", "high"):
                priority_val = "medium"

            deadline_val = deadlines[i].strip() if i < len(deadlines) else ""
            deadline_str = deadline_val if deadline_val else None

            task_desc = descs[i].strip() if i < len(descs) else ""

            db.execute(
                """INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, deadline, created_by)
                   VALUES (%s, %s, %s, %s, 'to_do', %s, %s, %s)""",
                (project_id, task_title, task_desc, assignee_id, priority_val, deadline_str, user_id)
            )
            created_tasks_count += 1

            if assignee_id and assignee_id != user_id:
                create_notification(
                    assignee_id,
                    f"You have been assigned task '{task_title}' for project '{project['title']}'."
                )

        # 4. Save to MySQL & Publish Project
        publish_now = request.form.get("publish_now", "0") in ("1", "true", "True")
        if publish_now:
            db.execute(
                "UPDATE projects SET is_published = 1, published_at = CURRENT_TIMESTAMP WHERE id = %s",
                (project_id,)
            )
            for s_id in valid_member_ids:
                if s_id != user_id:
                    create_notification(
                        s_id,
                        f"Project '{project['title']}' has been finalized and published! It is now featured on your student profile."
                    )
            success_msg = f"Project '{project['title']}' has been finalized, saved to the database, and successfully published to participating students' profiles!"
        else:
            success_msg = f"Roles and tasks for '{project['title']}' have been saved as draft."

        is_ajax = (request.headers.get("X-Requested-With") == "XMLHttpRequest" or
                   request.content_type == "application/json" or
                   request.accept_mimetypes.best == "application/json")

        if is_ajax:
            return jsonify({
                "success": True,
                "message": success_msg,
                "redirect_url": url_for("project_workspace", project_id=project_id)
            })
        else:
            flash(success_msg, "success")
            return redirect(url_for("project_workspace", project_id=project_id))

    # GET: Retrieve confirmed members & existing tasks
    members = db.query_all(
        """SELECT tm.*, sp.name, sp.department, sp.semester
           FROM team_members tm
           JOIN student_profiles sp ON tm.student_id = sp.user_id
           WHERE tm.project_id = %s
           ORDER BY (tm.student_id = %s) DESC, sp.name ASC""",
        (project_id, user_id)
    )

    existing_tasks = db.query_all(
        """SELECT t.*, sp.name as assignee_name
           FROM tasks t
           LEFT JOIN users u ON t.assigned_to = u.id
           LEFT JOIN student_profiles sp ON u.id = sp.user_id
           WHERE t.project_id = %s
           ORDER BY t.created_at DESC""",
        (project_id,)
    )

    return render_template(
        "student/finalize_team.html",
        project=project,
        members=members,
        existing_tasks=existing_tasks
    )

@app.route("/projects/<int:project_id>/tasks/create", methods=["POST"])
@student_required
def create_task(project_id):
    user_id = session["user_id"]

    # Verify authorization
    membership = db.query_one(
        "SELECT id FROM team_members WHERE project_id = %s AND student_id = %s",
        (project_id, user_id)
    )
    if not membership:
        abort(403, description="Unauthorized to add tasks to this project.")

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    assigned_to_raw = request.form.get("assigned_to", "")
    status = request.form.get("status", "to_do")
    priority = request.form.get("priority", "medium").strip().lower()
    if priority not in ("low", "medium", "high"):
        priority = "medium"
    deadline_raw = request.form.get("deadline", "").strip()
    deadline = deadline_raw if deadline_raw else None

    if not title:
        flash("Task title is required.", "error")
        return redirect(url_for("project_workspace", project_id=project_id))

    assigned_to = None
    if assigned_to_raw:
        assigned_to = safe_int(assigned_to_raw, default=None)
        # Verify assignee is an authorized member of this project
        assignee_member = db.query_one(
            "SELECT id FROM team_members WHERE project_id = %s AND student_id = %s",
            (project_id, assigned_to)
        )
        if not assignee_member:
            flash("Selected assignee is not an authorized project member.", "error")
            return redirect(url_for("project_workspace", project_id=project_id))

    db.execute(
        """INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, deadline, created_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (project_id, title, description, assigned_to, status, priority, deadline, user_id)
    )

    # Real notification on assignment (Section 12)
    if assigned_to and assigned_to != user_id:
        project = db.query_one("SELECT title FROM projects WHERE id = %s", (project_id,))
        create_notification(
            assigned_to,
            f"You were assigned task '{title}' in project '{project['title']}'."
        )

    flash("Task created successfully.", "success")
    return redirect(url_for("project_workspace", project_id=project_id))

@app.route("/tasks/<int:task_id>/status", methods=["POST"])
@student_required
def update_task_status(task_id):
    user_id = session["user_id"]
    new_status = request.form.get("status", "").strip()

    if new_status not in ("to_do", "in_progress", "completed"):
        flash("Invalid task status.", "error")
        return redirect(url_for("student_dashboard"))

    task = db.query_one("SELECT * FROM tasks WHERE id = %s", (task_id,))
    if not task:
        abort(404, description="Task not found.")

    # Verify authorization
    membership = db.query_one(
        "SELECT id FROM team_members WHERE project_id = %s AND student_id = %s",
        (task["project_id"], user_id)
    )
    if not membership:
        abort(403, description="Unauthorized to update this task.")

    db.execute("UPDATE tasks SET status = %s WHERE id = %s", (new_status, task_id))
    flash("Task status updated.", "info")
    return redirect(url_for("project_workspace", project_id=task["project_id"]))


# =====================================================================
# 9. Originality Checker & Web Evidence Engine (Modules 10 & 13)
# =====================================================================

def search_college_projects(title: str, description: str = "", exclude_project_id: int = None) -> list:
    """
    Compares the submitted project concept against all eligible student project records stored in MySQL/SQLite.
    - Excludes exclude_project_id if specified (no self-comparison).
    - Includes projects across all academic years, whether open, in-progress, or closed.
    - Compares titles, descriptions, categories/domains, and technical stacks.
    - Never exposes source code, private team discussions, or confidential student details.
    """
    if exclude_project_id:
        projects = db.query_all(
            """SELECT p.id, p.title, p.description, p.domain, p.status, p.created_at, sp.name as owner_name
               FROM projects p
               JOIN users u ON p.owner_id = u.id
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE p.id != %s
               ORDER BY p.created_at DESC""",
            (exclude_project_id,)
        )
    else:
        projects = db.query_all(
            """SELECT p.id, p.title, p.description, p.domain, p.status, p.created_at, sp.name as owner_name
               FROM projects p
               JOIN users u ON p.owner_id = u.id
               JOIN student_profiles sp ON u.id = sp.user_id
               ORDER BY p.created_at DESC"""
        )

    input_tokens = tokenize_text(title + " " + (description or ""))
    college_matches = []

    for p in projects:
        skills = db.query_all(
            "SELECT skill_name FROM project_required_skills WHERE project_id = %s",
            (p["id"],)
        )
        tech_list = [s["skill_name"] for s in skills]
        tech_str = ", ".join(tech_list)

        combined_target = p["title"] + " " + (p["description"] or "") + " " + (p["domain"] or "") + " " + tech_str
        target_tokens = tokenize_text(combined_target)

        union_tokens = input_tokens.union(target_tokens)
        if union_tokens:
            intersection_tokens = input_tokens.intersection(target_tokens)
            jaccard = len(intersection_tokens) / len(union_tokens)
            score_pct = int(round(jaccard * 100))
        else:
            score_pct = 0

        # Ratings (Section 6 & 11)
        if score_pct >= 70:
            level = "High Similarity"
        elif score_pct >= 40:
            level = "Moderate Similarity"
        else:
            level = "Low Similarity"

        college_matches.append({
            "id": p["id"],
            "title": p["title"],
            "description": p["description"],
            "domain": p["domain"],
            "technologies": tech_str,
            "status": p["status"],
            "owner_name": p["owner_name"],
            "score": score_pct,
            "level": level
        })

    # Sort descending by similarity score
    college_matches.sort(key=lambda m: (-m["score"], m["title"]))
    return college_matches


def search_external_projects(title: str, description: str = "", max_results: int = 5) -> tuple:
    """
    Searches external sources (public open-source software project repositories and configurable search APIs)
    using the submitted title and key descriptive phrases.
    Returns (results_list, error_message).
    """
    raw_words = re.findall(r"[a-zA-Z0-9]+", title.lower())
    kw = [w for w in raw_words if w not in STOPWORDS and len(w) > 2]
    if not kw:
        desc_words = re.findall(r"[a-zA-Z0-9]+", (description or "").lower())
        kw = [w for w in desc_words if w not in STOPWORDS and len(w) > 2][:4]

    query_str = " ".join(kw[:5]) if kw else title.strip()
    q = urllib.parse.quote_plus(query_str)
    url = f"https://api.github.com/search/repositories?q={q}+in:name,description&sort=stars&order=desc&per_page={max_results}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "StudentProjectFinder/2.0 (Academic Idea Originality Checker)",
            "Accept": "application/vnd.github.v3+json"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("items", [])
            results = []
            input_tokens = tokenize_text(title + " " + (description or ""))

            for item in items[:max_results]:
                name = item.get("name", "").replace("-", " ").replace("_", " ").title()
                raw_desc = (item.get("description") or "").strip()
                desc = raw_desc[:280] if raw_desc else f"Public open-source repository ({item.get('language') or 'Software Architecture'})."

                # Calculate Jaccard similarity estimate only when sufficient text is retrieved
                ext_tokens = tokenize_text(name + " " + desc)
                if len(ext_tokens) >= 3 and len(input_tokens) > 0:
                    union_len = len(input_tokens.union(ext_tokens))
                    intersection_len = len(input_tokens.intersection(ext_tokens))
                    sim_pct = int(round((intersection_len / union_len) * 100)) if union_len > 0 else 0
                else:
                    sim_pct = None

                results.append({
                    "title": name,
                    "source_website": "GitHub Public Repositories",
                    "domain": "github.com",
                    "url": item.get("html_url", ""),
                    "snippet": desc,
                    "stars": item.get("stargazers_count", 0),
                    "language": item.get("language") or "General",
                    "similarity_percentage": sim_pct
                })
            return (results, None)
    except Exception as e:
        return ([], str(e))


def generate_idea_enhancements(title: str, description: str, college_matches: list, external_matches: list) -> dict:
    """
    Generates meaningful, feasible unique features and a concrete suggested improved project idea
    tailored specifically to the submitted concept, college similarities, and external evidence.
    """
    combined_text = (title + " " + (description or "")).lower()
    tokens = tokenize_text(combined_text)

    is_attendance = any(w in tokens for w in ["attendance", "rollcall", "absent", "presence", "roll", "biometric"])
    is_resume_hiring = any(w in tokens for w in ["resume", "cv", "hiring", "recruitment", "job", "applicant", "career"])
    is_campus_event = any(w in tokens for w in ["campus", "event", "seminar", "workshop", "college", "club", "fest"])
    is_ecommerce = any(w in tokens for w in ["ecommerce", "shop", "cart", "product", "store", "payment", "inventory", "order"])
    is_healthcare = any(w in tokens for w in ["health", "medical", "hospital", "patient", "doctor", "disease", "clinic"])
    is_security = any(w in tokens for w in ["security", "cyber", "crypto", "encryption", "auth", "firewall", "vulnerability"])

    unique_features = []

    if is_attendance:
        unique_features.append({
            "feature": "Dynamic Time-Limited QR Codes with Classroom Geofencing",
            "motivation": "Existing attendance systems rely on static ID scans or credentials that allow buddy punching and proxy check-ins.",
            "uniqueness": "Generates refreshing 15-second OTP QR codes bound to the classroom Wi-Fi IP and GPS radius.",
            "user_relevance": "Prevents unauthorized proxies while speeding up roll-call for faculty across 60+ students.",
            "feasibility": "Easily implemented in Python Flask with HTML5 Geolocation API and Python qrcode library."
        })
        unique_features.append({
            "feature": "Automated Low-Attendance Risk Alerts & SMS Escalation",
            "motivation": "Standard systems only display tables without proactively alerting students before falling below the 75% cutoff.",
            "uniqueness": "Predicts absenteeism patterns and triggers automated notifications to students and faculty mentors.",
            "user_relevance": "Ensures students are warned in advance before semester exam eligibility deadlines.",
            "feasibility": "Scheduled background jobs using Python and email/webhook alerts."
        })
        unique_features.append({
            "feature": "Offline Batch Roll-Call with Background Sync",
            "motivation": "Campus classrooms frequently suffer from dead zones and unstable mobile connectivity.",
            "uniqueness": "Allows teachers to mark attendance offline in browser storage, auto-syncing when network returns.",
            "user_relevance": "Ensures no roll-call disruptions even during campus internet outages.",
            "feasibility": "Standard vanilla JavaScript Service Worker and LocalStorage queue."
        })
        unique_features.append({
            "feature": "Multi-Factor Biometric Verification Fallback",
            "motivation": "Face recognition or card taps alone fail on low-light cameras or misplaced student RFID tags.",
            "uniqueness": "Provides multi-mode verification (Facial verification with Bluetooth beacon fallback).",
            "user_relevance": "Guarantees 100% check-in reliability in crowded lecture halls.",
            "feasibility": "Lightweight client-side face-api.js or OpenCV Python backend."
        })
        revised_title = f"{title.strip()} with Geofenced Dynamic QR & Offline Sync"
        revised_description = (
            f"An advanced evolution of {title.strip()} featuring dynamic rotating QR codes with classroom "
            f"geofencing to eliminate proxy check-ins, offline roll-call synchronization for connectivity dead zones, "
            f"and automated proactive eligibility warnings for academic advisors."
        )
        differentiators = [
            "Time-limited rotating QR codes bound to classroom GPS radius to prevent proxy check-ins",
            "Offline-first client synchronization ensuring zero downtime during campus network dead zones",
            "Automated predictive low-attendance alerts sent to students before exam cutoffs",
            "Comprehensive visual attendance trend analytics for departmental heads"
        ]

    elif is_resume_hiring:
        unique_features.append({
            "feature": "Explainable Matching Breakdown & Skill Gap Roadmap",
            "motivation": "Existing resume matchers give a flat score without explaining why a candidate fell short.",
            "uniqueness": "Highlights exact missing competencies and suggests specific free certifications or learning paths.",
            "user_relevance": "Helps students understand how to upgrade their resumes rather than just receiving rejections.",
            "feasibility": "Keyword intersection analysis mapped against predefined curriculum skill ontologies."
        })
        unique_features.append({
            "feature": "Blind / Anonymous Resume Screening Mode",
            "motivation": "Standard ATS platforms show personal identifiers that can introduce unconscious demographic bias.",
            "uniqueness": "Redacts candidate names, photos, gender, and addresses during initial recruiter shortlisting.",
            "user_relevance": "Promotes fair merit-based evaluation and equal opportunities for all graduates.",
            "feasibility": "Regex-based PII mask prior to recruiter evaluation view."
        })
        unique_features.append({
            "feature": "Multi-Format Parsing (PDF, DOCX, TXT, Scanned Images)",
            "motivation": "Many applicant systems fail when students upload non-standard document formats.",
            "uniqueness": "Dual-engine extraction with OCR fallback for graphical or LaTeX resume layouts.",
            "user_relevance": "Ensures no candidate is disqualified due to resume layout formatting variations.",
            "feasibility": "Python pdfplumber and Tesseract OCR integration."
        })
        unique_features.append({
            "feature": "Interactive Interview Question Generator",
            "motivation": "Recruiters and students need targeted technical questions based on the candidate's stated projects.",
            "uniqueness": "Generates customized interview prompts targeting the specific libraries and frameworks found on the CV.",
            "user_relevance": "Provides high-value interview preparation for student applicants and technical interviewers.",
            "feasibility": "Rule-based skill prompt mapping in Flask backend."
        })
        revised_title = f"{title.strip()} with Skill Gap Roadmaps & Bias-Free Screening"
        revised_description = (
            f"An intelligent candidate ranking system incorporating explainable skill gap roadmaps for applicants, "
            f"anonymized blind evaluation to prevent screening bias, and multi-format ATS extraction with OCR fallback."
        )
        differentiators = [
            "Explainable skill gap analysis providing actionable learning roadmaps for unmatched skills",
            "Anonymized blind evaluation mode to eliminate demographic recruitment bias",
            "Multi-format ATS parsing supporting both digital PDFs and graphic resume templates",
            "Targeted technical interview prompt generation based on extracted project proficiencies"
        ]

    elif is_campus_event:
        unique_features.append({
            "feature": "Interactive Venue Navigation & Heatmap",
            "motivation": "Existing campus portals only list dates without indoor maps or crowd status.",
            "uniqueness": "Interactive campus floorplan showing real-time workshop room locations and crowd density.",
            "user_relevance": "Prevents students from getting lost in large multi-block engineering campus auditoriums.",
            "feasibility": "SVG floorplans rendered in vanilla JavaScript with coordinates."
        })
        unique_features.append({
            "feature": "Peer Skill-Matching for Hackathons & Team Events",
            "motivation": "Event platforms handle registration but leave participants stranded looking for balanced teams.",
            "uniqueness": "Automated teammate recommendation pairing developers, designers, and domain experts.",
            "user_relevance": "Boosts student participation by helping solo attendees find complementary teams.",
            "feasibility": "Skill Jaccard matching using the existing student profile skills table."
        })
        unique_features.append({
            "feature": "Instant Digital Certificate Issuance with Cryptographic Verification",
            "motivation": "Paper certificates take weeks to distribute and are difficult for employers to verify.",
            "uniqueness": "Issues digitally signed PDF participation certificates with unique QR verification URLs.",
            "user_relevance": "Students can immediately embed verified certificates on LinkedIn or digital portfolios.",
            "feasibility": "ReportLab PDF generation and sha256 certificate hash verification in Flask."
        })
        unique_features.append({
            "feature": "Real-Time Q&A and Upvoting for Live Sessions",
            "motivation": "Audience questions in large auditoriums are chaotic and often dominated by a few voices.",
            "uniqueness": "Live question queue where attendees upvote the most relevant questions for keynote speakers.",
            "user_relevance": "Fosters engaging, democratic interaction during campus seminars and tech talks.",
            "feasibility": "REST polling or Server-Sent Events in vanilla JavaScript."
        })
        revised_title = f"{title.strip()} with Teammate Matching & Digital Certificate Verification"
        revised_description = (
            f"A comprehensive campus engagement hub featuring automated peer skill-matching for hackathons, "
            f"cryptographically verifiable instant digital certificates, and interactive venue navigation."
        )
        differentiators = [
            "Peer skill-matching algorithm to form balanced teams for campus hackathons and competitions",
            "Automated cryptographic verification and instant PDF certificate generation",
            "Interactive campus block navigation with event room routing",
            "Audience Q&A upvoting queue for technical keynote sessions"
        ]

    else:
        unique_features.append({
            "feature": "Role-Based Granular Access & Audit Logging",
            "motivation": "Generic projects frequently lack separation of privileges between administrators, coordinators, and students.",
            "uniqueness": "Strict role-based access control with tamper-evident timestamped audit trails.",
            "user_relevance": "Ensures institutional accountability and meets institutional data privacy requirements.",
            "feasibility": "Flask decorators and dedicated audit logs table in MySQL."
        })
        unique_features.append({
            "feature": "Offline-First Data Entry with Auto-Synchronization",
            "motivation": "Most web apps fail completely when network connectivity drops momentarily.",
            "uniqueness": "Caches form submissions in client storage and transmits them seamlessly when connection restores.",
            "user_relevance": "Provides reliable uninterrupted user experience on mobile and desktop networks.",
            "feasibility": "Vanilla JS LocalStorage queue and window online/offline event listeners."
        })
        unique_features.append({
            "feature": "Real-Time Visual Analytics & Exportable Reports",
            "motivation": "Existing systems trap records in raw tables without high-level actionable insights.",
            "uniqueness": "Custom interactive metrics dashboard with one-click PDF and CSV export capabilities.",
            "user_relevance": "Empowers coordinators and managers to make data-driven administrative decisions.",
            "feasibility": "Lightweight CSS/Canvas charting and standard CSV generation in Flask."
        })
        unique_features.append({
            "feature": "Multilingual UI Localization Support",
            "motivation": "Systems designed only in English exclude non-native regional language users.",
            "uniqueness": "Supports seamless switching between English and regional language UI interfaces.",
            "user_relevance": "Greatly expands accessibility for diverse student and faculty demographics.",
            "feasibility": "Client-side JSON localization dictionaries in vanilla JavaScript."
        })
        revised_title = f"{title.strip()} with Offline-First Sync & Analytics"
        revised_description = (
            f"An enhanced implementation of {title.strip()} integrating offline-first data caching with automatic "
            f"synchronization, granular role-based audit logging, and actionable visual reporting."
        )
        differentiators = [
            "Offline-first client caching ensuring uninterrupted workflow during network drops",
            "Detailed administrative audit trails recording timestamped operational events",
            "Visual analytics dashboard with exportable departmental summaries",
            "Accessible multilingual user interface supporting regional languages"
        ]

    diff_explanation = (
        f"While existing projects in this domain typically deliver basic record management and static CRUD interfaces, "
        f"this proposed enhanced version differentiates itself by introducing proactive automation, robust offline capabilities, "
        f"and verifiable output metrics that directly address the gaps identified in related implementations."
    )

    return {
        "unique_features": unique_features,
        "revised_title": revised_title,
        "revised_description": revised_description,
        "differentiators": differentiators,
        "differentiation_explanation": diff_explanation
    }


@app.route("/originality", methods=["GET", "POST"])
@student_required
def originality_checker():
    user_id = session["user_id"]
    checked = False
    title = ""
    description = ""
    exclude_project_id = None
    college_matches = []
    external_matches = []
    external_error = None
    highest_college_score = 0
    highest_external_score = 0
    case_type = "D"
    case_title = ""
    case_message = ""
    case_badge_class = "badge-success"
    enhancements = None
    check_id = None

    # Load student's own projects for optional self-comparison exclusion
    my_projects = db.query_all(
        "SELECT id, title, description, domain FROM projects WHERE owner_id = %s ORDER BY created_at DESC",
        (user_id,)
    )

    # Load recent originality checks history for this student (Section 13)
    recent_checks = db.query_all(
        """SELECT * FROM originality_checks
           WHERE student_id = %s
           ORDER BY checked_at DESC LIMIT 5""",
        (user_id,)
    )

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        project_id_raw = request.form.get("project_id", "")
        exclude_project_id = safe_int(project_id_raw, default=None) if project_id_raw else None

        if len(title) < 3:
            flash("Please enter a proposed project title of at least 3 characters.", "warning")
            return render_template(
                "student/originality.html",
                checked=False,
                title=title,
                description=description,
                my_projects=my_projects,
                recent_checks=recent_checks
            )

        if len(description) < 10:
            flash("Please enter a concept or problem overview of at least 10 characters.", "warning")
            return render_template(
                "student/originality.html",
                checked=False,
                title=title,
                description=description,
                my_projects=my_projects,
                recent_checks=recent_checks
            )

        checked = True

        # 1. Search College Projects in MySQL/SQLite
        college_matches = search_college_projects(title, description, exclude_project_id)
        if college_matches:
            highest_college_score = college_matches[0]["score"]

        # 2. Search External Web Repositories
        external_matches, external_error = search_external_projects(title, description, max_results=5)
        if external_matches:
            ext_scores = [em["similarity_percentage"] for em in external_matches if em.get("similarity_percentage") is not None]
            highest_external_score = max(ext_scores) if ext_scores else 0

        # 3. Determine Case (Section 8)
        has_college_match = any(m["score"] >= 40 for m in college_matches)
        has_external_match = len(external_matches) > 0

        if has_college_match and has_external_match:
            case_type = "A"
            case_title = "Similar Projects Found in College & External Repositories"
            case_message = (
                "A similar project already exists in your college, and related project implementations exist in external web repositories. "
                "Review the existing college project and external sources below, and consider substantially differentiating your proposed system before proceeding."
            )
            case_badge_class = "badge-danger" if highest_college_score >= 70 else "badge-warning"

        elif not has_college_match and has_external_match:
            case_type = "B"
            case_title = "External Ideas Found — No Close College Match"
            case_message = (
                "Related project ideas were found outside your college, but no sufficiently similar project was found in the college records searched. "
                "Consider adding distinctive features, targeting a specific user group or solving a more specific problem."
            )
            case_badge_class = "badge-primary"

        elif has_college_match and not has_external_match and not external_error:
            case_type = "C"
            case_title = "Similar Project Exists in Your College"
            case_message = (
                "A similar project already exists in your college. Review the existing project and consider improving the functionality, "
                "solving a different problem or introducing meaningful features before proceeding. Note: External search did not return sufficiently close matches."
            )
            case_badge_class = "badge-danger" if highest_college_score >= 70 else "badge-warning"

        elif not has_college_match and not has_external_match and not external_error:
            case_type = "D"
            case_title = "No Close Matches Found in College Records or External Repositories"
            case_message = (
                "No sufficiently similar projects were found in the college repository or external sources searched. "
                "Note: This does not guarantee that the idea is globally unique, but no close textual matches were identified in our reference sources. "
                "You can proceed with creating this project or further refine your concept."
            )
            case_badge_class = "badge-success"

        elif external_error:
            case_type = "E"
            case_title = "College Records Evaluated — External Search Incomplete"
            case_message = (
                f"College project records have been successfully evaluated. However, external web search could not be completed "
                f"({external_error}). Note: An incomplete external search is never treated as evidence of worldwide originality."
            )
            case_badge_class = "badge-warning"

        # 4. Generate Relevant Unique Features & Suggested Improved Project Idea (Sections 9 & 10)
        enhancements = generate_idea_enhancements(title, description, college_matches, external_matches)

        # 5. Persist check in originality_checks table (Section 12)
        try:
            status_val = "completed" if not external_error else "partial"
            check_id = db.execute(
                """INSERT INTO originality_checks
                   (student_id, project_id, submitted_title, submitted_description,
                    highest_college_similarity, highest_external_similarity, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (
                    user_id,
                    exclude_project_id,
                    title,
                    description,
                    highest_college_score,
                    highest_external_score,
                    status_val
                )
            )

            # Persist top college matches in originality_check_results
            for cm in college_matches[:5]:
                db.execute(
                    """INSERT INTO originality_check_results
                       (check_id, source_type, matched_project_id, source_title, source_url, source_description, similarity_percentage)
                       VALUES (%s, 'college', %s, %s, %s, %s, %s)""",
                    (check_id, cm["id"], cm["title"], url_for("view_project_details", project_id=cm["id"]), cm["description"], cm["score"])
                )

            # Persist external matches in originality_check_results
            for em in external_matches[:5]:
                db.execute(
                    """INSERT INTO originality_check_results
                       (check_id, source_type, matched_project_id, source_title, source_url, source_description, similarity_percentage)
                       VALUES (%s, 'external', NULL, %s, %s, %s, %s)""",
                    (check_id, em["title"], em["url"], em["snippet"], em.get("similarity_percentage"))
                )
        except Exception as e:
            print(f"Error persisting originality check history: {e}")

    # Handle GET request with prefill parameters
    elif request.method == "GET":
        title = request.args.get("title", "").strip()
        description = request.args.get("description", "").strip()
        project_id_raw = request.args.get("project_id", "")
        exclude_project_id = safe_int(project_id_raw, default=None) if project_id_raw else None

    return render_template(
        "student/originality.html",
        checked=checked,
        title=title,
        description=description,
        exclude_project_id=exclude_project_id,
        college_matches=college_matches,
        external_matches=external_matches,
        external_error=external_error,
        highest_college_score=highest_college_score,
        highest_external_score=highest_external_score,
        case_type=case_type,
        case_title=case_title,
        case_message=case_message,
        case_badge_class=case_badge_class,
        unique_features=enhancements["unique_features"] if enhancements else [],
        improved_idea=enhancements if enhancements else None,
        my_projects=my_projects,
        recent_checks=recent_checks,
        check_id=check_id
    )


@app.route("/originality/report/<int:check_id>")
@student_required
def view_originality_report(check_id):
    """
    Displays an authorized stored originality check report for the logged-in student.
    Strictly verifies ownership: students cannot view reports belonging to other students.
    """
    user_id = session["user_id"]
    check = db.query_one("SELECT * FROM originality_checks WHERE id = %s", (check_id,))
    if not check:
        abort(404, description="Originality check report not found.")

    if check["student_id"] != user_id:
        abort(403, description="Unauthorized to view this originality report.")

    results = db.query_all(
        "SELECT * FROM originality_check_results WHERE check_id = %s ORDER BY similarity_percentage DESC, id ASC",
        (check_id,)
    )

    college_matches = []
    external_matches = []

    for r in results:
        if r["source_type"] == "college":
            score = r["similarity_percentage"] or 0
            if score >= 70:
                level = "High Similarity"
            elif score >= 40:
                level = "Moderate Similarity"
            else:
                level = "Low Similarity"
            college_matches.append({
                "id": r["matched_project_id"],
                "title": r["source_title"],
                "description": r["source_description"],
                "score": score,
                "level": level,
                "domain": "College Project",
                "owner_name": "Student Project"
            })
        else:
            external_matches.append({
                "title": r["source_title"],
                "url": r["source_url"],
                "snippet": r["source_description"],
                "similarity_percentage": r["similarity_percentage"],
                "source_website": "GitHub Public Repositories",
                "domain": "github.com"
            })

    highest_college_score = check["highest_college_similarity"]
    highest_external_score = check["highest_external_similarity"]
    has_college_match = any(m["score"] >= 40 for m in college_matches)
    has_external_match = len(external_matches) > 0

    if has_college_match and has_external_match:
        case_type = "A"
        case_title = "Similar Projects Found in College & External Repositories"
        case_message = (
            "A similar project already exists in your college, and related project implementations exist in external web repositories. "
            "Review the existing college project and external sources below, and consider substantially differentiating your proposed system before proceeding."
        )
        case_badge_class = "badge-danger" if highest_college_score >= 70 else "badge-warning"
    elif not has_college_match and has_external_match:
        case_type = "B"
        case_title = "External Ideas Found — No Close College Match"
        case_message = (
            "Related project ideas were found outside your college, but no sufficiently similar project was found in the college records searched. "
            "Consider adding distinctive features, targeting a specific user group or solving a more specific problem."
        )
        case_badge_class = "badge-primary"
    elif has_college_match and not has_external_match:
        case_type = "C"
        case_title = "Similar Project Exists in Your College"
        case_message = (
            "A similar project already exists in your college. Review the existing project and consider improving the functionality, "
            "solving a different problem or introducing meaningful features before proceeding. Note: External search did not return sufficiently close matches."
        )
        case_badge_class = "badge-danger" if highest_college_score >= 70 else "badge-warning"
    else:
        case_type = "D"
        case_title = "No Close Matches Found in College Records or External Repositories"
        case_message = (
            "No sufficiently similar projects were found in the college repository or external sources searched. "
            "Note: This does not guarantee that the idea is globally unique, but no close textual matches were identified in our reference sources."
        )
        case_badge_class = "badge-success"

    enhancements = generate_idea_enhancements(check["submitted_title"], check["submitted_description"], college_matches, external_matches)

    my_projects = db.query_all(
        "SELECT id, title, description, domain FROM projects WHERE owner_id = %s ORDER BY created_at DESC",
        (user_id,)
    )
    recent_checks = db.query_all(
        "SELECT * FROM originality_checks WHERE student_id = %s ORDER BY checked_at DESC LIMIT 5",
        (user_id,)
    )

    return render_template(
        "student/originality.html",
        checked=True,
        is_report_view=True,
        title=check["submitted_title"],
        description=check["submitted_description"],
        exclude_project_id=check["project_id"],
        college_matches=college_matches,
        external_matches=external_matches,
        external_error=None,
        highest_college_score=highest_college_score,
        highest_external_score=highest_external_score,
        case_type=case_type,
        case_title=case_title,
        case_message=case_message,
        case_badge_class=case_badge_class,
        unique_features=enhancements["unique_features"],
        improved_idea=enhancements,
        my_projects=my_projects,
        recent_checks=recent_checks,
        check_id=check_id
    )


# =====================================================================
# 10. Admin Governance & Approvals (Module 11 & Section 3)
# =====================================================================

@app.route("/admin/dashboard")
@admin_required
def admin_dashboard():
    status_filter = request.args.get("status", "pending").strip().lower()
    if status_filter not in ("pending", "approved", "rejected", "all"):
        status_filter = "pending"

    # Filter counts
    def get_count(sql, params=None):
        r = db.query_one(sql, params)
        return r["count"] if r else 0

    pending_count = get_count("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'pending'")
    approved_count = get_count("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'approved'")
    rejected_count = get_count("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'rejected'")
    all_count = pending_count + approved_count + rejected_count

    counts = {
        "pending": pending_count,
        "approved": approved_count,
        "rejected": rejected_count,
        "all": all_count
    }

    # Filtered requests query
    if status_filter == "pending":
        requests_list = db.query_all(
            """SELECT u.id, u.email, u.register_number, u.status, u.created_at, u.updated_at,
                      sp.name, sp.department, sp.semester, sp.section
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student' AND u.status = 'pending'
               ORDER BY u.created_at ASC"""
        )
    elif status_filter == "approved":
        requests_list = db.query_all(
            """SELECT u.id, u.email, u.register_number, u.status, u.created_at, u.updated_at,
                      sp.name, sp.department, sp.semester, sp.section,
                      (SELECT COUNT(*) FROM student_skills WHERE user_id = u.id) as skills_count
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student' AND u.status = 'approved'
               ORDER BY sp.name ASC"""
        )
    elif status_filter == "rejected":
        requests_list = db.query_all(
            """SELECT u.id, u.email, u.register_number, u.status, u.created_at, u.updated_at,
                      sp.name, sp.department, sp.semester, sp.section
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student' AND u.status = 'rejected'
               ORDER BY u.updated_at DESC, u.created_at DESC"""
        )
    else:  # all
        requests_list = db.query_all(
            """SELECT u.id, u.email, u.register_number, u.status, u.created_at, u.updated_at,
                      sp.name, sp.department, sp.semester, sp.section
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student'
               ORDER BY (CASE WHEN u.status = 'pending' THEN 1 WHEN u.status = 'approved' THEN 2 ELSE 3 END), u.created_at DESC"""
        )

    # Maintain existing pending_requests and approved_students for backward compatibility
    pending_requests = [r for r in requests_list if r["status"] == "pending"] if status_filter in ("pending", "all") else db.query_all(
        """SELECT u.id, u.email, u.register_number, u.status, u.created_at, u.updated_at, sp.name, sp.department, sp.semester, sp.section
           FROM users u JOIN student_profiles sp ON u.id = sp.user_id
           WHERE u.role = 'student' AND u.status = 'pending' ORDER BY u.created_at ASC"""
    )
    approved_students = db.query_all(
        """SELECT u.id, u.email, u.register_number, u.status, u.created_at, u.updated_at, sp.name, sp.department, sp.semester, sp.section,
                  (SELECT COUNT(*) FROM student_skills WHERE user_id = u.id) as skills_count
           FROM users u JOIN student_profiles sp ON u.id = sp.user_id
           WHERE u.role = 'student' AND u.status = 'approved' ORDER BY sp.name ASC"""
    )

    # Platform Statistics
    total_students = approved_count
    total_projects = get_count("SELECT COUNT(*) as count FROM projects")
    open_projects = get_count("SELECT COUNT(*) as count FROM projects WHERE status = 'open'")
    # Workspace tasks across actual student project workspaces
    total_tasks = get_count(
        """SELECT COUNT(*) as count
           FROM tasks t
           JOIN projects p ON t.project_id = p.id"""
    )
    completed_tasks = get_count(
        """SELECT COUNT(*) as count
           FROM tasks t
           JOIN projects p ON t.project_id = p.id
           WHERE LOWER(t.status) = 'completed'"""
    )

    stats = {
        "total_students": total_students,
        "pending_requests": pending_count,
        "total_projects": total_projects,
        "open_projects": open_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks
    }

    return render_template(
        "admin/dashboard.html",
        pending_requests=pending_requests,
        approved_students=approved_students,
        requests_list=requests_list,
        status_filter=status_filter,
        counts=counts,
        stats=stats
    )

@app.route("/admin/accounts/<int:user_id>/decide", methods=["POST"])
@admin_required
def decide_account_request(user_id):
    decision = request.form.get("decision", "").strip().lower()
    current_filter = request.form.get("current_filter") or request.args.get("status") or "pending"

    if decision not in ("approve", "reject"):
        flash("Invalid decision.", "error")
        return redirect(url_for("admin_dashboard", status=current_filter))

    user = db.query_one("SELECT * FROM users WHERE id = %s AND role = 'student'", (user_id,))
    if not user:
        abort(404, description="Student account request not found.")

    # Prevent repeated or unauthorized approval actions (Section 5)
    if decision == "approve" and user["status"] == "approved":
        flash("This student account has already been approved.", "info")
        return redirect(url_for("admin_dashboard", status=current_filter))

    if decision == "reject" and user["status"] == "rejected":
        flash("This student account has already been rejected.", "info")
        return redirect(url_for("admin_dashboard", status=current_filter))

    new_status = "approved" if decision == "approve" else "rejected"
    # Save status change and timestamp in MySQL
    db.execute(
        "UPDATE users SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
        (new_status, user_id)
    )

    if new_status == "approved":
        create_notification(
            user_id,
            "Your student account request has been approved! You can now log in and access the platform."
        )
        flash("Student account approved successfully.", "success")
    else:
        create_notification(
            user_id,
            "Your registration request was rejected by the Admin. Please contact the college project administrator for further information."
        )
        flash("Student account request rejected.", "info")

    return redirect(url_for("admin_dashboard", status=current_filter))


# =====================================================================
# Main Execution
# =====================================================================

if __name__ == "__main__":
    setup_admin()
    port = int(os.getenv("PORT", 5000))
    print(f"[*] Starting Student Project Finder & Originality Checker on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
