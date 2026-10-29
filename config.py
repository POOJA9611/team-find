import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "student_finder_super_secret_key_2026")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # MySQL Configuration
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB = os.getenv("MYSQL_DB") or os.getenv("MYSQL_DATABASE") or "student_project_finder"

    # Local SQLite Fallback Configuration
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SQLITE_PATH = os.path.join(BASE_DIR, "student_project_finder.sqlite")

    # External Web Search Configuration (Section 7)
    EXTERNAL_SEARCH_API_KEY = os.getenv("EXTERNAL_SEARCH_API_KEY", "")
    EXTERNAL_SEARCH_PROVIDER = os.getenv("EXTERNAL_SEARCH_PROVIDER", "github_public")
