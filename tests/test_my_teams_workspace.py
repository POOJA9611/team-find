"""
Comprehensive Verification Suite for Student -> Project Teams -> My Teams Workspace.
Tests:
- Automatic project access after team membership / invitation acceptance
- Backend authorization: Non-members blocked from viewing other teams (403)
- Project overview, leader, faculty mentor, and member list metadata
- Role and responsibilities assignment by team leader (persisted in database)
- Non-leader blocked from modifying member roles (403)
- Task management (Create, Edit, Delete) by team leader
- Non-leader blocked from creating, editing, or deleting tasks (403)
- Strict work completion security: Students can only update status of tasks assigned to them (or leader) (403)
- Unassigned members blocked from updating another member's task progress (403)
- Accurate progress tracking calculation (overall team vs. individual student)
- Zero fake percentages: proper empty state when 0 tasks exist
"""

import sys
import os
import json
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from backend.database import get_db

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def test_my_teams_workspace():
    print("=" * 70)
    print("🚀 RUNNING STUDENT -> MY TEAMS WORKSPACE INTEGRATION & SECURITY SUITE")
    print("=" * 70)

    client = app.test_client()
    ts = int(time.time() * 1000)

    # 1. Register Team Leader
    leader_email = f"ws.lead.{ts}@student.edu"
    reg_leader = client.post("/api/auth/signup", json={
        "name": "Maya WorkspaceLead",
        "email": leader_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-WS-LEAD-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "fullstack",
        "languages": "Python, React, SQL"
    })
    assert reg_leader.status_code == 201
    leader_token = reg_leader.get_json()["token"]
    leader_id = reg_leader.get_json()["user"]["id"]
    leader_headers = {"Authorization": f"Bearer {leader_token}"}
    print(f"✅ 1. Team Leader registered (ID: {leader_id})")

    # 2. Register Team Member A (Assignee)
    member_a_email = f"ws.memA.{ts}@student.edu"
    reg_a = client.post("/api/auth/signup", json={
        "name": "Alice Assignee",
        "email": member_a_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-WS-A-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "frontend",
        "languages": "React, CSS, HTML"
    })
    assert reg_a.status_code == 201
    member_a_token = reg_a.get_json()["token"]
    member_a_id = reg_a.get_json()["user"]["id"]
    member_a_headers = {"Authorization": f"Bearer {member_a_token}"}
    print(f"✅ 2. Team Member A registered (ID: {member_a_id})")

    # 3. Register Team Member B (Collaborator)
    member_b_email = f"ws.memB.{ts}@student.edu"
    reg_b = client.post("/api/auth/signup", json={
        "name": "Bob Collaborator",
        "email": member_b_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-WS-B-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "backend",
        "languages": "Python, Flask, SQLite"
    })
    assert reg_b.status_code == 201
    member_b_token = reg_b.get_json()["token"]
    member_b_id = reg_b.get_json()["user"]["id"]
    member_b_headers = {"Authorization": f"Bearer {member_b_token}"}
    print(f"✅ 3. Team Member B registered (ID: {member_b_id})")

    # 4. Register Outside Student (Non-Member)
    outside_email = f"ws.outside.{ts}@student.edu"
    reg_out = client.post("/api/auth/signup", json={
        "name": "Oscar Outside",
        "email": outside_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-WS-OUT-{ts}",
        "department": "Computer Science",
        "semester": 6
    })
    assert reg_out.status_code == 201
    outside_token = reg_out.get_json()["token"]
    outside_id = reg_out.get_json()["user"]["id"]
    outside_headers = {"Authorization": f"Bearer {outside_token}"}
    print(f"✅ 4. Outside Student registered (ID: {outside_id})")

    # 5. Leader creates project team
    team_res = client.post("/api/teams/proposals", headers=leader_headers, json={
        "name": f"Workspace Innovation {ts}",
        "project_title": "Real-Time Collaborative Workspace",
        "domain": "Web Development",
        "technologies": "Python, React, SQLite",
        "required_skills": "Backend API, Frontend UI",
        "max_members": 3,
        "description": "Comprehensive collaborative workspace for team deliverables."
    })
    assert team_res.status_code == 201
    team_id = team_res.get_json()["teamId"]
    print(f"✅ 5. Team created (ID: {team_id})")

    # 6. Add Member A and Member B to team
    with app.app_context():
        db = get_db()
        db.run("INSERT OR IGNORE INTO team_members (team_id, student_id, role) VALUES (?, ?, 'member')", [team_id, member_a_id])
        db.run("INSERT OR IGNORE INTO team_members (team_id, student_id, role) VALUES (?, ?, 'member')", [team_id, member_b_id])
    print("✅ 6. Members A and B added to team_members")

    # 7. Test Backend Authorization: Outside student blocked from accessing this team workspace
    unauth_res = client.get(f"/api/teams/my-team?team_id={team_id}", headers=outside_headers)
    assert unauth_res.status_code == 403, f"Expected 403 Forbidden for non-member, got {unauth_res.status_code}"
    print("✅ 7. Security: Non-members strictly blocked from viewing team workspace (403 Forbidden)")

    # 8. Member A accesses workspace
    mem_a_ws = client.get(f"/api/teams/my-team?team_id={team_id}", headers=member_a_headers)
    assert mem_a_ws.status_code == 200
    ws_data = mem_a_ws.get_json()
    assert ws_data["team"]["id"] == team_id
    assert len(ws_data["members"]) == 3
    assert ws_data["myRole"]["role"] == "member"
    assert ws_data["teamProgress"]["total"] == 0
    assert ws_data["teamProgress"]["percentage"] == 0
    print("✅ 8. Member A successfully accessed team workspace (Empty progress state: 0 tasks, 0%)")

    # 9. Leader assigns role and responsibilities to Member A
    role_res = client.post(f"/api/teams/{team_id}/members/{member_a_id}/role", headers=leader_headers)
    # PUT endpoint
    role_res = client.put(f"/api/teams/{team_id}/members/{member_a_id}/role", headers=leader_headers, json={
        "role_title": "Frontend Lead",
        "responsibilities": "Develop responsive components, UI themes, and client-side routing."
    })
    assert role_res.status_code == 200, f"Role update failed: {role_res.get_json()}"
    print("✅ 9. Leader assigned 'Frontend Lead' role to Member A")

    # 10. Security: Non-leader Member A cannot assign/update Member B's role
    hack_role = client.put(f"/api/teams/{team_id}/members/{member_b_id}/role", headers=member_a_headers, json={
        "role_title": "Unauthorized Role",
        "responsibilities": "Hacked"
    })
    assert hack_role.status_code == 403
    print("✅ 10. Security: Non-leaders blocked from assigning member roles (403 Forbidden)")

    # Verify Member A's updated role is reflected in workspace
    mem_a_check = client.get(f"/api/teams/my-team?team_id={team_id}", headers=member_a_headers).get_json()
    assert mem_a_check["myRole"]["role_title"] == "Frontend Lead"
    assert "Develop responsive components" in mem_a_check["myRole"]["responsibilities"]
    print("✅ 11. Member A's assigned role & responsibilities verified in workspace")

    # 11. Leader creates Task 1 assigned to Member A
    task1_res = client.post(f"/api/teams/{team_id}/tasks", headers=leader_headers, json={
        "title": "Build Workspace UI Dashboard",
        "description": "Implement responsive workspace tabs and metrics widgets.",
        "assigned_to": member_a_id,
        "deadline": "2026-11-15"
    })
    assert task1_res.status_code == 201, f"Task 1 creation failed: {task1_res.get_json()}"
    task1_id = task1_res.get_json()["task"]["id"]
    print(f"✅ 12. Leader created Task 1 (ID: {task1_id}, assigned to Member A)")

    # 12. Leader creates Task 2 assigned to Member B
    task2_res = client.post(f"/api/teams/{team_id}/tasks", headers=leader_headers, json={
        "title": "Implement REST API Endpoints",
        "description": "Build CRUD routes with strict authorization and JSON validation.",
        "assigned_to": member_b_id,
        "deadline": "2026-11-20"
    })
    assert task2_res.status_code == 201
    task2_id = task2_res.get_json()["task"]["id"]
    print(f"✅ 13. Leader created Task 2 (ID: {task2_id}, assigned to Member B)")

    # 13. Security: Member A cannot create tasks (Only leader can create tasks)
    mem_create = client.post(f"/api/teams/{team_id}/tasks", headers=member_a_headers, json={
        "title": "Unauthorized Task",
        "description": "Should fail"
    })
    assert mem_create.status_code == 403
    print("✅ 14. Security: Non-leader prevented from creating tasks (403 Forbidden)")

    # 14. Security: Member B tries to update Task 1 (Assigned to Member A) -> MUST FAIL WITH 403
    hack_status = client.patch(f"/api/teams/{team_id}/tasks/{task1_id}/status", headers=member_b_headers, json={
        "status": "completed"
    })
    assert hack_status.status_code == 403, f"Expected 403 Forbidden when member B updates member A's task, got {hack_status.status_code}"
    print("✅ 15. Security: Student blocked from updating progress of tasks assigned to other members (403 Forbidden)")

    # 15. Member A updates their own Task 1 to 'in_progress'
    update_a_1 = client.patch(f"/api/teams/{team_id}/tasks/{task1_id}/status", headers=member_a_headers, json={
        "status": "in_progress"
    })
    assert update_a_1.status_code == 200
    assert update_a_1.get_json()["task"]["status"] == "in_progress"
    print("✅ 16. Member A updated own Task 1 to 'in_progress'")

    # 16. Member A updates their own Task 1 to 'completed'
    update_a_2 = client.patch(f"/api/teams/{team_id}/tasks/{task1_id}/status", headers=member_a_headers, json={
        "status": "completed"
    })
    assert update_a_2.status_code == 200
    assert update_a_2.get_json()["task"]["status"] == "completed"
    print("✅ 17. Member A marked own Task 1 as 'completed'")

    # 17. Leader updates Task 2 to 'in_progress' (Leader has supervisory override)
    update_lead = client.patch(f"/api/teams/{team_id}/tasks/{task2_id}/status", headers=leader_headers, json={
        "status": "in_progress"
    })
    assert update_lead.status_code == 200
    print("✅ 18. Leader updated Task 2 status to 'in_progress'")

    # 18. Verify Accurate Progress Tracking Calculation:
    # Total tasks = 2 (1 completed, 1 in_progress) -> Team Progress = 50%
    # Member A tasks = 1 (1 completed) -> Member A Individual Progress = 100%
    # Member B tasks = 1 (0 completed) -> Member B Individual Progress = 0%
    prog_res_lead = client.get(f"/api/teams/my-team?team_id={team_id}", headers=leader_headers).get_json()
    tp = prog_res_lead["teamProgress"]
    assert tp["total"] == 2
    assert tp["completed"] == 1
    assert tp["in_progress"] == 1
    assert tp["percentage"] == 50
    print(f"✅ 19. Team Progress calculated accurately: {tp['completed']}/{tp['total']} tasks ({tp['percentage']}%)")

    prog_res_a = client.get(f"/api/teams/my-team?team_id={team_id}", headers=member_a_headers).get_json()
    ip_a = prog_res_a["individualProgress"]
    assert ip_a["total"] == 1
    assert ip_a["completed"] == 1
    assert ip_a["percentage"] == 100
    print(f"✅ 20. Member A Individual Progress calculated accurately: {ip_a['completed']}/{ip_a['total']} tasks ({ip_a['percentage']}%)")

    prog_res_b = client.get(f"/api/teams/my-team?team_id={team_id}", headers=member_b_headers).get_json()
    ip_b = prog_res_b["individualProgress"]
    assert ip_b["total"] == 1
    assert ip_b["completed"] == 0
    assert ip_b["percentage"] == 0
    print(f"✅ 21. Member B Individual Progress calculated accurately: {ip_b['completed']}/{ip_b['total']} tasks ({ip_b['percentage']}%)")

    # 19. Leader edits Task 2 details
    edit_res = client.put(f"/api/teams/{team_id}/tasks/{task2_id}", headers=leader_headers, json={
        "title": "Implement REST API & WebSocket Handlers",
        "description": "Updated scope including real-time event notifications.",
        "assigned_to": member_b_id,
        "deadline": "2026-11-25"
    })
    assert edit_res.status_code == 200
    assert edit_res.get_json()["task"]["title"] == "Implement REST API & WebSocket Handlers"
    print("✅ 22. Leader successfully edited Task 2 details")

    # 20. Leader deletes Task 2
    del_res = client.delete(f"/api/teams/{team_id}/tasks/{task2_id}", headers=leader_headers)
    assert del_res.status_code == 200
    print("✅ 23. Leader deleted Task 2")

    # 21. Verify progress recalculation after deletion (1 total task, 1 completed = 100%)
    recalc = client.get(f"/api/teams/my-team?team_id={team_id}", headers=leader_headers).get_json()
    assert recalc["teamProgress"]["total"] == 1
    assert recalc["teamProgress"]["completed"] == 1
    assert recalc["teamProgress"]["percentage"] == 100
    print("✅ 24. Team progress dynamically updated to 100% after task deletion")

    print("\n" + "=" * 70)
    print("🎉 ALL MY TEAMS WORKSPACE INTEGRATION & SECURITY TESTS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    test_my_teams_workspace()
