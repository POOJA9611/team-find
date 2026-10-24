import api from './api.js';
import { authState } from './auth.js';
import { socketManager } from './socket.js';
import { router } from './router.js';
import { renderLoginView, renderSignupView } from './views/auth_views.js';

let authScreenMode = 'login'; // 'login' or 'signup'
let topbarNotifications = [];
let topbarUnreadCount = 0;

async function bootstrapApp() {
  const loadingScreen = document.getElementById('loading-screen');
  const authContainer = document.getElementById('auth-container');
  const portalShell = document.getElementById('portal-shell');

  try {
    // Register Auth Listener
    authState.subscribe(async (user) => {
      try {
        if (!user) {
          // Disconnect socket if connected
          socketManager.disconnect();

          // Show unauthenticated screen
          portalShell.style.display = 'none';
          authContainer.style.display = 'block';
          renderAuthScreen();
        } else {
          // Show authenticated portal shell
          authContainer.style.display = 'none';
          portalShell.style.display = 'flex';

          // Update User Profile In UI
          updateUserUI(user);

          // Connect Socket.IO
          socketManager.connect(authState.getToken());

          // Setup Socket notification toast callback
          socketManager.onNotification((notif) => {
            socketManager.showNotificationToast(notif);
            fetchTopbarNotifications();
          });

          // Render Sidebar & navigate to default view
          router.init();

          // Fetch Topbar notifications
          fetchTopbarNotifications();
        }
      } catch (authErr) {
        console.error('Auth state transition error:', authErr);
      } finally {
        // Always hide initial loading screen
        if (loadingScreen) {
          loadingScreen.style.display = 'none';
        }
      }
    });

    // Setup Global Topbar Controls
    setupTopbarInteractions();

    // Listen for custom notifications updated event from pages
    window.addEventListener('notifications-updated', () => {
      fetchTopbarNotifications();
    });

    // Initialize auth state (checks localStorage and validates token)
    await authState.init();
  } catch (err) {
    console.error('Fatal bootstrap error:', err);
  } finally {
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  }
}

function renderAuthScreen() {
  const container = document.getElementById('auth-container');
  if (!container) return;

  if (authScreenMode === 'signup') {
    renderSignupView(container, {
      onGoToLogin: () => {
        authScreenMode = 'login';
        renderAuthScreen();
      },
      onSignupSuccess: () => {
        // Auth state automatically triggers subscription
      }
    });
  } else {
    renderLoginView(container, {
      onGoToSignup: () => {
        authScreenMode = 'signup';
        renderAuthScreen();
      },
      onLoginSuccess: () => {
        // Auth state automatically triggers subscription
      }
    });
  }
}

function updateUserUI(user) {
  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
  const avatarUrl = user.avatar || defaultAvatar;

  // Sidebar User Info
  const sidebarAvatar = document.getElementById('sidebar-user-avatar');
  const sidebarName = document.getElementById('sidebar-user-name');
  const sidebarRole = document.getElementById('sidebar-user-role');
  if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
  if (sidebarName) sidebarName.textContent = user.name;
  if (sidebarRole) sidebarRole.textContent = user.role === 'hod' ? 'Head of Department' : user.role;

  // Topbar User Info
  const topbarAvatar = document.getElementById('topbar-user-avatar');
  const topbarName = document.getElementById('topbar-user-name');
  const topbarRole = document.getElementById('topbar-user-role');
  if (topbarAvatar) topbarAvatar.src = avatarUrl;
  if (topbarName) topbarName.textContent = user.name;
  if (topbarRole) topbarRole.textContent = user.role;

  // Dropdown Info
  const dropdownName = document.getElementById('dropdown-user-name');
  const dropdownEmail = document.getElementById('dropdown-user-email');
  if (dropdownName) dropdownName.textContent = user.name;
  if (dropdownEmail) dropdownEmail.textContent = user.email;

  // Quick Demo Selector
  const roleSelect = document.getElementById('topbar-role-select');
  if (roleSelect) {
    roleSelect.value = user.role;
  }
}

async function fetchTopbarNotifications() {
  const user = authState.getUser();
  if (!user) return;

  try {
    const data = await api.getNotifications();
    topbarNotifications = data.notifications || [];
    topbarUnreadCount = data.unreadCount || 0;
    renderTopbarNotificationsDropdown();
  } catch (err) {
    console.error('Failed to fetch topbar notifications:', err);
  }
}

