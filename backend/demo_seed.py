import os
import sys

# Ensure project root is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from backend.database import get_db
from backend.seed import seed_hod
from backend.middleware.auth import hash_password


def seed_demo_data():
    print("🌱 Starting Demo Data Seeding...")
    hod = seed_hod()
    db = get_db()

    default_password = "Password@123"
    password_hash = hash_password(default_password)

    # 1. Seed Faculty Members
    faculty_data = [
        {
            "name": "Dr. Sarah Jenkins",
            "email": "sarah.jenkins@college.edu",
            "designation": "Associate Professor",
            "department": "Computer Science & Engineering",
            "bio": "Cloud architecture specialist with 12+ years of distributed systems and Kubernetes research.",
            "subjects": "Cloud Computing, Distributed Systems, Microservices",
            "languages": "Go, Python, Java, TypeScript",
            "linkedin": "https://linkedin.com/in/sarahjenkins-cloud",
            "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
        },
        {
            "name": "Prof. Alan Turing",
            "email": "alan.turing@college.edu",
            "designation": "Professor & Lab Director",
            "department": "AI & Data Science",
            "bio": "Machine learning lead researching generative AI pipelines and computer vision optimizations.",
            "subjects": "Machine Learning, Deep Learning, Natural Language Processing",
            "languages": "Python, C++, R, Julia",
            "linkedin": "https://linkedin.com/in/alanturing-ai",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        },
        {
            "name": "Dr. Maya Patel",
            "email": "maya.patel@college.edu",
            "designation": "Assistant Professor",
            "department": "Cybersecurity & Forensics",
            "bio": "Information security researcher focusing on zero-trust architectures and applied cryptography.",
            "subjects": "Network Security, Cryptography, Ethical Hacking",
            "languages": "Python, Rust, C, Bash",
            "linkedin": "https://linkedin.com/in/mayapatel-sec",
            "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"
        }
    ]

    faculty_ids = {}
    for f in faculty_data:
        user = db.get("SELECT id FROM users WHERE email = ?", [f["email"]])
        f_id = user["id"] if user else None
        if not user:
            res = db.run(
                """INSERT INTO users (role, name, email, password_hash, avatar)
                   VALUES ('faculty', ?, ?, ?, ?)""",
                [f["name"], f["email"], password_hash, f["avatar"]]
            )
            f_id = res.lastID
            db.run(
                """INSERT INTO faculty_profiles (user_id, designation, department, bio, subjects, languages, linkedin_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                [f_id, f["designation"], f["department"], f["bio"], f["subjects"], f["languages"], f["linkedin"]]
            )
            print(f"  + Created Faculty: {f['name']} ({f['email']})")
        else:
            print(f"  - Faculty already exists: {f['name']}")
        faculty_ids[f["email"]] = f_id

    # 2. Seed Students
    student_data = [
        {
            "name": "Alex Chen",
            "email": "alex.chen@student.edu",
            "reg_no": "RA2211003010142",
            "department": "Computer Science & Engineering",
            "semester": 6,
            "cgpa": 9.1,
            "strength": "fullstack",
            "languages": "JavaScript, TypeScript, React, Node.js",
            "bio": "Full-stack developer passionate about building scalable microservices and UI systems.",
            "linkedin": "https://linkedin.com/in/alexchen-dev",
            "github": "https://github.com/alexchen-dev",
            "facultyEmail": "sarah.jenkins@college.edu",
            "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
        },
        {
            "name": "Priya Sharma",
            "email": "priya.sharma@student.edu",
            "reg_no": "RA2211003010088",
            "department": "Computer Science & Engineering",
            "semester": 6,
            "cgpa": 8.8,
            "strength": "frontend",
            "languages": "React, Vue, Tailwind CSS, JavaScript",
            "bio": "UI/UX enthusiast focused on accessible web apps and component libraries.",
            "linkedin": "https://linkedin.com/in/priyasharma-web",
            "github": "https://github.com/priyasharma-web",
            "facultyEmail": "sarah.jenkins@college.edu",
            "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
        },
        {
            "name": "Marcus Vance",
            "email": "marcus.vance@student.edu",
            "reg_no": "RA2211003010210",
            "department": "Computer Science & Engineering",
            "semester": 8,
            "cgpa": 8.5,
            "strength": "backend",
            "languages": "Python, Go, PostgreSQL, Docker",
            "bio": "DevSecOps and distributed backend engineer.",
            "linkedin": "https://linkedin.com/in/marcusvance-eng",
            "github": "https://github.com/marcusvance-eng",
            "facultyEmail": "sarah.jenkins@college.edu",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        },
        {
            "name": "Ananya Iyer",
            "email": "ananya.iyer@student.edu",
            "reg_no": "RA2211003010312",
            "department": "AI & Data Science",
            "semester": 6,
            "cgpa": 9.3,
            "strength": "fullstack",
            "languages": "Python, React, FastAPI, MongoDB",
            "bio": "AI pipeline builder specializing in model serving and intuitive web dashboards.",
            "linkedin": "https://linkedin.com/in/ananyaiyer",
            "github": "https://github.com/ananyaiyer",
            "facultyEmail": "alan.turing@college.edu",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        },
        {
            "name": "David Kim",
            "email": "david.kim@student.edu",
            "reg_no": "RA2211003010405",
            "department": "AI & Data Science",
            "semester": 6,
            "cgpa": 8.2,
            "strength": "backend",
            "languages": "Java, Spring Boot, MySQL, Redis",
            "bio": "Database optimization fan with keen interest in asynchronous message queues.",
            "linkedin": "https://linkedin.com/in/davidkim-cs",
            "github": "https://github.com/davidkim-cs",
            "facultyEmail": "alan.turing@college.edu",
            "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
        },
        {
            "name": "Sneha Reddy",
            "email": "sneha.reddy@student.edu",
            "reg_no": "RA2211003010521",
            "department": "Computer Science & Engineering",
            "semester": 6,
            "cgpa": 8.9,
            "strength": "frontend",
            "languages": "HTML/CSS, React, Next.js, Figma",
            "bio": "Design engineer passionate about frontend performance and interactive micro-animations.",
            "linkedin": "https://linkedin.com/in/snehareddy",
            "github": "https://github.com/snehareddy",
            "facultyEmail": None,  # UNASSIGNED initially for HOD testing!
            "avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150"
        }
    ]

    student_ids = {}
    for s in student_data:
        user = db.get("SELECT id FROM users WHERE email = ?", [s["email"]])
        s_id = user["id"] if user else None
        assigned_fac_id = faculty_ids.get(s["facultyEmail"]) if s["facultyEmail"] else None

        if not user:
            res = db.run(
                """INSERT INTO users (role, name, email, password_hash, avatar)
                   VALUES ('student', ?, ?, ?, ?)""",
                [s["name"], s["email"], password_hash, s["avatar"]]
            )
            s_id = res.lastID
            db.run(
                """INSERT INTO student_profiles (
                    user_id, reg_no, department, semester, cgpa, bio, strength, languages, linkedin_url, github_url, faculty_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [s_id, s["reg_no"], s["department"], s["semester"], s["cgpa"], s["bio"], s["strength"], s["languages"], s["linkedin"], s["github"], assigned_fac_id]
            )

            if assigned_fac_id:
                db.run(
                    """INSERT INTO faculty_assignments (student_id, faculty_id, assigned_by, note)
                       VALUES (?, ?, ?, 'Initial HOD Semester Allocation')""",
                    [s_id, assigned_fac_id, hod["id"]]
                )
            print(f"  + Created Student: {s['name']} ({s['email']}) - Assigned to: {s['facultyEmail'] or 'UNASSIGNED'}")
        student_ids[s["email"]] = s_id

    # 3. Create Teams and Chats
    sj_id = faculty_ids.get("sarah.jenkins@college.edu")
    alex_id = student_ids.get("alex.chen@student.edu")
    priya_id = student_ids.get("priya.sharma@student.edu")
    marcus_id = student_ids.get("marcus.vance@student.edu")

    # Team 1: CloudScale
    existing_team1 = db.get("SELECT id FROM teams WHERE name = ?", ["CloudScale"])
    if not existing_team1 and sj_id and alex_id and priya_id:
        t_res = db.run(
            "INSERT INTO teams (name, faculty_id, leader_id, created_by) VALUES ('CloudScale', ?, ?, ?)",
            [sj_id, alex_id, sj_id]
        )
        team_id = t_res.lastID

        db.run("INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'leader')", [team_id, alex_id])
        db.run("INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'member')", [team_id, priya_id])

        cg_res = db.run(
            "INSERT INTO chat_groups (name, team_id, faculty_id, created_by) VALUES ('Team: CloudScale', ?, ?, ?)",
            [team_id, sj_id, sj_id]
        )
        cg_id = cg_res.lastID

        db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, sj_id])
        db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, alex_id])
        db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, priya_id])

        db.run(
            "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
            [cg_id, sj_id, "Welcome Alex and Priya to Team CloudScale! Please push your SRS draft here by Friday."]
        )
        db.run(
            "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
            [cg_id, alex_id, "Thanks Dr. Jenkins! Working on the architecture diagram and database schema now."]
        )

        p_res = db.run(
            "INSERT INTO projects (title, description, status, team_id) VALUES (?, ?, 'ongoing', ?)",
            ["CloudScale: Multi-Tenant Campus Event Platform", "Scalable microservice architecture using Node.js and Redis.", team_id]
        )
        db.run("INSERT INTO project_members (project_id, student_id) VALUES (?, ?)", [p_res.lastID, alex_id])
        db.run("INSERT INTO project_members (project_id, student_id) VALUES (?, ?)", [p_res.lastID, priya_id])
        print('  + Created Team "CloudScale" with chat & project')

    # Team 2: DevSecOps Alpha
    existing_team2 = db.get("SELECT id FROM teams WHERE name = ?", ["DevSecOps Alpha"])
    if not existing_team2 and sj_id and marcus_id:
        t_res = db.run(
            "INSERT INTO teams (name, faculty_id, leader_id, created_by) VALUES ('DevSecOps Alpha', ?, ?, ?)",
            [sj_id, marcus_id, sj_id]
        )
        team_id = t_res.lastID

        db.run("INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'leader')", [team_id, marcus_id])

        cg_res = db.run(
            "INSERT INTO chat_groups (name, team_id, faculty_id, created_by) VALUES ('Team: DevSecOps Alpha', ?, ?, ?)",
            [team_id, sj_id, sj_id]
        )
        cg_id = cg_res.lastID

        db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, sj_id])
        db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, marcus_id])

        db.run(
            "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
            [cg_id, sj_id, "Marcus, please confirm the CI/CD pipeline scans pass before final deployment."]
        )

        p_res = db.run(
            "INSERT INTO projects (title, description, status, team_id) VALUES (?, ?, 'completed', ?)",
            ["Automated Container Vulnerability Scanner", "GitHub Action integration for static container vulnerability scanning.", team_id]
        )
        db.run("INSERT INTO project_members (project_id, student_id) VALUES (?, ?)", [p_res.lastID, marcus_id])
        print('  + Created Team "DevSecOps Alpha" with chat & project')

    # 4. Seed Notifications
    existing_notifs = db.get("SELECT COUNT(*) as count FROM notifications")
    if existing_notifs and existing_notifs["count"] == 0:
        db.run(
            """INSERT INTO notifications (title, body, audience, posted_by, deadline)
               VALUES (?, ?, 'both', ?, '2026-11-15T23:59:59Z')""",
            [
                "Capstone Milestone 1 Submissions Open",
                "All department project teams must upload their System Architecture and SRS document to the portal by the stated deadline.",
                hod["id"]
            ]
        )

        db.run(
            """INSERT INTO notifications (title, body, audience, posted_by, deadline)
               VALUES (?, ?, 'students', ?, '2026-11-05T18:00:00Z')""",
            [
                "Upcoming Hackathon & GitHub Classroom Guidelines",
                "Students must ensure all code repositories have verified student contributor emails linked.",
                hod["id"]
            ]
        )

        db.run(
            """INSERT INTO notifications (title, body, audience, posted_by, deadline)
               VALUES (?, ?, 'faculty', ?, '2026-10-30T10:00:00Z')""",
            [
                "Semester Guidance Evaluation Meeting in Conference Room A",
                "Faculty mentors are requested to review assigned student teams and submit preliminary progress marks.",
                hod["id"]
            ]
        )
        print("  + Seeded 3 Role-Filtered Notifications")

    # 5. Seed Change Request for Ananya
    ananya_id = student_ids.get("ananya.iyer@student.edu")
    alan_id = faculty_ids.get("alan.turing@college.edu")
    if ananya_id and alan_id and sj_id:
        existing_req = db.get("SELECT id FROM change_requests WHERE student_id = ?", [ananya_id])
        if not existing_req:
            db.run(
                """INSERT INTO change_requests (student_id, current_faculty_id, requested_faculty_id, reason, status)
                   VALUES (?, ?, ?, 'My capstone project focus is high-throughput distributed microservices, which directly aligns with Dr. Sarah Jenkins research domain.', 'pending')""",
                [ananya_id, alan_id, sj_id]
            )
            print("  + Seeded 1 Pending Change Request for Ananya Iyer")

    # 6. Seed Demo Invitations (Matching UI reference for Alex Chen)
    if alex_id:
        existing_alex_inv = db.get("SELECT id FROM team_invitations WHERE sender_id = ? OR recipient_id = ?", [alex_id, alex_id])
        if not existing_alex_inv:
            def get_or_create_team(t_name, l_id, p_title, fac_id=sj_id):
                t = db.get("SELECT id FROM teams WHERE name = ?", [t_name])
                if not t:
                    res = db.run(
                        "INSERT INTO teams (name, faculty_id, leader_id, created_by, project_title, status) VALUES (?, ?, ?, ?, ?, 'approved')",
                        [t_name, fac_id, l_id, l_id, p_title]
                    )
                    t_id = res.lastID
                    db.run("INSERT OR IGNORE INTO team_members (team_id, student_id, role) VALUES (?, ?, 'leader')", [t_id, l_id])
                    return t_id
                return t["id"]

            smart_att_id = get_or_create_team("Smart Attendance System", alex_id, "Smart Attendance System")
            campus_food_id = get_or_create_team("Campus Food Ordering App", alex_id, "Campus Food Ordering App")
            lib_sys_id = get_or_create_team("Library Management System", alex_id, "Library Management System")

            ai_bot_id = get_or_create_team("AI-Powered Chatbot", priya_id or alex_id, "AI-Powered Chatbot")
            web_portal_id = get_or_create_team("Web Development Portal", student_ids.get("david.kim@student.edu") or alex_id, "Web Development Portal")
            event_mgmt_id = get_or_create_team("College Event Management", student_ids.get("sneha.reddy@student.edu") or alex_id, "College Event Management")

            sneha_id = student_ids.get("sneha.reddy@student.edu")
            david_id = student_ids.get("david.kim@student.edu")

            # Sent Invitations by Alex Chen
            if sneha_id:
                db.run(
                    "INSERT INTO team_invitations (team_id, sender_id, recipient_id, message, status, created_at) VALUES (?, ?, ?, ?, 'pending', '2026-10-24 10:32:00')",
                    [smart_att_id, alex_id, sneha_id, "Would love to have your frontend experience on our Smart Attendance project."]
                )
            if david_id:
                db.run(
                    "INSERT INTO team_invitations (team_id, sender_id, recipient_id, message, status, created_at, decided_at) VALUES (?, ?, ?, ?, 'accepted', '2026-10-22 16:15:00', '2026-10-22 17:00:00')",
                    [campus_food_id, alex_id, david_id, "Please join us for database optimization on Campus Food Ordering."]
                )
            if ananya_id:
                db.run(
                    "INSERT INTO team_invitations (team_id, sender_id, recipient_id, message, status, created_at, decided_at) VALUES (?, ?, ?, ?, 'rejected', '2026-10-20 11:45:00', '2026-10-20 12:30:00')",
                    [lib_sys_id, alex_id, ananya_id, "We have an open spot for ML pipeline development."]
                )

            # Received Invitations for Alex Chen
            if priya_id:
                db.run(
                    "INSERT INTO team_invitations (team_id, sender_id, recipient_id, message, status, created_at) VALUES (?, ?, ?, ?, 'pending', '2026-10-25 14:20:00')",
                    [ai_bot_id, priya_id, alex_id, "Hey Alex, we need a strong backend engineer for the AI Chatbot team!"]
                )
            if david_id:
                db.run(
                    "INSERT INTO team_invitations (team_id, sender_id, recipient_id, message, status, created_at, decided_at) VALUES (?, ?, ?, ?, 'accepted', '2026-10-22 13:10:00', '2026-10-22 14:00:00')",
                    [web_portal_id, david_id, alex_id, "Invite to collaborate on Web Development Portal."]
                )
            if sneha_id:
                db.run(
                    "INSERT INTO team_invitations (team_id, sender_id, recipient_id, message, status, created_at, decided_at) VALUES (?, ?, ?, ?, 'rejected', '2026-10-18 09:05:00', '2026-10-18 10:00:00')",
                    [event_mgmt_id, sneha_id, alex_id, "Would you like to join the College Event Management system team?"]
                )
            print("  + Seeded Demo Team Invitations matching UI reference")

    print("\n🎉 Demo Data Seeding Completed Successfully!")


seed_all = seed_demo_data

if __name__ == "__main__":
    seed_demo_data()
