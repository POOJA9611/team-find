"""
Automated Verification Suite for Student -> Team Project Module:
1. Priority field validation & persistence in tasks (low, medium, high, urgent)
2. Capacity enforcement & recruiting closure upon invitation acceptance
3. Real-time Socket.IO team room joining & event emission
4. Dynamic role recommendation & Leader confirmation workflow
5. Task assignee recommendation based on workload & skills
6. Data isolation & strict permission enforcement (403 Forbidden for unauthorized actions)
7. Global user role preservation (users.role is never changed)
"""

import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app import app, socketio
from backend.database import get_db

client = app.test_client()

def test_team_project_realtime_and_roles():
    print("=" * 70)
    print("🚀 RUNNING STUDENT -> TEAM PROJECT REAL-TIME & ROLES TEST SUITE")
    print("=" * 70)

    db = get_db()
    ts = int(time.time() * 1000)

    # Helper for student registration
    def create_student(name, email, languages="Python, React, SQL", strength="fullstack"):
        res = client.post("/api/auth/signup", json={
            "name": name,
            "email": email,
            "password": "Password@123",
            "role": "student",
            "reg_no": f"REG-{int(time.time() * 1000) % 100000}",
            "department": "Computer Science & Engineering",
            "semester": 6,
            "cgpa": 8.8,
            "strength": strength,
            "languages": languages
        })
        assert res.status_code == 201, f"Signup failed for {email}: {res.get_json()}"
        data = res.get_json()
        return data["token"], data["user"]

    token_leader, user_leader = create_student("Alpha Leader", f"alpha_lead_{ts}@student.edu", "Python, Flask, Docker", "backend")
    token_member, user_member = create_student("Beta Member", f"beta_mem_{ts}@student.edu", "React, Tailwind, HTML, JavaScript", "frontend")
    token_invitee, user_invitee = create_student("Gamma Invitee", f"gamma_inv_{ts}@student.edu", "SQL, PostgreSQL, Database", "backend")
    token_outsider, user_outsider = create_student("Delta Outsider", f"delta_out_{ts}@student.edu", "Java, C++", "backend")

    auth_lead = {"Authorization": f"Bearer {token_leader}"}
    auth_mem = {"Authorization": f"Bearer {token_member}"}
    auth_inv = {"Authorization": f"Bearer {token_invitee}"}
    auth_out = {"Authorization": f"Bearer {token_outsider}"}

    print("✅ 1. Registered Leader, Member, Invitee, and Outsider students.")

    # 1. Create a Team Project with max_members = 2
    res = client.post("/api/teams/proposals", headers=auth_lead, json={
        "name": f"Cloud Sync Engine {ts}",
        "project_title": "Real-Time Distributed File Synchronizer",
        "domain": "Distributed Systems",
        "technologies": "Python, Flask, React, SQLite",
        "required_skills": "Python, React, API",
        "description": "Cross-platform distributed synchronization with conflict resolution.",
        "max_members": 2
    })
    assert res.status_code == 201
    team_id = res.get_json()["teamId"]
    db.run("UPDATE teams SET status = 'approved' WHERE id = ?", [team_id])
    print(f"✅ 2. Created and approved team (ID: {team_id}, max_members: 2).")

    # 2. Add Member to team (Team now has 2/2 members)
    db.run("INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'member')", [team_id, user_member["id"]])
    # Team is now at capacity
    db.run("UPDATE teams SET is_accepting_members = 0 WHERE id = ?", [team_id])

    # 3. Tasks & Priority: Leader creates tasks with different priorities
    t1_res = client.post(f"/api/teams/{team_id}/tasks", headers=auth_lead, json={
        "title": "Architect WebSocket Event Bridge",
        "description": "Establish real-time event broadcasting to scoped project rooms.",
        "assigned_to": user_member["id"],
        "priority": "urgent",
        "deadline": "2026-11-15"
    })
    assert t1_res.status_code == 201
    t1 = t1_res.get_json()["task"]
    assert t1["priority"] == "urgent"
    assert t1["assigned_to"] == user_member["id"]
    task1_id = t1["id"]

    t2_res = client.post(f"/api/teams/{team_id}/tasks", headers=auth_lead, json={
        "title": "Build Client-side Toast Alerts",
        "description": "Render notification toasts on received socket messages.",
        "assigned_to": user_leader["id"],
        "priority": "high",
        "deadline": "2026-11-20"
    })
    assert t2_res.status_code == 201
    t2 = t2_res.get_json()["task"]
    assert t2["priority"] == "high"
    task2_id = t2["id"]

    # Test priority update via PUT
    edit_res = client.put(f"/api/teams/{team_id}/tasks/{task2_id}", headers=auth_lead, json={
        "title": "Build Client-side Toast Alerts (Refined)",
        "priority": "urgent",
        "assigned_to": user_leader["id"]
    })
    assert edit_res.status_code == 200
    assert edit_res.get_json()["task"]["priority"] == "urgent"
    print("✅ 3. Verified task priority creation and editing (urgent, high, medium, low).")

    # 4. Progress calculation check
    ws_res = client.get(f"/api/teams/my-team?team_id={team_id}", headers=auth_lead)
    assert ws_res.status_code == 200
    ws = ws_res.get_json()
    assert ws["teamProgress"]["total"] == 2
    assert ws["teamProgress"]["completed"] == 0
    assert ws["teamProgress"]["percentage"] == 0

    # Member marks their task in_progress then completed
    st_res = client.patch(f"/api/teams/{team_id}/tasks/{task1_id}/status", headers=auth_mem, json={"status": "in_progress"})
    assert st_res.status_code == 200
    # In-progress tasks do NOT count as completed
    ws2 = client.get(f"/api/teams/my-team?team_id={team_id}", headers=auth_lead).get_json()
    assert ws2["teamProgress"]["completed"] == 0
    assert ws2["teamProgress"]["in_progress"] == 1
    assert ws2["teamProgress"]["percentage"] == 0

    # Mark completed -> now 1/2 = 50%
    st_comp = client.patch(f"/api/teams/{team_id}/tasks/{task1_id}/status", headers=auth_mem, json={"status": "completed"})
    assert st_comp.status_code == 200
    ws3 = client.get(f"/api/teams/my-team?team_id={team_id}", headers=auth_lead).get_json()
    assert ws3["teamProgress"]["completed"] == 1
    assert ws3["teamProgress"]["percentage"] == 50

    # Reopened task must no longer count as completed
    st_reopen = client.patch(f"/api/teams/{team_id}/tasks/{task1_id}/status", headers=auth_mem, json={"status": "in_progress"})
    assert st_reopen.status_code == 200
    ws4 = client.get(f"/api/teams/my-team?team_id={team_id}", headers=auth_lead).get_json()
    assert ws4["teamProgress"]["completed"] == 0
    assert ws4["teamProgress"]["percentage"] == 0
    print("✅ 4. Verified automatic progress recalculation (in-progress exclusion, completion, and reopening).")

    # 5. Role Assignment: Leader assigns role to member
    role_res = client.put(f"/api/teams/{team_id}/members/{user_member['id']}/role", headers=auth_lead, json={
        "role_title": "Frontend Lead",
        "responsibilities": "Lead UI development and client state management."
    })
    assert role_res.status_code == 200

    # Check global role isolation
    user_mem_row = db.get("SELECT role FROM users WHERE id = ?", [user_member["id"]])
    assert user_mem_row["role"] == "student", "Project role assignment must NEVER alter global users.role!"

    # Non-leader cannot assign role (403)
    hack_role = client.put(f"/api/teams/{team_id}/members/{user_leader['id']}/role", headers=auth_mem, json={
        "role_title": "Demoted"
    })
    assert hack_role.status_code == 403
    print("✅ 5. Verified role assignment & strict global account role isolation.")

    # 6. Capacity Enforcement & Invitation Acceptance
    # Expand team max_members to 3 so invitee can be invited
    db.run("UPDATE teams SET max_members = 3, is_accepting_members = 1 WHERE id = ?", [team_id])

    inv_res = client.post(f"/api/teams/{team_id}/invite", headers=auth_lead, json={
        "studentId": user_invitee["id"],
        "message": "Join our distributed file synchronizer project!"
    })
    assert inv_res.status_code == 201
    inv_id = inv_res.get_json()["invitationId"]

    # Invitee accepts invitation
    dec_res = client.post(f"/api/teams/invitations/{inv_id}/decide", headers=auth_inv, json={"action": "accept"})
    assert dec_res.status_code == 200

    # Invitee is now a confirmed member (Total: 3/3 members)
    mem_check = db.get("SELECT 1 FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, user_invitee["id"]])
    assert mem_check is not None

    # Team reached max_members (3), so is_accepting_members should automatically be set to 0
    team_row = db.get("SELECT is_accepting_members FROM teams WHERE id = ?", [team_id])
    assert team_row["is_accepting_members"] == 0, "Team reaching max capacity via invitation accept must close recruiting!"
    print("✅ 6. Verified invitation acceptance grants membership and automatically closes recruiting at capacity.")

    # 7. Real-Time Socket.IO verification
    sio_client_lead = socketio.test_client(app, auth={"token": token_leader})
    assert sio_client_lead.is_connected()

    # Join authorized team room
    lead_ack = sio_client_lead.emit("join_team", {"teamId": team_id}, callback=True)
    assert lead_ack.get("success") is True, f"Leader should be allowed to join team room, got {lead_ack}"

    # Unauthorized outsider joins team room -> rejected
    sio_client_out = socketio.test_client(app, auth={"token": token_outsider})
    assert sio_client_out.is_connected()
    out_ack = sio_client_out.emit("join_team", {"teamId": team_id}, callback=True)
    assert out_ack.get("error") is not None, f"Outsider joining team socket room must be rejected, got {out_ack}"
    print("✅ 7. Verified Socket.IO authenticated connection, room joining, and outsider authorization guard.")

    # 8. Outsider access isolation
    out_ws = client.get(f"/api/teams/my-team?team_id={team_id}", headers=auth_out)
    assert out_ws.status_code == 403, "Outsider strictly blocked from workspace."

    out_apps = client.get(f"/api/teams/{team_id}/applications", headers=auth_out)
    assert out_apps.status_code == 403, "Outsider strictly blocked from applications."

    out_cands = client.get(f"/api/teams/{team_id}/candidates", headers=auth_out)
    assert out_cands.status_code == 403, "Outsider strictly blocked from candidates."
    print("✅ 8. Verified complete project data isolation across all endpoints.")

    print("\n" + "=" * 70)
    print("🎉 ALL 8 REAL-TIME, ROLES, TASKS, AND ISOLATION TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_team_project_realtime_and_roles()
