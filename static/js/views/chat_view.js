import api from '../api.js';
import { socketManager } from '../socket.js';
import { authState } from '../auth.js';
import { openFacultyDetailModal } from './modals.js';

let activeGroupId = null;
let currentGroups = [];
let currentMessages = [];
let chatSocketCleanup = null;

export async function renderChatView(container, options = {}) {
  const user = authState.getUser();
  const initialGroupId = options.initialGroupId || null;

  container.innerHTML = `
    <div class="p-8 text-center" id="chat-loading-spinner">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i>
    </div>
  `;

  try {
    const data = await api.getChatGroups();
    currentGroups = data.groups || [];

    if (currentGroups.length === 0) {
      container.innerHTML = `
        <div class="card text-center p-12">
          <div style="font-size: 48px; color: var(--color-primary); margin-bottom: 16px;">
            <i class="fa-solid fa-comments"></i>
          </div>
          <h3 style="font-size: 18px; fontWeight: 800; margin-bottom: 8px;">
            No Chat Channels Available
          </h3>
          <p style="color: var(--text-secondary); max-width: 460px; margin: 0 auto 16px auto;">
            ${user.role === 'faculty'
              ? 'Form a new capstone team in the "Capstone Teams" tab to automatically initialize your team group chat channel.'
              : 'You will automatically gain access to your team chat once your faculty mentor forms your project team.'}
          </p>
        </div>
      `;
      return;
    }

    // Determine initial active group
    if (initialGroupId) {
      const match = currentGroups.find(g => g.id === Number(initialGroupId));
      activeGroupId = match ? match.id : currentGroups[0].id;
    } else if (!activeGroupId || !currentGroups.some(g => g.id === activeGroupId)) {
      activeGroupId = currentGroups[0].id;
    }

    renderWorkspace(container);
  } catch (err) {
    console.error('Failed to load chat channels:', err);
    container.innerHTML = `
      <div class="card p-6 text-center text-danger">
        <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
        <p>Failed to load chat channels: ${err.message}</p>
      </div>
    `;
  }
}

