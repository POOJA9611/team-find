from flask import Blueprint, request, jsonify, g, current_app
from backend.database import get_db
from backend.middleware.auth import authenticate_token, require_role
from backend.utils.validators import sanitize_string
from backend.utils.recommendations import calculate_student_team_match, tokenize
from backend.routes.notifications_routes import create_system_notification

teams_bp = Blueprint("teams", __name__)


# 1. Get Teams
@teams_bp.route("", methods=["GET"])
@teams_bp.route("/", methods=["GET"])
@authenticate_token
def get_teams():
    try:
        db = get_db()
        user = g.user
        role = user["role"]

        if role == "faculty":
            query = """
                SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
                       l.name as leader_name,
                       (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
                       cg.id as chat_group_id
                FROM teams t
                LEFT JOIN users u ON t.faculty_id = u.id
                LEFT JOIN users l ON t.leader_id = l.id
                LEFT JOIN chat_groups cg ON t.id = cg.team_id
                WHERE t.faculty_id = ?
                ORDER BY t.created_at DESC
            """
            params = [user["id"]]
        elif role == "student":
            query = """
                SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
                       l.name as leader_name,
                       (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
                       cg.id as chat_group_id
                FROM teams t
                JOIN team_members tm ON t.id = tm.team_id
                LEFT JOIN users u ON t.faculty_id = u.id
                LEFT JOIN users l ON t.leader_id = l.id
                LEFT JOIN chat_groups cg ON t.id = cg.team_id
                WHERE tm.student_id = ?
                ORDER BY t.created_at DESC
            """
            params = [user["id"]]
        elif role == "hod":
            query = """
                SELECT t.*, u.name as faculty_name, u.avatar as faculty_avatar,
                       l.name as leader_name,
                       (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
                       cg.id as chat_group_id
                FROM teams t
                LEFT JOIN users u ON t.faculty_id = u.id
                LEFT JOIN users l ON t.leader_id = l.id
                LEFT JOIN chat_groups cg ON t.id = cg.team_id
                ORDER BY t.created_at DESC
            """
            params = []
        else:
            return jsonify({"teams": []})

        teams = db.all(query, params)

        for team in teams:
            members = db.all(
                """SELECT u.id, u.name, u.email, u.avatar, tm.role as team_role,
                          sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department
                   FROM team_members tm
                   JOIN users u ON tm.student_id = u.id
                   LEFT JOIN student_profiles sp ON u.id = sp.user_id
                   WHERE tm.team_id = ?""",
                [team["id"]]
            )
            team["members"] = members

            projects = db.all("SELECT * FROM projects WHERE team_id = ?", [team["id"]])
            team["projects"] = projects

        return jsonify({"teams": teams})

    except Exception as error:
        print("Get teams error:", error)
        return jsonify({"error": "Failed to retrieve teams."}), 500


def analyze_team_skill_balance(team: dict, members: list):
    """
    Analyzes confirmed team members' competencies against core capstone project dimensions.
    Returns categorized status (Covered vs Needed) and a tailored recommendation next step.
    """
    combined_languages = " ".join([(m.get("languages") or "") for m in members]).lower()
    strengths = [(m.get("strength") or "").lower() for m in members]

    has_backend = any(s in ("backend", "fullstack") for s in strengths) or any(
        k in combined_languages for k in ("python", "node", "java", "flask", "django", "express", "c++", "go", "backend")
    )

    has_frontend = any(s in ("frontend", "fullstack") for s in strengths) or any(
        k in combined_languages for k in ("react", "javascript", "js", "html", "css", "vue", "angular", "typescript", "frontend", "ui")
    )

    has_database = any(
        k in combined_languages for k in ("sql", "mysql", "postgres", "mongodb", "sqlite", "redis", "database")
    ) or (has_backend and len(members) >= 2)

    has_testing = any(
        k in combined_languages for k in ("test", "testing", "qa", "docker", "devops", "ci/cd", "cloud", "aws", "git")
    ) or (any(s == "fullstack" for s in strengths) and len(members) >= 3)

    categories = [
        {"name": "Python / Backend", "status": "Covered" if has_backend else "Needed"},
        {"name": "Frontend / UI", "status": "Covered" if has_frontend else "Needed"},
        {"name": "Testing / QA", "status": "Covered" if has_testing else "Needed"},
        {"name": "Database", "status": "Covered" if has_database else "Needed"},
    ]

    needed_names = [c["name"] for c in categories if c["status"] == "Needed"]
    if needed_names:
        needed_str = " and ".join(needed_names) if len(needed_names) <= 2 else ", ".join(needed_names[:-1]) + f", and {needed_names[-1]}"
        recommended_step = f"Prioritize students who can contribute {needed_str} skills, while also checking project compatibility and teamwork fit."
    else:
        recommended_step = "All core technical competencies are well-covered. Prioritize students with strong domain interest and proven collaboration skills."

    return {
        "categories": categories,
        "recommendedNextStep": recommended_step,
        "neededCategories": needed_names
    }


