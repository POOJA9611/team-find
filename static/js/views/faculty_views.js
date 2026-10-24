/**
 * Faculty Workspace Views for Smart Real-Time Project Team Finder System.
 */

import api from '../api.js';
import auth from '../auth.js';
import { openModal } from './modals.js';

// 1. Faculty Overview Dashboard
export async function renderFacultyDashboard(container, { navigate }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const [studentsRes, teamsRes, profileRes] = await Promise.all([
      api.getMyStudents(),
      api.getTeams(),
      api.getFacultyProfile()
    ]);

    const students = studentsRes.students || [];
    const teams = teamsRes.teams || [];
    const profile = profileRes.profile;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Banner -->
        <div class="card" style="background: linear-gradient(135deg, #4338CA 0%, #6366F1 100%); color: #fff; padding: 28px 32px; border-radius: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.4);">
          <div>
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85;">
              Faculty Guidance Workspace
            </span>
            <h2 style="font-size: 24px; font-weight: 800; margin-top: 4px; margin-bottom: 8px;">
              Welcome, ${auth.user?.name || 'Faculty Mentor'}
            </h2>
            <p style="font-size: 14px; opacity: 0.9; max-width: 600px; margin: 0;">
              Guide assigned students through project milestones, establish capstone teams, and mentor students in dedicated team group chats.
            </p>
          </div>
          <div style="display: flex; gap: 12px;">
            <button id="btn-fac-dash-createteam" style="background-color: #fff; color: #4338CA; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; border: none; cursor: pointer; box-shadow: var(--shadow-sm);">
              <i class="fa-solid fa-people-group mr-2"></i> Manage Teams
            </button>
            <button id="btn-fac-dash-chat" style="background-color: rgba(255, 255, 255, 0.2); color: #fff; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; border: 1px solid rgba(255, 255, 255, 0.4); cursor: pointer;">
              <i class="fa-solid fa-comments mr-2"></i> Group Chats
            </button>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="stats-grid-three">
          <div class="card stat-card hover-lift">
            <div class="stat-icon-wrap bg-indigo-light">
              <i class="fa-solid fa-user-graduate"></i>
            </div>
            <div class="stat-info-col">
              <div class="stat-value">${students.length}</div>
              <div class="stat-label">Assigned Students</div>
              <div class="stat-subtext">Active student mentees</div>
            </div>
          </div>

          <div class="card stat-card hover-lift">
            <div class="stat-icon-wrap bg-violet-light">
              <i class="fa-solid fa-people-group"></i>
            </div>
            <div class="stat-info-col">
              <div class="stat-value">${teams.length}</div>
              <div class="stat-label">Capstone Teams</div>
              <div class="stat-subtext">Formed project squads</div>
            </div>
          </div>

          <div class="card stat-card hover-lift">
            <div class="stat-icon-wrap bg-emerald-light">
              <i class="fa-solid fa-comments"></i>
            </div>
            <div class="stat-info-col">
              <div class="stat-value">${teams.length}</div>
              <div class="stat-label">Chat Workspaces</div>
              <div class="stat-subtext">Real-time guidance channels</div>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
          <div id="card-fac-students" class="card hover-lift" style="cursor: pointer;">
            <div class="card-title-row">
              <h3 class="card-main-title">
                <i class="fa-solid fa-user-graduate text-indigo mr-2"></i> My Assigned Students
              </h3>
              <span class="badge badge-indigo">${students.length} Students</span>
            </div>
            <p class="card-subtitle" style="margin-bottom: 16px;">
              View technical profiles, strengths, languages, and track the ongoing/completed projects of students assigned to you.
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--color-primary); font-weight: 700;">
              <span>Inspect student roster</span>
              <i class="fa-solid fa-arrow-right"></i>
            </div>
          </div>

          <div id="card-fac-teams" class="card hover-lift" style="cursor: pointer;">
            <div class="card-title-row">
              <h3 class="card-main-title">
                <i class="fa-solid fa-people-group text-violet mr-2"></i> Capstone Teams
              </h3>
              <span class="badge badge-violet">${teams.length} Teams</span>
            </div>
            <p class="card-subtitle" style="margin-bottom: 16px;">
              Group your assigned mentees into dedicated project teams, adjust members, and collaborate in team group chats.
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--color-secondary); font-weight: 700;">
              <span>Manage capstone teams</span>
              <i class="fa-solid fa-arrow-right"></i>
            </div>
          </div>

          <div id="card-fac-profile" class="card hover-lift" style="cursor: pointer;">
            <div class="card-title-row">
              <h3 class="card-main-title">
                <i class="fa-solid fa-id-card text-emerald mr-2"></i> Faculty Profile & Guidance Areas
              </h3>
              <span class="badge badge-emerald">Active</span>
            </div>
            <p class="card-subtitle" style="margin-bottom: 16px;">
              Keep your research interests, guidance subjects, and programming languages updated for accurate team matching.
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--color-success); font-weight: 700;">
              <span>Edit academic profile</span>
              <i class="fa-solid fa-arrow-right"></i>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-fac-dash-createteam').addEventListener('click', () => navigate('faculty-teams'));
    container.querySelector('#btn-fac-dash-chat').addEventListener('click', () => navigate('faculty-chat'));
    container.querySelector('#card-fac-students').addEventListener('click', () => navigate('my-students'));
    container.querySelector('#card-fac-teams').addEventListener('click', () => navigate('faculty-teams'));
    container.querySelector('#card-fac-profile').addEventListener('click', () => navigate('faculty-profile'));

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load dashboard.'}</div>`;
  }
}


