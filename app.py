import json
import os
import re
import secrets
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
            return redirect(url_for("login"))
        if session.get("role") != "admin":
            flash("Access denied: Administrator permissions required.", "danger")
            return redirect(url_for("student_dashboard"))
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

@app.route("/register", methods=["GET", "POST"])
def register():
    if "user_id" in session:
        return redirect(url_for("index"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        department = request.form.get("department", "").strip()
        semester = safe_int(request.form.get("semester"), default=1, min_val=1, max_val=8)
        section = request.form.get("section", "").strip()
        bio = request.form.get("bio", "").strip()

        if not name or not email or not password or not department:
            flash("Please fill in all required fields marked with an asterisk (*).", "error")
            return render_template("register.html")

        if len(password) < 6:
            flash("Password must be at least 6 characters long.", "error")
            return render_template("register.html")

        existing = db.query_one("SELECT id FROM users WHERE email = %s", (email,))
        if existing:
            flash("An account request with this email already exists. Please sign in or contact the admin.", "error")
            return render_template("register.html")

        pw_hash = generate_password_hash(password)

        try:
            # Create user in 'pending' status awaiting admin approval
            user_id = db.execute(
                "INSERT INTO users (email, password_hash, role, status) VALUES (%s, %s, 'student', 'pending')",
                (email, pw_hash)
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
            """SELECT u.id, u.email, u.status, u.created_at, u.updated_at, sp.name, sp.department
               FROM users u
               LEFT JOIN student_profiles sp ON u.id = sp.user_id
               WHERE LOWER(u.email) = %s AND u.role = 'student'""",
            (email_query,)
        )
        if user:
            status_info = {
                "email": user["email"],
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

    return render_template("student/profile.html", user=user, profile=profile, skills=skills)

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
            # If 1-person project, team is formed immediately
            if max_members <= 1:
                check_and_trigger_team_formation_originality(project_id)
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

            check_and_trigger_team_formation_originality(project_id)
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

    return render_template(
        "student/public_profile.html",
        student_user=student_user,
        profile=profile,
        skills=skills,
        projects_led=projects_led,
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

        # Automatically check and trigger team formation originality check if team is now full
        check_and_trigger_team_formation_originality(project["id"])
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

        # Automatically check and trigger team formation originality check if team is now full
        check_and_trigger_team_formation_originality(project["id"])
    except Exception as e:
        flash(f"Error accepting application: {e}", "error")

    return redirect(url_for("student_dashboard"))


@app.route("/projects/<int:project_id>/originality-check", methods=["POST"])
@student_required
def recheck_project_originality(project_id):
    user_id = session["user_id"]
    project = db.query_one("SELECT * FROM projects WHERE id = %s", (project_id,))
    if not project:
        abort(404, description="Project not found.")

    if project["owner_id"] != user_id:
        abort(403, description="Only the project owner can check originality for this project.")

    res = run_project_originality_check(project_id, trigger_event="manual_recheck")
    flash(f"Originality recheck completed for '{project['title']}': {res['highest_similarity']}% highest similarity ({res['similarity_category']}).", "info")
    return redirect(url_for("student_dashboard"))


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
           ORDER BY (tm.role = 'owner') DESC, sp.name ASC""",
        (project_id,)
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
        """INSERT INTO tasks (project_id, title, description, assigned_to, status, created_by)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (project_id, title, description, assigned_to, status, user_id)
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
# 9. Originality Checker (Module 10 & Section 13)
# =====================================================================

@app.route("/originality", methods=["GET", "POST"])
@student_required
def originality_checker():
    checked = False
    title = ""
    description = ""
    matches = []
    highest_score = 0
    similarity_level = "Low Similarity"

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()

        if not title:
            flash("Please enter a proposed project title.", "warning")
            return render_template("student/originality.html")

        checked = True
        input_tokens = tokenize_text(title + " " + description)

        # Retrieve comparison projects from database
        stored_projects = db.query_all(
            """SELECT p.*, sp.name as owner_name
               FROM projects p
               JOIN users u ON p.owner_id = u.id
               JOIN student_profiles sp ON u.id = sp.user_id
               ORDER BY p.created_at DESC"""
        )

        for proj in stored_projects:
            proj_tokens = tokenize_text(proj["title"] + " " + proj["description"])
            union_len = len(input_tokens.union(proj_tokens))

            # Jaccard Similarity (Section 13)
            if union_len > 0:
                intersection_len = len(input_tokens.intersection(proj_tokens))
                jaccard = intersection_len / union_len
            else:
                jaccard = 0.0

            score_pct = int(round(jaccard * 100))

            # Categories: >= 70% High, 40-69% Moderate, < 40% Low
            if score_pct >= 70:
                level = "High Similarity"
            elif score_pct >= 40:
                level = "Moderate Similarity"
            else:
                level = "Low Similarity"

            matches.append({
                "id": proj["id"],
                "title": proj["title"],
                "description": proj["description"],
                "domain": proj["domain"],
                "owner_name": proj["owner_name"],
                "status": proj["status"],
                "score": score_pct,
                "level": level
            })

            if score_pct > highest_score:
                highest_score = score_pct
                similarity_level = level

        # Sort matches descending by score
        matches.sort(key=lambda m: -m["score"])

    return render_template(
        "student/originality.html",
        checked=checked,
        title=title,
        description=description,
        matches=matches,
        highest_score=highest_score,
        similarity_level=similarity_level
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
            """SELECT u.id, u.email, u.status, u.created_at, u.updated_at,
                      sp.name, sp.department, sp.semester, sp.section
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student' AND u.status = 'pending'
               ORDER BY u.created_at ASC"""
        )
    elif status_filter == "approved":
        requests_list = db.query_all(
            """SELECT u.id, u.email, u.status, u.created_at, u.updated_at,
                      sp.name, sp.department, sp.semester, sp.section,
                      (SELECT COUNT(*) FROM student_skills WHERE user_id = u.id) as skills_count
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student' AND u.status = 'approved'
               ORDER BY sp.name ASC"""
        )
    elif status_filter == "rejected":
        requests_list = db.query_all(
            """SELECT u.id, u.email, u.status, u.created_at, u.updated_at,
                      sp.name, sp.department, sp.semester, sp.section
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student' AND u.status = 'rejected'
               ORDER BY u.updated_at DESC, u.created_at DESC"""
        )
    else:  # all
        requests_list = db.query_all(
            """SELECT u.id, u.email, u.status, u.created_at, u.updated_at,
                      sp.name, sp.department, sp.semester, sp.section
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student'
               ORDER BY (CASE WHEN u.status = 'pending' THEN 1 WHEN u.status = 'approved' THEN 2 ELSE 3 END), u.created_at DESC"""
        )

    # Maintain existing pending_requests and approved_students for backward compatibility
    pending_requests = [r for r in requests_list if r["status"] == "pending"] if status_filter in ("pending", "all") else db.query_all(
        """SELECT u.id, u.email, u.status, u.created_at, u.updated_at, sp.name, sp.department, sp.semester, sp.section
           FROM users u JOIN student_profiles sp ON u.id = sp.user_id
           WHERE u.role = 'student' AND u.status = 'pending' ORDER BY u.created_at ASC"""
    )
    approved_students = db.query_all(
        """SELECT u.id, u.email, u.status, u.created_at, u.updated_at, sp.name, sp.department, sp.semester, sp.section,
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