# 2. Get My Team Details & Project Workspace
@teams_bp.route("/my-team", methods=["GET"])
@authenticate_token
@require_role("student")
def get_my_team():
    try:
        db = get_db()
        student_id = g.user["id"]
        requested_team_id = request.args.get("team_id")

        # 1. Retrieve all teams this student belongs to
        all_my_teams = db.all(
            """SELECT t.*, tm.role as my_role, tm.role_title as my_role_title, tm.responsibilities as my_responsibilities,
                      lead.name as leader_name, lead.email as leader_email, lead.avatar as leader_avatar,
                      u.name as faculty_name, u.avatar as faculty_avatar,
                      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
                      (SELECT COUNT(*) FROM team_tasks WHERE team_id = t.id) as total_tasks,
                      (SELECT COUNT(*) FROM team_tasks WHERE team_id = t.id AND status = 'completed') as completed_tasks
               FROM teams t
               JOIN team_members tm ON t.id = tm.team_id
               LEFT JOIN users lead ON t.leader_id = lead.id
               LEFT JOIN users u ON t.faculty_id = u.id
               WHERE tm.student_id = ?
               ORDER BY t.created_at DESC""",
            [student_id]
        )
        for t in all_my_teams:
            tot = t.get("total_tasks") or 0
            comp = t.get("completed_tasks") or 0
            t["progress_percentage"] = round((comp / tot) * 100) if tot > 0 else 0
            max_m = t.get("max_members") or 4
            t["max_members"] = max_m
            t["vacancies"] = max(0, max_m - (t.get("member_count") or 0))

        team = None
        if requested_team_id and requested_team_id not in ("none", "list", "0"):
            try:
                t_id = int(requested_team_id)
                team = db.get(
                    """SELECT t.*, tm.role as my_role, tm.role_title, tm.responsibilities,
                              u.name as faculty_name, u.email as faculty_email,
                              u.avatar as faculty_avatar, fp.designation as faculty_designation,
                              fp.department as faculty_department, fp.subjects as faculty_subjects,
                              cg.id as chat_group_id,
                              lead.name as leader_name, lead.email as leader_email
                       FROM teams t
                       JOIN team_members tm ON t.id = tm.team_id
                       LEFT JOIN users u ON t.faculty_id = u.id
                       LEFT JOIN users lead ON t.leader_id = lead.id
                       LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
                       LEFT JOIN chat_groups cg ON t.id = cg.team_id
                       WHERE tm.student_id = ? AND t.id = ?""",
                    [student_id, t_id]
                )
                if not team:
                    return jsonify({"error": "You are not an authorized member of this project team."}), 403
            except ValueError:
                pass
        elif not requested_team_id:
            team = db.get(
                """SELECT t.*, tm.role as my_role, tm.role_title, tm.responsibilities,
                          u.name as faculty_name, u.email as faculty_email,
                          u.avatar as faculty_avatar, fp.designation as faculty_designation,
                          fp.department as faculty_department, fp.subjects as faculty_subjects,
                          cg.id as chat_group_id,
                          lead.name as leader_name, lead.email as leader_email
                   FROM teams t
                   JOIN team_members tm ON t.id = tm.team_id
                   LEFT JOIN users u ON t.faculty_id = u.id
                   LEFT JOIN users lead ON t.leader_id = lead.id
                   LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
                   LEFT JOIN chat_groups cg ON t.id = cg.team_id
                   WHERE tm.student_id = ?
                   ORDER BY t.created_at DESC
                   LIMIT 1""",
                [student_id]
            )

        members = []
        incoming_requests = []
        skill_balance = None
        tasks = []
        my_tasks = []
        team_progress = {
            "total": 0, "completed": 0, "in_progress": 0, "not_started": 0, "overdue": 0, "percentage": 0
        }
        individual_progress = {
            "total": 0, "completed": 0, "in_progress": 0, "not_started": 0, "overdue": 0, "percentage": 0
        }
        my_role = None

        if team:
            # 2. Retrieve team members with role titles and responsibilities
            members = db.all(
                """SELECT u.id, u.name, u.email, u.avatar, tm.role as team_role,
                          tm.role_title, tm.responsibilities, tm.joined_at,
                          sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department, sp.bio
                   FROM team_members tm
                   JOIN users u ON tm.student_id = u.id
                   LEFT JOIN student_profiles sp ON u.id = sp.user_id
                   WHERE tm.team_id = ?
                   ORDER BY (CASE WHEN tm.role = 'leader' THEN 0 ELSE 1 END), u.name ASC""",
                [team["id"]]
            )

            confirmed_count = len(members)
            max_members = team.get("max_members") or 4
            vacancies = max(0, max_members - confirmed_count)
            is_full = confirmed_count >= max_members

            team["confirmed_members"] = confirmed_count
            team["vacancies"] = vacancies
            team["is_full"] = is_full

            skill_balance = analyze_team_skill_balance(team, members)
            team["skill_balance"] = skill_balance

            # 3. Retrieve team tasks
            tasks = db.all(
                """SELECT tt.*, 
                          u.name as assigned_name, u.email as assigned_email, u.avatar as assigned_avatar,
                          cb.name as creator_name
                   FROM team_tasks tt
                   LEFT JOIN users u ON tt.assigned_to = u.id
                   LEFT JOIN users cb ON tt.created_by = cb.id
                   WHERE tt.team_id = ?
                   ORDER BY (CASE tt.status WHEN 'in_progress' THEN 1 WHEN 'not_started' THEN 2 ELSE 3 END),
                            tt.deadline ASC, tt.id DESC""",
                [team["id"]]
            )

            from datetime import date
            today_str = date.today().isoformat()

            total_tasks = len(tasks)
            completed_tasks = sum(1 for t in tasks if t["status"] == "completed")
            in_progress_tasks = sum(1 for t in tasks if t["status"] == "in_progress")
            not_started_tasks = sum(1 for t in tasks if t["status"] == "not_started")
            overdue_tasks = sum(
                1 for t in tasks 
                if t["status"] != "completed" and t.get("deadline") and str(t["deadline"]) < today_str
            )

            team_progress = {
                "total": total_tasks,
                "completed": completed_tasks,
                "in_progress": in_progress_tasks,
                "not_started": not_started_tasks,
                "overdue": overdue_tasks,
                "percentage": round((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
            }

            my_tasks = [t for t in tasks if t.get("assigned_to") == student_id]
            my_total = len(my_tasks)
            my_completed = sum(1 for t in my_tasks if t["status"] == "completed")
            my_in_progress = sum(1 for t in my_tasks if t["status"] == "in_progress")
            my_not_started = sum(1 for t in my_tasks if t["status"] == "not_started")
            my_overdue = sum(
                1 for t in my_tasks 
                if t["status"] != "completed" and t.get("deadline") and str(t["deadline"]) < today_str
            )

            individual_progress = {
                "total": my_total,
                "completed": my_completed,
                "in_progress": my_in_progress,
                "not_started": my_not_started,
                "overdue": my_overdue,
                "percentage": round((my_completed / my_total) * 100) if my_total > 0 else 0
            }

            # Attach task counts to each member
            for m in members:
                m_tasks = [t for t in tasks if t.get("assigned_to") == m["id"]]
                m["total_tasks"] = len(m_tasks)
                m["completed_tasks"] = sum(1 for t in m_tasks if t["status"] == "completed")
                m["progress_percentage"] = round((m["completed_tasks"] / len(m_tasks)) * 100) if len(m_tasks) > 0 else 0

            # 4. Student's own role details
            my_role = {
                "role": team.get("my_role") or "member",
                "role_title": team.get("role_title") or ("Project Leader" if team.get("my_role") == "leader" else "Team Member"),
                "responsibilities": team.get("responsibilities") or ("Oversee project roadmap, task assignments, and team delivery." if team.get("my_role") == "leader" else "Contribute to module development, tasks, and team milestones."),
                "is_leader": bool(team.get("leader_id") == student_id or team.get("my_role") == "leader")
            }

            if team.get("leader_id") == student_id or team.get("my_role") == "leader":
                incoming_requests = db.all(
                    """SELECT jr.*, u.name as student_name, u.email as student_email, u.avatar as student_avatar,
                              sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department, sp.bio
                       FROM team_join_requests jr
                       JOIN users u ON jr.student_id = u.id
                       LEFT JOIN student_profiles sp ON u.id = sp.user_id
                       WHERE jr.team_id = ?
                       ORDER BY jr.created_at DESC""",
                    [team["id"]]
                )

                for req in incoming_requests:
                    req_student = {
                        "id": req["student_id"],
                        "name": req["student_name"],
                        "languages": req.get("languages") or "",
                        "strength": req.get("strength") or "fullstack",
                        "bio": req.get("bio") or "",
                        "department": req.get("department") or ""
                    }
                    match_res = calculate_student_team_match(req_student, team, members)
                    req["compatibility_score"] = match_res["score"]
                    req["match_explanation"] = match_res["explanation"]
                    req["matched_skills"] = match_res["matchedTech"]

        return jsonify({
            "team": team,
            "members": members,
            "myTeamsList": all_my_teams,
            "incomingRequests": incoming_requests,
            "skillBalance": skill_balance,
            "tasks": tasks,
            "myTasks": my_tasks,
            "teamProgress": team_progress,
            "individualProgress": individual_progress,
            "myRole": my_role
        })

    except Exception as error:
        print("Get my team error:", error)
        return jsonify({"error": "Failed to retrieve my team details."}), 500


# 3. Create Team Proposal
@teams_bp.route("/proposals", methods=["POST"])
@authenticate_token
@require_role("student")
def create_team_proposal():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        project_title = data.get("project_title")
        description = data.get("description")
        domain = data.get("domain")
        technologies = data.get("technologies")
        required_skills = data.get("required_skills")
        max_members = data.get("max_members", 4)
        objectives = data.get("objectives")
        target_date = data.get("target_date")

        if not name or not isinstance(name, str) or len(name.strip()) < 3:
            return jsonify({"error": "Team name must be at least 3 characters."}), 400

        if not project_title or not isinstance(project_title, str) or len(project_title.strip()) < 3:
            return jsonify({"error": "Project title must be at least 3 characters."}), 400

        try:
            max_m = int(max_members)
            if max_m < 2 or max_m > 6:
                max_m = 4
        except Exception:
            max_m = 4

        db = get_db()
        student_id = g.user["id"]

        # Check if student already leads an active team
        existing_lead = db.get(
            """SELECT t.id, t.name, t.status FROM teams t
               JOIN team_members tm ON t.id = tm.team_id
               WHERE tm.student_id = ? AND tm.role = 'leader' AND t.status IN ('approved', 'pending_approval', 'modification_requested')""",
            [student_id]
        )
        if existing_lead:
            return jsonify({
                "error": f"You are already leading the active team '{existing_lead['name']}'. Each student can lead only one active project team."
            }), 400

        io = current_app.extensions.get("socketio")

        with db.transaction():
            res = db.run(
                """INSERT INTO teams (
                    name, leader_id, created_by, project_title, description, domain,
                    technologies, required_skills, max_members, objectives, target_date, status, is_accepting_members
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', 1)""",
                [
                    name.strip(),
                    student_id,
                    student_id,
                    project_title.strip(),
                    description.strip() if description else "",
                    domain.strip() if domain else "General Software Engineering",
                    technologies.strip() if technologies else "",
                    required_skills.strip() if required_skills else "",
                    max_m,
                    objectives.strip() if objectives else "",
                    target_date.strip() if target_date else None
                ]
            )
            team_id = res.lastID

            # Add student as leader
            db.run(
                "INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'leader')",
                [team_id, student_id]
            )

            # Auto create chat group
            cg_res = db.run(
                "INSERT INTO chat_groups (name, team_id, created_by) VALUES (?, ?, ?)",
                [f"Team: {name.strip()}", team_id, student_id]
            )
            cg_id = cg_res.lastID
            db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, student_id])

            # Initial welcome message
            db.run(
                "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
                [cg_id, student_id, f"Welcome to {name.strip()} team workspace! Project proposal: {project_title.strip()}"]
            )

            # Notify HOD
            create_system_notification(
                db, io,
                title="New Project Team Proposal Submitted",
                body=f"Student {g.user['name']} has submitted a capstone proposal: '{project_title.strip()}' for team '{name.strip()}'.",
                audience="both",
                posted_by=student_id
            )

        new_team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        return jsonify({
            "message": "Project team proposal submitted successfully. It is now awaiting HOD review.",
            "team": new_team,
            "teamId": team_id
        }), 201

    except Exception as error:
        print("Create proposal error:", error)
        return jsonify({"error": "Failed to submit project team proposal."}), 500