// 2. My Assigned Students
export async function renderMyStudents(container, { navigate }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const data = await api.getMyStudents();
    const students = data.students || [];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div class="card" style="padding: 20px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
            My Assigned Student Mentees (${students.length})
          </h3>
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
            Strict ownership isolation: Only students allocated to your mentorship portfolio by the HOD appear here.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 18px;">
          ${students.length === 0 ? `
            <div class="card p-8 text-center text-muted" style="grid-column: 1 / -1;">
              No students currently assigned to your mentorship.
            </div>
          ` : students.map((s) => `
            <div class="card hover-lift" style="padding: 22px;">
              <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 14px;">
                <img src="${s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 52px; height: 52px; border-radius: 14px;" />
                <div>
                  <h4 style="font-size: 16px; font-weight: 800; margin: 0 0 2px 0;">${s.name}</h4>
                  <div style="font-size: 12px; color: var(--text-secondary);">${s.email}</div>
                  <div style="font-size: 12px; color: var(--color-primary); font-weight: 600; margin-top: 2px;">
                    ${s.reg_no} • Sem ${s.semester} • CGPA ${s.cgpa}
                  </div>
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">Strength & Skills</span>
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span class="badge badge-indigo text-xs" style="text-transform: capitalize;">${s.strength}</span>
                  <span style="font-size: 12px; color: var(--text-secondary);">${s.languages}</span>
                </div>
              </div>

              ${s.bio ? `
                <div style="margin-bottom: 14px;">
                  <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 2px;">Bio</span>
                  <p style="font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.4;">${s.bio}</p>
                </div>
              ` : ''}

              <!-- Projects Section -->
              <div style="border-top: 1px solid var(--border-light); padding-top: 12px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 6px;">
                  Capstone Projects (${(s.projects || []).length})
                </span>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${(s.projects || []).length === 0 ? `
                    <span style="font-size: 12px; color: var(--text-muted);">No projects recorded yet.</span>
                  ` : (s.projects || []).map((p) => `
                    <div style="background-color: var(--bg-subtle); padding: 8px 10px; border-radius: 8px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
                      <strong style="color: var(--text-primary);">${p.title}</strong>
                      <span class="badge ${p.status === 'completed' ? 'badge-emerald' : 'badge-indigo'} text-xs">
                        ${p.status}
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load students.'}</div>`;
  }
}


// 3. Capstone Teams Management
export async function renderFacultyTeams(container, { navigate, onNavigateToChat }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const [teamsRes, studentsRes] = await Promise.all([
      api.getTeams(),
      api.getMyStudents()
    ]);

    const teams = teamsRes.teams || [];
    const students = studentsRes.students || [];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div class="card" style="padding: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
              Manage Mentored Capstone Teams (${teams.length})
            </h3>
            <span style="font-size: 12px; color: var(--text-secondary);">
              Group your assigned students into project squads. Creating a team automatically spins up a persistent WebSocket chat group.
            </span>
          </div>

          <button id="btn-open-create-team-modal" class="btn btn-primary">
            <i class="fa-solid fa-plus mr-1"></i> Form New Team
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${teams.length === 0 ? `
            <div class="card p-8 text-center text-muted">
              No capstone teams created yet. Click "Form New Team" to group your assigned students.
            </div>
          ` : teams.map((team) => `
            <div class="card" style="padding: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                <div>
                  <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                    ${team.name}
                  </h3>
                  <div style="font-size: 12px; color: var(--text-secondary);">
                    ${team.project_title || 'Capstone Project'} • ${team.domain || 'Software Engineering'}
                  </div>
                </div>

                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-sm btn-subtle btn-add-member" data-team-id="${team.id}" data-team-name="${team.name}">
                    <i class="fa-solid fa-user-plus mr-1"></i> Add Student
                  </button>
                  ${team.chat_group_id ? `
                    <button class="btn btn-sm btn-primary btn-open-team-chat" data-group-id="${team.chat_group_id}">
                      <i class="fa-solid fa-comments mr-1"></i> Team Chat
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- Members Table -->
              <div style="background-color: var(--bg-subtle); border-radius: 10px; overflow: hidden; margin-bottom: 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted);">
                      <th style="padding: 10px 14px;">Member</th>
                      <th style="padding: 10px 14px;">Reg No</th>
                      <th style="padding: 10px 14px;">Strength</th>
                      <th style="padding: 10px 14px;">Role</th>
                      <th style="padding: 10px 14px; text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(team.members || []).map((m) => `
                      <tr style="border-bottom: 1px solid var(--border-light);">
                        <td style="padding: 10px 14px;">
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 26px; height: 26px; border-radius: 50%;" />
                            <strong>${m.name}</strong>
                          </div>
                        </td>
                        <td style="padding: 10px 14px;">${m.reg_no}</td>
                        <td style="padding: 10px 14px; text-transform: capitalize;">${m.strength}</td>
                        <td style="padding: 10px 14px;">
                          <span class="badge ${m.team_role === 'leader' ? 'badge-amber' : 'badge-indigo'} text-xs">
                            ${m.team_role}
                          </span>
                        </td>
                        <td style="padding: 10px 14px; text-align: right;">
                          <button class="btn-icon-subtle btn-remove-member" data-team-id="${team.id}" data-student-id="${m.id}" data-student-name="${m.name}" title="Remove from team" style="color: var(--color-danger); cursor: pointer;">
                            <i class="fa-solid fa-trash text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Open Create Team Modal
    container.querySelector('#btn-open-create-team-modal').addEventListener('click', () => {
      const studentCheckboxes = students.map((s) => `
        <label style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-light); cursor: pointer; font-size: 13px;">
          <input type="checkbox" class="chk-team-student" value="${s.id}" />
          <span><strong>${s.name}</strong> (${s.reg_no} • ${s.strength})</span>
        </label>
      `).join('');

      openModal({
        title: 'Form New Capstone Project Team',
        maxWidth: '520px',
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Team Name *</label>
              <input id="modal-team-name" type="text" placeholder="e.g. CloudScale Architecture" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px;">Select Assigned Students *</label>
              <div style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto;">
                ${studentCheckboxes || '<span class="text-xs text-muted">No assigned students available.</span>'}
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
              <button class="btn btn-primary" id="btn-confirm-create-team">
                Create Team & Auto-Setup Chat
              </button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-confirm-create-team').addEventListener('click', async (e) => {
        const teamName = document.getElementById('modal-team-name').value.trim();
        const selectedIds = Array.from(document.querySelectorAll('.chk-team-student:checked')).map((c) => Number(c.value));

        if (!teamName) {
          alert('Please enter a team name.');
          return;
        }

        if (selectedIds.length === 0) {
          alert('Please select at least one student.');
          return;
        }

        e.target.disabled = true;
        e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

        try {
          await api.createTeam(teamName, selectedIds);
          alert(`Team "${teamName}" created successfully!`);
          document.querySelector('.modal-backdrop-layer')?.remove();
          renderFacultyTeams(container, { navigate, onNavigateToChat });
        } catch (err) {
          alert(err.message || 'Failed to create team.');
          e.target.disabled = false;
          e.target.textContent = 'Create Team & Auto-Setup Chat';
        }
      });
    });

    // Add Member Modal
    container.querySelectorAll('.btn-add-member').forEach((btn) => {
      btn.addEventListener('click', () => {
        const teamId = btn.dataset.teamId;
        const teamName = btn.dataset.teamName;

        const options = students.map((s) => `
          <option value="${s.id}">${s.name} (${s.reg_no} • ${s.strength})</option>
        `).join('');

        openModal({
          title: `Add Student to ${teamName}`,
          maxWidth: '460px',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Select Assigned Student</label>
                <select id="modal-select-add-std" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;">
                  ${options}
                </select>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
                <button class="btn btn-primary" id="btn-confirm-add-std">
                  Add to Team & Chat
                </button>
              </div>
            </div>
          `
        });

        document.getElementById('btn-confirm-add-std').addEventListener('click', async (e) => {
          const sId = Number(document.getElementById('modal-select-add-std').value);
          e.target.disabled = true;
          e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

          try {
            await api.addTeamMember(teamId, sId);
            alert('Student added successfully!');
            document.querySelector('.modal-backdrop-layer')?.remove();
            renderFacultyTeams(container, { navigate, onNavigateToChat });
          } catch (err) {
            alert(err.message || 'Failed to add student.');
            e.target.disabled = false;
            e.target.textContent = 'Add to Team & Chat';
          }
        });
      });
    });

    // Remove Member
    container.querySelectorAll('.btn-remove-member').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const teamId = btn.dataset.teamId;
        const studentId = btn.dataset.studentId;
        const studentName = btn.dataset.studentName;

        if (!confirm(`Are you sure you want to remove ${studentName} from this team?`)) return;

        try {
          await api.removeTeamMember(teamId, studentId);
          renderFacultyTeams(container, { navigate, onNavigateToChat });
        } catch (err) {
          alert(err.message || 'Failed to remove member.');
        }
      });
    });

    // Open Chat
    container.querySelectorAll('.btn-open-team-chat').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (onNavigateToChat) {
          onNavigateToChat(btn.dataset.groupId);
        } else {
          navigate('faculty-chat');
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load teams.'}</div>`;
  }
}


// 4. Faculty Profile & Skills
export async function renderFacultyProfile(container, { navigate }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const data = await api.getFacultyProfile();
    const profile = data.profile;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 680px; margin: 0 auto;">
        <div class="card" style="padding: 28px;">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-light);">
            <img src="${profile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="" style="width: 64px; height: 64px; border-radius: 16px;" />
            <div>
              <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 2px 0;">${profile.name}</h3>
              <div style="font-size: 13px; color: var(--text-secondary);">${profile.designation} • ${profile.department}</div>
              <div style="font-size: 12px; color: var(--color-primary); font-weight: 600; margin-top: 2px;">${profile.email}</div>
            </div>
          </div>

          <div id="fac-profile-success" style="display: none; background-color: var(--color-success-light); color: var(--color-success); padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 16px;">
            <i class="fa-solid fa-circle-check mr-2"></i> Profile updated successfully!
          </div>

          <form id="form-faculty-profile" style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Full Name</label>
                <input id="fac-name" type="text" value="${profile.name || ''}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Academic Designation</label>
                <input id="fac-desig" type="text" value="${profile.designation || ''}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Department</label>
              <input id="fac-dept" type="text" value="${profile.department || ''}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Guidance & Specialization Subjects (Comma Separated)</label>
              <input id="fac-subjects" type="text" value="${profile.subjects || ''}" placeholder="e.g. Cloud Computing, Kubernetes, Distributed Systems" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Programming Languages Known</label>
              <input id="fac-langs" type="text" value="${profile.languages || ''}" placeholder="e.g. Python, Go, Java, TypeScript" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">LinkedIn Profile URL</label>
              <input id="fac-linkedin" type="url" value="${profile.linkedin_url || ''}" placeholder="https://linkedin.com/in/username" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Bio / Mentorship Philosophy</label>
              <textarea id="fac-bio" rows="4" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit; line-height: 1.4;">${profile.bio || ''}</textarea>
            </div>

            <button id="btn-save-fac-profile" type="submit" class="btn btn-primary" style="margin-top: 8px; padding: 12px;">
              Save Profile Changes
            </button>
          </form>
        </div>
      </div>
    `;

    container.querySelector('#form-faculty-profile').addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = container.querySelector('#btn-save-fac-profile');
      const successBox = container.querySelector('#fac-profile-success');

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

      try {
        await api.updateFacultyProfile({
          name: container.querySelector('#fac-name').value.trim(),
          designation: container.querySelector('#fac-desig').value.trim(),
          department: container.querySelector('#fac-dept').value.trim(),
          subjects: container.querySelector('#fac-subjects').value.trim(),
          languages: container.querySelector('#fac-langs').value.trim(),
          linkedin_url: container.querySelector('#fac-linkedin').value.trim(),
          bio: container.querySelector('#fac-bio').value.trim()
        });

        await auth.refreshUser();
        successBox.style.display = 'block';
        setTimeout(() => { successBox.style.display = 'none'; }, 4000);
      } catch (err) {
        alert(err.message || 'Failed to update profile.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile Changes';
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load profile.'}</div>`;
  }
}

export const renderFacultyMyStudents = renderMyStudents;
