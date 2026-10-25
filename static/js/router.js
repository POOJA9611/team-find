import { authState } from './auth.js';
import { openFacultyDetailModal } from './views/modals.js';

// HOD Views
import {
  renderHodDashboard,
  renderHodAssignments,
  renderHodChangeRequests,
  renderHodProjectTeamRequests,
  renderHodDirectory,
  renderHodPostNotification
} from './views/hod_views.js';

// Faculty Views
import {
  renderFacultyDashboard,
  renderFacultyMyStudents,
  renderFacultyTeams,
  renderFacultyProfile
} from './views/faculty_views.js';

// Student Views
import {
  renderStudentDashboard,
  renderStudentProfile,
  renderStudentProjectTeams,
  renderStudentFacultyDirectory,
  renderStudentChangeRequest,
  renderStudentInvitations
} from './views/student_views.js';

// Common Views
import { renderChatView } from './views/chat_view.js';
import { renderNotificationsView } from './views/notifications_view.js';

class Router {
  constructor() {
    this.activeView = 'dashboard';
    this.viewParams = {};
    this.targetChatGroupId = null;
  }

  init() {
    this.renderSidebar();
    this.navigate('dashboard');
  }

  getPageTitle(view) {
    const user = authState.getUser();
    const titles = {
      dashboard: `${user?.role === 'hod' ? 'HOD Executive' : user?.role === 'faculty' ? 'Faculty Mentor' : 'Student'} Dashboard`,
      assignments: 'Faculty Mentorship & Student Workload Assignments',
      'change-requests': 'Faculty Change Requests Inbox',
      directory: 'Department Student & Faculty Directory',
      'post-notification': 'Broadcast Department Notification',
      'my-students': 'Assigned Students & Project Monitoring',
      'faculty-teams': 'Manage Teams & Capstone Formations',
      'faculty-chat': 'Team Group Chat & Mentorship Channels',
      'faculty-profile': 'Faculty Academic Profile & Skills',
      'student-profile': 'Student Portfolio & Academic Projects',
      'project-teams': 'Capstone Project Teams & Collaboration',
      'invitations': 'Project Team Invitations',
      'student-chat': 'My Team & Faculty Mentor Chat',
      'hod-team-requests': 'Project Team Proposals & Mentor Assignment',
      'faculty-directory': 'Browse Department Faculty Mentors',
      'change-request': 'Request Faculty Mentor Change',
      notifications: 'Department Announcements & Deadlines'
    };
    return titles[view] || 'Academic Portal';
  }

  navigate(view, params = {}) {
    this.activeView = view;
    this.viewParams = params;

    const user = authState.getUser();
    if (!user) return;

    // Update Topbar
    const titleEl = document.getElementById('topbar-title');
    const breadcrumbRole = document.getElementById('breadcrumb-role');
    const breadcrumbView = document.getElementById('breadcrumb-view');
    if (titleEl) titleEl.textContent = this.getPageTitle(view);
    if (breadcrumbRole) breadcrumbRole.textContent = user.role;
    if (breadcrumbView) breadcrumbView.textContent = view;

    // Highlight active sidebar item
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
      if (btn.getAttribute('data-view') === view) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Close mobile drawer if open
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.style.display = 'none';

    // Render content into #main-content
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    this.renderActiveView(mainContent);
  }

  navigateToChat(groupId) {
    const user = authState.getUser();
    const targetView = user?.role === 'faculty' ? 'faculty-chat' : 'student-chat';
    this.targetChatGroupId = groupId;
    this.navigate(targetView, { initialGroupId: groupId });
  }

  renderActiveView(container) {
    const user = authState.getUser();
    if (!user) return;

    const onNavigate = (view, params) => this.navigate(view, params);
    const onNavigateToChat = (groupId) => this.navigateToChat(groupId);
    const onOpenFacultyModal = (facultyId) => openFacultyDetailModal(facultyId);
    const viewCtx = {
      navigate: onNavigate,
      onNavigate,
      onNavigateToChat,
      onOpenFacultyModal,
      viewParams: this.viewParams
    };

    // HOD Views
    if (user.role === 'hod') {
      switch (this.activeView) {
        case 'dashboard':
          renderHodDashboard(container, viewCtx);
          break;
        case 'assignments':
          renderHodAssignments(container, viewCtx);
          break;
        case 'change-requests':
          renderHodChangeRequests(container, viewCtx);
          break;
        case 'hod-team-requests':
          renderHodProjectTeamRequests(container, viewCtx);
          break;
        case 'directory':
          renderHodDirectory(container, viewCtx);
          break;
        case 'post-notification':
          renderHodPostNotification(container, viewCtx);
          break;
        case 'notifications':
          renderNotificationsView(container, viewCtx);
          break;
        default:
          renderHodDashboard(container, viewCtx);
          break;
      }
      return;
    }

    // Faculty Views
    if (user.role === 'faculty') {
      switch (this.activeView) {
        case 'dashboard':
          renderFacultyDashboard(container, viewCtx);
          break;
        case 'my-students':
          renderFacultyMyStudents(container, viewCtx);
          break;
        case 'faculty-teams':
          renderFacultyTeams(container, viewCtx);
          break;
        case 'faculty-chat':
          renderChatView(container, {
            initialGroupId: this.targetChatGroupId || this.viewParams.initialGroupId
          });
          break;
        case 'faculty-profile':
          renderFacultyProfile(container, viewCtx);
          break;
        case 'notifications':
          renderNotificationsView(container, viewCtx);
          break;
        default:
          renderFacultyDashboard(container, viewCtx);
          break;
      }
      return;
    }

    // Student Views
    if (user.role === 'student') {
      switch (this.activeView) {
        case 'dashboard':
          renderStudentDashboard(container, viewCtx);
          break;
        case 'student-profile':
          renderStudentProfile(container, viewCtx);
          break;
        case 'project-teams':
          renderStudentProjectTeams(container, viewCtx);
          break;
        case 'invitations':
          renderStudentInvitations(container, viewCtx);
          break;
        case 'student-chat':
          renderChatView(container, {
            initialGroupId: this.targetChatGroupId || this.viewParams.initialGroupId
          });
          break;
        case 'faculty-directory':
          renderStudentFacultyDirectory(container, viewCtx);
          break;
        case 'change-request':
          renderStudentChangeRequest(container, viewCtx);
          break;
        case 'notifications':
          renderNotificationsView(container, viewCtx);
          break;
        default:
          renderStudentDashboard(container, viewCtx);
          break;
      }
      return;
    }
  }

