from flask import request
from flask_socketio import emit, join_room, leave_room, disconnect
from backend.database import get_db
from backend.middleware.auth import decode_token

_connected_users = {}


def setup_socket_events(socketio):
    def get_socket_user():
        if hasattr(request, "sid_user") and request.sid_user:
            return request.sid_user
        sid = getattr(request, "sid", None)
        if sid and sid in _connected_users:
            return _connected_users[sid]
        return None

    @socketio.on("connect")
    def on_connect(auth):
        token = None
        if isinstance(auth, dict) and "token" in auth:
            token = auth["token"]
        elif request.args.get("token"):
            token = request.args.get("token")

        if not token:
            print("⛔ Socket connect rejected: No token provided.")
            return False

        try:
            payload = decode_token(token)
            user_id = payload.get("userId")
        except Exception as e:
            print(f"⛔ Socket connect rejected: Invalid token ({e}).")
            return False

        db = get_db()
        user = db.get("SELECT id, role, name, email, avatar FROM users WHERE id = ?", [user_id])
        if not user:
            print(f"⛔ Socket connect rejected: User {user_id} not found.")
            return False

        # Store user on session & map
        request.sid_user = user
        if hasattr(request, "sid") and request.sid:
            _connected_users[request.sid] = user

        user_room = f"user_{user['id']}"
        role_room = f"role_{user['role']}"

        join_room(user_room)
        join_room(role_room)

        # Auto-join all project teams the user is a confirmed member or leader of
        try:
            if user["role"] == "student":
                user_teams = db.all("SELECT team_id FROM team_members WHERE student_id = ?", [user["id"]])
                for ut in user_teams:
                    t_room = f"team_{ut['team_id']}"
                    join_room(t_room)
        except Exception as t_err:
            print(f"Team room join note: {t_err}")

        print(f"⚡ Socket connected: User {user['name']} ({user['role']}, ID: {user['id']})")
        return True

    @socketio.on("join_team")
    def on_join_team(data):
        user = get_socket_user()
        if not user:
            return {"error": "Authentication required."}

        team_id = data.get("teamId") or data.get("team_id") if isinstance(data, dict) else None
        if not team_id:
            return {"error": "Team ID is required."}

        db = get_db()
        membership = db.get(
            "SELECT * FROM team_members WHERE team_id = ? AND student_id = ?",
            [team_id, user["id"]]
        )

        if not membership and user.get("role") != "hod":
            print(f"⛔ Unauthorized team join attempt: User {user['id']} tried to join team {team_id}")
            emit("error_message", {"error": "Access denied: You are not a member of this project team."})
            return {"error": "Access denied: Not a member."}

        room_name = f"team_{team_id}"
        join_room(room_name)
        print(f"👥 User {user['name']} joined team room {room_name}")
        return {"success": True, "room": room_name}

    @socketio.on("leave_team")
    def on_leave_team(data):
        team_id = data.get("teamId") or data.get("team_id") if isinstance(data, dict) else None
        if team_id:
            room_name = f"team_{team_id}"
            leave_room(room_name)
            user = get_socket_user()
            user_name = user["name"] if user else "Unknown"
            print(f"👋 User {user_name} left team room {room_name}")
            return {"success": True}

    @socketio.on("join_group")
    def on_join_group(data):
        user = get_socket_user()
        if not user:
            return {"error": "Authentication required."}

        group_id = data.get("groupId") if isinstance(data, dict) else None
        if not group_id:
            return {"error": "Group ID is required."}

        db = get_db()
        membership = db.get(
            "SELECT * FROM chat_group_members WHERE group_id = ? AND user_id = ?",
            [group_id, user["id"]]
        )

        if not membership:
            print(f"⛔ Unauthorized join attempt: User {user['id']} tried to join group {group_id}")
            emit("error_message", {"error": "Access denied: You are not a member of this chat group."})
            return {"error": "Access denied: Not a member."}

        room_name = f"group_{group_id}"
        join_room(room_name)
        print(f"👥 User {user['name']} joined room {room_name}")
        return {"success": True, "room": room_name}

    @socketio.on("leave_group")
    def on_leave_group(data):
        group_id = data.get("groupId") if isinstance(data, dict) else None
        if group_id:
            room_name = f"group_{group_id}"
            leave_room(room_name)
            user = get_socket_user()
            user_name = user["name"] if user else "Unknown"
            print(f"👋 User {user_name} left room {room_name}")

    @socketio.on("chat_message")
    def on_chat_message(data):
        user = get_socket_user()
        if not user:
            return {"error": "Authentication required."}

        if not isinstance(data, dict):
            return {"error": "Invalid payload format."}

        group_id = data.get("groupId")
        body = data.get("body")

        if not group_id or not body or not isinstance(body, str) or len(body.strip()) == 0:
            return {"error": "Group ID and non-empty body required."}

        db = get_db()
        membership = db.get(
            "SELECT * FROM chat_group_members WHERE group_id = ? AND user_id = ?",
            [group_id, user["id"]]
        )

        if not membership:
            return {"error": "Access denied: You are not in this chat group."}

        clean_body = body.strip()
        res = db.run(
            "INSERT INTO messages (group_id, sender_id, body) VALUES (?, ?, ?)",
            [group_id, user["id"], clean_body]
        )

        saved_msg = db.get(
            """SELECT m.id, m.group_id, m.sender_id, m.body, m.created_at,
                      u.name as sender_name, u.role as sender_role, u.avatar as sender_avatar
               FROM messages m
               JOIN users u ON m.sender_id = u.id
               WHERE m.id = ?""",
            [res.lastID]
        )

        room_name = f"group_{group_id}"
        emit("receive_message", saved_msg, to=room_name)
        return {"success": True, "message": saved_msg}

    @socketio.on("disconnect")
    def on_disconnect():
        user = get_socket_user()
        sid = getattr(request, "sid", None)
        if sid:
            _connected_users.pop(sid, None)
        user_name = user["name"] if user else "Unknown"
        user_id = user["id"] if user else "?"
        print(f"🔌 Socket disconnected: User {user_name} (ID: {user_id})")
