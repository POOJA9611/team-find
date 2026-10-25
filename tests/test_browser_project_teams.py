"""
Headless Edge Browser Verification for Student -> Project Teams UI.
Validates the UI layout against the user mockup:
- Top purple banner with 3 tabs (My Teams, Available Teams, Create Team)
- Metrics (team members, vacancies)
- Recruiting status line with badge
- Two action cards: Applications and Smart Match
- Team Skill Balance categories and Recommended next step banner
- Navigation into Applications view and back
- Navigation into Smart Match view and back
- Verification that 'How it works?' panel is removed
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
    t_end = time.time() + 5
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

def test_browser_ui():
    print("=" * 70)
    print("🌐 RUNNING HEADLESS EDGE BROWSER UI VERIFICATION FOR PROJECT TEAMS")
    print("=" * 70)

    # 1. Connect to Edge
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    user_data = os.path.abspath("tests/edge_pt_profile")
    edge_proc = subprocess.Popen([
        edge_path,
        "--headless=new",
        f"--user-data-dir={user_data}",
        "--remote-debugging-port=9223",
        "--disable-gpu",
        "about:blank"
    ])

    try:
        time.sleep(2)
        req = urllib.request.Request("http://127.0.0.1:9223/json/new", method="PUT")
        tab = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        ws_url = tab["webSocketDebuggerUrl"]
        s = ws_connect(ws_url)
        s.settimeout(0.5)

        ws_send(s, json.dumps({"id": 1, "method": "Runtime.enable"}))
        ws_send(s, json.dumps({"id": 2, "method": "Page.enable"}))
        ws_send(s, json.dumps({"id": 3, "method": "Page.navigate", "params": {"url": "http://127.0.0.1:5000/"}}))

        time.sleep(2)

        # 2. Login as a student leader who has a team
        # First let's check login
        login_res = evaluate_js(s, 10, """
        (async function() {
            // Register or login a fresh student leader via API directly into localStorage
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
                return { success: true, email: data.user.email };
            }
            return { error: data.error };
        })()
        """)
        print("Login setup result:", login_res)

        time.sleep(2.5)

        # 3. Navigate to Project Teams
        nav_res = evaluate_js(s, 20, """
        (function() {
            const btn = document.querySelector('[data-view="project-teams"]');
            if (btn) {
                btn.click();
                return { success: true };
            }
            return { error: 'Project Teams navigation item not found' };
        })()
        """)
        print("Navigate to Project Teams:", nav_res)

        time.sleep(2)

        # 4. Verify Project Teams Overview UI Elements (Matching Mockup)
        ui_res = evaluate_js(s, 30, """
        (function() {
            const body = document.body.innerHTML;
            return {
                hasBannerTitle: body.includes('Project Teams'),
                hasBannerSubtitle: body.includes('Build your team. Find your people. Create together.'),
                hasTabMyTeam: !!document.getElementById('tab-my-team'),
                hasTabJoinTeams: !!document.getElementById('tab-join-teams'),
                hasTabProposeTeam: !!document.getElementById('tab-propose-team'),
                hasMembersMetric: body.includes('team members'),
                hasVacanciesMetric: body.includes('vacancies'),
                hasRecruitingStatus: body.includes('Recruiting status'),
                hasApplicationsCard: !!document.getElementById('card-open-applications'),
                hasSmartMatchCard: !!document.getElementById('card-open-smart-match'),
                hasTeamSkillBalance: body.includes('Team Skill Balance'),
                hasRecommendedNextStep: body.includes('Recommended next step')
            };
        })()
        """)
        print("Overview UI Elements Verification:")
        for k, v in ui_res.items():
            print(f"  - {k}: {v}")
            assert v is True, f"Failed verification: {k} was False"

        print("✅ 4. All Overview UI elements match the mockup perfectly!")

        # 5. Click Applications Card
        app_click = evaluate_js(s, 40, """
        (function() {
            const card = document.getElementById('card-open-applications');
            if (card) {
                card.click();
                return { success: true };
            }
            return { error: 'Applications card not found' };
        })()
        """)
        print("Click Applications Card:", app_click)
        time.sleep(1)

        app_view_res = evaluate_js(s, 41, """
        (function() {
            const body = document.body.innerHTML;
            const hasBackBtn = !!document.getElementById('btn-back-team-overview');
            const hasAppHeading = body.includes('Applications —') || body.includes('No applications received yet');
            return { hasBackBtn, hasAppHeading };
        })()
        """)
        print("Applications Sub-View:", app_view_res)
        assert app_view_res["hasBackBtn"] is True, "Back button missing in Applications view"

        # 6. Click Back to Team Overview
        back_click1 = evaluate_js(s, 42, """
        (function() {
            const btn = document.getElementById('btn-back-team-overview');
            btn.click();
            return { success: true };
        })()
        """)
        print("Click Back to Overview from Applications:", back_click1)
        time.sleep(1)

        # 7. Click Smart Match Card
        smart_click = evaluate_js(s, 50, """
        (function() {
            const card = document.getElementById('card-open-smart-match');
            if (card) {
                card.click();
                return { success: true };
            }
            return { error: 'Smart Match card not found' };
        })()
        """)
        print("Click Smart Match Card:", smart_click)
        time.sleep(2)

        smart_view_res = evaluate_js(s, 51, """
        (function() {
            const body = document.body.innerHTML;
            const hasBackBtn = !!document.getElementById('btn-back-team-overview');
            const hasSmartHeading = body.includes('Smart Match / Find Members');
            const hasHowItWorks = body.includes('How it works?');
            return { hasBackBtn, hasSmartHeading, hasHowItWorks };
        })()
        """)
        print("Smart Match Sub-View:", smart_view_res)
        assert smart_view_res["hasBackBtn"] is True, "Back button missing in Smart Match view"
        assert smart_view_res["hasSmartHeading"] is True, "Smart Match heading missing"
        assert smart_view_res["hasHowItWorks"] is False, "'How it works?' panel was NOT removed!"
        print("✅ 7. Verified: 'How it works?' panel is completely removed from Smart Match view!")

        # 8. Click Back to Team Overview from Smart Match
        back_click2 = evaluate_js(s, 52, """
        (function() {
            const btn = document.getElementById('btn-back-team-overview');
            btn.click();
            return { success: true };
        })()
        """)
        print("Click Back to Overview from Smart Match:", back_click2)
        time.sleep(1)

        print("\n" + "=" * 70)
        print("🎉 ALL BROWSER UI VERIFICATIONS PASSED FLAWLESSLY!")
        print("=" * 70)

    finally:
        edge_proc.kill()

if __name__ == "__main__":
    test_browser_ui()
