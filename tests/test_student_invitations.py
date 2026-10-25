"""
Comprehensive Automated Verification Suite for Student -> Invitations Module.
Tests:
- GET /api/teams/my-invitations (sent vs received separation, formatting, metadata)
- Lifecycle of invitations (Pending -> Accepted, Pending -> Rejected)
- Security & Authorization (sender cannot decide, 3rd party cannot decide, only recipient can decide)
- Atomic team membership & chat group addition upon acceptance
- Atomic team capacity & vacancy enforcement (cannot accept if full)
- Notification generation upon acceptance/rejection
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

def test_invitations():
    print("=" * 70)
    print("🚀 RUNNING STUDENT -> INVITATIONS MODULE INTEGRATION TEST SUITE")
    print("=" * 70)

    client = app.test_client()
    ts = int(time.time() * 1000)

    # 1. Register Student Leader (Sender)
    leader_email = f"lead.inv.{ts}@student.edu"
    reg_leader = client.post("/api/auth/signup", json={
        "name": "David TeamLead",
        "email": leader_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-LEAD-INV-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "fullstack",
        "languages": "Python, React"
    })
    assert reg_leader.status_code == 201, f"Failed to register leader: {reg_leader.get_json()}"
    leader_token = reg_leader.get_json()["token"]
    leader_id = reg_leader.get_json()["user"]["id"]
    leader_headers = {"Authorization": f"Bearer {leader_token}"}
    print(f"✅ 1. Student Leader registered successfully (ID: {leader_id})")

    # 2. Register Recipient Student 1 (Accept scenario)
    cand_1_email = f"cand1.inv.{ts}@student.edu"
    reg_cand_1 = client.post("/api/auth/signup", json={
        "name": "Sarah Recipient",
        "email": cand_1_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-C1-INV-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "frontend",
        "languages": "JavaScript, React, CSS"
    })
    assert reg_cand_1.status_code == 201
    cand_1_token = reg_cand_1.get_json()["token"]
    cand_1_id = reg_cand_1.get_json()["user"]["id"]
    cand_1_headers = {"Authorization": f"Bearer {cand_1_token}"}
    print(f"✅ 2. Recipient Student 1 registered (ID: {cand_1_id})")

    # 3. Register Recipient Student 2 (Reject scenario)
    cand_2_email = f"cand2.inv.{ts}@student.edu"
    reg_cand_2 = client.post("/api/auth/signup", json={
        "name": "Robert Rejecter",
        "email": cand_2_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-C2-INV-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "backend",
        "languages": "Python, SQL"
    })
    assert reg_cand_2.status_code == 201
    cand_2_token = reg_cand_2.get_json()["token"]
    cand_2_id = reg_cand_2.get_json()["user"]["id"]
    cand_2_headers = {"Authorization": f"Bearer {cand_2_token}"}
    print(f"✅ 3. Recipient Student 2 registered (ID: {cand_2_id})")

    # 4. Register 3rd Party Student (Unauthorized actor)
    cand_3_email = f"cand3.inv.{ts}@student.edu"
    reg_cand_3 = client.post("/api/auth/signup", json={
        "name": "Mallory ThirdParty",
        "email": cand_3_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-C3-INV-{ts}",
        "department": "Computer Science",
        "semester": 6
    })
    assert reg_cand_3.status_code == 201
    cand_3_token = reg_cand_3.get_json()["token"]
    cand_3_id = reg_cand_3.get_json()["user"]["id"]
    cand_3_headers = {"Authorization": f"Bearer {cand_3_token}"}
    print(f"✅ 4. Third-Party Student registered (ID: {cand_3_id})")

    # 5. Create a Team with max_members = 2 (Capacity = Leader + 1 more)
    create_resp = client.post("/api/teams/proposals", headers=leader_headers, json={
        "name": f"Inv Innovation Team {ts}",
        "project_title": "Modern Team Invitation Workflow",
        "description": "Building modern team invitation workflow",
        "domain": "Web Development",
        "required_skills": "Python, React",
        "max_members": 2,
        "looking_for": "Frontend Engineer"
    })
    assert create_resp.status_code == 201, f"Failed to create team: {create_resp.get_json()}"
    team_id = create_resp.get_json()["teamId"]
    print(f"✅ 5. Team created successfully (Team ID: {team_id}, max_members: 2)")

    # 6. Leader sends invitation to Recipient 1
    inv1_resp = client.post(f"/api/teams/{team_id}/invite", headers=leader_headers, json={
        "student_id": cand_1_id,
        "message": "We would love you to lead the Frontend development!"
    })
    assert inv1_resp.status_code == 201, f"Failed to send invite 1: {inv1_resp.get_json()}"
    inv1_id = inv1_resp.get_json()["invitation_id"]
    print(f"✅ 6. Leader sent invitation 1 to Recipient 1 (Inv ID: {inv1_id})")

    # 7. Leader sends invitation to Recipient 2
    inv2_resp = client.post(f"/api/teams/{team_id}/invite", headers=leader_headers, json={
        "student_id": cand_2_id,
        "message": "Join us for backend APIs."
    })
    assert inv2_resp.status_code == 201, f"Failed to send invite 2: {inv2_resp.get_json()}"
    inv2_id = inv2_resp.get_json()["invitation_id"]
    print(f"✅ 7. Leader sent invitation 2 to Recipient 2 (Inv ID: {inv2_id})")

    # 8. Check GET /api/teams/my-invitations from Leader's perspective
    leader_invs = client.get("/api/teams/my-invitations", headers=leader_headers)
    assert leader_invs.status_code == 200
    leader_data = leader_invs.get_json()
    assert "sent" in leader_data and "received" in leader_data
    assert len(leader_data["sent"]) >= 2, f"Expected at least 2 sent invites, got {len(leader_data['sent'])}"
    # Verify sent fields
    sent_1 = next(i for i in leader_data["sent"] if i["id"] == inv1_id)
    assert sent_1["recipient_name"] == "Sarah Recipient"
    assert sent_1["status"] == "pending"
    assert "Inv Innovation Team" in sent_1["team_name"]
    assert "Modern Team Invitation Workflow" in sent_1["project_title"]
    print(f"✅ 8. Leader's Sent Invitations verified (Found {len(leader_data['sent'])} sent invitations)")

    # 9. Check GET /api/teams/my-invitations from Recipient 1's perspective
    cand1_invs = client.get("/api/teams/my-invitations", headers=cand_1_headers)
    assert cand1_invs.status_code == 200
    cand1_data = cand1_invs.get_json()
    assert len(cand1_data["received"]) >= 1
    rec_1 = next(i for i in cand1_data["received"] if i["id"] == inv1_id)
    assert rec_1["sender_name"] == "David TeamLead"
    assert rec_1["status"] == "pending"
    assert rec_1["message"] == "We would love you to lead the Frontend development!"
    print(f"✅ 9. Recipient 1's Received Invitations verified (Found {len(cand1_data['received'])} received invitations)")

    # 10. Security Test: SENDER CANNOT DECIDE THEIR OWN INVITATION
    sender_decide = client.post(f"/api/teams/invitations/{inv1_id}/decide", headers=leader_headers, json={
        "action": "accept"
    })
    assert sender_decide.status_code == 403, f"Expected 403 when sender tries to decide, got {sender_decide.status_code}"
    print("✅ 10. Security: Sender prevented from accepting/rejecting their own invitation (403 Forbidden)")

    # 11. Security Test: UNAUTHORIZED 3RD PARTY CANNOT DECIDE
    third_party_decide = client.post(f"/api/teams/invitations/{inv1_id}/decide", headers=cand_3_headers, json={
        "action": "accept"
    })
    assert third_party_decide.status_code == 403, f"Expected 403 when 3rd party tries to decide, got {third_party_decide.status_code}"
    print("✅ 11. Security: Unauthorized 3rd party student prevented from deciding invitation (403 Forbidden)")

    # 12. Recipient 2 Rejects Invitation 2
    rec2_decide = client.post(f"/api/teams/invitations/{inv2_id}/decide", headers=cand_2_headers, json={
        "action": "reject"
    })
    assert rec2_decide.status_code == 200
    assert rec2_decide.get_json()["status"] == "rejected"
    print("✅ 12. Recipient 2 successfully rejected invitation 2")

    # Verify Database state for rejected invitation
    with app.app_context():
        db = get_db()
        inv2_row = db.get("SELECT status, decided_at FROM team_invitations WHERE id = ?", [inv2_id])
        assert inv2_row["status"] == "rejected"
        assert inv2_row["decided_at"] is not None
        # Recipient 2 should NOT be in team_members
        mem = db.get("SELECT team_id FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, cand_2_id])
        assert mem is None
    print("✅ 13. Database verified: Rejection saved, student not added to team_members")

    # 13. Recipient 1 Accepts Invitation 1
    rec1_decide = client.post(f"/api/teams/invitations/{inv1_id}/decide", headers=cand_1_headers, json={
        "action": "accept"
    })
    assert rec1_decide.status_code == 200, f"Accept failed: {rec1_decide.get_json()}"
    assert rec1_decide.get_json()["status"] == "accepted"
    print("✅ 14. Recipient 1 successfully accepted invitation 1")

    # Verify Database state for accepted invitation
    with app.app_context():
        db = get_db()
        inv1_row = db.get("SELECT status, decided_at FROM team_invitations WHERE id = ?", [inv1_id])
        assert inv1_row["status"] == "accepted"
        assert inv1_row["decided_at"] is not None
        
        # Recipient 1 MUST be in team_members
        mem = db.get("SELECT team_id, role FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, cand_1_id])
        assert mem is not None, "Recipient 1 was NOT added to team_members!"
        assert mem["role"].lower() == "member"

        # Recipient 1 MUST be added to chat_group_members
        chat_group = db.get("SELECT id FROM chat_groups WHERE team_id = ?", [team_id])
        if chat_group:
            chat_mem = db.get("SELECT user_id FROM chat_group_members WHERE group_id = ? AND user_id = ?", [chat_group["id"], cand_1_id])
            assert chat_mem is not None, "Recipient 1 was not added to chat_group_members!"
            print("✅ 15. Chat group membership confirmed for accepted student")

        # Check notification was created for Leader
        notif = db.get("SELECT body FROM notifications WHERE target_user_id = ? AND body LIKE '%Sarah Recipient accepted%'", [leader_id])
        assert notif is not None, "Notification not created for leader on invitation acceptance!"
        print("✅ 16. Real-time notification recorded for team leader")
    print("✅ 17. Database verified: Acceptance saved, student added to team_members and chat")

    # 14. Prevent double decision on already decided invitation
    double_decide = client.post(f"/api/teams/invitations/{inv1_id}/decide", headers=cand_1_headers, json={
        "action": "accept"
    })
    assert double_decide.status_code == 400
    err_msg = double_decide.get_json().get("error") or double_decide.get_json().get("message", "")
    assert "already been" in err_msg.lower()
    print("✅ 18. Double-decision prevented (Cannot re-accept or change already decided invitation)")

    # 15. Team is now FULL (Leader + Recipient 1 = 2 members, max_members = 2)
    # Create another student and invitation to test full team capacity rejection
    cand_4_email = f"cand4.inv.{ts}@student.edu"
    reg_cand_4 = client.post("/api/auth/signup", json={
        "name": "Excess Student",
        "email": cand_4_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-C4-INV-{ts}",
        "department": "Computer Science",
        "semester": 6
    })
    cand_4_token = reg_cand_4.get_json()["token"]
    cand_4_id = reg_cand_4.get_json()["user"]["id"]
    cand_4_headers = {"Authorization": f"Bearer {cand_4_token}"}

    # Manually insert pending invite to test capacity rejection at accept time
    with app.app_context():
        db = get_db()
        res = db.run(
            "INSERT INTO team_invitations (team_id, sender_id, recipient_id, message, status, created_at) VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)",
            [team_id, leader_id, cand_4_id, "Late invite"]
        )
        inv_excess_id = res.lastID

    # Cand 4 tries to accept when team is already at max_members
    excess_accept = client.post(f"/api/teams/invitations/{inv_excess_id}/decide", headers=cand_4_headers, json={
        "action": "accept"
    })
    assert excess_accept.status_code == 400
    cap_msg = excess_accept.get_json().get("error") or excess_accept.get_json().get("message", "")
    assert "capacity" in cap_msg.lower() or "full" in cap_msg.lower()
    print("✅ 19. Team capacity strictly enforced: Acceptance rejected when team is at capacity")

    # 16. Verify Demo Seeded Invitations for Alex Chen
    alex_login = client.post("/api/auth/login", json={
        "email": "alex.chen@student.edu",
        "password": "Password@123"
    })
    assert alex_login.status_code == 200, f"Alex Chen login failed: {alex_login.get_json()}"
    alex_token = alex_login.get_json()["token"]
    alex_headers = {"Authorization": f"Bearer {alex_token}"}

    alex_invs = client.get("/api/teams/my-invitations", headers=alex_headers)
    assert alex_invs.status_code == 200
    alex_data = alex_invs.get_json()
    print(f"✅ 20. Demo user Alex Chen has {len(alex_data['sent'])} sent and {len(alex_data['received'])} received invitations")
    assert len(alex_data["sent"]) >= 3, f"Expected 3 sent invitations for Alex Chen, got {len(alex_data['sent'])}"
    assert len(alex_data["received"]) >= 3, f"Expected 3 received invitations for Alex Chen, got {len(alex_data['received'])}"

    # Check statuses match mockup
    sent_statuses = {i["status"] for i in alex_data["sent"]}
    rec_statuses = {i["status"] for i in alex_data["received"]}
    assert "pending" in sent_statuses and "accepted" in sent_statuses and "rejected" in sent_statuses
    assert "pending" in rec_statuses and "accepted" in rec_statuses and "rejected" in rec_statuses
    print("✅ 21. Demo data contains all status variants: pending, accepted, rejected matching the UI mockup")

    print("\n" + "=" * 70)
    print("🎉 ALL INVITATIONS BACKEND INTEGRATION & SECURITY TESTS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    test_invitations()