  renderSidebar() {
    const user = authState.getUser();
    const container = document.getElementById('sidebar-nav-container');
    if (!container || !user) return;

    let html = '';

    if (user.role === 'hod') {
      html = `
        <span class="nav-group-label">HOD Governance</span>
        <nav class="sidebar-menu">
          <button class="sidebar-nav-item" data-view="dashboard">
            <i class="fa-solid fa-chart-pie"></i>
            <span>Executive Dashboard</span>
          </button>
          <button class="sidebar-nav-item" data-view="assignments">
            <i class="fa-solid fa-user-plus"></i>
            <span>Assign Students</span>
          </button>
          <button class="sidebar-nav-item" data-view="change-requests">
            <i class="fa-solid fa-inbox"></i>
            <span>Change Requests</span>
          </button>
          <button class="sidebar-nav-item" data-view="hod-team-requests">
            <i class="fa-solid fa-clipboard-check"></i>
            <span>Project Team Requests</span>
          </button>
          <button class="sidebar-nav-item" data-view="directory">
            <i class="fa-solid fa-users"></i>
            <span>Directory (View-Only)</span>
          </button>
          <button class="sidebar-nav-item" data-view="post-notification">
            <i class="fa-solid fa-bullhorn"></i>
            <span>Broadcast Notice</span>
          </button>
        </nav>
      `;
    } else if (user.role === 'faculty') {
      html = `
        <span class="nav-group-label">Faculty Workspace</span>
        <nav class="sidebar-menu">
          <button class="sidebar-nav-item" data-view="dashboard">
            <i class="fa-solid fa-chart-pie"></i>
            <span>Overview</span>
          </button>
          <button class="sidebar-nav-item" data-view="my-students">
            <i class="fa-solid fa-user-graduate"></i>
            <span>My Assigned Students</span>
          </button>
          <button class="sidebar-nav-item" data-view="faculty-teams">
            <i class="fa-solid fa-people-group"></i>
            <span>Capstone Teams</span>
          </button>
          <button class="sidebar-nav-item" data-view="faculty-chat">
            <i class="fa-solid fa-comments"></i>
            <span>Team Group Chats</span>
          </button>
          <button class="sidebar-nav-item" data-view="faculty-profile">
            <i class="fa-solid fa-id-card"></i>
            <span>My Profile & Skills</span>
          </button>
          <button class="sidebar-nav-item" data-view="notifications">
            <i class="fa-regular fa-bell"></i>
            <span>Department Alerts</span>
          </button>
        </nav>
      `;
    } else if (user.role === 'student') {
      html = `
        <span class="nav-group-label">Student Workspace</span>
        <nav class="sidebar-menu">
          <button class="sidebar-nav-item" data-view="dashboard">
            <i class="fa-solid fa-chart-pie"></i>
            <span>Dashboard</span>
          </button>
          <button class="sidebar-nav-item" data-view="student-profile">
            <i class="fa-solid fa-user-astronaut"></i>
            <span>Profile & Projects</span>
          </button>
          <button class="sidebar-nav-item" data-view="project-teams">
            <i class="fa-solid fa-people-group"></i>
            <span>Project Teams</span>
          </button>
          <button class="sidebar-nav-item" data-view="invitations">
            <i class="fa-solid fa-envelope"></i>
            <span>Invitations</span>
            <span class="badge badge-indigo text-xs" style="margin-left: auto; padding: 2px 7px; font-size: 10px; font-weight: 700; border-radius: 10px;">New</span>
          </button>
          <button class="sidebar-nav-item" data-view="student-chat">
            <i class="fa-solid fa-comments"></i>
            <span>Team & Mentor Chat</span>
          </button>
          <button class="sidebar-nav-item" data-view="faculty-directory">
            <i class="fa-solid fa-chalkboard-user"></i>
            <span>Faculty Directory</span>
          </button>
          <button class="sidebar-nav-item" data-view="change-request">
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
            <span>Request Faculty Change</span>
          </button>
          <button class="sidebar-nav-item" data-view="notifications">
            <i class="fa-regular fa-bell"></i>
            <span>Announcements & Deadlines</span>
          </button>
        </nav>
      `;
    }

    container.innerHTML = html;

    // Attach click events
    container.querySelectorAll('.sidebar-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        this.navigate(view);
      });
    });
  }
}

export const router = new Router();
