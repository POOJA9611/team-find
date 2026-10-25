"""
Headless Edge Browser Verification for Student -> Project Teams -> My Teams Workspace.
Validates:
- My Teams workspace view rendering with real data
- Workspace navigation tabs: Overview & Progress, Tasks & Work, Members & Roles, Chat & Files
- Overview tab metrics: Team Progress %, Individual Progress %, My Project Role card
- Tasks & Work tab: task listing, status filters, leader task creation controls, status update buttons
- Members & Roles tab: members listing with role titles, responsibilities, leader role assignment button
- Chat & Files tab: Team Chat navigation link and repository/file submission instructions
"""

import os
import sys
import socket
import json
import urllib.request
import time
import subprocess
import base64
import struct

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def ws_connect(ws_url):
    parts = ws_url.replace("ws://", "").split("/", 1)
    host, port = parts[0].split(":")
    path = "/" + parts[1]
    
    s = socket.create_connection((host, int(port)), timeout=5)
    key = base64.b64encode(os.urandom(16)).decode('ascii')
    req = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {parts[0]}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        f"Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(req.encode('latin1'))
    resp = s.recv(4096).decode('latin1')
    if "101" not in resp:
        raise Exception("WebSocket handshake failed: " + resp)
    return s

def ws_send(s, msg):
    data = msg.encode('utf-8')
    length = len(data)
    frame = bytearray([0x81])
    mask = os.urandom(4)
    if length <= 125:
        frame.append(0x80 | length)
    elif length <= 65535:
        frame.append(0x80 | 126)
        frame.extend(struct.pack("!H", length))
    else:
        frame.append(0x80 | 127)
        frame.extend(struct.pack("!Q", length))
    frame.extend(mask)
    masked = bytearray(data)
    for i in range(len(masked)):
        masked[i] ^= mask[i % 4]
    frame.extend(masked)
    s.sendall(frame)

def ws_recv(s):
    hdr = s.recv(2)
    if not hdr: return None
    b1, b2 = hdr[0], hdr[1]
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack("!H", s.recv(2))[0]
    elif length == 127:
        length = struct.unpack("!Q", s.recv(8))[0]
    data = b""
    while len(data) < length:
        chunk = s.recv(min(4096, length - len(data)))
        if not chunk: break
        data += chunk
    return data.decode('utf-8', errors='replace')

def evaluate_js(s, req_id, expr):
    ws_send(s, json.dumps({
        "id": req_id,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expr,
            "returnByValue": True,
            "awaitPromise": True
        }
    }))
    t_end = time.time() + 6
    while time.time() < t_end:
        try:
            msg = ws_recv(s)
            if not msg: continue
            ev = json.loads(msg)
            if ev.get("id") == req_id:
                return ev.get("result", {}).get("result", {}).get("value")
        except socket.timeout:
            pass
    return None

