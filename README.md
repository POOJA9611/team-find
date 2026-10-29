# Student Project Finder & Originality Checker

> **Simple, Functional and Reliable** academic collaboration and project originality checking platform for college students and administrators.
> Built strictly with **HTML5, CSS3, Vanilla JavaScript, Python Flask, and MySQL** (with zero-configuration SQLite local fallback).

---

## 📌 Main Idea & Purpose

College students are required to complete academic projects every year. Before starting a project, students face three major challenges:
1. They don't know whether their project idea has already been created by someone else in the institution.
2. They spend excessive time searching for suitable project ideas and understanding what other students have built.
3. They have difficulty finding suitable teammates with complementary skills.

**Student Project Finder & Originality Checker** solves all three problems in one unified, reliable platform:
- **Check Project Originality**: Instant conceptual comparison against existing projects using Jaccard word-token similarity with clear, honest platform disclaimers.
- **Discover Projects**: Search and filter past and ongoing student projects across domains without exposing source code.
- **Find Teammates**: Mathematical skill-matching formula $(Matched / Required) \times 100$ ranking eligible candidates into Excellent, Good, Partial, and Low matches.
- **Simple Team Workspace**: Lightweight task progress tracking without complicated third-party tooling.

---

## 🛠️ Strict Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Semantic markup, custom responsive CSS (Deep Indigo & Charcoal theme), vanilla DOM manipulation. **Zero external UI frameworks** (no React, Angular, Vue, Bootstrap, or Tailwind). |
| **Backend** | Python Flask (Jinja2) | Multi-page server-rendered application with session-based authentication, CSRF validation, and parameterized database queries. |
| **Database** | MySQL 8.0+ / SQLite3 | Normalized relational database using MySQL syntax (`schema.sql`). Automatically activates local SQLite (`student_project_finder.sqlite`) if MySQL is inactive. |

---

## 👥 System Roles & Approval Rules

The platform enforces exactly **two** global system roles:

### 1. Student
- **Registration**: Submits account request; starts with `status = 'pending'`. Cannot log in until approved.
- **Profile**: Manages academic details (Department, Semester, Section, Bio, Interests) and individual skills.
- **Projects**: Creates and manages projects (Title, Domain, Description, Problem Statement, Solution, Required Skills, Team Capacity).
- **Find Teammates**: Project owners find candidates matched by skill overlap and send invitations.
- **Invitations**: Students accept or reject invitations on their dashboard.
- **Workspace**: Project members track task progress (`to_do`, `in_progress`, `completed`).
- **Originality Checker**: Checks proposed project concepts against stored database records.

### 2. Admin
- **Protected Setup**: Initial Admin account created securely via CLI (`python seed_admin.py`). Public admin registration is disabled.
- **Account Governance**: Reviews pending student requests; approves or declines accounts.
- **Student Directory**: Inspects registered students, departments, and skill counts.
- **Platform Analytics**: Views total student counts, active projects, and workspace tasks.

> **Academic Integrity & Privacy Rule**: Faculty approval is completely omitted. There is **zero source code exposure** or code download capability anywhere on the platform.

---

## 📊 Mathematical Algorithms

### 1. Teammate Skill Matching Formula
For a given project requiring distinct technical skills:

$$\text{Match Percentage} = \text{round}\left( \frac{\text{Distinct Matched Required Skills}}{\text{Total Distinct Required Skills}} \times 100 \right)$$

#### Match Categories:
- **80% – 100%**: Excellent Match (`badge-excellent`)
- **60% – 79%**: Good Match (`badge-good`)
- **40% – 59%**: Partial Match (`badge-partial`)
- **Below 40%**: Low Match (`badge-low`)

*Exclusions: The project owner, existing team members, and students with pending invitations are automatically excluded from the candidate roster.*

### 2. Idea Originality Checker Formula
Uses Jaccard text similarity on unique normalized non-stopword word tokens between the proposed concept and each stored project:

$$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

- **High Similarity ($\ge 70\%$)**: Similar project already exists. Displays matched project, category, creator, and year.
- **Moderate Similarity ($40\% - 69\%$)**: Notable conceptual overlap found.
- **Low Similarity ($< 40\%$)**: No similar project found in our database.

> **Honest Scope Notice**: The system explicitly clarifies: *"This originality check compares only records stored within this application's project repository. It is not an internet-wide plagiarism detector and cannot prove global originality or plagiarism."*

---

## 🗄️ Database Architecture

