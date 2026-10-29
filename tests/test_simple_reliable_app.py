"""
Comprehensive test suite for Student Project Finder & Originality Checker.
Tests all 11 modules and essential requirements from the Master Implementation Prompt.
"""
import os
import sys
import unittest

# Ensure project root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from db import db
from seed_admin import setup_admin
from seed_demo import seed_demo
from werkzeug.security import generate_password_hash

TEST_CSRF = "secure_test_csrf_token_12345"

class TestSimpleReliableApp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        # Clean all tables to guarantee absolute test isolation
        for tbl in ("project_originality_checks", "project_applications", "tasks", "invitations", "team_members", "project_required_skills", "projects", "student_skills", "student_profiles", "notifications", "users"):
            try:
                db.execute(f"DELETE FROM {tbl}")
            except Exception:
                pass
        setup_admin()
        seed_demo()

    def setUp(self):
        # Fresh test client per test method to isolate cookies and sessions
        self.client = app.test_client()

    def get_session_csrf(self, client=None):
        target = client or self.client
        with target.session_transaction() as sess:
            if "csrf_token" not in sess:
                sess["csrf_token"] = TEST_CSRF
            return sess["csrf_token"]

    def login_user(self, email, password, client=None):
        target = client or self.client
        with target.session_transaction() as sess:
            sess["csrf_token"] = TEST_CSRF
        return target.post("/login", data={
            "email": email,
            "password": password,
            "csrf_token": TEST_CSRF
        }, follow_redirects=True)

    # -------------------------------------------------------------
    # 1. Student Registration & Admin Approval (Modules 1 & 2)
    # -------------------------------------------------------------
    def test_01_registration_pending_and_admin_approval(self):
        # Clean Sarah if present
        db.execute("DELETE FROM users WHERE email = 'sarah@student.edu'")

        csrf = self.get_session_csrf(self.client)
        reg_data = {
            "name": "Sarah Connor",
            "email": "sarah@student.edu",
            "password": "Password@123",
            "department": "Cybernetics",
            "semester": "4",
            "section": "B",
            "bio": "Robotics and AI student.",
            "csrf_token": csrf
        }
        res = self.client.post("/register", data=reg_data, follow_redirects=True)
        self.assertIn("submitted successfully", res.get_data(as_text=True))

        # Verify DB status is pending
        user = db.query_one("SELECT * FROM users WHERE email = %s", ("sarah@student.edu",))
        self.assertIsNotNone(user)
        self.assertEqual(user["status"], "pending")
        self.assertEqual(user["role"], "student")

        # Attempt login before approval -> Must be blocked with pending message
        res_login = self.login_user("sarah@student.edu", "Password@123")
        self.assertIn("awaiting Admin approval", res_login.get_data(as_text=True))

        # Check status page before approval -> Shows Pending card and required message
        res_status_pending = self.client.get("/check-status?email=sarah@student.edu")
        self.assertEqual(res_status_pending.status_code, 200)
        status_pending_html = res_status_pending.get_data(as_text=True)
        self.assertIn("Your registration is awaiting Admin approval.", status_pending_html)
        self.assertIn("Pending", status_pending_html)

        # Admin logs in on a fresh client session
        admin_client = app.test_client()
        admin_res = self.login_user("admin@college.edu", "AdminSecure@2026", client=admin_client)
        self.assertIn("Administrator Executive Dashboard", admin_res.get_data(as_text=True))
        self.assertIn("Sarah Connor", admin_res.get_data(as_text=True))

        # Admin tests status filters: Pending, Approved, Rejected, All
        res_f_pending = admin_client.get("/admin/dashboard?status=pending")
        self.assertIn("Sarah Connor", res_f_pending.get_data(as_text=True))

        res_f_rejected = admin_client.get("/admin/dashboard?status=rejected")
        self.assertEqual(res_f_rejected.status_code, 200)

        # Admin approves Sarah
        admin_csrf = self.get_session_csrf(admin_client)
        res_approve = admin_client.post(
            f"/admin/accounts/{user['id']}/decide",
            data={"decision": "approve", "csrf_token": admin_csrf},
            follow_redirects=True
        )
        self.assertIn("approved successfully", res_approve.get_data(as_text=True))

        # Prevent repeated approval
        res_dup_approve = admin_client.post(
            f"/admin/accounts/{user['id']}/decide",
            data={"decision": "approve", "csrf_token": admin_csrf},
            follow_redirects=True
        )
        self.assertIn("already been approved", res_dup_approve.get_data(as_text=True))

        # Verify DB status is now approved and updated_at timestamp is set
        user_after = db.query_one("SELECT * FROM users WHERE email = %s", ("sarah@student.edu",))
        self.assertEqual(user_after["status"], "approved")
        self.assertIsNotNone(user_after.get("updated_at"))

        # Check status page after approval -> Shows Approved card and required message
        res_status_app = self.client.get("/check-status?email=sarah@student.edu")
        self.assertEqual(res_status_app.status_code, 200)
        status_app_html = res_status_app.get_data(as_text=True)
        self.assertIn("Your account has been approved. You can now log in.", status_app_html)

        # Sarah logs in now on a fresh client -> Success
        sarah_client = app.test_client()
        res_sarah = self.login_user("sarah@student.edu", "Password@123", client=sarah_client)
        self.assertIn("Welcome back, Sarah Connor", res_sarah.get_data(as_text=True))

        # Test Rejection workflow with a pending demo user
        john_user = db.query_one("SELECT * FROM users WHERE email = 'john.pending@student.edu'")
        self.assertIsNotNone(john_user)
        res_reject = admin_client.post(
            f"/admin/accounts/{john_user['id']}/decide",
            data={"decision": "reject", "csrf_token": admin_csrf},
            follow_redirects=True
        )
        self.assertIn("rejected", res_reject.get_data(as_text=True))

        # Verify DB status is rejected
        john_after = db.query_one("SELECT * FROM users WHERE id = %s", (john_user["id"],))
        self.assertEqual(john_after["status"], "rejected")

        # Rejected student attempts to log in -> blocked with explicit message
        res_john_login = self.login_user("john.pending@student.edu", "Student@2026")
        self.assertIn("rejected by the Admin", res_john_login.get_data(as_text=True))

        # Rejected student checks status -> shows rejection card and message
        res_john_status = self.client.get("/check-status?email=john.pending@student.edu")
        john_status_html = res_john_status.get_data(as_text=True)
        self.assertIn("Your registration request was rejected.", john_status_html)

    # -------------------------------------------------------------
    # 2. Strict Role-based Access Control
    # -------------------------------------------------------------
    def test_02_role_based_access(self):
        # 1. Anonymous user cannot access student dashboard -> redirects to /login
        res = self.client.get("/student/dashboard", follow_redirects=False)
        self.assertEqual(res.status_code, 302)
        self.assertIn("/login", res.headers.get("Location", ""))

        # 2. Student cannot access admin dashboard -> redirects to /student/dashboard
        self.login_user("alex@student.edu", "Student@2026")
        res = self.client.get("/admin/dashboard", follow_redirects=False)
        self.assertEqual(res.status_code, 302)
        self.assertIn("/student/dashboard", res.headers.get("Location", ""))

        # 3. Admin cannot access student profile -> redirects to /admin/dashboard
        admin_client = app.test_client()
        self.login_user("admin@college.edu", "AdminSecure@2026", client=admin_client)
        res_admin = admin_client.get("/student/profile", follow_redirects=False)
        self.assertEqual(res_admin.status_code, 302)
        self.assertIn("/admin/dashboard", res_admin.headers.get("Location", ""))

    # -------------------------------------------------------------
    # 3. Student Profile & Individual Skills (Module 3)
    # -------------------------------------------------------------
    def test_03_profile_and_individual_skills(self):
        self.login_user("liam@student.edu", "Student@2026")

        # Clean test skill if present
        liam_id = db.query_one("SELECT id FROM users WHERE email = %s", ("liam@student.edu",))["id"]
        db.execute("DELETE FROM student_skills WHERE user_id = %s AND LOWER(skill_name) = 'dockertest'", (liam_id,))

        # View profile
        res = self.client.get("/student/profile")
        content = res.get_data(as_text=True)
        self.assertIn("Liam Davis", content)

        # Add new skill
        csrf = self.get_session_csrf(self.client)
        res_skill = self.client.post("/student/skills/add", data={
            "skill_name": "DockerTest",
            "csrf_token": csrf
        }, follow_redirects=True)
        self.assertIn("Added 1 skill(s)", res_skill.get_data(as_text=True))

        # Check individual row in student_skills table
        docker_skill = db.query_one("SELECT * FROM student_skills WHERE user_id = %s AND LOWER(skill_name) = 'dockertest'", (liam_id,))
        self.assertIsNotNone(docker_skill, "Skill 'DockerTest' must be saved as individual database record")

        # Delete skill
        del_csrf = self.get_session_csrf(self.client)
        res_del = self.client.post(f"/student/skills/{docker_skill['id']}/delete", data={
            "csrf_token": del_csrf
        }, follow_redirects=True)
        self.assertIn("Skill removed from your profile", res_del.get_data(as_text=True))

    # -------------------------------------------------------------
    # 4. Project Creation, Editing and Closing (Module 4)
    # -------------------------------------------------------------
    def test_04_project_lifecycle(self):
        # Clean any existing project with this title
        db.execute("DELETE FROM projects WHERE title LIKE '%Solar Microgrid%'")

        self.login_user("pooja@student.edu", "Student@2026")
        csrf = self.get_session_csrf(self.client)

        # Create project
        proj_data = {
            "title": "Smart Solar Microgrid Energy Monitor",
            "domain": "IoT & Embedded Systems",
            "description": "IoT embedded nodes monitoring power distribution and solar battery health in real-time.",
            "problem_statement": "Campus solar panels lack real-time decentralized yield and battery monitoring.",
            "solution_overview": "ESP32 sensors transmit telemetry to a central dashboard with predictive fault alerts.",
            "max_members": "3",
            "required_skills": "Python, IoT, ESP32, MQTT",
            "csrf_token": csrf
        }
        res_create = self.client.post("/projects/create", data=proj_data, follow_redirects=True)
        self.assertIn("created successfully", res_create.get_data(as_text=True))

        # Verify DB records
        proj = db.query_one("SELECT * FROM projects WHERE title = %s", (proj_data["title"],))
        self.assertIsNotNone(proj)
        self.assertEqual(proj["status"], "open")
        self.assertEqual(proj["max_members"], 3)

        # Check required skills stored individually in project_required_skills
        skills = db.query_all("SELECT skill_name FROM project_required_skills WHERE project_id = %s", (proj["id"],))
        skill_names = [s["skill_name"] for s in skills]
        self.assertIn("Python", skill_names)
        self.assertIn("IoT", skill_names)

        # Check owner is registered in team_members with role 'owner'
        pooja_id = db.query_one("SELECT id FROM users WHERE email = %s", ("pooja@student.edu",))["id"]
        tm = db.query_one("SELECT * FROM team_members WHERE project_id = %s AND student_id = %s", (proj["id"], pooja_id))
        self.assertIsNotNone(tm)
        self.assertEqual(tm["role"], "owner")

        # Edit project
        edit_csrf = self.get_session_csrf(self.client)
        res_edit = self.client.post(f"/projects/{proj['id']}/edit", data={
            "title": "Smart Solar Microgrid Energy Monitor",
            "domain": "IoT & Embedded Systems",
            "description": "Updated description with enhanced telemetry and dynamic battery load balancing.",
            "problem_statement": proj_data["problem_statement"],
            "solution_overview": proj_data["solution_overview"],
            "max_members": "4",
            "required_skills": "Python, IoT, ESP32, MQTT, Grafana",
            "status": "open",
            "csrf_token": edit_csrf
        }, follow_redirects=True)
        self.assertIn("updated successfully", res_edit.get_data(as_text=True))

        # Verify max_members updated
        proj_updated = db.query_one("SELECT * FROM projects WHERE id = %s", (proj["id"],))
        self.assertEqual(proj_updated["max_members"], 4)

    # -------------------------------------------------------------
    # 5. Explore Projects (Module 5)
    # -------------------------------------------------------------
    def test_05_explore_projects(self):
        self.login_user("alex@student.edu", "Student@2026")

        # Normal view
        res = self.client.get("/explore")
        content = res.get_data(as_text=True)
        self.assertIn("Explore Projects", content)
        self.assertIn("Resume Screening", content)

        # Filter by domain
        res_filter = self.client.get("/explore?domain=Web+Development")
        self.assertIn("Smart Campus Event Navigator", res_filter.get_data(as_text=True))

        # Search by keyword
        res_search = self.client.get("/explore?q=Resume")
        self.assertIn("Resume Screening", res_search.get_data(as_text=True))

        # Ensure NO source code download or view links
        self.assertNotIn("download source", content.lower())
        self.assertNotIn("view source code", content.lower())

    # -------------------------------------------------------------
    # 6. Project-Specific Find Teammates (Module 6)
    # -------------------------------------------------------------
    def test_06_find_teammates_math_and_permissions(self):
        resume_proj = db.query_one("SELECT id FROM projects WHERE title LIKE '%Resume%'")
        self.assertIsNotNone(resume_proj)

        # Non-owner (Maya) cannot access Alex's find teammates -> 403 Forbidden
        self.login_user("maya@student.edu", "Student@2026")
        res_unauth = self.client.get(f"/projects/{resume_proj['id']}/find-teammates")
        self.assertEqual(res_unauth.status_code, 403)

        # Alex (owner) accesses find teammates
        alex_client = app.test_client()
        self.login_user("alex@student.edu", "Student@2026", client=alex_client)
        res_alex = alex_client.get(f"/projects/{resume_proj['id']}/find-teammates")
        self.assertEqual(res_alex.status_code, 200)
        content = res_alex.get_data(as_text=True)

        # Candidate ranking and cards
        self.assertIn("Find Teammates", content)
        self.assertIn("Pooja Sharma", content)
        self.assertIn("Liam Davis", content)
        self.assertNotIn("Candidate: Alex Chen", content)

    # -------------------------------------------------------------
    # 7. Invitations & Team Membership (Module 7)
    # -------------------------------------------------------------
    def test_07_invitation_send_and_accept(self):
        resume_proj = db.query_one("SELECT id FROM projects WHERE title LIKE '%Resume%'")
        pooja = db.query_one("SELECT id FROM users WHERE email = %s", ("pooja@student.edu",))

        # Clean existing invitations if any
        db.execute("DELETE FROM invitations WHERE project_id = %s AND recipient_id = %s", (resume_proj["id"], pooja["id"]))
        db.execute("DELETE FROM team_members WHERE project_id = %s AND student_id = %s", (resume_proj["id"], pooja["id"]))

        # Alex invites Pooja
        self.login_user("alex@student.edu", "Student@2026")
        csrf = self.get_session_csrf(self.client)

        res_invite = self.client.post(
            f"/projects/{resume_proj['id']}/invite",
            data={"recipient_id": str(pooja["id"]), "message": "We would love to have you build the backend API with us!", "csrf_token": csrf},
            follow_redirects=True
        )
        self.assertIn("Invitation successfully sent to", res_invite.get_data(as_text=True))

        # Check DB
        inv = db.query_one("SELECT * FROM invitations WHERE project_id = %s AND recipient_id = %s", (resume_proj["id"], pooja["id"]))
        self.assertIsNotNone(inv)
        self.assertEqual(inv["status"], "pending")

        # Duplicate invite check
        dup_csrf = self.get_session_csrf(self.client)
        res_dup = self.client.post(
            f"/projects/{resume_proj['id']}/invite",
            data={"recipient_id": str(pooja["id"]), "message": "Duplicate invite", "csrf_token": dup_csrf},
            follow_redirects=True
        )
        self.assertIn("pending invitation already exists", res_dup.get_data(as_text=True))

        # Pooja logs in -> views dashboard -> accepts invitation
        pooja_client = app.test_client()
        self.login_user("pooja@student.edu", "Student@2026", client=pooja_client)
        dash_res = pooja_client.get("/student/dashboard")
        self.assertIn("Team Invitations", dash_res.get_data(as_text=True))

        pooja_csrf = self.get_session_csrf(pooja_client)
        res_accept = pooja_client.post(
            f"/invitations/{inv['id']}/respond",
            data={"action": "accept", "csrf_token": pooja_csrf},
            follow_redirects=True
        )
        self.assertIn("Success! You have joined", res_accept.get_data(as_text=True))

        # Verify Pooja is in team_members
        tm = db.query_one("SELECT * FROM team_members WHERE project_id = %s AND student_id = %s", (resume_proj["id"], pooja["id"]))
        self.assertIsNotNone(tm)
        self.assertEqual(tm["role"], "member")

    # -------------------------------------------------------------
    # 8. Project Workspace & Task Progress (Module 9)
    # -------------------------------------------------------------
    def test_08_workspace_and_tasks(self):
        resume_proj = db.query_one("SELECT id FROM projects WHERE title LIKE '%Resume%'")
        alex = db.query_one("SELECT id FROM users WHERE email = %s", ("alex@student.edu",))

        # Non-member (Liam) cannot access workspace -> 403
        self.login_user("liam@student.edu", "Student@2026")
        res_unauth = self.client.get(f"/projects/{resume_proj['id']}/workspace")
        self.assertEqual(res_unauth.status_code, 403)

        # Owner Alex accesses workspace -> 200
        alex_client = app.test_client()
        self.login_user("alex@student.edu", "Student@2026", client=alex_client)

        res_ws = alex_client.get(f"/projects/{resume_proj['id']}/workspace")
        self.assertEqual(res_ws.status_code, 200)
        content = res_ws.get_data(as_text=True)
        self.assertIn("Workspace", content)
        self.assertIn("Task Completion Progress", content)

        # Create task
        task_csrf = self.get_session_csrf(alex_client)
        res_task = alex_client.post(
            f"/projects/{resume_proj['id']}/tasks/create",
            data={
                "title": "Set up Database Indexes",
                "description": "Optimize inverted index search for skill keywords",
                "assigned_to": str(alex["id"]),
                "status": "in_progress",
                "csrf_token": task_csrf
            },
            follow_redirects=True
        )
        self.assertIn("Task created successfully", res_task.get_data(as_text=True))

        # Update task status to completed
        task = db.query_one("SELECT id FROM tasks WHERE project_id = %s AND title LIKE '%Database Indexes%'", (resume_proj["id"],))
        self.assertIsNotNone(task)

        update_csrf = self.get_session_csrf(alex_client)
        res_update = alex_client.post(
            f"/tasks/{task['id']}/status",
            data={"status": "completed", "csrf_token": update_csrf},
            follow_redirects=True
        )
        self.assertIn("Task status updated", res_update.get_data(as_text=True))

        # Verify task is completed
        t_after = db.query_one("SELECT status FROM tasks WHERE id = %s", (task["id"],))
        self.assertEqual(t_after["status"], "completed")

    # -------------------------------------------------------------
    # 9. Originality Checker (Module 10)
    # -------------------------------------------------------------
    def test_09_originality_checker(self):
        self.login_user("maya@student.edu", "Student@2026")
        csrf = self.get_session_csrf(self.client)

        # Test idea with high similarity to existing "AI Resume Screening & Ranking Engine"
        similar_query = {
            "title": "AI Resume Screening and Ranking Engine",
            "description": "An intelligent resume evaluation system that parses candidate CVs, extracts technical proficiencies, and matches against job requirement descriptors.",
            "csrf_token": csrf
        }
        res_check = self.client.post("/originality", data=similar_query, follow_redirects=True)
        content = res_check.get_data(as_text=True)

        self.assertIn("Check Your Project Idea", content)
        self.assertIn("Similar project(s) found in our database", content)
        self.assertIn("Disclaimer", content)

        # Test novel idea
        novel_csrf = self.get_session_csrf(self.client)
        novel_query = {
            "title": "Deep Sea Hydrothermal Vent Acoustic Sensor Network",
            "description": "Submarine acoustic sensors tracking geothermal pressure anomalies near oceanic crust fissures.",
            "csrf_token": novel_csrf
        }
        res_novel = self.client.post("/originality", data=novel_query, follow_redirects=True)
        content_novel = res_novel.get_data(as_text=True)

        self.assertIn("No similar project found in our database", content_novel)
        self.assertIn("Disclaimer", content_novel)

    # -------------------------------------------------------------
    # 10. Admin Dashboard & Student Management (Module 11)
    # -------------------------------------------------------------
    def test_10_admin_dashboard(self):
        self.login_user("admin@college.edu", "AdminSecure@2026")
        res = self.client.get("/admin/dashboard")
        content = res.get_data(as_text=True)

        self.assertIn("Administrator Executive Dashboard", content)
        self.assertIn("Registered Approved Students", content)
        self.assertIn("Alex Chen", content)
        self.assertIn("Maya Patel", content)

        # Verify Workspace Tasks statistics card
        self.assertIn("Workspace Tasks", content)
        db_total_tasks = db.query_one("SELECT COUNT(*) as count FROM tasks t JOIN projects p ON t.project_id = p.id")["count"]
        db_completed_tasks = db.query_one("SELECT COUNT(*) as count FROM tasks t JOIN projects p ON t.project_id = p.id WHERE LOWER(t.status) = 'completed'")["count"]
        self.assertIn(f">{db_total_tasks}<", content)
        self.assertIn(f"{db_completed_tasks} Tasks Completed", content)

    # -------------------------------------------------------------
    # 11. Student Applications to Join Existing Projects
    # -------------------------------------------------------------
    def test_11_student_applications(self):
        # Liam applies to Alex's project "AI Resume Screening & Ranking Engine"
        alex_user = db.query_one("SELECT * FROM users WHERE email = 'alex@student.edu'")
        liam_user = db.query_one("SELECT * FROM users WHERE email = 'liam@student.edu'")
        resume_proj = db.query_one("SELECT * FROM projects WHERE title LIKE '%AI Resume Screening%'")
        self.assertIsNotNone(resume_proj)

        # 1. Liam explores projects and sees matching percentage and team capacity
        liam_client = app.test_client()
        self.login_user("liam@student.edu", "Student@2026", liam_client)
        res_explore = liam_client.get("/explore")
        content_explore = res_explore.get_data(as_text=True)
        self.assertIn("AI Resume Screening", content_explore)
        self.assertIn("Apply to Join", content_explore)
        self.assertIn("Team Capacity:", content_explore)

        # 2. Alex cannot apply to his own project
        alex_client = app.test_client()
        self.login_user("alex@student.edu", "Student@2026", alex_client)
        alex_csrf = self.get_session_csrf(alex_client)
        res_own_apply = alex_client.post(
            f"/projects/{resume_proj['id']}/apply",
            data={"message": "I want to apply to my own project", "csrf_token": alex_csrf},
            follow_redirects=True
        )
        self.assertIn("cannot apply to join your own project", res_own_apply.get_data(as_text=True).lower())

        # 3. Liam submits an application to join Alex's project
        liam_csrf = self.get_session_csrf(liam_client)
        res_apply = liam_client.post(
            f"/projects/{resume_proj['id']}/apply",
            data={"message": "I have extensive experience with NLP and vector embeddings.", "csrf_token": liam_csrf},
            follow_redirects=True
        )
        self.assertIn("Application submitted successfully", res_apply.get_data(as_text=True))

        # Check DB
        app_record = db.query_one(
            "SELECT * FROM project_applications WHERE project_id = %s AND applicant_id = %s",
            (resume_proj["id"], liam_user["id"])
        )
        self.assertIsNotNone(app_record)
        self.assertEqual(app_record["status"], "pending")

        # 4. Duplicate pending application is prevented
        res_dup = liam_client.post(
            f"/projects/{resume_proj['id']}/apply",
            data={"message": "Applying again", "csrf_token": liam_csrf},
            follow_redirects=True
        )
        self.assertIn("already have a pending application", res_dup.get_data(as_text=True).lower())

        # 5. Alex reviews application on dashboard
        res_dash = alex_client.get("/student/dashboard")
        dash_content = res_dash.get_data(as_text=True)
        self.assertIn("Project Applications Received", dash_content)
        self.assertIn("Liam Davis", dash_content)
        self.assertIn("I have extensive experience with NLP", dash_content)
        self.assertIn("Accept Application", dash_content)

        # 6. Alex accepts Liam's application
        alex_csrf = self.get_session_csrf(alex_client)
        res_decide = alex_client.post(
            f"/applications/{app_record['id']}/decide",
            data={"action": "accept", "csrf_token": alex_csrf},
            follow_redirects=True
        )
        self.assertIn("Application accepted", res_decide.get_data(as_text=True))

        # Verify Liam is now in team_members
        membership = db.query_one(
            "SELECT * FROM team_members WHERE project_id = %s AND student_id = %s",
            (resume_proj["id"], liam_user["id"])
        )
        self.assertIsNotNone(membership)
        self.assertEqual(membership["role"], "member")

        # Verify application status in DB is accepted
        app_updated = db.query_one("SELECT * FROM project_applications WHERE id = %s", (app_record["id"],))
        self.assertEqual(app_updated["status"], "accepted")

        # 7. Existing member (Liam) cannot apply again
        res_reapply = liam_client.post(
            f"/projects/{resume_proj['id']}/apply",
            data={"message": "Applying again after already joining", "csrf_token": liam_csrf},
            follow_redirects=True
        )
        self.assertIn("already a member", res_reapply.get_data(as_text=True).lower())

        # 8. Rejection workflow: Maya applies and Alex rejects
        maya_user = db.query_one("SELECT * FROM users WHERE email = 'maya@student.edu'")
        maya_client = app.test_client()
        self.login_user("maya@student.edu", "Student@2026", maya_client)
        maya_csrf = self.get_session_csrf(maya_client)

        res_m_apply = maya_client.post(
            f"/projects/{resume_proj['id']}/apply",
            data={"message": "I would like to help with front-end testing.", "csrf_token": maya_csrf},
            follow_redirects=True
        )
        self.assertIn("Application submitted successfully", res_m_apply.get_data(as_text=True))
        m_app = db.query_one(
            "SELECT * FROM project_applications WHERE project_id = %s AND applicant_id = %s AND status = 'pending'",
            (resume_proj["id"], maya_user["id"])
        )
        self.assertIsNotNone(m_app)

        # Non-owner (Liam) cannot decide Maya's application (403 Forbidden)
        res_unauth = liam_client.post(
            f"/applications/{m_app['id']}/decide",
            data={"action": "reject", "csrf_token": liam_csrf}
        )
        self.assertEqual(res_unauth.status_code, 403)

        # Owner (Alex) rejects Maya's application
        res_rej = alex_client.post(
            f"/applications/{m_app['id']}/decide",
            data={"action": "reject", "csrf_token": alex_csrf},
            follow_redirects=True
        )
        self.assertIn("Application rejected", res_rej.get_data(as_text=True))

        # Check DB: status is rejected, decided_at is set, no team membership
        m_app_db = db.query_one("SELECT * FROM project_applications WHERE id = %s", (m_app["id"],))
        self.assertEqual(m_app_db["status"], "rejected")
        self.assertIsNotNone(m_app_db["decided_at"])
        m_mem = db.query_one("SELECT * FROM team_members WHERE project_id = %s AND student_id = %s", (resume_proj["id"], maya_user["id"]))
        self.assertIsNone(m_mem)

    # -------------------------------------------------------------
    # 12. Automatic Project Idea Storage & Originality Checking
    # -------------------------------------------------------------
    def test_12_automatic_team_formation_originality_check(self):
        # Create a 2-person project by Maya
        maya_client = app.test_client()
        self.login_user("maya@student.edu", "Student@2026", maya_client)
        maya_csrf = self.get_session_csrf(maya_client)
        maya_user = db.query_one("SELECT * FROM users WHERE email = 'maya@student.edu'")

        # Create project with similar idea to "AI Resume Screening & Ranking Engine"
        proj_data = {
            "title": "Smart AI Candidate Resume Screening & Ranking",
            "description": "An automated resume screening tool that extracts candidate skills, compares with job descriptions, and calculates match rankings.",
            "domain": "Artificial Intelligence",
            "max_members": 2,
            "required_skills": "Python, Machine Learning, NLP",
            "csrf_token": maya_csrf
        }
        res_create = maya_client.post("/projects/create", data=proj_data, follow_redirects=True)
        new_proj = db.query_one("SELECT * FROM projects WHERE title = %s", (proj_data["title"],))
        self.assertIsNotNone(new_proj)

        # Team is not yet full (1/2 members), so automatic check has not run yet
        check_before = db.query_one(
            "SELECT * FROM project_originality_checks WHERE project_id = %s AND trigger_event = 'team_formed'",
            (new_proj["id"],)
        )
        self.assertIsNone(check_before)

        # Pooja applies to join Maya's project
        pooja_user = db.query_one("SELECT * FROM users WHERE email = 'pooja@student.edu'")
        pooja_client = app.test_client()
        self.login_user("pooja@student.edu", "Student@2026", pooja_client)
        pooja_csrf = self.get_session_csrf(pooja_client)

        pooja_client.post(
            f"/projects/{new_proj['id']}/apply",
            data={"message": "I want to collaborate on NLP screening algorithms.", "csrf_token": pooja_csrf},
            follow_redirects=True
        )
        app_record = db.query_one(
            "SELECT * FROM project_applications WHERE project_id = %s AND applicant_id = %s",
            (new_proj["id"], pooja_user["id"])
        )
        self.assertIsNotNone(app_record)

        # Maya accepts Pooja -> Team reaches 2/2 (fully formed!)
        maya_csrf = self.get_session_csrf(maya_client)
        res_accept = maya_client.post(
            f"/applications/{app_record['id']}/decide",
            data={"action": "accept", "csrf_token": maya_csrf},
            follow_redirects=True
        )
        self.assertIn("Application accepted", res_accept.get_data(as_text=True))

        # Verify automatic originality check was triggered and saved in DB
        orig_check = db.query_one(
            "SELECT * FROM project_originality_checks WHERE project_id = %s AND trigger_event = 'team_formed'",
            (new_proj["id"],)
        )
        self.assertIsNotNone(orig_check)
        self.assertGreater(orig_check["compared_count"], 0)
        self.assertIsNotNone(orig_check["closest_project_title"])
        # Exclude self-comparison: check that closest_project_id is NOT new_proj["id"]
        self.assertNotEqual(orig_check["closest_project_id"], new_proj["id"])

        # Check Maya's dashboard displays the Automatic Originality Checks section
        res_dash = maya_client.get("/student/dashboard")
        dash_content = res_dash.get_data(as_text=True)
        self.assertIn("Automatic Originality Checks", dash_content)
        self.assertIn("Trigger: <strong>Team formed</strong>", dash_content)
        self.assertIn("honest platform text similarity check", dash_content)

        # Test manual recheck route
        maya_csrf = self.get_session_csrf(maya_client)
        res_recheck = maya_client.post(
            f"/projects/{new_proj['id']}/originality-check",
            data={"csrf_token": maya_csrf},
            follow_redirects=True
        )
        self.assertIn("Originality recheck completed", res_recheck.get_data(as_text=True))

    # -------------------------------------------------------------
    # 13. Invitation Module: Sent & Received Pages with Status Filters
    # -------------------------------------------------------------
    def test_13_invitation_module_pages_and_filters(self):
        # Setup: Maya creates a project and invites Liam and Pooja
        maya_client = app.test_client()
        self.login_user("maya@student.edu", "Student@2026", maya_client)
        maya_csrf = self.get_session_csrf(maya_client)
        liam_user = db.query_one("SELECT * FROM users WHERE email = 'liam@student.edu'")
        pooja_user = db.query_one("SELECT * FROM users WHERE email = 'pooja@student.edu'")

        # Create a fresh 3-person project by Maya
        proj_data = {
            "title": "Quantum Cryptography Key Exchange",
            "description": "Simulation platform for quantum key distribution protocols with noise mitigation.",
            "domain": "Cybersecurity",
            "max_members": 3,
            "required_skills": "Python, SQL, Cryptography",
            "csrf_token": maya_csrf
        }
        maya_client.post("/projects/create", data=proj_data, follow_redirects=True)
        q_proj = db.query_one("SELECT * FROM projects WHERE title = %s", (proj_data["title"],))
        self.assertIsNotNone(q_proj)

        # Maya sends invitation 1 to Liam
        maya_csrf = self.get_session_csrf(maya_client)
        maya_client.post(
            f"/projects/{q_proj['id']}/invite",
            data={"recipient_id": str(liam_user["id"]), "message": "Join us for key distribution simulation!", "csrf_token": maya_csrf},
            follow_redirects=True
        )

        # Maya sends invitation 2 to Pooja
        maya_csrf = self.get_session_csrf(maya_client)
        maya_client.post(
            f"/projects/{q_proj['id']}/invite",
            data={"recipient_id": str(pooja_user["id"]), "message": "Help with simulation backend!", "csrf_token": maya_csrf},
            follow_redirects=True
        )

        inv_liam = db.query_one("SELECT * FROM invitations WHERE project_id = %s AND recipient_id = %s", (q_proj["id"], liam_user["id"]))
        inv_pooja = db.query_one("SELECT * FROM invitations WHERE project_id = %s AND recipient_id = %s", (q_proj["id"], pooja_user["id"]))
        self.assertIsNotNone(inv_liam)
        self.assertIsNotNone(inv_pooja)
        self.assertEqual(inv_liam["status"], "pending")
        self.assertEqual(inv_pooja["status"], "pending")

        # 1. Maya visits Sent Invitations page (/invitations/sent)
        res_sent = maya_client.get("/invitations/sent")
        sent_html = res_sent.get_data(as_text=True)
        self.assertIn("Sent Invitations", sent_html)
        self.assertIn("Liam Davis", sent_html)
        self.assertIn("Pooja Sharma", sent_html)
        self.assertIn("Quantum Cryptography Key Exchange", sent_html)
        self.assertIn("Pending", sent_html)

        # Test pending filter on sent page
        res_sent_pending = maya_client.get("/invitations/sent?status=pending")
        self.assertEqual(res_sent_pending.status_code, 200)
        self.assertIn("Liam Davis", res_sent_pending.get_data(as_text=True))

        # Test accepted filter when none accepted yet -> empty state
        res_sent_acc = maya_client.get("/invitations/sent?status=accepted")
        self.assertEqual(res_sent_acc.status_code, 200)
        self.assertIn("None of your sent invitations have been accepted yet", res_sent_acc.get_data(as_text=True))

        # 2. Liam visits Received Invitations page (/invitations/received)
        liam_client = app.test_client()
        self.login_user("liam@student.edu", "Student@2026", liam_client)
        res_rec = liam_client.get("/invitations/received")
        rec_html = res_rec.get_data(as_text=True)
        self.assertIn("Received Invitations", rec_html)
        self.assertIn("Quantum Cryptography Key Exchange", rec_html)
        self.assertIn("Maya Patel", rec_html)
        self.assertIn("Accept Invitation", rec_html)
        self.assertIn("Reject", rec_html)

        # 3. Liam rejects Maya's invitation
        liam_csrf = self.get_session_csrf(liam_client)
        res_rej = liam_client.post(
            f"/invitations/{inv_liam['id']}/respond",
            data={"action": "reject", "csrf_token": liam_csrf},
            follow_redirects=True
        )
        self.assertIn("Invitation rejected", res_rej.get_data(as_text=True))

        # Verify Liam is NOT added to team members
        liam_mem = db.query_one("SELECT * FROM team_members WHERE project_id = %s AND student_id = %s", (q_proj["id"], liam_user["id"]))
        self.assertIsNone(liam_mem)

        # Verify rejected status in DB and on Liam's received page
        inv_liam_updated = db.query_one("SELECT * FROM invitations WHERE id = %s", (inv_liam["id"],))
        self.assertEqual(inv_liam_updated["status"], "rejected")

        res_rec_rej = liam_client.get("/invitations/received?status=rejected")
        rec_rej_html = res_rec_rej.get_data(as_text=True)
        self.assertIn("Quantum Cryptography Key Exchange", rec_rej_html)
        self.assertIn("Rejected", rec_rej_html)
        # Response buttons must NOT appear for rejected invitation
        self.assertNotIn("Accept Invitation", rec_rej_html)

        # 4. Pooja visits Received Invitations and accepts her invitation
        pooja_client = app.test_client()
        self.login_user("pooja@student.edu", "Student@2026", pooja_client)
        pooja_csrf = self.get_session_csrf(pooja_client)
        res_acc = pooja_client.post(
            f"/invitations/{inv_pooja['id']}/respond",
            data={"action": "accept", "csrf_token": pooja_csrf},
            follow_redirects=True
        )
        self.assertIn("Success! You have joined", res_acc.get_data(as_text=True))

        # Verify Pooja is confirmed member in team_members
        pooja_mem = db.query_one("SELECT * FROM team_members WHERE project_id = %s AND student_id = %s", (q_proj["id"], pooja_user["id"]))
        self.assertIsNotNone(pooja_mem)
        self.assertEqual(pooja_mem["role"], "member")

        # Response buttons must NOT appear for accepted invitation
        res_rec_acc = pooja_client.get("/invitations/received?status=accepted")
        rec_acc_html = res_rec_acc.get_data(as_text=True)
        self.assertIn("Accepted", rec_acc_html)
        self.assertNotIn("Accept Invitation", rec_acc_html)
        self.assertIn("Open Project Workspace", rec_acc_html)

        # 5. Maya verifies Sent Invitations filters reflect both decisions
        res_maya_acc = maya_client.get("/invitations/sent?status=accepted")
        self.assertIn("Pooja Sharma", res_maya_acc.get_data(as_text=True))

        res_maya_rej = maya_client.get("/invitations/sent?status=rejected")
        self.assertIn("Liam Davis", res_maya_rej.get_data(as_text=True))

        # 6. Security & Unauthorized checks:
        # Non-recipient (Alex) cannot respond to Liam's invitation
        alex_client = app.test_client()
        self.login_user("alex@student.edu", "Student@2026", alex_client)
        alex_csrf = self.get_session_csrf(alex_client)
        res_unauth = alex_client.post(
            f"/invitations/{inv_liam['id']}/respond",
            data={"action": "accept", "csrf_token": alex_csrf}
        )
        self.assertEqual(res_unauth.status_code, 403)

    # -------------------------------------------------------------
    # 14. Explore Recommendations, View Project & Creator Profile, Apply
    # -------------------------------------------------------------
    def test_14_explore_recommendations_creator_profile_and_apply(self):
        # Student Liam explores projects
        liam_client = app.test_client()
        self.login_user("liam@student.edu", "Student@2026", liam_client)

        res_explore = liam_client.get("/explore")
        self.assertEqual(res_explore.status_code, 200)
        explore_html = res_explore.get_data(as_text=True)

        # 1. Personalized Recommendations & Matching calculation
        self.assertIn("Personalized project recommendations", explore_html)
        self.assertIn("Ranked by Skill Matching Accuracy", explore_html)
        self.assertIn("View Project", explore_html)
        self.assertIn("Matching:", explore_html)
        self.assertIn("Missing:", explore_html)

        # 2. View Project Details
        resume_proj = db.query_one("SELECT * FROM projects WHERE title LIKE '%Resume Screening%'")
        self.assertIsNotNone(resume_proj)

        res_proj = liam_client.get(f"/projects/{resume_proj['id']}")
        self.assertEqual(res_proj.status_code, 200)
        proj_html = res_proj.get_data(as_text=True)

        self.assertIn("AI Resume Screening", proj_html)
        self.assertIn("View Creator Profile", proj_html)
        self.assertIn("Target Technical Skills", proj_html)
        self.assertIn("Matching Skills in Your Profile", proj_html)
        self.assertIn("Confirmed Project Team Members", proj_html)

        # 3. View Creator Profile
        res_creator = liam_client.get(f"/students/{resume_proj['owner_id']}?from_project={resume_proj['id']}")
        self.assertEqual(res_creator.status_code, 200)
        creator_html = res_creator.get_data(as_text=True)

        self.assertIn("Alex Chen", creator_html)
        self.assertIn("Computer Science", creator_html)
        self.assertIn("Technical Skills & Programming Languages", creator_html)
        self.assertIn("Python", creator_html)
        self.assertIn("Back to Project:", creator_html)
        self.assertIn("AI Resume Screening", creator_html)
        # Security: No sensitive passwords or password hashes
        self.assertNotIn("password_hash", creator_html)
        self.assertNotIn("pbkdf2:sha256", creator_html)

        # 4. View an Open Project where Liam is not a member (e.g. Maya's Campus Event Navigator) and Apply to Join
        campus_proj = db.query_one("SELECT * FROM projects WHERE title LIKE '%Campus Event Navigator%'")
        self.assertIsNotNone(campus_proj)

        res_campus = liam_client.get(f"/projects/{campus_proj['id']}")
        self.assertEqual(res_campus.status_code, 200)
        campus_html = res_campus.get_data(as_text=True)
        self.assertIn("Smart Campus Event Navigator", campus_html)
        self.assertIn("Apply to Join Team", campus_html)

        liam_csrf = self.get_session_csrf(liam_client)
        apply_data = {
            "message": "I specialize in backend architecture and would love to contribute to this navigator.",
            "next": f"/projects/{campus_proj['id']}",
            "csrf_token": liam_csrf
        }
        res_apply = liam_client.post(
            f"/projects/{campus_proj['id']}/apply",
            data=apply_data,
            follow_redirects=True
        )
        self.assertEqual(res_apply.status_code, 200)
        apply_html = res_apply.get_data(as_text=True)
        self.assertIn("Application submitted successfully", apply_html)
        self.assertIn("Application Pending Owner Review", apply_html)

    # -------------------------------------------------------------
    # 15. Student Registration Approval Status, Check Status & Notifications
    # -------------------------------------------------------------
    def test_15_registration_status_workflow_and_notifications(self):
        # Clean test user if already exists
        db.execute("DELETE FROM users WHERE email = 'neo@student.edu'")

        # 1. Registration Request Submission
        reg_client = app.test_client()
        csrf = self.get_session_csrf(reg_client)
        reg_data = {
            "name": "Thomas Anderson",
            "email": "neo@student.edu",
            "password": "MatrixPassword@2026",
            "department": "Computer Science & Engineering",
            "semester": "6",
            "section": "A",
            "bio": "Specializing in distributed neural architectures.",
            "csrf_token": csrf
        }
        res_reg = reg_client.post("/register", data=reg_data, follow_redirects=True)
        reg_html = res_reg.get_data(as_text=True)
        self.assertIn("Your registration request has been submitted", reg_html)
        self.assertIn("Please wait for Admin approval", reg_html)

        # Verify saved in DB with status pending
        neo_user = db.query_one("SELECT * FROM users WHERE email = %s", ("neo@student.edu",))
        self.assertIsNotNone(neo_user)
        self.assertEqual(neo_user["status"], "pending")

        # 2. Check Status while Pending
        res_chk_pending = reg_client.get("/check-status?email=neo@student.edu")
        chk_pending_html = res_chk_pending.get_data(as_text=True)
        self.assertIn("Pending", chk_pending_html)
        self.assertIn("Your registration is awaiting Admin approval.", chk_pending_html)
        self.assertIn("Your account is awaiting Admin approval. You will be able to log in after your account is approved.", chk_pending_html)

        # 3. Blocked Login Attempt while Pending
        res_login_pending = self.login_user("neo@student.edu", "MatrixPassword@2026", client=reg_client)
        login_pending_html = res_login_pending.get_data(as_text=True)
        self.assertIn("Your account is awaiting Admin approval. You will be able to log in after your account is approved.", login_pending_html)
        self.assertIn("Check Registration Status", login_pending_html)

        # 4. Protected access blocked
        res_prot = reg_client.get("/student/dashboard", follow_redirects=False)
        self.assertEqual(res_prot.status_code, 302)
        self.assertIn("/login", res_prot.headers.get("Location", ""))

        # 5. Admin Workflow: View in Pending filter
        admin_client = app.test_client()
        self.login_user("admin@college.edu", "AdminSecure@2026", client=admin_client)
        res_admin_pending = admin_client.get("/admin/dashboard?status=pending")
        self.assertIn("Thomas Anderson", res_admin_pending.get_data(as_text=True))

        # Admin approves Thomas
        admin_csrf = self.get_session_csrf(admin_client)
        res_approve = admin_client.post(
            f"/admin/accounts/{neo_user['id']}/decide",
            data={"decision": "approve", "csrf_token": admin_csrf},
            follow_redirects=True
        )
        self.assertIn("approved successfully", res_approve.get_data(as_text=True))

        # Verify DB updated_at timestamp and status
        neo_after_app = db.query_one("SELECT * FROM users WHERE id = %s", (neo_user["id"],))
        self.assertEqual(neo_after_app["status"], "approved")
        self.assertIsNotNone(neo_after_app.get("updated_at"))

        # Prevent repeated approval
        res_dup = admin_client.post(
            f"/admin/accounts/{neo_user['id']}/decide",
            data={"decision": "approve", "csrf_token": admin_csrf},
            follow_redirects=True
        )
        self.assertIn("already been approved", res_dup.get_data(as_text=True))

        # 6. Check Status while Approved
        res_chk_app = reg_client.get("/check-status?email=neo@student.edu")
        chk_app_html = res_chk_app.get_data(as_text=True)
        self.assertIn("Approved", chk_app_html)
        self.assertIn("Your account has been approved. You can now log in.", chk_app_html)

        # 7. Student can now log in successfully
        res_login_success = self.login_user("neo@student.edu", "MatrixPassword@2026", client=reg_client)
        self.assertIn("Welcome back, Thomas Anderson", res_login_success.get_data(as_text=True))

        # 8. Rejection Workflow: Create a rejected account
        db.execute("DELETE FROM users WHERE email = 'cypher@student.edu'")
        cypher_id = db.execute(
            "INSERT INTO users (email, password_hash, role, status) VALUES (%s, %s, 'student', 'pending')",
            ("cypher@student.edu", generate_password_hash("CypherSecret@2026"))
        )
        db.execute(
            "INSERT INTO student_profiles (user_id, name, department) VALUES (%s, %s, %s)",
            (cypher_id, "Reagan Cypher", "Electrical Engineering")
        )

        # Admin rejects Cypher
        res_rej = admin_client.post(
            f"/admin/accounts/{cypher_id}/decide",
            data={"decision": "reject", "csrf_token": admin_csrf},
            follow_redirects=True
        )
        self.assertIn("rejected", res_rej.get_data(as_text=True))

        # Verify DB status is rejected
        cypher_db = db.query_one("SELECT * FROM users WHERE id = %s", (cypher_id,))
        self.assertEqual(cypher_db["status"], "rejected")

        # Prevent repeated rejection
        res_dup_rej = admin_client.post(
            f"/admin/accounts/{cypher_id}/decide",
            data={"decision": "reject", "csrf_token": admin_csrf},
            follow_redirects=True
        )
        self.assertIn("already been rejected", res_dup_rej.get_data(as_text=True))

        # Attempt to log in with rejected account -> blocked with message
        cypher_client = app.test_client()
        res_cypher_login = self.login_user("cypher@student.edu", "CypherSecret@2026", client=cypher_client)
        cypher_login_html = res_cypher_login.get_data(as_text=True)
        self.assertIn("Your registration request was rejected by the Admin. Please contact the college project administrator for further information.", cypher_login_html)

        # Check status for rejected account -> displays exact prompt message
        res_cypher_status = cypher_client.get("/check-status?email=cypher@student.edu")
        cypher_status_html = res_cypher_status.get_data(as_text=True)
        self.assertIn("Rejected", cypher_status_html)
        self.assertIn("Your registration request was rejected. Please contact the project administrator.", cypher_status_html)

        # 9. Non-existent email search does not reveal internal details
        res_unknown = cypher_client.get("/check-status?email=nonexistent@college.edu")
        self.assertIn("No registration request found for this email address", res_unknown.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