function renderWorkspace(container) {
  const activeGroup = currentGroups.find(g => g.id === activeGroupId) || currentGroups[0];
  const isConnected = typeof socketManager?.isConnected === 'function' ? socketManager.isConnected() : Boolean(socketManager?.isConnected);

  container.innerHTML = `
    <div
      class="card"
      style="padding: 0; height: 75vh; display: grid; grid-template-columns: 300px 1fr 240px; overflow: hidden; border-radius: 20px;"
    >
      <!-- 1. Groups Sidebar -->
      <div style="border-right: 1px solid var(--border-color); background-color: #FAF5FF; display: flex; flex-direction: column;">
        <div style="padding: 16px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 14px; font-weight: 800; color: var(--text-primary);">
            <i class="fa-solid fa-comments text-indigo mr-2"></i> Chat Channels
          </div>
          <span
            id="chat-live-badge"
            style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px; background-color: ${isConnected ? '#DCFCE7' : '#FEE2E2'}; color: ${isConnected ? '#16A34A' : '#DC2626'};"
          >
            ${isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        <div style="flex: 1; overflow-y: auto;" id="chat-channels-list">
          ${currentGroups.map(g => `
            <div
              class="chat-group-item"
              data-group-id="${g.id}"
              style="padding: 14px 16px; border-bottom: 1px solid var(--border-light); background-color: ${g.id === activeGroup.id ? '#EDE9FE' : 'transparent'}; border-left: ${g.id === activeGroup.id ? '4px solid var(--color-primary)' : '4px solid transparent'}; cursor: pointer; transition: all 0.15s;"
            >
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <strong style="font-size: 13px; color: var(--text-primary);">${g.name}</strong>
                ${g.last_message_time ? `
                  <span style="font-size: 10px; color: var(--text-muted);">
                    ${new Date(g.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ` : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">
                <i class="fa-solid fa-graduation-cap mr-1"></i> Guide: ${g.faculty_name || 'Awaiting Allocation'}
              </div>
              ${g.last_message ? `
                <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(g.last_message)}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. Messages Main Thread -->
      <div style="display: flex; flex-direction: column; background-color: #FFFFFF;">
        <!-- Header -->
        <div style="padding: 14px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; background-color: #fff;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; margin: 0; color: var(--text-primary);">
              ${escapeHtml(activeGroup.name)}
            </h3>
            <span style="font-size: 11px; color: var(--text-secondary);">
              Mentor: <strong>${escapeHtml(activeGroup.faculty_name || 'Awaiting HOD Allocation')}</strong> • Real-time encrypted channel
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-indigo text-xs">
              <i class="fa-solid fa-users mr-1"></i> ${activeGroup.member_count || (activeGroup.members ? activeGroup.members.length : 1)} members
            </span>
          </div>
        </div>

        <!-- Chat Error Banner -->
        <div id="chat-error-banner" style="display: none; padding: 8px 16px; background-color: #FEE2E2; color: #DC2626; font-size: 12px; font-weight: 600;"></div>

        <!-- Messages Area -->
        <div id="messages-container" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px;">
          <div class="text-center text-muted" style="margin: auto;">
            <i class="fa-solid fa-spinner fa-spin text-xl text-indigo"></i>
          </div>
        </div>

        <!-- Input Bar -->
        <form id="chat-send-form" style="padding: 14px 18px; border-top: 1px solid var(--border-color); background-color: #FAF5FF; display: flex; gap: 10px;">
          <input
            id="chat-message-input"
            type="text"
            placeholder="Message ${escapeHtml(activeGroup.name)}..."
            style="flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 13px; outline: none; background-color: #fff;"
          />
          <button
            id="chat-send-btn"
            type="submit"
            style="background-color: var(--color-primary); color: #fff; border: none; border-radius: 10px; padding: 0 20px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px;"
          >
            <i class="fa-solid fa-paper-plane"></i> Send
          </button>
        </form>
      </div>

      <!-- 3. Participants Panel -->
      <div style="border-left: 1px solid var(--border-color); background-color: #FAF5FF; padding: 16px; display: flex; flex-direction: column;">
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 14px;">
          Participants (<span id="chat-participants-count">${activeGroup.members ? activeGroup.members.length : 0}</span>)
        </div>

        <div id="chat-participants-list" style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto;">
          ${(activeGroup.members || []).map(m => `
            <div
              class="chat-participant-item"
              data-id="${m.id}"
              data-role="${m.role}"
              style="display: flex; align-items: center; gap: 8px; cursor: ${m.role === 'faculty' ? 'pointer' : 'default'}; padding: 4px; border-radius: 8px;"
              title="${m.role === 'faculty' ? 'Click to inspect faculty research profile' : ''}"
            >
              <img src="${m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="" class="avatar avatar-sm" />
              <div style="flex: 1; overflow: hidden;">
                <div style="font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(m.name)}
                </div>
                <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${m.role === 'faculty' ? '#7C3AED' : '#4338CA'};">
                  ${m.role}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach channel click handlers
  container.querySelectorAll('.chat-group-item').forEach(item => {
    item.addEventListener('click', () => {
      const gId = Number(item.getAttribute('data-group-id'));
      if (gId !== activeGroupId) {
        activeGroupId = gId;
        renderWorkspace(container);
      }
    });
  });

  // Attach participant click handlers
  container.querySelectorAll('.chat-participant-item').forEach(item => {
    item.addEventListener('click', () => {
      const role = item.getAttribute('data-role');
      const id = Number(item.getAttribute('data-id'));
      if (role === 'faculty') {
        openFacultyDetailModal(id);
      }
    });
  });

  // Setup form submission
  const sendForm = container.querySelector('#chat-send-form');
  const messageInput = container.querySelector('#chat-message-input');
  const sendBtn = container.querySelector('#chat-send-btn');
  const errorBanner = container.querySelector('#chat-error-banner');

  sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !activeGroupId) return;

    messageInput.value = '';
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.6';

    try {
      errorBanner.style.display = 'none';
      const res = await api.sendGroupMessage(activeGroupId, text);
      appendMessage(res.message);
    } catch (err) {
      console.error('Failed to send message:', err);
      errorBanner.textContent = err.message || 'Failed to send message.';
      errorBanner.style.display = 'block';
    } finally {
      sendBtn.disabled = false;
      sendBtn.style.opacity = '1';
      messageInput.focus();
    }
  });

  // Load initial messages for active group & setup socket
  loadActiveGroupMessages(activeGroup.id);
}