Stored skills are completely normalized into separate rows:
- `users`: Core login credentials (`email`, `password_hash`, `role`, `status`, `created_at`).
- `student_profiles`: Academic details (`department`, `semester`, `section`, `bio`, `interests`).
- `student_skills`: Individual student skills as related records (`user_id`, `skill_name`).
- `projects`: Student-created projects (`owner_id`, `title`, `domain`, `description`, `max_members`, `status`).
- `project_required_skills`: Individual project requirements as related records (`project_id`, `skill_name`).
- `team_members`: Membership and roles (`project_id`, `student_id`, `role`).
- `invitations`: Teammate requests (`project_id`, `sender_id`, `recipient_id`, `message`, `status`).
- `project_applications`: Student applications to join projects (`project_id`, `applicant_id`, `owner_id`, `message`, `status`).
- `project_originality_checks`: Automated and manual similarity check records (`project_id`, `trigger_event`, `highest_similarity`, `closest_project_id`).
- `notifications`: User notifications (`user_id`, `message`, `is_read`).
- `tasks`: Team task progress (`project_id`, `title`, `description`, `assigned_to`, `status`, `created_by`).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+ installed
- Windows PowerShell or Command Prompt

### 2. Installation
Open a terminal in the project directory:
```bash
cd c:\Users\KITS\Desktop\pooja
python -m pip install -r requirements.txt
```

### 3. Initialize Admin & Demo Data
Create the initial Administrator account:
```bash
python seed_admin.py
```
*Default Admin Credentials:* `admin@college.edu` / `AdminSecure@2026`

Populate sample students, projects, and tasks for visual evaluation:
```bash
python seed_demo.py
```
*Pre-configured Demo Accounts:*
- **Alex Chen** (CS / ML): `alex@student.edu` / `Student@2026`
- **Maya Patel** (IT / Frontend): `maya@student.edu` / `Student@2026`
- **Liam Davis** (Data Science / PyTorch): `liam@student.edu` / `Student@2026`
- **Pooja Sharma** (CS / Full-Stack): `pooja@student.edu` / `Student@2026`
- **John Pending** (Pending Admin Approval): `john.pending@student.edu` / `Student@2026`

### 4. Run the Application
```bash
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🧪 Automated Integration Testing

Run the full end-to-end test suite covering all 11 modules:
```bash
python -m unittest tests/test_simple_reliable_app.py -v
```
All 10 integration tests execute with zero failures and zero errors:
1. `test_01_registration_pending_and_admin_approval`: Verifies pending status on registration, login rejection prior to approval, admin approval workflow, and student login activation.
2. `test_02_role_based_access`: Enforces strict student and admin route boundary guards.
3. `test_03_profile_and_individual_skills`: Verifies individual skill row insertions and deletions in `student_skills`.
4. `test_04_project_lifecycle`: Tests project creation, normalized required skills insertion, owner team assignment, and project editing.
5. `test_05_explore_projects`: Verifies project browsing, domain filtering, keyword search, and absence of code downloads.
6. `test_06_find_teammates_math_and_permissions`: Tests ownership restriction, candidate match percentage calculation $(Matched/Required) \times 100$, and candidate roster exclusion.
7. `test_07_invitation_send_and_accept`: Tests invitation creation, duplicate invitation prevention, dashboard notification, and team acceptance.
8. `test_08_workspace_and_tasks`: Verifies workspace member access, task creation, member assignment, status transition, and progress percentage.
9. `test_09_originality_checker`: Verifies Jaccard token similarity calculation, high similarity detection against existing project, novel idea response, and platform disclaimer.
10. `test_10_admin_dashboard`: Verifies platform metrics, pending request approvals, and approved student directory.
11. `test_11_student_applications`: Tests student applications to open projects, duplicate prevention, and owner review/decision workflow.
12. `test_12_automatic_team_formation_originality_check`: Verifies automatic Jaccard originality check trigger when project team reaches capacity.
13. `test_13_invitation_module_pages_and_filters`: Tests Sent and Received invitation pages with Pending, Accepted, and Rejected filters.
14. `test_14_explore_recommendations_creator_profile_and_apply`: Tests skill-based recommendation sorting, public creator profile viewing, and project application.
15. `test_15_registration_status_workflow_and_notifications`: Tests student registration status tracking (`/check-status`), login blocking for pending/rejected accounts, and admin status governance.

---

## 🎨 Color Palette & UI Guidelines

| Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| Primary Dark | `#29265B` | Brand identity, headers, main actions |
| Accent Purple | `#49459A` | Gradients, secondary buttons, active highlights |
| Background | `#F7F8FC` | Soft off-white clean application canvas |
| Surface / Cards | `#FFFFFF` | Form containers, candidate and project cards |
| Text Main | `#202238` | Headings and high-contrast body typography |
| Text Secondary| `#70748A` | Subtitles, meta tags, and descriptions |
| Border | `#E5E7EF` | Clean structural dividers |
| Success | `#27845B` | Excellent match badges, approved alerts |
| Warning | `#B7791F` | Pending approvals, partial matches |
| Error | `#C24141` | High originality alerts, rejection actions |