function renderTopbarNotificationsDropdown() {
  const badge = document.getElementById('topbar-notif-badge');
  const subtitle = document.getElementById('topbar-notif-subtitle');
  const markAllBtn = document.getElementById('btn-topbar-mark-all-read');
  const itemsContainer = document.getElementById('topbar-notif-items');

  if (badge) {
    if (topbarUnreadCount > 0) {
      badge.textContent = topbarUnreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  if (subtitle) {
    subtitle.textContent = `${topbarUnreadCount} unread alert(s)`;
  }

  if (markAllBtn) {
    markAllBtn.style.display = topbarUnreadCount > 0 ? 'inline-block' : 'none';
  }

  if (itemsContainer) {
    if (topbarNotifications.length === 0) {
      itemsContainer.innerHTML = '<div class="p-4 text-center text-xs text-muted">No notifications yet.</div>';
    } else {
      itemsContainer.innerHTML = topbarNotifications.slice(0, 5).map(n => `
        <div
          class="notif-item ${!n.is_read ? 'unread' : ''}"
          data-id="${n.id}"
          style="cursor: pointer; padding: 10px 14px; border-bottom: 1px solid var(--border-light);"
        >
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="font-size: 12px; color: var(--text-primary);">${escapeHtml(n.title)}</strong>
            <span class="badge badge-indigo text-xs" style="text-transform: capitalize;">${escapeHtml(n.audience)}</span>
          </div>
          <p style="font-size: 11px; color: var(--text-secondary); margin: 4px 0 0 0; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${escapeHtml(n.body)}
          </p>
          ${n.deadline ? `
            <div style="font-size: 10px; color: var(--color-amber); font-weight: 600; margin-top: 4px;">
              <i class="fa-regular fa-clock mr-1"></i> Due: ${new Date(n.deadline).toLocaleDateString()}
            </div>
          ` : ''}
        </div>
      `).join('');

      itemsContainer.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', async () => {
          const id = Number(item.getAttribute('data-id'));
          try {
            await api.markNotificationRead(id);
            topbarUnreadCount = Math.max(0, topbarUnreadCount - 1);
            const n = topbarNotifications.find(x => x.id === id);
            if (n) n.is_read = 1;
            renderTopbarNotificationsDropdown();
          } catch (e) {
            console.error('Error marking notif read:', e);
          }
          const menu = document.getElementById('topbar-notif-menu');
          if (menu) menu.style.display = 'none';
          router.navigate('notifications');
        });
      });
    }
  }
}

function setupTopbarInteractions() {
  // Mobile Nav Drawer Toggle
  const btnToggle = document.getElementById('btn-toggle-mobile-nav');
  const sidebar = document.getElementById('main-sidebar');
  const overlay = document.getElementById('mobile-overlay');

  if (btnToggle && sidebar && overlay) {
    btnToggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('mobile-open');
      overlay.style.display = isOpen ? 'block' : 'none';
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.style.display = 'none';
    });
  }

  // Quick Demo Persona Switcher
  const roleSelect = document.getElementById('topbar-role-select');
  if (roleSelect) {
    roleSelect.addEventListener('change', async (e) => {
      const selectedRole = e.target.value;
      try {
        await authState.switchDemoAccount(selectedRole);
      } catch (err) {
        alert('Could not switch demo persona: ' + err.message);
      }
    });
  }

  // Notifications Dropdown Toggle
  const notifBtn = document.getElementById('btn-topbar-notif');
  const notifMenu = document.getElementById('topbar-notif-menu');
  if (notifBtn && notifMenu) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = notifMenu.style.display === 'block';
      closeAllDropdowns();
      if (!isVisible) {
        notifMenu.style.display = 'block';
      }
    });
  }

  // Mark all notifications read in dropdown
  const markAllBtn = document.getElementById('btn-topbar-mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await api.markAllNotificationsRead();
        topbarNotifications.forEach(n => n.is_read = 1);
        topbarUnreadCount = 0;
        renderTopbarNotificationsDropdown();
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (err) {
        console.error('Failed to mark all notifications read:', err);
      }
    });
  }

  // View All Notifications from Dropdown
  const viewAllBtn = document.getElementById('btn-topbar-view-all-notifs');
  if (viewAllBtn && notifMenu) {
    viewAllBtn.addEventListener('click', () => {
      notifMenu.style.display = 'none';
      router.navigate('notifications');
    });
  }

  // User Profile Dropdown Toggle
  const profileBtn = document.getElementById('btn-topbar-profile');
  const profileMenu = document.getElementById('topbar-profile-dropdown');
  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = profileMenu.style.display === 'block';
      closeAllDropdowns();
      if (!isVisible) {
        profileMenu.style.display = 'block';
      }
    });
  }

  // Sign out buttons
  const sidebarSignout = document.getElementById('btn-sidebar-signout');
  const dropdownSignout = document.getElementById('btn-dropdown-signout');
  const doLogout = () => {
    closeAllDropdowns();
    authState.logout();
  };

  if (sidebarSignout) sidebarSignout.addEventListener('click', doLogout);
  if (dropdownSignout) dropdownSignout.addEventListener('click', doLogout);

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    closeAllDropdowns();
  });
}

function closeAllDropdowns() {
  const notifMenu = document.getElementById('topbar-notif-menu');
  const profileMenu = document.getElementById('topbar-profile-dropdown');
  if (notifMenu) notifMenu.style.display = 'none';
  if (profileMenu) profileMenu.style.display = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', bootstrapApp);