async function loadActiveGroupMessages(groupId) {
  const container = document.getElementById('messages-container');
  const errorBanner = document.getElementById('chat-error-banner');
  if (!container) return;

  try {
    const data = await api.getGroupMessages(groupId);
    currentMessages = data.messages || [];
    renderMessagesList();

    // Socket Room Joining
    const socket = socketManager.getSocket();
    if (socket && socket.connected) {
      socket.emit('join_group', { groupId: groupId });
    }

    // Clean up previous socket listener if any
    if (chatSocketCleanup) {
      chatSocketCleanup();
    }

    // Register receive_message listener
    const onReceiveMessage = (msg) => {
      if (msg.group_id === activeGroupId) {
        appendMessage(msg);
      }
    };

    if (socket) {
      socket.on('receive_message', onReceiveMessage);
      chatSocketCleanup = () => {
        socket.off('receive_message', onReceiveMessage);
        socket.emit('leave_group', { groupId: groupId });
      };
    }
  } catch (err) {
    console.error('Failed to load messages for group:', groupId, err);
    if (errorBanner) {
      errorBanner.textContent = err.message || 'Unable to load chat messages.';
      errorBanner.style.display = 'block';
    }
  }
}

function renderMessagesList() {
  const container = document.getElementById('messages-container');
  if (!container) return;
  const user = authState.getUser();

  if (currentMessages.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); margin: auto;">
        <i class="fa-regular fa-comment-dots text-3xl mb-2 block"></i>
        No messages yet in this group. Say hello to kick off your project discussion!
      </div>
    `;
    return;
  }

  container.innerHTML = currentMessages.map(m => {
    const isMine = m.sender_id === user.id;
    return `
      <div style="display: flex; align-items: flex-start; gap: 10px; flex-direction: ${isMine ? 'row-reverse' : 'row'};">
        <img
          src="${m.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}"
          alt=""
          class="avatar avatar-sm"
        />
        <div style="max-width: 65%;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; justify-content: ${isMine ? 'flex-end' : 'flex-start'};">
            <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">
              ${escapeHtml(m.sender_name)}
            </span>
            <span style="font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; text-transform: uppercase; background-color: ${m.sender_role === 'faculty' ? '#EDE9FE' : '#EEF2FF'}; color: ${m.sender_role === 'faculty' ? '#7C3AED' : '#4338CA'};">
              ${m.sender_role}
            </span>
            <span style="font-size: 10px; color: var(--text-muted);">
              ${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div
            style="padding: 10px 14px; border-radius: ${isMine ? '14px 4px 14px 14px' : '4px 14px 14px 14px'}; background-color: ${isMine ? 'var(--color-primary)' : 'var(--bg-subtle)'}; color: ${isMine ? '#fff' : 'var(--text-primary)'}; font-size: 13px; line-height: 1.45; word-break: break-word; box-shadow: var(--shadow-sm);"
          >
            ${escapeHtml(m.body)}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function appendMessage(msg) {
  // Avoid duplicate appending
  if (currentMessages.some(m => m.id === msg.id)) return;
  currentMessages.push(msg);

  const container = document.getElementById('messages-container');
  if (!container) return;

  // If this was the first message, clear the empty state
  if (currentMessages.length === 1) {
    container.innerHTML = '';
  }

  const user = authState.getUser();
  const isMine = msg.sender_id === user.id;

  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = `display: flex; align-items: flex-start; gap: 10px; flex-direction: ${isMine ? 'row-reverse' : 'row'};`;
  msgDiv.innerHTML = `
    <img
      src="${msg.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}"
      alt=""
      class="avatar avatar-sm"
    />
    <div style="max-width: 65%;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; justify-content: ${isMine ? 'flex-end' : 'flex-start'};">
        <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">
          ${escapeHtml(msg.sender_name)}
        </span>
        <span style="font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; text-transform: uppercase; background-color: ${msg.sender_role === 'faculty' ? '#EDE9FE' : '#EEF2FF'}; color: ${msg.sender_role === 'faculty' ? '#7C3AED' : '#4338CA'};">
          ${msg.sender_role}
        </span>
        <span style="font-size: 10px; color: var(--text-muted);">
          ${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div
        style="padding: 10px 14px; border-radius: ${isMine ? '14px 4px 14px 14px' : '4px 14px 14px 14px'}; background-color: ${isMine ? 'var(--color-primary)' : 'var(--bg-subtle)'}; color: ${isMine ? '#fff' : 'var(--text-primary)'}; font-size: 13px; line-height: 1.45; word-break: break-word; box-shadow: var(--shadow-sm);"
      >
        ${escapeHtml(msg.body)}
      </div>
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
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
