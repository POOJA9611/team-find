import os
import sys
import socket
import json
import urllib.request
import time
import subprocess
import base64
import struct

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
    t_end = time.time() + 4
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

def run_tests():
    server_proc = subprocess.Popen([sys.executable, "app.py"])
    for _ in range(20):
        time.sleep(0.5)
        try:
            if urllib.request.urlopen("http://127.0.0.1:5000/api/health").status == 200:
                break
        except Exception:
            pass

    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    user_data = os.path.abspath("tests/edge_test_profile")
    edge_proc = subprocess.Popen([
        edge_path,
        "--headless=new",
        f"--user-data-dir={user_data}",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "about:blank"
    ])

    try:
        time.sleep(2)
        req = urllib.request.Request("http://127.0.0.1:9222/json/new", method="PUT")
        tab = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        ws_url = tab["webSocketDebuggerUrl"]
        s = ws_connect(ws_url)
        s.settimeout(0.5)

        ws_send(s, json.dumps({"id": 1, "method": "Runtime.enable"}))
        ws_send(s, json.dumps({"id": 2, "method": "Page.enable"}))
        ws_send(s, json.dumps({"id": 3, "method": "Page.navigate", "params": {"url": "http://127.0.0.1:5000/"}}))

        time.sleep(2)

        print("\n=== 1. TEST QUICK DEMO BUTTONS ===")
        res_hod = evaluate_js(s, 10, """
        (function() {
            var b = document.getElementById('btn-fill-hod');
            if (!b) return { error: 'No HOD button' };
            b.click();
            return {
                email: document.getElementById('login-email').value,
                pw: document.getElementById('login-password').value
            };
        })()
        """)
        print("Click HOD result:", res_hod)
        assert res_hod["email"] == "hod.cs@college.edu", "HOD email fill failed!"

        res_fac = evaluate_js(s, 11, """
        (function() {
            var b = document.getElementById('btn-fill-fac');
            b.click();
            return { email: document.getElementById('login-email').value };
        })()
        """)
        print("Click Faculty result:", res_fac)
        assert res_fac["email"] == "sarah.jenkins@college.edu", "Faculty email fill failed!"

        print("\n=== 2. TEST CLICK CREATE AN ACCOUNT ===")
        res_signup = evaluate_js(s, 20, """
        (function() {
            var btn = document.getElementById('link-go-to-signup');
            if (!btn) return { error: 'No signup link' };
            btn.click();
            return {
                hasSignupForm: !!document.getElementById('signup-form'),
                hasStudentTab: !!document.getElementById('role-tab-student'),
                hasFacultyTab: !!document.getElementById('role-tab-faculty')
            };
        })()
        """)
        print("Click Create Account result:", res_signup)
        assert res_signup["hasSignupForm"], "Create an account did not open signup form!"

        print("\n=== 3. TEST ROLE TABS IN SIGNUP ===")
        res_tabs = evaluate_js(s, 30, """
        (function() {
            var facTab = document.getElementById('role-tab-faculty');
            facTab.click();
            return {
                hasDesignation: !!document.getElementById('signup-designation'),
                hasSubjects: !!document.getElementById('signup-subjects')
            };
        })()
        """)
        print("Switch to Faculty Tab result:", res_tabs)
        assert res_tabs["hasDesignation"], "Faculty tab switch failed!"

        print("\n=== 4. TEST BACK TO SIGN IN FROM SIGNUP ===")
        res_back_login = evaluate_js(s, 40, """
        (function() {
            var btn = document.getElementById('link-go-to-login');
            btn.click();
            return {
                hasLoginForm: !!document.getElementById('login-form')
            };
        })()
        """)
        print("Back to Login result:", res_back_login)
        assert res_back_login["hasLoginForm"], "Back to login failed!"

        print("\n=== 5. TEST FORGOT PASSWORD BUTTON ===")
        res_forgot = evaluate_js(s, 50, """
        (function() {
            var btn = document.getElementById('link-go-to-forgot');
            if (!btn) return { error: 'No forgot link' };
            btn.click();
            return {
                hasForgotForm: !!document.getElementById('forgot-form'),
                hasEmailInput: !!document.getElementById('forgot-email')
            };
        })()
        """)
        print("Click Forgot Password result:", res_forgot)
        assert res_forgot["hasForgotForm"], "Forgot Password did not open forgot form!"

        print("\n=== 6. TEST BACK TO SIGN IN FROM FORGOT PASSWORD ===")
        res_forgot_back = evaluate_js(s, 60, """
        (function() {
            var btn = document.getElementById('link-forgot-to-login');
            btn.click();
            return {
                hasLoginForm: !!document.getElementById('login-form')
            };
        })()
        """)
        print("Back to Login result:", res_forgot_back)
        assert res_forgot_back["hasLoginForm"], "Back to login from forgot failed!"

        print("\n=== 7. TEST LOGIN & DASHBOARD REDIRECT ===")
        res_login_submit = evaluate_js(s, 70, """
        (async function() {
            document.getElementById('btn-fill-hod').click();
            document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
            await new Promise(r => setTimeout(r, 1500));
            return {
                portalShellDisplay: document.getElementById('portal-shell').style.display,
                authContainerDisplay: document.getElementById('auth-container').style.display,
                userName: document.getElementById('sidebar-user-name').textContent,
                sidebarItemsCount: document.querySelectorAll('.sidebar-nav-item').length
            };
        })()
        """)
        print("Login submit result:", res_login_submit)
        assert res_login_submit["portalShellDisplay"] == "flex", "Portal shell did not display after login!"
        assert len(res_login_submit["userName"]) > 0, "User name missing!"

        print("\n[SUCCESS] ALL BROWSER BUTTON INTERACTION TESTS PASSED PERFECTLY!")

    finally:
        try: edge_proc.terminate()
        except: pass
        try: server_proc.terminate()
        except: pass

if __name__ == "__main__":
    run_tests()