# 4. Available Teams to Join
@teams_bp.route("/available-to-join", methods=["GET"])
@authenticate_token
@require_role("student")
def available_teams_to_join():
    try:
        db = get_db()
        student_id = g.user["id"]

        student = db.get(
            """SELECT sp.*, u.name, u.email
               FROM users u
               JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.id = ?""",
            [student_id]
        )

        active_teams_count = db.get(
            "SELECT COUNT(*) as count FROM team_members WHERE student_id = ?",
            [student_id]
        )["count"]

        # Fetch teams accepting members that are approved
        teams = db.all(
            """SELECT t.*, u.name as faculty_name, l.name as leader_name, l.avatar as leader_avatar,
                      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as current_members_count
               FROM teams t
               LEFT JOIN users u ON t.faculty_id = u.id
               LEFT JOIN users l ON t.leader_id = l.id
               WHERE t.status = 'approved'
                 AND t.is_accepting_members = 1
                 AND t.id NOT IN (SELECT team_id FROM team_members WHERE student_id = ?)
               ORDER BY t.created_at DESC""",
            [student_id]
        )

        available_list = []
        for team in teams:
            if team["current_members_count"] >= team["max_members"]:
                continue

            members = db.all(
                """SELECT u.id, u.name, tm.role, sp.strength, sp.languages
                   FROM team_members tm
                   JOIN users u ON tm.student_id = u.id
                   LEFT JOIN student_profiles sp ON u.id = sp.user_id
                   WHERE tm.team_id = ?""",
                [team["id"]]
            )

            existing_request = db.get(
                "SELECT id, status FROM team_join_requests WHERE team_id = ? AND student_id = ? ORDER BY created_at DESC LIMIT 1",
                [team["id"], student_id]
            )

            match_result = calculate_student_team_match(
                student=student,
                team=team,
                team_members=members,
                student_active_teams_count=active_teams_count
            )

            team_copy = dict(team)
            team_copy["members"] = members
            team_copy["compatibilityScore"] = match_result["score"]
            team_copy["matchExplanation"] = match_result["explanation"]
            team_copy["matchedTech"] = match_result.get("matchedTech", [])
            team_copy["missingTech"] = match_result.get("missingTech", [])
            team_copy["requestStatus"] = existing_request["status"] if existing_request else None
            team_copy["requestId"] = existing_request["id"] if existing_request else None

            available_list.append(team_copy)

        available_list.sort(key=lambda x: x["compatibilityScore"], reverse=True)
        return jsonify({"teams": available_list})

    except Exception as error:
        print("Available teams error:", error)
        return jsonify({"error": "Failed to retrieve available teams."}), 500


