import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from flask import Flask, jsonify, send_from_directory, render_template, request
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv

load_dotenv()

from backend.database import initialize_database
from backend.sockets.socket_handler import setup_socket_events
from backend.routes.auth_routes import auth_bp
from backend.routes.hod_routes import hod_bp
from backend.routes.faculty_routes import faculty_bp
from backend.routes.student_routes import student_bp
from backend.routes.teams_routes import teams_bp
from backend.routes.chat_routes import chat_bp
from backend.routes.notifications_routes import notifications_bp

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)

app.config["SECRET_KEY"] = os.getenv("JWT_SECRET", "supersecret_college_portal_jwt_token_key_2026!")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5MB upload limit

# CORS
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Socket.IO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
app.extensions["socketio"] = socketio
setup_socket_events(socketio)

# Security headers
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Uploads directory
base_dir = os.path.dirname(os.path.abspath(__file__))
uploads_dir = os.path.join(base_dir, "uploads")
avatars_dir = os.path.join(uploads_dir, "avatars")
os.makedirs(avatars_dir, exist_ok=True)

@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(uploads_dir, filename)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(hod_bp, url_prefix="/api/hod")
app.register_blueprint(faculty_bp, url_prefix="/api/faculty")
app.register_blueprint(student_bp, url_prefix="/api/student")
app.register_blueprint(teams_bp, url_prefix="/api/teams")
app.register_blueprint(chat_bp, url_prefix="/api/chat")
app.register_blueprint(notifications_bp, url_prefix="/api/notifications")

# Health Check
@app.route("/api/health")
def health_check():
    import datetime
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "service": "Project Guidance & Team Portal API (Python Flask + MySQL/SQLite)"
    })

# Frontend SPA routes
@app.route("/")
@app.route("/<path:path>")
def index(path=""):
    if path.startswith("api/") or path.startswith("uploads/"):
        return jsonify({"error": "Resource not found"}), 404
    return render_template("index.html")

# Global error handlers
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "API route not found"}), 404
    return render_template("index.html")

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

PORT = int(os.getenv("PORT", 5000))

if __name__ == "__main__":
    print(f"🚀 Initializing College Portal Database...")
    initialize_database()
    
    # Auto-seed initial demo accounts and HOD if not already seeded
    try:
        from backend.demo_seed import seed_demo_data
        seed_demo_data()
    except Exception as seed_err:
        print(f"ℹ️ Seed check note: {seed_err}")

    print(f"🚀 College Portal Backend running on http://localhost:{PORT}")
    print(f"📡 Socket.IO listening for real-time events")
    socketio.run(app, host="0.0.0.0", port=PORT, debug=False, allow_unsafe_werkzeug=True)
