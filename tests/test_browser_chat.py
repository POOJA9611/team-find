"""
Automated Verification for Chat View and SocketManager.isConnected fix.
Tests:
- typeof socketManager.isConnected === 'function'
- socketManager.isConnected() returns boolean without throwing TypeError
- Student navigation to Team & Mentor Chat
- Chat channel list loads without 'Failed to load chat channels: socketManager.isConnected is not a function' error
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

def test_chat_bug_fix():
    print("=" * 70)
    print("🌐 RUNNING CHAT VIEW & SOCKETMANAGER.ISCONNECTED VERIFICATION")
    print("=" * 70)

    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    user_data = os.path.abspath("tests/edge_chat_profile")
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
        print("1. Login result:", login_res)
        assert login_res and login_res.get("success") is True

        time.sleep(2.5)

        # 2. Check socketManager directly via ES module import
        socket_check = evaluate_js(s, 20, """
        (async function() {
            const { socketManager } = await import('/static/js/socket.js');
            return {
                exists: !!socketManager,
                typeOfIsConnected: typeof socketManager.isConnected,
                isFunction: typeof socketManager.isConnected === 'function',
                callResult: socketManager.isConnected()
            };
        })()
        """)
        print("2. SocketManager.isConnected inspection:", socket_check)
        assert socket_check["isFunction"] is True, f"Expected isConnected to be function, got {socket_check['typeOfIsConnected']}"
        assert isinstance(socket_check["callResult"], bool), f"Expected boolean, got {type(socket_check['callResult'])}"
        print("✅ 2. Verified socketManager.isConnected is a function and returns a boolean!")

        # 3. Navigate to Student Chat view
        nav_chat = evaluate_js(s, 30, """
        (function() {
            const chatBtn = document.querySelector('[data-view="student-chat"]');
            if (chatBtn) {
                chatBtn.click();
                return { clicked: true };
            }
            return { error: 'Chat button [data-view="student-chat"] not found in sidebar' };
        })()
        """)
        print("3. Navigate to Chat:", nav_chat)
        assert nav_chat.get("clicked") is True, f"Failed to click chat: {nav_chat}"

        time.sleep(2)

        # 4. Verify Chat Page loaded without error
        chat_dom = evaluate_js(s, 40, """
        (function() {
            const body = document.body.innerHTML;
            const hasError = body.includes('Failed to load chat channels: socketManager.isConnected is not a function') ||
                             body.includes('socketManager.isConnected is not a function');
            const hasChatContent = body.includes('Channels') || body.includes('No Chat Channels Available') || body.includes('chat-message');
            const hasLiveBadge = body.includes('LIVE') || body.includes('OFFLINE');
            return {
                hasError: hasError,
                hasChatContent: hasChatContent,
                hasLiveBadge: hasLiveBadge
            };
        })()
        """)
        print("4. Chat DOM verification:", chat_dom)
        assert chat_dom["hasError"] is False, "Error 'socketManager.isConnected is not a function' was found on the page!"
        assert chat_dom["hasChatContent"] is True, "Chat workspace did not render content"
        assert chat_dom["hasLiveBadge"] is True, "Live/Offline badge did not render"
        print("✅ 4. Chat channels loaded cleanly without any socketManager error!")

        print("\n" + "=" * 70)
        print("🎉 CHAT BUG FIX VERIFICATION PASSED 100%!")
        print("=" * 70)

    finally:
        try:
            edge_proc.terminate()
            edge_proc.wait(timeout=3)
        except Exception:
            pass
        # Clean profile directory
        try:
            import shutil
            shutil.rmtree(user_data, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    test_chat_bug_fix()