# 5. Send Join Request
@teams_bp.route("/<int:team_id>/join-request", methods=["POST"])
@authenticate_token
@require_role("student")
def request_to_join_team(team_id):
    try:
        data = request.get_json(silent=True) or {}
        message = data.get("message")
        student_id = g.user["id"]
        db = get_db()

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Target project team not found."}), 404

        is_member = db.get("SELECT * FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, student_id])
        if is_member:
            return jsonify({"error": "You are already a member of this team."}), 400

        member_count = db.get("SELECT COUNT(*) as count FROM team_members WHERE team_id = ?", [team_id])["count"]
        if member_count >= team["max_members"]:
            return jsonify({"error": "This team has reached its maximum capacity."}), 400

        existing_req = db.get(
            "SELECT * FROM team_join_requests WHERE team_id = ? AND student_id = ? AND status = 'pending'",
            [team_id, student_id]
        )
        if existing_req:
            return jsonify({"error": "You already have a pending join request for this team."}), 400

        clean_message = sanitize_string(message) if message else "I would like to contribute my skills to your project team."
        res = db.run(
            """INSERT INTO team_join_requests (team_id, student_id, message, status)
               VALUES (?, ?, ?, 'pending')""",
            [team_id, student_id, clean_message]
        )

        io = current_app.extensions.get("socketio")
        if team.get("leader_id"):
            create_system_notification(
                db, io,
                title="New Team Join Request",
                body=f"Student {g.user['name']} has requested to join your team '{team['name']}'. Message: {clean_message}",
                audience="user",
                posted_by=student_id,
                target_user_id=team["leader_id"]
            )
            if io:
                try:
                    io.emit("team_applications_updated", {
                        "team_id": team_id,
                        "action": "new_application",
                        "requestId": res.lastID
                    }, to=f"user_{team['leader_id']}")
                except Exception as emit_err:
                    print("Socket emit error:", emit_err)

        return jsonify({
            "message": "Join request successfully submitted to team leader.",
            "requestId": res.lastID
        }), 201

    except Exception as error:
        print("Join request error:", error)
        return jsonify({"error": "Failed to submit join request."}), 500


# 6. Decide Join Request
@teams_bp.route("/join-requests/<int:request_id>/decide", methods=["POST"])
@authenticate_token
@require_role("student")
def decide_join_request(request_id):
    try:
        data = request.get_json(silent=True) or {}
        action = data.get("action")  # 'accept' or 'reject'
        student_id = g.user["id"]

        if action not in ("accept", "reject"):
            return jsonify({"error": "Invalid action. Must be 'accept' or 'reject'."}), 400

        db = get_db()
        req_row = db.get(
            """SELECT jr.*, t.name as team_name, t.leader_id, t.max_members,
                      s.name as applicant_name
               FROM team_join_requests jr
               JOIN teams t ON jr.team_id = t.id
               JOIN users s ON jr.student_id = s.id
               WHERE jr.id = ?""",
            [request_id]
        )

        if not req_row:
            return jsonify({"error": "Join request not found."}), 404

        if req_row["leader_id"] != student_id:
            return jsonify({"error": "Only the team leader can decide join requests."}), 403

        if req_row["status"] != "pending":
            return jsonify({"error": f"This request has already been {req_row['status']}."}), 400

        io = current_app.extensions.get("socketio")

        if action == "accept":
            current_count = db.get("SELECT COUNT(*) as count FROM team_members WHERE team_id = ?", [req_row["team_id"]])["count"]
            if current_count >= req_row["max_members"]:
                return jsonify({"error": "Team is already at maximum capacity."}), 400

            already_member = db.get("SELECT 1 FROM team_members WHERE team_id = ? AND student_id = ?", [req_row["team_id"], req_row["student_id"]])
            if already_member:
                return jsonify({"error": "This student is already a member of the team."}), 400

            with db.transaction():
                db.run(
                    "UPDATE team_join_requests SET status = 'accepted', decided_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [request_id]
                )
                db.run(
                    "INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'member')",
                    [req_row["team_id"], req_row["student_id"]]
                )

                if current_count + 1 >= req_row["max_members"]:
                    db.run("UPDATE teams SET is_accepting_members = 0 WHERE id = ?", [req_row["team_id"]])

                cg = db.get("SELECT id FROM chat_groups WHERE team_id = ?", [req_row["team_id"]])
                if cg:
                    db.run(
                        "INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)",
                        [cg["id"], req_row["student_id"]]
                    )
                    db.run(
                        "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
                        [cg["id"], student_id, f"Please welcome {req_row['applicant_name']} to the team!"]
                    )

                create_system_notification(
                    db, io,
                    title="Team Join Request Accepted!",
                    body=f"Congratulations! Your request to join '{req_row['team_name']}' has been accepted by the leader.",
                    audience="user",
                    posted_by=student_id,
                    target_user_id=req_row["student_id"]
                )

            if io:
                try:
                    io.emit("team_membership_updated", {
                        "team_id": req_row["team_id"],
                        "student_id": req_row["student_id"],
                        "action": "joined"
                    }, to=f"team_{req_row['team_id']}")
                    io.emit("team_membership_updated", {
                        "team_id": req_row["team_id"],
                        "student_id": req_row["student_id"],
                        "action": "joined"
                    }, to=f"user_{req_row['student_id']}")
                    io.emit("team_applications_updated", {
                        "team_id": req_row["team_id"],
                        "request_id": request_id,
                        "status": "accepted"
                    }, to=f"user_{req_row['leader_id']}")
                    io.emit("available_teams_updated", {})
                except Exception as emit_err:
                    print("Socket emit error:", emit_err)

            return jsonify({
                "message": f"Accepted {req_row['applicant_name']} into team '{req_row['team_name']}'.",
                "status": "accepted"
            })

        else:
            with db.transaction():
                db.run(
                    "UPDATE team_join_requests SET status = 'rejected', decided_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [request_id]
                )
                create_system_notification(
                    db, io,
                    title="Team Join Request Declined",
                    body=f"Your request to join team '{req_row['team_name']}' was declined by the leader.",
                    audience="user",
                    posted_by=student_id,
                    target_user_id=req_row["student_id"]
                )

            if io:
                try:
                    io.emit("team_applications_updated", {
                        "team_id": req_row["team_id"],
                        "request_id": request_id,
                        "status": "rejected"
                    }, to=f"user_{req_row['leader_id']}")
                    io.emit("team_applications_updated", {
                        "team_id": req_row["team_id"],
                        "request_id": request_id,
                        "status": "rejected"
                    }, to=f"user_{req_row['student_id']}")
                except Exception as emit_err:
                    print("Socket emit error:", emit_err)

            return jsonify({
                "message": f"Declined join request from {req_row['applicant_name']}.",
                "status": "rejected"
            })

    except Exception as error:
        print("Decide join request error:", error)
        return jsonify({"error": "Failed to process join request decision."}), 500


# 6b. Get Team Applications (Dedicated Page for Leader)
@teams_bp.route("/<int:team_id>/applications", methods=["GET"])
@authenticate_token
@require_role("student")
def get_team_applications(team_id):
    try:
        db = get_db()
        student_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        is_leader = team["leader_id"] == student_id or db.get(
            "SELECT 1 FROM team_members WHERE team_id = ? AND student_id = ? AND role = 'leader'",
            [team_id, student_id]
        )
        if not is_leader:
            return jsonify({"error": "Only the authorized project leader can view and manage applications."}), 403

        members = db.all(
            """SELECT u.id, u.name, tm.role, sp.strength, sp.languages
               FROM team_members tm
               JOIN users u ON tm.student_id = u.id
               LEFT JOIN student_profiles sp ON u.id = sp.user_id
               WHERE tm.team_id = ?""",
            [team_id]
        )

        incoming_requests = db.all(
            """SELECT jr.*, u.name as student_name, u.email as student_email, u.avatar as student_avatar,
                      sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department, sp.bio
               FROM team_join_requests jr
               JOIN users u ON jr.student_id = u.id
               LEFT JOIN student_profiles sp ON u.id = sp.user_id
               WHERE jr.team_id = ?
               ORDER BY (CASE jr.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END), jr.created_at DESC""",
            [team_id]
        )

        for req in incoming_requests:
            req_student = {
                "id": req["student_id"],
                "name": req["student_name"],
                "languages": req.get("languages") or "",
                "strength": req.get("strength") or "fullstack",
                "bio": req.get("bio") or "",
                "department": req.get("department") or ""
            }
            match_res = calculate_student_team_match(req_student, team, members)
            req["compatibility_score"] = match_res["score"]
            req["match_explanation"] = match_res["explanation"]
            req["matched_skills"] = match_res.get("matchedTech", [])

        confirmed_count = len(members)
        max_members = team.get("max_members") or 4
        vacancies = max(0, max_members - confirmed_count)

        return jsonify({
            "applications": incoming_requests,
            "team": {
                "id": team["id"],
                "name": team["name"],
                "project_title": team.get("project_title"),
                "status": team.get("status"),
                "is_accepting_members": team.get("is_accepting_members"),
                "max_members": max_members,
                "confirmed_members": confirmed_count,
                "vacancies": vacancies,
                "is_full": confirmed_count >= max_members
            }
        })

    except Exception as error:
        print("Get team applications error:", error)
        return jsonify({"error": "Failed to retrieve project applications."}), 500


# 7. Toggle Recruiting
@teams_bp.route("/<int:team_id>/toggle-recruiting", methods=["PUT"])
@authenticate_token
@require_role("student")
def toggle_recruiting(team_id):
    try:
        db = get_db()
        student_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        if team["leader_id"] != student_id:
            return jsonify({"error": "Only the team leader can modify recruiting status."}), 403

        new_status = 0 if team.get("is_accepting_members") else 1
        db.run("UPDATE teams SET is_accepting_members = ? WHERE id = ?", [new_status, team_id])

        io = current_app.extensions.get("socketio")
        if io:
            try:
                io.emit("team_updated", {"team_id": team_id, "is_accepting_members": new_status}, to=f"team_{team_id}")
                io.emit("available_teams_updated", {})
            except Exception as emit_err:
                print("Socket emit error:", emit_err)

        return jsonify({
            "message": f"Team recruiting is now {'open' if new_status else 'closed'}.",
            "is_accepting_members": new_status
        })

    except Exception as error:
        print("Toggle recruiting error:", error)
        return jsonify({"error": "Failed to update recruiting status."}), 500


# 8. Create Team (Faculty)
@teams_bp.route("", methods=["POST"])
@teams_bp.route("/", methods=["POST"])
@authenticate_token
@require_role("faculty")
def create_team_by_faculty():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        student_ids = data.get("studentIds")

        if not name or not isinstance(name, str) or len(name.strip()) < 2:
            return jsonify({"error": "Team name must be at least 2 characters."}), 400

        if not isinstance(student_ids, list) or len(student_ids) == 0:
            return jsonify({"error": "At least one student must be selected to form a team."}), 400

        db = get_db()
        faculty_id = g.user["id"]

        # Verify all students belong to this faculty
        for s_id in student_ids:
            st = db.get("SELECT user_id FROM student_profiles WHERE user_id = ? AND faculty_id = ?", [s_id, faculty_id])
            if not st:
                return jsonify({"error": f"Student ID {s_id} is not assigned to your mentorship."}), 403

        io = current_app.extensions.get("socketio")

        with db.transaction():
            res = db.run(
                """INSERT INTO teams (name, faculty_id, leader_id, created_by, status)
                   VALUES (?, ?, ?, ?, 'approved')""",
                [name.strip(), faculty_id, student_ids[0], faculty_id]
            )
            team_id = res.lastID

            for idx, s_id in enumerate(student_ids):
                role = "leader" if idx == 0 else "member"
                db.run("INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, ?)", [team_id, s_id, role])

            # Auto create chat group
            cg_res = db.run(
                "INSERT INTO chat_groups (name, team_id, faculty_id, created_by) VALUES (?, ?, ?, ?)",
                [f"Team: {name.strip()}", team_id, faculty_id, faculty_id]
            )
            cg_id = cg_res.lastID
            db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, faculty_id])
            for s_id in student_ids:
                db.run("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg_id, s_id])

            db.run(
                "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
                [cg_id, faculty_id, f"Welcome to {name.strip()} team workspace! Let's get started on your capstone project."]
            )

        if io:
            io.emit("team_created", {
                "teamId": team_id,
                "name": name.strip(),
                "facultyId": faculty_id,
                "memberCount": len(student_ids)
            })

        return jsonify({
            "message": f"Team '{name.strip()}' created successfully.",
            "teamId": team_id
        }), 201

    except Exception as error:
        print("Faculty create team error:", error)
        return jsonify({"error": "Failed to create team."}), 500


# 9. Add Team Member (Faculty)
@teams_bp.route("/<int:team_id>/members", methods=["POST"])
@authenticate_token
@require_role("faculty")
def add_team_member(team_id):
    try:
        data = request.get_json(silent=True) or {}
        student_id = data.get("studentId")

        if not student_id:
            return jsonify({"error": "Student ID is required."}), 400

        db = get_db()
        faculty_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ? AND faculty_id = ?", [team_id, faculty_id])
        if not team:
            return jsonify({"error": "Team not found or not mentored by you."}), 404

        assigned = db.get("SELECT user_id FROM student_profiles WHERE user_id = ? AND faculty_id = ?", [student_id, faculty_id])
        if not assigned:
            return jsonify({"error": "Student is not assigned to your mentorship."}), 403

        existing = db.get("SELECT * FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, student_id])
        if existing:
            return jsonify({"error": "Student is already in this team."}), 400

        with db.transaction():
            db.run("INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'member')", [team_id, student_id])
            cg = db.get("SELECT id FROM chat_groups WHERE team_id = ?", [team_id])
            if cg:
                db.run("INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [cg["id"], student_id])

        return jsonify({"message": "Student added to team successfully."})

    except Exception as error:
        print("Add team member error:", error)
        return jsonify({"error": "Failed to add student to team."}), 500


# 10. Remove Team Member (Faculty)
@teams_bp.route("/<int:team_id>/members/<int:student_id>", methods=["DELETE"])
@authenticate_token
@require_role("faculty")
def remove_team_member(team_id, student_id):
    try:
        db = get_db()
        faculty_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ? AND faculty_id = ?", [team_id, faculty_id])
        if not team:
            return jsonify({"error": "Team not found or not mentored by you."}), 404

        with db.transaction():
            db.run("DELETE FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, student_id])
            cg = db.get("SELECT id FROM chat_groups WHERE team_id = ?", [team_id])
            if cg:
                db.run("DELETE FROM chat_group_members WHERE group_id = ? AND user_id = ?", [cg["id"], student_id])

        return jsonify({"message": "Student removed from team successfully."})

    except Exception as error:
        print("Remove team member error:", error)
        return jsonify({"error": "Failed to remove student from team."}), 500


def evaluate_candidate_for_team(candidate: dict, team: dict, members: list, needed_categories: list):
    """
    Evaluates candidate compatibility against project requirements and team skill balance gaps.
    Calculates Project Compatibility %, Team Compatibility %, and Overall Compatibility %.
    """
    # 1. Project compatibility (using actual candidate profile vs project details)
    project_match = calculate_student_team_match(candidate, team, members)
    project_score = project_match.get("score") or 50

    # Matching skills
    team_tech = tokenize(team.get("technologies") or "")
    team_skills = tokenize(team.get("required_skills") or "")
    combined_target = set(team_tech + team_skills)

    cand_langs = tokenize(candidate.get("languages") or "")
    cand_strength = (candidate.get("strength") or "").lower()

    matching_skills = []
    for target in combined_target:
        if any(target in l or l in target for l in cand_langs):
            matching_skills.append(target.title())

    if not matching_skills and cand_langs:
        proj_text = f"{team.get('project_title', '')} {team.get('domain', '')}".lower()
        for l in cand_langs:
            if l in proj_text:
                matching_skills.append(l.title())

    if not matching_skills and cand_langs:
        matching_skills = [l.title() for l in cand_langs[:2]]

    # 2. Missing team skills contributed
    cand_langs_str = " ".join(cand_langs)
    cand_bio = (candidate.get("bio") or "").lower()

    cand_has_backend = cand_strength in ("backend", "fullstack") or any(
        k in cand_langs_str for k in ("python", "node", "java", "flask", "django", "express", "c++", "go", "backend")
    )
    cand_has_frontend = cand_strength in ("frontend", "fullstack") or any(
        k in cand_langs_str for k in ("react", "javascript", "js", "html", "css", "vue", "angular", "typescript", "frontend", "ui")
    )
    cand_has_testing = any(
        k in cand_langs_str or k in cand_bio for k in ("test", "testing", "qa", "docker", "devops", "ci/cd", "cloud", "aws", "git")
    )
    cand_has_database = any(
        k in cand_langs_str for k in ("sql", "mysql", "postgres", "mongodb", "sqlite", "redis", "database")
    )

    missing_contributed = []
    if "Python / Backend" in needed_categories and cand_has_backend:
        missing_contributed.append("Python / Backend")
    if "Frontend / UI" in needed_categories and cand_has_frontend:
        missing_contributed.append("Frontend / UI")
    if "Testing / QA" in needed_categories and cand_has_testing:
        missing_contributed.append("Testing / QA")
    if "Database" in needed_categories and cand_has_database:
        missing_contributed.append("Database")

    # 3. Team compatibility score (evaluating complementary skill balance)
    if not needed_categories:
        team_score = 90 if cand_strength == "fullstack" else 84
    else:
        fill_ratio = len(missing_contributed) / max(1, len(needed_categories))
        team_score = round(45.0 + fill_ratio * 50.0)
        if cand_strength == "fullstack":
            team_score = min(98, team_score + 5)

    # 4. Overall compatibility score (weighted combination)
    overall_score = min(99, max(20, round(0.55 * project_score + 0.45 * team_score)))

    return {
        "projectCompatibility": project_score,
        "teamCompatibility": team_score,
        "overallCompatibility": overall_score,
        "matchingSkills": matching_skills,
        "missingSkillsContributed": missing_contributed,
        "explanation": project_match.get("explanation") or "Compatible candidate profile."
    }


# 11. Candidate Recommendations for Team Vacancies (Smart Match / Find Members)
@teams_bp.route("/<int:team_id>/candidates", methods=["GET"])
@authenticate_token
@require_role("student")
def get_team_candidates(team_id):
    try:
        db = get_db()
        student_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        # Only leader can access candidate recommendations
        is_leader = team["leader_id"] == student_id or db.get(
            "SELECT team_id FROM team_members WHERE team_id = ? AND student_id = ? AND role = 'leader'",
            [team_id, student_id]
        )
        if not is_leader:
            return jsonify({"error": "Only the team leader can access candidate recommendations."}), 403

        members = db.all(
            """SELECT u.id, u.name, u.email, u.avatar, tm.role as team_role,
                      sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department, sp.bio
               FROM team_members tm
               JOIN users u ON tm.student_id = u.id
               LEFT JOIN student_profiles sp ON u.id = sp.user_id
               WHERE tm.team_id = ?""",
            [team_id]
        )

        max_members = team.get("max_members") or 4
        confirmed_count = len(members)
        vacancies = max(0, max_members - confirmed_count)

        skill_balance = analyze_team_skill_balance(team, members)
        needed_categories = skill_balance.get("neededCategories", [])

        if vacancies == 0:
            return jsonify({
                "candidates": [],
                "vacancies": 0,
                "confirmed_count": confirmed_count,
                "max_members": max_members,
                "is_full": True,
                "skillBalance": skill_balance,
                "message": "Team Complete. All member slots have been filled."
            })

        # Fetch eligible students excluding current confirmed team members
        potential_students = db.all(
            """SELECT u.id, u.name, u.email, u.avatar,
                      sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department, sp.bio
               FROM users u
               LEFT JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.role = 'student'
                 AND u.id NOT IN (SELECT student_id FROM team_members WHERE team_id = ?)
               ORDER BY u.name ASC""",
            [team_id]
        )

        # Get existing invitation statuses for this team
        invitations = db.all(
            "SELECT recipient_id, status FROM team_invitations WHERE team_id = ?",
            [team_id]
        )
        invitation_map = {inv["recipient_id"]: inv["status"] for inv in invitations}

        candidates = []
        for cand in potential_students:
            inv_status = invitation_map.get(cand["id"])
            eval_res = evaluate_candidate_for_team(cand, team, members, needed_categories)

            candidates.append({
                "id": cand["id"],
                "name": cand["name"],
                "email": cand["email"],
                "avatar": cand["avatar"],
                "reg_no": cand.get("reg_no") or "N/A",
                "strength": cand.get("strength") or "fullstack",
                "languages": cand.get("languages") or "",
                "cgpa": cand.get("cgpa"),
                "department": cand.get("department") or "Computer Science",
                "bio": cand.get("bio") or "",
                "projectCompatibility": eval_res["projectCompatibility"],
                "teamCompatibility": eval_res["teamCompatibility"],
                "overallCompatibility": eval_res["overallCompatibility"],
                "matchingSkills": eval_res["matchingSkills"],
                "missingSkillsContributed": eval_res["missingSkillsContributed"],
                "matchExplanation": eval_res["explanation"],
                "invitationStatus": inv_status
            })

        # Rank candidates from highest to lowest overall compatibility
        candidates.sort(key=lambda c: c["overallCompatibility"], reverse=True)

        return jsonify({
            "candidates": candidates,
            "vacancies": vacancies,
            "confirmed_count": confirmed_count,
            "max_members": max_members,
            "is_full": False,
            "skillBalance": skill_balance
        })

    except Exception as error:
        print("Get team candidates error:", error)
        return jsonify({"error": "Failed to retrieve candidate recommendations."}), 500


# 12. Candidate Detailed Profile
@teams_bp.route("/candidate-profile/<int:student_id>", methods=["GET"])
@authenticate_token
@require_role("student")
def get_candidate_profile(student_id):
    try:
        db = get_db()
        student = db.get(
            """SELECT u.id, u.name, u.email, u.avatar,
                      sp.reg_no, sp.strength, sp.languages, sp.cgpa, sp.department, sp.semester,
                      sp.bio, sp.linkedin_url, sp.github_url
               FROM users u
               LEFT JOIN student_profiles sp ON u.id = sp.user_id
               WHERE u.id = ? AND u.role = 'student'""",
            [student_id]
        )
        if not student:
            return jsonify({"error": "Candidate not found."}), 404

        projects = db.all(
            """SELECT p.id, p.title, p.description, p.status, p.created_at
               FROM projects p
               JOIN project_members pm ON p.id = pm.project_id
               WHERE pm.student_id = ?
               ORDER BY p.created_at DESC""",
            [student_id]
        )

        return jsonify({
            "student": student,
            "projects": projects
        })

    except Exception as error:
        print("Get candidate profile error:", error)
        return jsonify({"error": "Failed to load candidate profile."}), 500


# 13. Invite Candidate to Team
@teams_bp.route("/<int:team_id>/invite", methods=["POST"])
@authenticate_token
@require_role("student")
def invite_to_team(team_id):
    try:
        data = request.get_json(silent=True) or {}
        recipient_id = data.get("studentId") or data.get("recipientId") or data.get("student_id") or data.get("recipient_id")
        message = data.get("message")

        if not recipient_id:
            return jsonify({"error": "Student ID is required."}), 400

        db = get_db()
        leader_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        if team["leader_id"] != leader_id:
            return jsonify({"error": "Only the team leader can send invitations."}), 403

        max_members = team.get("max_members") or 4
        current_count = db.get("SELECT COUNT(*) as count FROM team_members WHERE team_id = ?", [team_id])["count"]
        if current_count >= max_members:
            return jsonify({"error": "Team is already at maximum capacity (0 vacancies remaining)."}), 400

        recipient = db.get("SELECT id, name FROM users WHERE id = ? AND role = 'student'", [recipient_id])
        if not recipient:
            return jsonify({"error": "Selected student not found or ineligible."}), 404

        already_member = db.get("SELECT team_id FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, recipient_id])
        if already_member:
            return jsonify({"error": f"{recipient['name']} is already a confirmed member of this team."}), 400

        existing_inv = db.get(
            "SELECT id FROM team_invitations WHERE team_id = ? AND recipient_id = ? AND status = 'pending'",
            [team_id, recipient_id]
        )
        if existing_inv:
            return jsonify({"error": f"A pending invitation has already been sent to {recipient['name']}."}), 400

        io = current_app.extensions.get("socketio")
        inv_msg = message.strip() if message and message.strip() else f"You have been invited by {g.user['name']} to join the '{team['name']}' capstone project team."

        with db.transaction():
            res = db.run(
                """INSERT INTO team_invitations (team_id, sender_id, recipient_id, message, status)
                   VALUES (?, ?, ?, ?, 'pending')""",
                [team_id, leader_id, recipient_id, inv_msg]
            )
            inv_id = res.lastID

            create_system_notification(
                db, io,
                title=f"Team Invitation: {team['name']}",
                body=f"Team leader {g.user['name']} invited you to join team '{team['name']}' ({team.get('project_title') or 'Capstone'}).",
                audience="user",
                posted_by=leader_id,
                target_user_id=recipient_id
            )

        if io:
            try:
                io.emit("team_invitations_updated", {
                    "team_id": team_id,
                    "recipient_id": recipient_id,
                    "invitation_id": inv_id,
                    "action": "new_invitation"
                }, to=f"user_{recipient_id}")
            except Exception as emit_err:
                print("Socket emit error:", emit_err)

        return jsonify({
            "message": f"Invitation successfully sent to {recipient['name']}.",
            "invitationId": inv_id,
            "invitation_id": inv_id
        }), 201

    except Exception as error:
        print("Invite to team error:", error)
        return jsonify({"error": "Failed to send team invitation."}), 500


# 14. Get Sent and Received Invitations
@teams_bp.route("/my-invitations", methods=["GET"])
@authenticate_token
@require_role("student")
def get_my_invitations():
    try:
        db = get_db()
        student_id = g.user["id"]

        received = db.all(
            """SELECT ti.*, 
                      COALESCE(t.project_title, t.name) as project_title,
                      t.name as team_name, t.domain, t.max_members,
                      u.name as sender_name, u.avatar as sender_avatar,
                      (SELECT COUNT(*) FROM team_members WHERE team_id = ti.team_id) as current_members_count
               FROM team_invitations ti
               JOIN teams t ON ti.team_id = t.id
               JOIN users u ON ti.sender_id = u.id
               WHERE ti.recipient_id = ?
               ORDER BY ti.created_at DESC""",
            [student_id]
        )

        sent = db.all(
            """SELECT ti.*, 
                      COALESCE(t.project_title, t.name) as project_title,
                      t.name as team_name, t.domain, t.max_members,
                      s.name as sender_name,
                      u.name as recipient_name, u.avatar as recipient_avatar,
                      sp.reg_no as recipient_reg_no, sp.strength as recipient_strength, sp.languages as recipient_languages,
                      (SELECT COUNT(*) FROM team_members WHERE team_id = ti.team_id) as current_members_count
               FROM team_invitations ti
               JOIN teams t ON ti.team_id = t.id
               JOIN users u ON ti.recipient_id = u.id
               JOIN users s ON ti.sender_id = s.id
               LEFT JOIN student_profiles sp ON u.id = sp.user_id
               WHERE ti.sender_id = ? OR t.leader_id = ?
               ORDER BY ti.created_at DESC""",
            [student_id, student_id]
        )

        return jsonify({
            "received": received,
            "sent": sent
        })

    except Exception as error:
        print("Get invitations error:", error)
        return jsonify({"error": "Failed to retrieve invitations."}), 500


# 15. Decide Team Invitation (Accept / Reject)
@teams_bp.route("/invitations/<int:invitation_id>/decide", methods=["POST"])
@authenticate_token
@require_role("student")
def decide_team_invitation(invitation_id):
    try:
        data = request.get_json(silent=True) or {}
        action = data.get("action")

        if action not in ("accept", "reject"):
            return jsonify({"error": "Invalid action. Must be 'accept' or 'reject'."}), 400

        db = get_db()
        student_id = g.user["id"]

        inv = db.get(
            """SELECT ti.*, t.name as team_name, t.leader_id, t.max_members,
                      u.name as recipient_name
               FROM team_invitations ti
               JOIN teams t ON ti.team_id = t.id
               JOIN users u ON ti.recipient_id = u.id
               WHERE ti.id = ?""",
            [invitation_id]
        )

        if not inv:
            return jsonify({"error": "Invitation not found."}), 404

        if inv["recipient_id"] != student_id:
            return jsonify({"error": "You are not authorized to respond to this invitation."}), 403

        if inv["status"] != "pending":
            return jsonify({"error": f"This invitation has already been {inv['status']}."}), 400

        io = current_app.extensions.get("socketio")

        if action == "accept":
            current_count = db.get("SELECT COUNT(*) as count FROM team_members WHERE team_id = ?", [inv["team_id"]])["count"]
            max_members = inv.get("max_members") or 4
            if current_count >= max_members:
                return jsonify({"error": "This team has already reached its maximum capacity."}), 400

            with db.transaction():
                db.run(
                    "UPDATE team_invitations SET status = 'accepted', decided_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [invitation_id]
                )

                existing_member = db.get(
                    "SELECT team_id FROM team_members WHERE team_id = ? AND student_id = ?",
                    [inv["team_id"], student_id]
                )
                if not existing_member:
                    db.run(
                        "INSERT INTO team_members (team_id, student_id, role) VALUES (?, ?, 'member')",
                        [inv["team_id"], student_id]
                    )

                # Auto-close recruiting if maximum capacity reached
                if current_count + 1 >= max_members:
                    db.run("UPDATE teams SET is_accepting_members = 0 WHERE id = ?", [inv["team_id"]])

                cg = db.get("SELECT id FROM chat_groups WHERE team_id = ?", [inv["team_id"]])
                if cg:
                    db.run(
                        "INSERT OR IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)",
                        [cg["id"], student_id]
                    )
                    db.run(
                        "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
                        [cg["id"], student_id, f"Hello everyone! I have joined the {inv['team_name']} workspace."]
                    )

                create_system_notification(
                    db, io,
                    title="Team Invitation Accepted!",
                    body=f"{inv['recipient_name']} accepted your invitation to join '{inv['team_name']}'.",
                    audience="user",
                    posted_by=student_id,
                    target_user_id=inv["leader_id"]
                )

            if io:
                try:
                    io.emit("team_membership_updated", {
                        "team_id": inv["team_id"],
                        "student_id": student_id,
                        "action": "member_joined"
                    }, to=f"team_{inv['team_id']}")
                    io.emit("team_membership_updated", {
                        "team_id": inv["team_id"],
                        "student_id": student_id,
                        "action": "member_joined"
                    }, to=f"user_{student_id}")
                    io.emit("team_invitations_updated", {
                        "team_id": inv["team_id"],
                        "invitation_id": invitation_id,
                        "status": "accepted"
                    }, to=f"user_{inv['leader_id']}")
                    io.emit("available_teams_updated", {})
                except Exception as emit_err:
                    print("Socket emit error:", emit_err)

            return jsonify({
                "message": f"Successfully joined team '{inv['team_name']}'!",
                "status": "accepted"
            })

        else:
            with db.transaction():
                db.run(
                    "UPDATE team_invitations SET status = 'rejected', decided_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [invitation_id]
                )
                create_system_notification(
                    db, io,
                    title="Team Invitation Declined",
                    body=f"{inv['recipient_name']} declined the invitation to join team '{inv['team_name']}'.",
                    audience="user",
                    posted_by=student_id,
                    target_user_id=inv["leader_id"]
                )

            if io:
                try:
                    io.emit("team_invitations_updated", {
                        "team_id": inv["team_id"],
                        "invitation_id": invitation_id,
                        "status": "rejected"
                    }, to=f"user_{inv['leader_id']}")
                    io.emit("team_invitations_updated", {
                        "team_id": inv["team_id"],
                        "invitation_id": invitation_id,
                        "status": "rejected"
                    }, to=f"user_{student_id}")
                except Exception as emit_err:
                    print("Socket emit error:", emit_err)

            return jsonify({
                "message": f"Declined invitation from '{inv['team_name']}'.",
                "status": "rejected"
            })

    except Exception as error:
        print("Decide invitation error:", error)
        return jsonify({"error": "Failed to process invitation decision."}), 500


# 16. Update Member Role and Responsibilities (Workspace)
@teams_bp.route("/<int:team_id>/members/<int:target_student_id>/role", methods=["PUT", "POST"])
@teams_bp.route("/<int:team_id>/members/<int:target_student_id>/role/", methods=["PUT", "POST"])
@authenticate_token
@require_role("student")
def update_member_role(team_id, target_student_id):
    try:
        db = get_db()
        current_student_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        if team["leader_id"] != current_student_id:
            return jsonify({"error": "Only the authorized team leader can assign or update member roles."}), 403

        member = db.get("SELECT student_id FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, target_student_id])
        if not member:
            return jsonify({"error": "Selected student is not a confirmed member of this team."}), 404

        data = request.get_json(silent=True) or {}
        role_title = (data.get("role_title") or data.get("roleTitle") or "").strip()
        responsibilities = (data.get("responsibilities") or "").strip()

        if not role_title:
            return jsonify({"error": "Role title is required."}), 400

        db.run(
            "UPDATE team_members SET role_title = ?, responsibilities = ? WHERE team_id = ? AND student_id = ?",
            [role_title, responsibilities if responsibilities else None, team_id, target_student_id]
        )

        io = current_app.extensions.get("socketio")
        if io:
            try:
                io.emit("team_roles_updated", {
                    "team_id": team_id,
                    "student_id": target_student_id,
                    "role_title": role_title,
                    "responsibilities": responsibilities or None
                }, to=f"team_{team_id}")
            except Exception as emit_err:
                print("Socket emit error:", emit_err)

        return jsonify({
            "message": "Member role and responsibilities updated successfully.",
            "role_title": role_title,
            "responsibilities": responsibilities or None
        })

    except Exception as error:
        print("Update member role error:", error)
        return jsonify({"error": "Failed to update member role."}), 500


# 17. Create Team Task & Retrieve Tasks (Workspace)
@teams_bp.route("/<int:team_id>/tasks", methods=["GET", "POST"])
@teams_bp.route("/<int:team_id>/tasks/", methods=["GET", "POST"])
@authenticate_token
@require_role("student")
def create_team_task(team_id):
    try:
        db = get_db()
        current_student_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        # If GET request, return list of tasks for authorized member
        if request.method == "GET":
            is_mem = db.get("SELECT student_id FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, current_student_id])
            if not is_mem:
                return jsonify({"error": "You are not an authorized member of this team."}), 403
            tasks = db.all(
                """SELECT tt.*, u.name as assigned_name, u.email as assigned_email, u.avatar as assigned_avatar
                   FROM team_tasks tt
                   LEFT JOIN users u ON tt.assigned_to = u.id
                   WHERE tt.team_id = ?
                   ORDER BY tt.created_at DESC""",
                [team_id]
            )
            return jsonify({"tasks": tasks})

        if team["leader_id"] != current_student_id:
            return jsonify({"error": "Only the authorized team leader can create and assign tasks."}), 403

        data = request.get_json(silent=True) or {}
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        assigned_to = data.get("assigned_to") or data.get("assignedTo")
        priority = (data.get("priority") or "medium").strip().lower()
        if priority not in ("low", "medium", "high", "urgent"):
            priority = "medium"
        deadline = (data.get("deadline") or "").strip() or None

        if not title:
            return jsonify({"error": "Task title is required."}), 400

        if assigned_to:
            try:
                assigned_to = int(assigned_to)
                is_mem = db.get("SELECT student_id FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, assigned_to])
                if not is_mem:
                    return jsonify({"error": "Selected assignee is not a confirmed member of this team."}), 400
            except ValueError:
                return jsonify({"error": "Invalid assignee ID."}), 400
        else:
            assigned_to = None

        res = db.run(
            """INSERT INTO team_tasks (team_id, title, description, assigned_to, priority, deadline, status, created_by)
               VALUES (?, ?, ?, ?, ?, ?, 'not_started', ?)""",
            [team_id, title, description or None, assigned_to, priority, deadline, current_student_id]
        )
        task_id = res.lastID

        task = db.get(
            """SELECT tt.*, u.name as assigned_name, u.email as assigned_email, u.avatar as assigned_avatar
               FROM team_tasks tt
               LEFT JOIN users u ON tt.assigned_to = u.id
               WHERE tt.id = ?""",
            [task_id]
        )

        io = current_app.extensions.get("socketio")
        if io:
            try:
                io.emit("team_tasks_updated", {
                    "team_id": team_id,
                    "action": "created",
                    "task": task
                }, to=f"team_{team_id}")
            except Exception as emit_err:
                print("Socket emit error:", emit_err)

        return jsonify({
            "message": "Task created successfully.",
            "task": task
        }), 201

    except Exception as error:
        print("Create task error:", error)
        return jsonify({"error": "Failed to create task."}), 500


# 18. Update Team Task Details (Workspace)
@teams_bp.route("/<int:team_id>/tasks/<int:task_id>", methods=["PUT", "POST"])
@teams_bp.route("/<int:team_id>/tasks/<int:task_id>/", methods=["PUT", "POST"])
@authenticate_token
@require_role("student")
def update_team_task(team_id, task_id):
    try:
        db = get_db()
        current_student_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        if team["leader_id"] != current_student_id:
            return jsonify({"error": "Only the authorized team leader can edit task details."}), 403

        task = db.get("SELECT * FROM team_tasks WHERE id = ? AND team_id = ?", [task_id, team_id])
        if not task:
            return jsonify({"error": "Task not found."}), 404

        data = request.get_json(silent=True) or {}
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        assigned_to = data.get("assigned_to") or data.get("assignedTo")
        priority = (data.get("priority") or task.get("priority") or "medium").strip().lower()
        if priority not in ("low", "medium", "high", "urgent"):
            priority = "medium"
        deadline = (data.get("deadline") or "").strip() or None

        if not title:
            return jsonify({"error": "Task title is required."}), 400

        if assigned_to:
            try:
                assigned_to = int(assigned_to)
                is_mem = db.get("SELECT student_id FROM team_members WHERE team_id = ? AND student_id = ?", [team_id, assigned_to])
                if not is_mem:
                    return jsonify({"error": "Selected assignee is not a member of this team."}), 400
            except ValueError:
                return jsonify({"error": "Invalid assignee ID."}), 400
        else:
            assigned_to = None

        db.run(
            """UPDATE team_tasks 
               SET title = ?, description = ?, assigned_to = ?, priority = ?, deadline = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            [title, description or None, assigned_to, priority, deadline, task_id]
        )

        updated_task = db.get(
            """SELECT tt.*, u.name as assigned_name, u.email as assigned_email, u.avatar as assigned_avatar
               FROM team_tasks tt
               LEFT JOIN users u ON tt.assigned_to = u.id
               WHERE tt.id = ?""",
            [task_id]
        )

        io = current_app.extensions.get("socketio")
        if io:
            try:
                io.emit("team_tasks_updated", {
                    "team_id": team_id,
                    "action": "updated",
                    "task": updated_task
                }, to=f"team_{team_id}")
            except Exception as emit_err:
                print("Socket emit error:", emit_err)

        return jsonify({
            "message": "Task updated successfully.",
            "task": updated_task
        })

    except Exception as error:
        print("Update task error:", error)
        return jsonify({"error": "Failed to update task."}), 500


# 19. Delete Team Task (Workspace)
@teams_bp.route("/<int:team_id>/tasks/<int:task_id>", methods=["DELETE"])
@teams_bp.route("/<int:team_id>/tasks/<int:task_id>/", methods=["DELETE"])
@authenticate_token
@require_role("student")
def delete_team_task(team_id, task_id):
    try:
        db = get_db()
        current_student_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        if team["leader_id"] != current_student_id:
            return jsonify({"error": "Only the authorized team leader can delete tasks."}), 403

        task = db.get("SELECT * FROM team_tasks WHERE id = ? AND team_id = ?", [task_id, team_id])
        if not task:
            return jsonify({"error": "Task not found."}), 404

        db.run("DELETE FROM team_tasks WHERE id = ?", [task_id])

        io = current_app.extensions.get("socketio")
        if io:
            try:
                io.emit("team_tasks_updated", {
                    "team_id": team_id,
                    "action": "deleted",
                    "taskId": task_id
                }, to=f"team_{team_id}")
            except Exception as emit_err:
                print("Socket emit error:", emit_err)

        return jsonify({"message": "Task deleted successfully."})

    except Exception as error:
        print("Delete task error:", error)
        return jsonify({"error": "Failed to delete task."}), 500


# 20. Update Task Status (Workspace - Individual work completion)
@teams_bp.route("/<int:team_id>/tasks/<int:task_id>/status", methods=["PATCH", "PUT", "POST"])
@teams_bp.route("/<int:team_id>/tasks/<int:task_id>/status/", methods=["PATCH", "PUT", "POST"])
@authenticate_token
@require_role("student")
def update_task_status(team_id, task_id):
    try:
        db = get_db()
        current_student_id = g.user["id"]

        team = db.get("SELECT * FROM teams WHERE id = ?", [team_id])
        if not team:
            return jsonify({"error": "Team not found."}), 404

        task = db.get("SELECT * FROM team_tasks WHERE id = ? AND team_id = ?", [task_id, team_id])
        if not task:
            return jsonify({"error": "Task not found."}), 404

        # Strict authorization rule:
        # A student can only update the status of tasks assigned to them,
        # or the authorized team leader can update any task status.
        is_assigned = (task["assigned_to"] == current_student_id)
        is_leader = (team["leader_id"] == current_student_id)

        if not is_assigned and not is_leader:
            return jsonify({"error": "You are only permitted to update the progress of tasks assigned to you."}), 403

        data = request.get_json(silent=True) or {}
        new_status = data.get("status")

        if new_status not in ["not_started", "in_progress", "completed"]:
            return jsonify({"error": "Invalid status. Must be 'not_started', 'in_progress', or 'completed'."}), 400

        db.run(
            "UPDATE team_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [new_status, task_id]
        )

        updated_task = db.get(
            """SELECT tt.*, u.name as assigned_name, u.email as assigned_email, u.avatar as assigned_avatar
               FROM team_tasks tt
               LEFT JOIN users u ON tt.assigned_to = u.id
               WHERE tt.id = ?""",
            [task_id]
        )

        io = current_app.extensions.get("socketio")
        if io:
            try:
                io.emit("team_tasks_updated", {
                    "team_id": team_id,
                    "action": "status_changed",
                    "task": updated_task
                }, to=f"team_{team_id}")
            except Exception as emit_err:
                print("Socket emit error:", emit_err)

        return jsonify({
            "message": f"Task status updated to {new_status.replace('_', ' ')}.",
            "task": updated_task
        })

    except Exception as error:
        print("Update task status error:", error)
        return jsonify({"error": "Failed to update task status."}), 500