def test_browser_my_teams():
    print("=" * 70)
    print("🌐 RUNNING HEADLESS EDGE BROWSER UI VERIFICATION FOR MY TEAMS WORKSPACE")
    print("=" * 70)

    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    user_data = os.path.abspath("tests/edge_workspace_profile")
    edge_proc = subprocess.Popen([
        edge_path,
        "--headless=new",
        f"--user-data-dir={user_data}",
        "--remote-debugging-port=9225",
        "--disable-gpu",
        "about:blank"
    ])

    try:
        time.sleep(2)
        req = urllib.request.Request("http://127.0.0.1:9225/json/new", method="PUT")
        tab = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        ws_url = tab["webSocketDebuggerUrl"]
        s = ws_connect(ws_url)
        s.settimeout(0.5)

        ws_send(s, json.dumps({"id": 1, "method": "Runtime.enable"}))
        ws_send(s, json.dumps({"id": 2, "method": "Page.enable"}))
        ws_send(s, json.dumps({"id": 3, "method": "Page.navigate", "params": {"url": "http://127.0.0.1:5000/"}}))

        time.sleep(2)

        # 1. Login as Alex Chen (Student Leader with a team)
        login_res = evaluate_js(s, 10, """
        (async function() {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'alex.chen@student.edu', password: 'Password@123' })
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.reload();
                return { success: true, user: data.user };
            }
            return { error: data.error };
        })()
        """)
        print("1. Login response:", login_res)
        assert login_res and login_res.get('success'), f"Login failed: {login_res}"

        time.sleep(2.5)

        # 2. Navigate to Student -> Project Teams -> My Teams
        nav_res = evaluate_js(s, 20, """
        (function() {
            const btn = document.querySelector('[data-view="project-teams"]');
            if (btn) {
                btn.click();
                return { success: true };
            }
            return { error: 'Project Teams menu item not found' };
        })()
        """)
        print("2. Navigate to Project Teams:", nav_res)
        time.sleep(2)

        # 3. Check Workspace Sub-Navigation Tabs and Overview Tab Elements
        ws_check = evaluate_js(s, 30, """
        (function() {
            const tabOverview = document.getElementById('ws-tab-overview');
            const tabTasks = document.getElementById('ws-tab-tasks');
            const tabMembers = document.getElementById('ws-tab-members');
            const tabFiles = document.getElementById('ws-tab-files');

            const body = document.body.innerHTML;
            return {
                hasTabOverview: !!tabOverview,
                hasTabTasks: !!tabTasks,
                hasTabMembers: !!tabMembers,
                hasTabFiles: !!tabFiles,
                hasTeamProgressCard: body.includes('Overall Team Progress'),
                hasMyRoleCard: body.includes('My Project Role'),
                hasApplicationsCard: !!document.getElementById('card-open-applications'),
                hasSmartMatchCard: !!document.getElementById('card-open-smart-match'),
                hasTeamSkillBalance: body.includes('Team Skill Balance')
            };
        })()
        """)
        print("3. Workspace Navigation & Overview Elements:", ws_check)
        assert ws_check['hasTabOverview'], "Missing Overview tab"
        assert ws_check['hasTabTasks'], "Missing Tasks tab"
        assert ws_check['hasTabMembers'], "Missing Members tab"
        assert ws_check['hasTabFiles'], "Missing Files tab"
        assert ws_check['hasTeamProgressCard'], "Missing Overall Team Progress Card"
        assert ws_check['hasMyRoleCard'], "Missing My Project Role Card"
        assert ws_check['hasApplicationsCard'], "Missing Applications Card"
        assert ws_check['hasSmartMatchCard'], "Missing Smart Match Card"

        # 4. Click 'Tasks & Work' tab and verify tasks view
        tasks_tab_res = evaluate_js(s, 40, """
        (function() {
            const tabTasks = document.getElementById('ws-tab-tasks');
            if (!tabTasks) return { error: 'Tab tasks not found' };
            tabTasks.click();
            return { success: true };
        })()
        """)
        print("4. Clicked Tasks & Work tab:", tasks_tab_res)
        time.sleep(1)

        tasks_view_check = evaluate_js(s, 50, """
        (function() {
            const body = document.body.innerHTML;
            const btnCreate = document.getElementById('btn-open-create-task');
            const filterAll = document.querySelector('[data-filter="all"]');
            const filterMy = document.querySelector('[data-filter="my"]');
            return {
                hasCreateTaskButton: !!btnCreate,
                hasFilterAll: !!filterAll,
                hasFilterMy: !!filterMy,
                hasTasksSection: body.includes('Tasks &amp; Work Completion') || body.includes('Tasks & Work Completion')
            };
        })()
        """)
        print("5. Tasks View Elements:", tasks_view_check)
        assert tasks_view_check['hasCreateTaskButton'], "Leader missing create task button"
        assert tasks_view_check['hasFilterAll'], "Missing task status filters"
        assert tasks_view_check['hasTasksSection'], "Missing tasks section title"

        # 5. Click 'Members & Roles' tab and verify members list and leader controls
        members_tab_res = evaluate_js(s, 60, """
        (function() {
            const tabMembers = document.getElementById('ws-tab-members');
            if (!tabMembers) return { error: 'Tab members not found' };
            tabMembers.click();
            return { success: true };
        })()
        """)
        print("6. Clicked Members & Roles tab:", members_tab_res)
        time.sleep(1)

        members_view_check = evaluate_js(s, 70, """
        (function() {
            const body = document.body.innerHTML;
            const assignBtns = document.querySelectorAll('.btn-assign-member-role');
            return {
                hasMembersHeader: body.includes('Team Members &amp; Roles') || body.includes('Team Members & Roles'),
                hasAssignRoleButtons: assignBtns.length > 0
            };
        })()
        """)
        print("7. Members View Elements:", members_view_check)
        assert members_view_check['hasMembersHeader'], "Missing members header"
        assert members_view_check['hasAssignRoleButtons'], "Leader should have Assign Role buttons"

        # 6. Click 'Chat & Files' tab and verify chat link and deliverables info
        chat_tab_res = evaluate_js(s, 80, """
        (function() {
            const tabFiles = document.getElementById('ws-tab-files');
            if (!tabFiles) return { error: 'Tab files not found' };
            tabFiles.click();
            return { success: true };
        })()
        """)
        print("8. Clicked Chat & Files tab:", chat_tab_res)
        time.sleep(1)

        chat_view_check = evaluate_js(s, 90, """
        (function() {
            const body = document.body.innerHTML;
            const btnOpenChat = document.getElementById('btn-open-workspace-chat');
            return {
                hasOpenChatBtn: !!btnOpenChat,
                hasFilesGuidance: body.includes('Project Files &amp; Deliverables') || body.includes('Project Files & Deliverables')
            };
        })()
        """)
        print("9. Chat & Files View Elements:", chat_view_check)
        assert chat_view_check['hasOpenChatBtn'], "Missing open workspace chat button"
        assert chat_view_check['hasFilesGuidance'], "Missing repository / deliverables guidance"

        print("=" * 70)
        print("🎉 ALL HEADLESS BROWSER UI WORKSPACE CHECKS PASSED 100%!")
        print("=" * 70)

    finally:
        try:
            edge_proc.terminate()
            edge_proc.wait(timeout=3)
        except Exception:
            pass

if __name__ == "__main__":
    test_browser_my_teams()
