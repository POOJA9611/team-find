import os
import sys

# Ensure project root is in Python sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app import app

def test_frontend_routes():
    client = app.test_client()

    print("\n🔍 ========================================================")
    print("🔍 TESTING FRONTEND ROUTES, STATIC ASSETS & SPA FALLBACK")
    print("🔍 ========================================================\n")

    # 1. Main SPA index HTML
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200 for /, got {res.status_code}"
    html = res.data.decode("utf-8")
    assert "Project Guidance & Team Portal" in html, "Page title missing in index.html"
    assert "static/js/app.js" in html, "Script static/js/app.js missing in index.html"
    assert "id=\"portal-shell\"" in html, "portal-shell container missing"
    assert "id=\"auth-container\"" in html, "auth-container missing"
    print("  ✅ 1. GET / returns 200 and loads SPA template successfully")

    # 2. Static CSS files
    css_files = ["style.css", "components.css", "responsive.css"]
    for css in css_files:
        res = client.get(f"/static/css/{css}")
        assert res.status_code == 200, f"Expected 200 for {css}, got {res.status_code}"
        print(f"  ✅ 2. GET /static/css/{css} returns 200 (Length: {len(res.data)} bytes)")

    # 3. Static JS modules
    js_modules = [
        "app.js",
        "router.js",
        "api.js",
        "auth.js",
        "socket.js",
        "views/auth_views.js",
        "views/hod_views.js",
        "views/faculty_views.js",
        "views/student_views.js",
        "views/chat_view.js",
        "views/notifications_view.js",
        "views/modals.js"
    ]
    for js in js_modules:
        res = client.get(f"/static/js/{js}")
        assert res.status_code == 200, f"Expected 200 for {js}, got {res.status_code}"
        print(f"  ✅ 3. GET /static/js/{js} returns 200 (Length: {len(res.data)} bytes)")

    # 4. API health endpoint
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200 for /api/health, got {res.status_code}"
    data = res.get_json()
    assert data.get("status") in ["ok", "healthy"], f"Expected healthy status, got {data}"
    print(f"  ✅ 4. GET /api/health returns 200: {data}")

    # 5. SPA Fallback routing
    spa_routes = ["/dashboard", "/assignments", "/my-students", "/project-teams", "/invitations"]
    for route in spa_routes:
        res = client.get(route)
        assert res.status_code == 200, f"Expected 200 for SPA route {route}, got {res.status_code}"
        assert "Project Guidance & Team Portal" in res.data.decode("utf-8"), f"SPA fallback failed for {route}"
        print(f"  ✅ 5. SPA Route {route} correctly returns index.html")

    print("\n🎉 ========================================================")
    print("🎉 ALL FRONTEND & STATIC ASSET ROUTE TESTS PASSED!")
    print("🎉 ========================================================\n")

if __name__ == "__main__":
    test_frontend_routes()
