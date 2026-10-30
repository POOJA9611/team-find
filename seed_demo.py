"""
Demo data seeder for Student Project Finder & Originality Checker.
Populates approved demo students, skills, sample projects, and tasks for visual testing.
"""
from werkzeug.security import generate_password_hash
from db import db

def seed_demo():
    print("[*] Checking admin user...")
    admin = db.query_one("SELECT id FROM users WHERE email = %s", ("admin@college.edu",))
    if not admin:
        admin_pw = generate_password_hash("AdminSecure@2026")
        db.execute(
            "INSERT INTO users (email, password_hash, role, status) VALUES (%s, %s, 'admin', 'approved')",
            ("admin@college.edu", admin_pw)
        )
        print("[+] Seeded Admin account: admin@college.edu / AdminSecure@2026")

    print("[*] Seeding demo students...")
    students = [
        {
            "name": "Alex Chen",
            "email": "alex@student.edu",
            "register_number": "REG-21CS001",
            "password": generate_password_hash("Student@2026"),
            "department": "Computer Science & Engineering",
            "semester": 6,
            "section": "A",
            "bio": "Enthusiastic full-stack and ML developer looking to build impactful academic tools.",
            "interests": "Machine Learning, Backend Architecture, Cloud Computing",
            "skills": ["Python", "Flask", "Machine Learning", "MySQL", "Docker"]
        },
        {
            "name": "Maya Patel",
            "email": "maya@student.edu",
            "register_number": "REG-21IT002",
            "password": generate_password_hash("Student@2026"),
            "department": "Information Technology",
            "semester": 6,
            "section": "B",
            "bio": "Frontend designer & developer passionate about clean UI/UX and web standards.",
            "interests": "Frontend Development, UI/UX Design, Accessibility",
            "skills": ["JavaScript", "HTML", "CSS", "UI/UX", "React"]
        },
        {
            "name": "Liam Davis",
            "email": "liam@student.edu",
            "register_number": "REG-21DS003",
            "password": generate_password_hash("Student@2026"),
            "department": "Data Science",
            "semester": 6,
            "section": "A",
            "bio": "Data science researcher working on NLP, data pipelines and vector embeddings.",
            "interests": "Natural Language Processing, Deep Learning, Big Data",
            "skills": ["Python", "Machine Learning", "PyTorch", "SQL", "Pandas"]
        },
        {
            "name": "Pooja Sharma",
            "email": "pooja@student.edu",
            "register_number": "REG-21CS004",
            "password": generate_password_hash("Student@2026"),
            "department": "Computer Science & Engineering",
            "semester": 6,
            "section": "A",
            "bio": "Full-stack enthusiast interested in team collaboration systems and smart algorithms.",
            "interests": "Web Apps, Database Design, System Security",
            "skills": ["Python", "Flask", "JavaScript", "SQL", "Git"]
        },
        {
            "name": "John Pending",
            "email": "john.pending@student.edu",
            "register_number": "REG-22EE005",
            "password": generate_password_hash("Student@2026"),
            "department": "Electrical Engineering",
            "semester": 4,
            "section": "C",
            "bio": "Awaiting admin approval for account access.",
            "interests": "IoT, Embedded Systems",
            "skills": ["C++", "Arduino"],
            "status": "pending"
        }
    ]

    student_ids = {}

    for s in students:
        status = s.get("status", "approved")
        reg_no = s.get("register_number")
        existing = db.query_one("SELECT id FROM users WHERE email = %s", (s["email"],))
        if existing:
            uid = existing["id"]
            db.execute("UPDATE users SET status = %s, register_number = COALESCE(register_number, %s) WHERE id = %s", (status, reg_no, uid))
        else:
            uid = db.execute(
                "INSERT INTO users (email, register_number, password_hash, role, status) VALUES (%s, %s, %s, %s, %s)",
                (s["email"], reg_no, s["password"], "student", status)
            )

        student_ids[s["email"]] = uid

        # Upsert profile
        prof = db.query_one("SELECT id FROM student_profiles WHERE user_id = %s", (uid,))
        if not prof:
            db.execute(
                """INSERT INTO student_profiles (user_id, name, department, semester, section, bio, interests)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (uid, s["name"], s["department"], s["semester"], s["section"], s["bio"], s["interests"])
            )
        else:
            db.execute(
                """UPDATE student_profiles SET name=%s, department=%s, semester=%s, section=%s, bio=%s, interests=%s
                   WHERE user_id=%s""",
                (s["name"], s["department"], s["semester"], s["section"], s["bio"], s["interests"], uid)
            )

        # Upsert individual skills in student_skills table
        for skill_name in s["skills"]:
            clean_skill = skill_name.strip()
            existing_skill = db.query_one(
                "SELECT id FROM student_skills WHERE user_id = %s AND LOWER(skill_name) = %s",
                (uid, clean_skill.lower())
            )
            if not existing_skill:
                db.execute(
                    "INSERT INTO student_skills (user_id, skill_name) VALUES (%s, %s)",
                    (uid, clean_skill)
                )

    print(f"[+] Seeded {len(students)} student accounts.")

    # Seed Sample Projects
    alex_id = student_ids["alex@student.edu"]
    maya_id = student_ids["maya@student.edu"]

    projects = [
        {
            "owner_id": alex_id,
            "title": "AI Resume Screening & Ranking Engine",
            "domain": "Artificial Intelligence",
            "description": "An intelligent resume evaluation system that parses candidate CVs, extracts technical proficiencies, and matches against job requirement descriptors.",
            "max_members": 4,
            "status": "open",
            "skills": ["Python", "Flask", "Machine Learning", "MySQL"]
        },
        {
            "owner_id": maya_id,
            "title": "Smart Campus Event Navigator",
            "domain": "Web Development",
            "description": "Interactive web platform to discover, RSVP, and navigate workshops, technical seminars, and cultural fests happening across college departments.",
            "max_members": 3,
            "status": "open",
            "skills": ["JavaScript", "HTML", "CSS", "UI/UX", "Flask"]
        }
    ]

    for p in projects:
        existing_p = db.query_one("SELECT id FROM projects WHERE title = %s", (p["title"],))
        if not existing_p:
            pid = db.execute(
                """INSERT INTO projects (owner_id, title, domain, description, max_members, status)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (p["owner_id"], p["title"], p["domain"], p["description"], p["max_members"], p["status"])
            )
            # Add owner as team member
            db.execute(
                "INSERT INTO team_members (project_id, student_id, role) VALUES (%s, %s, 'owner')",
                (pid, p["owner_id"])
            )
            # Add project required skills
            for req in p["skills"]:
                db.execute(
                    "INSERT INTO project_required_skills (project_id, skill_name) VALUES (%s, %s)",
                    (pid, req.strip())
                )

            # Add sample tasks
            if "Resume" in p["title"]:
                db.execute(
                    "INSERT INTO tasks (project_id, title, description, assigned_to, status, created_by) VALUES (%s, %s, %s, %s, %s, %s)",
                    (pid, "Design Resume Parser Regex", "Extract phone, email, and education sections reliably", alex_id, "completed", alex_id)
                )
                db.execute(
                    "INSERT INTO tasks (project_id, title, description, assigned_to, status, created_by) VALUES (%s, %s, %s, %s, %s, %s)",
                    (pid, "Implement TF-IDF & Cosine Matcher", "Calculate match score between resume and job description", None, "in_progress", alex_id)
                )
                db.execute(
                    "INSERT INTO tasks (project_id, title, description, assigned_to, status, created_by) VALUES (%s, %s, %s, %s, %s, %s)",
                    (pid, "Build Results Dashboard UI", "Show similarity breakdown and radar chart", None, "to_do", alex_id)
                )
            elif "Campus" in p["title"]:
                db.execute(
                    "INSERT INTO tasks (project_id, title, description, assigned_to, status, created_by) VALUES (%s, %s, %s, %s, %s, %s)",
                    (pid, "Draft UI Wireframes", "Create responsive cards for campus events", maya_id, "completed", maya_id)
                )
                db.execute(
                    "INSERT INTO tasks (project_id, title, description, assigned_to, status, created_by) VALUES (%s, %s, %s, %s, %s, %s)",
                    (pid, "Build RSVP API endpoints", "Flask routes for event registration", None, "to_do", maya_id)
                )

    print("[+] Sample projects and tasks seeded successfully!")
    print("[+] Demo accounts:")
    print("    - Admin:   admin@college.edu / AdminSecure@2026")
    print("    - Student: alex@student.edu  / Student@2026")
    print("    - Student: maya@student.edu  / Student@2026")
    print("    - Student: liam@student.edu  / Student@2026")
    print("    - Student: pooja@student.edu / Student@2026")
    print("    - Pending: john.pending@student.edu / Student@2026")

if __name__ == "__main__":
    seed_demo()
