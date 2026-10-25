/**
 * API Service Client for Smart Real-Time Project Team Finder System.
 * Uses native Fetch API with automatic JWT Bearer token headers.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  signup: (userData) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

  resetPassword: (token, new_password, confirm_password) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password, confirm_password })
    }),

  getMe: () => request('/auth/me'),

  // HOD
  getHodStats: () => request('/hod/dashboard-stats'),
  getHodStudents: () => request('/hod/directory/students'),
  getHodFaculty: () => request('/hod/directory/faculty'),
  assignStudents: (studentIds, facultyId, note) =>
    request('/hod/assign-students', {
      method: 'POST',
      body: JSON.stringify({ studentIds, facultyId, note })
    }),
  getAssignmentHistory: () => request('/hod/assignments-history'),
  getChangeRequests: () => request('/hod/change-requests'),
  decideChangeRequest: (requestId, action, newFacultyId, remark) =>
    request('/hod/change-requests/decide', {
      method: 'POST',
      body: JSON.stringify({ requestId, action, newFacultyId, remark })
    }),
  postNotification: (notification) =>
    request('/hod/notifications', {
      method: 'POST',
      body: JSON.stringify(notification)
    }),
  getHodTeamProposals: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, v);
    });
    const queryString = q.toString();
    return request(`/hod/team-proposals${queryString ? `?${queryString}` : ''}`);
  },
  decideHodProposal: (teamId, action, remarks) =>
    request(`/hod/team-proposals/${teamId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action, remarks })
    }),
  getHodMentorRecommendations: (teamId) =>
    request(`/hod/team-proposals/${teamId}/mentor-recommendations`),
  assignHodMentor: (teamId, facultyId, note) =>
    request(`/hod/team-proposals/${teamId}/assign-mentor`, {
      method: 'POST',
      body: JSON.stringify({ facultyId, note })
    }),

  // Faculty
  getMyStudents: () => request('/faculty/my-students'),
  getFacultyProfile: () => request('/faculty/profile'),
  updateFacultyProfile: (data) =>
    request('/faculty/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Student
  getStudentProfile: () => request('/student/profile'),
  updateStudentProfile: (data) =>
    request('/student/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  uploadAvatar: async (file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('avatar', file);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/student/profile/avatar`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload profile picture.');
    }
    return data;
  },
  removeAvatar: () => request('/student/profile/avatar', { method: 'DELETE' }),
  addProject: (data) =>
    request('/student/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  submitChangeRequest: (data) =>
    request('/student/change-request', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getFacultyDirectory: () => request('/student/faculty-list'),
  getFacultyDetail: (id) => request(`/student/faculty/${id}`),

  // Teams
  getTeams: () => request('/teams'),
  getMyTeam: (teamId) => request(teamId ? `/teams/my-team?team_id=${teamId}` : '/teams/my-team'),
  updateMemberRole: (teamId, studentId, roleData) =>
    request(`/teams/${teamId}/members/${studentId}/role`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    }),
  createTeamTask: (teamId, taskData) =>
    request(`/teams/${teamId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    }),
  updateTeamTask: (teamId, taskId, taskData) =>
    request(`/teams/${teamId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    }),
  deleteTeamTask: (teamId, taskId) =>
    request(`/teams/${teamId}/tasks/${taskId}`, {
      method: 'DELETE'
    }),
  updateTaskStatus: (teamId, taskId, status) =>
    request(`/teams/${teamId}/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  createTeamProposal: (proposalData) =>
    request('/teams/proposals', {
      method: 'POST',
      body: JSON.stringify(proposalData)
    }),
  getAvailableTeamsToJoin: () => request('/teams/available-to-join'),
  requestToJoinTeam: (teamId, message) =>
    request(`/teams/${teamId}/join-request`, {
      method: 'POST',
      body: JSON.stringify({ message })
    }),
  decideJoinRequest: (requestId, action) =>
    request(`/teams/join-requests/${requestId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action })
    }),
  toggleTeamRecruiting: (teamId) =>
    request(`/teams/${teamId}/toggle-recruiting`, {
      method: 'PUT'
    }),
  createTeam: (name, studentIds) =>
    request('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, studentIds })
    }),
  addTeamMember: (teamId, studentId) =>
    request(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ studentId })
    }),
  removeTeamMember: (teamId, studentId) =>
    request(`/teams/${teamId}/members/${studentId}`, {
      method: 'DELETE'
    }),
  getTeamCandidates: (teamId) => request(`/teams/${teamId}/candidates`),
  getCandidateProfile: (studentId) => request(`/teams/candidate-profile/${studentId}`),
  sendTeamInvitation: (teamId, studentId, message) =>
    request(`/teams/${teamId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ studentId, message })
    }),
  getMyInvitations: () => request('/teams/my-invitations'),
  decideTeamInvitation: (invitationId, action) =>
    request(`/teams/invitations/${invitationId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action })
    }),

  // Chat
  getChatGroups: () => request('/chat/groups'),
  getGroupMessages: (groupId) => request(`/chat/groups/${groupId}/messages`),
  sendGroupMessage: (groupId, body) =>
    request(`/chat/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body })
    }),
  createCustomChatGroup: (data) =>
    request('/chat/groups', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'POST'
    }),
  markAllNotificationsRead: () =>
    request('/notifications/mark-all-read', {
      method: 'POST'
    })
};

export default api;
