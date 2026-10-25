"""
Comprehensive Automated Verification for Student -> Project Teams Enhancement.
Tests skill balance analysis, candidate recommendations, manual application review,
invitation lifecycle, vacancy management, and strict capacity enforcement.
"""

import sys
import os
import json
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from backend.database import get_db

def test_project_teams():
    print("=" * 70)
    print("🚀 RUNNING STUDENT -> PROJECT TEAMS ENHANCEMENT VERIFICATION SUITE")
    print("=" * 70)

    client = app.test_client()
    ts = int(time.time() * 1000)

    # 1. Register a student leader
    leader_email = f"lead.{ts}@student.edu"
    reg_leader = client.post("/api/auth/signup", json={
        "name": "Alex Leader",
        "email": leader_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-LEAD-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "backend",
        "languages": "Python, Flask, SQLite, PostgreSQL"
    })
    assert reg_leader.status_code == 201, f"Failed to register leader: {reg_leader.get_json()}"
    leader_token = reg_leader.get_json()["token"]
    leader_id = reg_leader.get_json()["user"]["id"]
    leader_headers = {"Authorization": f"Bearer {leader_token}"}
    print(f"✅ 1. Student Leader registered successfully (ID: {leader_id})")

    # 2. Register candidate students with specific skills
    # Candidate A: Frontend focus (React, UI/UX, CSS)
    cand_a_email = f"frontend.{ts}@student.edu"
    reg_cand_a = client.post("/api/auth/signup", json={
        "name": "Fiona Frontend",
        "email": cand_a_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-FA-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "frontend",
        "languages": "React, JavaScript, HTML, CSS, Tailwind"
    })
    assert reg_cand_a.status_code == 201
    cand_a_token = reg_cand_a.get_json()["token"]
    cand_a_id = reg_cand_a.get_json()["user"]["id"]
    cand_a_headers = {"Authorization": f"Bearer {cand_a_token}"}
    print(f"✅ 2a. Candidate A (Frontend) registered (ID: {cand_a_id})")

    # Candidate B: Testing/QA focus (QA, Docker, CI/CD, Python)
    cand_b_email = f"qa.{ts}@student.edu"
    reg_cand_b = client.post("/api/auth/signup", json={
        "name": "Quinn QA",
        "email": cand_b_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-QB-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "fullstack",
        "languages": "Python, Docker, QA, Testing, CI/CD"
    })
    assert reg_cand_b.status_code == 201
    cand_b_token = reg_cand_b.get_json()["token"]
    cand_b_id = reg_cand_b.get_json()["user"]["id"]
    cand_b_headers = {"Authorization": f"Bearer {cand_b_token}"}
    print(f"✅ 2b. Candidate B (Testing/QA) registered (ID: {cand_b_id})")

    # Candidate C: Applicant student
    cand_c_email = f"applicant.{ts}@student.edu"
    reg_cand_c = client.post("/api/auth/signup", json={
        "name": "Charlie Candidate",
        "email": cand_c_email,
        "password": "Password123!",
        "role": "student",
        "reg_no": f"REG-CC-{ts}",
        "department": "Computer Science",
        "semester": 6,
        "strength": "fullstack",
        "languages": "Python, React, SQL"
    })
    assert reg_cand_c.status_code == 201
    cand_c_token = reg_cand_c.get_json()["token"]
    cand_c_id = reg_cand_c.get_json()["user"]["id"]
    cand_c_headers = {"Authorization": f"Bearer {cand_c_token}"}
    print(f"✅ 2c. Candidate C (Applicant) registered (ID: {cand_c_id})")

    # 3. Create a Team Proposal by Leader (Capacity = 3 to test boundary)
    team_res = client.post("/api/teams/proposals", headers=leader_headers, json={
        "name": f"CloudScale AI {ts}",
        "project_title": "Scalable Microservices with ML Serving",
        "domain": "Cloud Computing",
        "technologies": "Python, React, Docker, SQL",
        "required_skills": "Backend API, Frontend UI, Testing QA",
        "max_members": 3,
        "description": "High performance cloud-native microservices platform."
    })
    assert team_res.status_code == 201, f"Failed to propose team: {team_res.get_json()}"
    team_id = team_res.get_json()["teamId"]
    print(f"✅ 3. Project Team created (ID: {team_id}, max_members: 3)")

    # 4. Verify My Team details (vacancies & team skill balance)
    my_team_res = client.get("/api/teams/my-team", headers=leader_headers)
    assert my_team_res.status_code == 200
    my_team_data = my_team_res.get_json()
    team_obj = my_team_data["team"]
    assert team_obj["confirmed_members"] == 1, "Leader should be 1 confirmed member"
    assert team_obj["vacancies"] == 2, "Vacancies should be 3 - 1 = 2"
    assert team_obj["is_full"] is False

    sb = my_team_data["skillBalance"]
    assert sb is not None
    cat_map = {c["name"]: c["status"] for c in sb["categories"]}
    assert cat_map["Python / Backend"] == "Covered", "Leader has Python/Backend"
    assert cat_map["Frontend / UI"] == "Needed", "Frontend should be Needed"
    assert cat_map["Testing / QA"] == "Needed", "Testing should be Needed"
    assert "Recommended next step" in str(sb["recommendedNextStep"]) or len(sb["recommendedNextStep"]) > 10
    print(f"✅ 4. Team Skill Balance verified dynamically: {cat_map}")
    print(f"      Advice: {sb['recommendedNextStep']}")

    # 5. Verify Candidate Recommendations (Smart Match)
    cand_rec_res = client.get(f"/api/teams/{team_id}/candidates", headers=leader_headers)
    assert cand_rec_res.status_code == 200
    cand_rec = cand_rec_res.get_json()
    candidates = cand_rec["candidates"]
    assert len(candidates) >= 3, f"Expected at least 3 candidates, got {len(candidates)}"
    assert cand_rec["vacancies"] == 2

    # Verify Leader is NOT in recommendations
    cand_ids = [c["id"] for c in candidates]
    assert leader_id not in cand_ids, "Team leader must be excluded from candidate recommendations"

    # Verify scores and gap contributions
    cand_a_eval = next(c for c in candidates if c["id"] == cand_a_id)
    assert "Frontend / UI" in cand_a_eval["missingSkillsContributed"], "Candidate A must contribute Frontend / UI gap"
    assert cand_a_eval["overallCompatibility"] > 0
    assert cand_a_eval["projectCompatibility"] > 0
    assert cand_a_eval["teamCompatibility"] > 0

    cand_b_eval = next(c for c in candidates if c["id"] == cand_b_id)
    assert "Testing / QA" in cand_b_eval["missingSkillsContributed"], "Candidate B must contribute Testing / QA gap"

    print("✅ 5. Candidate Recommendations verified: Real scores & gap identification working perfectly")
    print(f"      Candidate A Overall Score: {cand_a_eval['overallCompatibility']}%, Contributed: {cand_a_eval['missingSkillsContributed']}")
    print(f"      Candidate B Overall Score: {cand_b_eval['overallCompatibility']}%, Contributed: {cand_b_eval['missingSkillsContributed']}")

    # Non-leader access check
    non_lead_rec = client.get(f"/api/teams/{team_id}/candidates", headers=cand_a_headers)
    assert non_lead_rec.status_code == 403, "Non-leader must be forbidden from accessing candidates"
    print("✅ 5b. Non-leader access correctly blocked with 403")

    # 6. Candidate detailed profile inspection
    prof_res = client.get(f"/api/teams/candidate-profile/{cand_a_id}", headers=leader_headers)
    assert prof_res.status_code == 200
    assert prof_res.get_json()["student"]["name"] == "Fiona Frontend"
    print("✅ 6. Detailed candidate profile inspection verified")

    # 7. Candidate C applies to join the team (Applications flow)
    app_res = client.post(f"/api/teams/{team_id}/join-request", headers=cand_c_headers, json={
        "message": "Hi Alex! I have extensive React and SQL experience and would love to join your project."
    })
    assert app_res.status_code == 201
    print("✅ 7. Candidate C submitted join application")

    # 8. Team Leader reviews incoming applications
    my_team_res2 = client.get("/api/teams/my-team", headers=leader_headers)
    reqs = my_team_res2.get_json()["incomingRequests"]
    c_req = next((r for r in reqs if r["student_id"] == cand_c_id), None)
    assert c_req is not None
    assert c_req["status"] == "pending"
    assert c_req["compatibility_score"] > 0
    print(f"✅ 8. Leader reviewed application from {c_req['student_name']} (Match: {c_req['compatibility_score']}%)")

    # Leader accepts Candidate C's application
    decide_res = client.post(f"/api/teams/join-requests/{c_req['id']}/decide", headers=leader_headers, json={
        "action": "accept"
    })
    assert decide_res.status_code == 200
    print("✅ 8b. Leader accepted application. Candidate C is now confirmed member.")

    # Check updated vacancies: 3 - 2 = 1 vacancy left
    my_team_res3 = client.get("/api/teams/my-team", headers=leader_headers)
    team_obj3 = my_team_res3.get_json()["team"]
    assert team_obj3["confirmed_members"] == 2
    assert team_obj3["vacancies"] == 1
    print("✅ 8c. Confirmed members updated to 2, vacancies updated to 1")

    # 9. Send Team Invitation to Candidate A (Invitations flow)
    inv_res = client.post(f"/api/teams/{team_id}/invite", headers=leader_headers, json={
        "studentId": cand_a_id,
        "message": "We need your frontend skills! Please join us."
    })
    assert inv_res.status_code == 201
    inv_id = inv_res.get_json()["invitationId"]
    print(f"✅ 9. Team invitation sent to Candidate A (Invitation ID: {inv_id})")

    # Duplicate pending invitation rejected
    inv_dup = client.post(f"/api/teams/{team_id}/invite", headers=leader_headers, json={
        "studentId": cand_a_id
    })
    assert inv_dup.status_code == 400, "Duplicate invitation must be rejected"
    print("✅ 9b. Duplicate pending invitation rejected with 400")

    # Candidate A views received invitations
    invs_res = client.get("/api/teams/my-invitations", headers=cand_a_headers)
    assert invs_res.status_code == 200
    recv = invs_res.get_json()["received"]
    my_inv = next((i for i in recv if i["id"] == inv_id), None)
    assert my_inv is not None
    assert my_inv["status"] == "pending"
    print("✅ 9c. Candidate A retrieved pending invitation in Received Invitations")

    # Candidate A accepts the invitation
    dec_inv = client.post(f"/api/teams/invitations/{inv_id}/decide", headers=cand_a_headers, json={
        "action": "accept"
    })
    assert dec_inv.status_code == 200
    print("✅ 9d. Candidate A accepted invitation. Now confirmed member.")

    # 10. Check Team Complete (Max Capacity reached: 3/3 members, 0 vacancies)
    my_team_res4 = client.get("/api/teams/my-team", headers=leader_headers)
    team_obj4 = my_team_res4.get_json()["team"]
    assert team_obj4["confirmed_members"] == 3
    assert team_obj4["vacancies"] == 0
    assert team_obj4["is_full"] is True
    print("✅ 10. Team reached maximum capacity (3/3 confirmed members, 0 vacancies)")

    # 11. Verify capacity enforcement prevents overfilling
    # Candidates endpoint should show Team Complete
    cand_full = client.get(f"/api/teams/{team_id}/candidates", headers=leader_headers)
    assert cand_full.status_code == 200
    assert cand_full.get_json()["is_full"] is True
    assert len(cand_full.get_json()["candidates"]) == 0
    print("✅ 11a. Candidates list returns empty with is_full=True when team is complete")

    # New invitation attempt blocked because team is full
    inv_full = client.post(f"/api/teams/{team_id}/invite", headers=leader_headers, json={
        "studentId": cand_b_id
    })
    assert inv_full.status_code == 400
    assert "maximum capacity" in inv_full.get_json()["error"].lower()
    print("✅ 11b. Backend blocked new invitation because team is at maximum capacity")

    # 12. Toggle Recruiting
    rec_toggle = client.put(f"/api/teams/{team_id}/toggle-recruiting", headers=leader_headers)
    assert rec_toggle.status_code == 200
    assert rec_toggle.get_json()["is_accepting_members"] == 0
    print("✅ 12. Leader successfully closed recruiting")

    rec_toggle2 = client.put(f"/api/teams/{team_id}/toggle-recruiting", headers=leader_headers)
    assert rec_toggle2.status_code == 200
    assert rec_toggle2.get_json()["is_accepting_members"] == 1
    print("✅ 12b. Leader successfully re-opened recruiting")

    print("\n" + "=" * 70)
    print("🎉 ALL STUDENT -> PROJECT TEAMS VERIFICATIONS PASSED FLAWLESSLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_project_teams()
