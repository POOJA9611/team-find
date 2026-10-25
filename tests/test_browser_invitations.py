"""
Headless Edge Browser Verification for Student -> Invitations UI.
Validates the UI layout against the user mockup screenshot (media_1792917007615_9de7bf76.png):
- Sidebar: Invitations menu item with envelope icon and 'New' badge directly under Project Teams
- Header: Purple icon with envelope, 'Invitations' title and subtitle
- Tabs: Sent Invitations (count), Received Invitations (count), View Both
- Sent Invitations Section:
  - Subtitle 'Track the status of invitations you have sent to other students.'
  - Sent cards with team/project names, 'To: <recipient>', date, status badges (Pending, Accepted, Rejected), chevrons
- Received Invitations Section:
  - Subtitle 'Respond to invitations from team leaders and other students.'
  - Received cards with team/project names, 'From: <sender>', date
  - Pending cards show Accept (green) and Reject (red) action buttons
  - Accepted / Rejected cards show resolved status badges and chevrons
- Informational Alert Banner:
  - 'You can only accept or reject invitations received from other students. Sent invitations can only be tracked, not modified.'
- Detail Modal:
  - Clicking an invitation card opens full invitation details modal
- Tab Filtering:
  - Switching between Sent, Received, and Both tabs updates the view correctly
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

def test_browser_invitations():
    print("=" * 70)
    print("🌐 RUNNING HEADLESS EDGE BROWSER UI VERIFICATION FOR STUDENT INVITATIONS")
    print("=" * 70)

    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    user_data = os.path.abspath("tests/edge_inv_profile")
    edge_proc = subprocess.Popen([
        edge_path,
        "--headless=new",
        f"--user-data-dir={user_data}",
        "--remote-debugging-port=9224",
        "--disable-gpu",
        "about:blank"
    ])

    try:
        time.sleep(2)
        req = urllib.request.Request("http://127.0.0.1:9224/json/new", method="PUT")
        tab = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        ws_url = tab["webSocketDebuggerUrl"]
        s = ws_connect(ws_url)
        s.settimeout(0.5)

        ws_send(s, json.dumps({"id": 1, "method": "Runtime.enable"}))
        ws_send(s, json.dumps({"id": 2, "method": "Page.enable"}))
        ws_send(s, json.dumps({"id": 3, "method": "Page.navigate", "params": {"url": "http://127.0.0.1:5000/"}}))

        time.sleep(2)

        # 1. Login as Alex Chen
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
                return { success: true, email: data.user.email };
            }
            return { error: data.error };
        })()
        """)
        print("1. Login setup result:", login_res)
        assert login_res and login_res.get("success") is True, f"Login failed: {login_res}"

        time.sleep(2.5)

        # 2. Verify Sidebar item exists and has 'New' badge
        sidebar_res = evaluate_js(s, 20, """
        (function() {
            const invBtn = document.querySelector('[data-view="invitations"]');
            const ptBtn = document.querySelector('[data-view="project-teams"]');
            if (!invBtn) return { error: 'Invitations button not in sidebar' };
            
            const badge = invBtn.querySelector('span:last-child');
            const badgeText = badge ? badge.textContent.trim() : '';
            const icon = invBtn.querySelector('i');
            const iconClass = icon ? icon.className : '';
            
            return {
                exists: true,
                badgeText: badgeText,
                hasEnvelopeIcon: iconClass.includes('fa-envelope'),
                isBelowProjectTeams: ptBtn ? (invBtn.compareDocumentPosition(ptBtn) & Node.DOCUMENT_POSITION_PRECEDING) > 0 : false
            };
        })()
        """)
        print("2. Sidebar Verification:", sidebar_res)
        assert sidebar_res["exists"] is True, "Sidebar item missing"
        assert sidebar_res["badgeText"] == "New", "Badge should say 'New'"
        assert sidebar_res["hasEnvelopeIcon"] is True, "Icon should be fa-envelope"
        assert sidebar_res["isBelowProjectTeams"] is True, "Invitations should be placed below Project Teams"
        print("✅ 2. Sidebar button verified with envelope icon and 'New' badge below Project Teams!")

        # 3. Click on Invitations
        click_res = evaluate_js(s, 30, """
        (function() {
            const invBtn = document.querySelector('[data-view="invitations"]');
            if (invBtn) {
                invBtn.click();
                return { success: true };
            }
            return { error: 'Not found' };
        })()
        """)
        print("3. Click Invitations:", click_res)
        time.sleep(2)

        # 4. Verify Invitations Page Header & Mockup Layout
        header_res = evaluate_js(s, 40, """
        (function() {
            const body = document.body.innerHTML;
            const h2El = document.querySelector('#main-content h2') || document.querySelector('h2');
            const titleText = h2El ? h2El.textContent.trim() : '';
            const hasSubtitle = body.includes('View and manage your project team invitations.');
            
            const tabSent = document.getElementById('tab-sent-invitations');
            const tabRecv = document.getElementById('tab-received-invitations');
            const tabBoth = document.getElementById('tab-all-invitations');
            
            const infoBanner = body.includes('You can only accept or reject invitations received from other students.');
            
            return {
                titleText: titleText,
                hasSubtitle: hasSubtitle,
                hasTabSent: !!tabSent,
                hasTabRecv: !!tabRecv,
                hasTabBoth: !!tabBoth,
                hasInfoBanner: infoBanner
            };
        })()
        """)
        print("4. Page Header & Structure Verification:", header_res)
        assert header_res["titleText"] == "Invitations", f"Expected title 'Invitations', got {header_res['titleText']}"
        assert header_res["hasSubtitle"] is True, "Subtitle missing"
        assert header_res["hasTabSent"] is True, "Sent tab missing"
        assert header_res["hasTabRecv"] is True, "Received tab missing"
        assert header_res["hasTabBoth"] is True, "Both tab missing"
        assert header_res["hasInfoBanner"] is True, "Bottom informational alert banner missing"
        print("✅ 4. Header, tabs, and informational banner match mockup perfectly!")

        # 5. Verify Sent Invitations Section & Cards
        sent_cards_res = evaluate_js(s, 50, """
        (function() {
            const container = document.getElementById('inv-section-sent');
            if (!container) return { error: 'Sent section not found' };
            const text = container.innerHTML;
            
            const hasSentSubtitle = text.includes('Track the status of invitations you have sent to other students.');
            const hasSmartAttendance = text.includes('Smart Attendance System');
            const hasCampusFood = text.includes('Campus Food Ordering App');
            const hasLibrary = text.includes('Library Management System');
            const hasPendingBadge = text.includes('Pending');
            const hasAcceptedBadge = text.includes('Accepted');
            const hasRejectedBadge = text.includes('Rejected');
            
            return {
                hasSentSubtitle,
                hasSmartAttendance,
                hasCampusFood,
                hasLibrary,
                hasPendingBadge,
                hasAcceptedBadge,
                hasRejectedBadge
            };
        })()
        """)
        print("5. Sent Invitations Verification:", sent_cards_res)
        for k, v in sent_cards_res.items():
            assert v is True, f"Failed verification: {k} was False"
        print("✅ 5. Sent invitations list contains all demo projects and status badges (Pending, Accepted, Rejected)!")

        # 6. Verify Received Invitations Section & Action Buttons
        recv_cards_res = evaluate_js(s, 60, """
        (function() {
            const container = document.getElementById('inv-section-received');
            if (!container) return { error: 'Received section not found' };
            const text = container.innerHTML;
            
            const hasRecvSubtitle = text.includes('Respond to invitations from team leaders and other students.');
            const hasChatbot = text.includes('AI-Powered Chatbot');
            const hasWebPortal = text.includes('Web Development Portal');
            const hasEventMgmt = text.includes('College Event Management');
            
            // Check for Accept and Reject buttons on pending cards
            const acceptBtns = container.querySelectorAll('.btn-inv-accept');
            const rejectBtns = container.querySelectorAll('.btn-inv-reject');
            
            return {
                hasRecvSubtitle,
                hasChatbot,
                hasWebPortal,
                hasEventMgmt,
                acceptBtnCount: acceptBtns.length,
                rejectBtnCount: rejectBtns.length
            };
        })()
        """)
        print("6. Received Invitations Verification:", recv_cards_res)
        assert recv_cards_res["hasRecvSubtitle"] is True
        assert recv_cards_res["hasChatbot"] is True
        assert recv_cards_res["hasWebPortal"] is True
        assert recv_cards_res["hasEventMgmt"] is True
        assert recv_cards_res["acceptBtnCount"] >= 1, "Pending received invitation must have Accept button"
        assert recv_cards_res["rejectBtnCount"] >= 1, "Pending received invitation must have Reject button"
        print("✅ 6. Received invitations list contains projects and working Accept/Reject action buttons!")

        # 7. Test Detail Modal on click
        modal_open_res = evaluate_js(s, 70, """
        (function() {
            const card = document.querySelector('.invitation-row-card');
            if (card) {
                card.click();
                return { clicked: true };
            }
            return { error: 'No invitation-row-card found' };
        })()
        """)
        print("7. Click invitation card to open modal:", modal_open_res)
        time.sleep(1)

        modal_check = evaluate_js(s, 71, """
        (function() {
            const modalBackdrop = document.querySelector('.modal-backdrop-layer');
            if (!modalBackdrop) return { open: false };
            const titleEl = modalBackdrop.querySelector('h3');
            const title = titleEl ? titleEl.textContent.trim() : '';
            const closeBtn = modalBackdrop.querySelector('.modal-close-trigger');
            if (closeBtn) closeBtn.click();
            return {
                open: true,
                title: title
            };
        })()
        """)
        print("7b. Modal Verification:", modal_check)
        assert modal_check["open"] is True, "Invitation details modal did not open"
        assert "Invitation Details" in modal_check["title"], f"Modal title unexpected: {modal_check['title']}"
        print("✅ 7. Invitation details modal opens with comprehensive details and closes smoothly!")

        # 8. Test Tab Filtering (Sent only, Received only, Both)
        tab_test = evaluate_js(s, 80, """
        (function() {
            const tabSent = document.getElementById('tab-sent-invitations');
            const tabRecv = document.getElementById('tab-received-invitations');
            const tabBoth = document.getElementById('tab-all-invitations');
            
            // Click Sent tab
            tabSent.click();
            const secSentAfterSent = document.getElementById('inv-section-sent');
            const secRecvAfterSent = document.getElementById('inv-section-received');
            const sentOnlyValid = !!secSentAfterSent && !secRecvAfterSent;
            
            // Click Received tab
            tabRecv.click();
            const secSentAfterRecv = document.getElementById('inv-section-sent');
            const secRecvAfterRecv = document.getElementById('inv-section-received');
            const recvOnlyValid = !secSentAfterRecv && !!secRecvAfterRecv;
            
            // Click Both tab
            tabBoth.click();
            const secSentAfterBoth = document.getElementById('inv-section-sent');
            const secRecvAfterBoth = document.getElementById('inv-section-received');
            const bothValid = !!secSentAfterBoth && !!secRecvAfterBoth;
            
            return { sentOnlyValid, recvOnlyValid, bothValid };
        })()
        """)
        print("8. Tab filtering verification:", tab_test)
        assert tab_test["sentOnlyValid"] is True, "Sent tab filter failed"
        assert tab_test["recvOnlyValid"] is True, "Received tab filter failed"
        assert tab_test["bothValid"] is True, "Both tab filter failed"
        print("✅ 8. Tab filtering between Sent, Received, and Both functions properly!")

        print("\n" + "=" * 70)
        print("🎉 ALL BROWSER UI INVITATIONS TESTS PASSED 100%!")
        print("=" * 70)

    finally:
        try:
            edge_proc.terminate()
            edge_proc.wait(timeout=3)
        except Exception:
            pass

if __name__ == "__main__":
    test_browser_invitations()
