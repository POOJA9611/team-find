/**
 * Socket.IO Real-Time Client Manager for Smart Real-Time Project Team Finder System.
 */

import auth from './auth.js';

class SocketManager {
  constructor() {
    this.socket = null;
    this._isConnected = false;
    this.messageListeners = [];
  }

  init() {
    auth.onChange(({ user, token }) => {
      if (!user || !token) {
        this.disconnect();
      } else {
        this.connect(token, user);
      }
    });
  }

  connect(token, user) {
    if (this.socket) {
      this.socket.disconnect();
    }

    if (typeof io === 'undefined') {
      console.warn('Socket.IO client library not loaded.');
      return;
    }

    this.socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('⚡ Socket connected to server');
      this._isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this._isConnected = false;
    });

    this.socket.on('new_notification', (notification) => {
      console.log('🔔 Received real-time notification:', notification);
      if (
        notification.audience === 'both' ||
        (user.role === 'student' && notification.audience === 'students') ||
        (user.role === 'faculty' && notification.audience === 'faculty') ||
        user.role === 'hod' ||
        notification.target_user_id === user.id
      ) {
        this.showToastNotification(notification);
        // Refresh notifications count in topbar
        window.dispatchEvent(new CustomEvent('portal:refresh-notifications'));
      }
    });

    this.socket.on('receive_message', (msg) => {
      this.messageListeners.forEach((cb) => cb(msg));
    });

    this.socket.on('assignments_updated', () => {
      window.dispatchEvent(new CustomEvent('portal:refresh-view'));
    });

    this.socket.on('change_request_decided', () => {
      window.dispatchEvent(new CustomEvent('portal:refresh-view'));
    });

    this.socket.on('team_created', () => {
      window.dispatchEvent(new CustomEvent('portal:refresh-view'));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._isConnected = false;
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return Boolean(this._isConnected && this.socket && this.socket.connected);
  }

  onNotification(callback) {
    if (this.socket) {
      this.socket.on('new_notification', callback);
    }
  }

  showNotificationToast(notif) {
    return this.showToastNotification(notif);
  }

  onReceiveMessage(callback) {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((cb) => cb !== callback);
    };
  }

  joinGroup(groupId, callback) {
    if (this.socket && this.isConnected()) {
      this.socket.emit('join_group', { groupId: Number(groupId) }, callback);
    }
  }

  leaveGroup(groupId) {
    if (this.socket && this.isConnected()) {
      this.socket.emit('leave_group', { groupId: Number(groupId) });
    }
  }

  sendChatMessage(groupId, body, callback) {
    if (this.socket && this.isConnected()) {
      this.socket.emit('chat_message', { groupId: Number(groupId), body }, callback);
    }
  }

  showToastNotification(notif) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'realtime-notice-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      background-color: #fff;
      border: 2px solid var(--color-primary);
      border-radius: 14px;
      padding: 16px 20px;
      box-shadow: var(--shadow-modal);
      max-width: 380px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      animation: slideIn 0.3s ease;
    `;

    toast.innerHTML = `
      <div style="width: 36px; height: 36px; border-radius: 8px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <i class="fa-solid fa-bullhorn"></i>
      </div>
      <div style="flex: 1;">
        <div style="font-size: 11px; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
          Real-Time Notice
        </div>
        <strong style="font-size: 13px; display: block; color: var(--text-primary); margin-top: 2px;">
          ${notif.title || 'Department Notice'}
        </strong>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 0 0; line-height: 1.3;">
          ${notif.body || ''}
        </p>
      </div>
      <button class="toast-close-btn" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px;">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 8000);
  }
}

export const socketManager = new SocketManager();
export default socketManager;
