/**
 * Student Workspace Views for Smart Real-Time Project Team Finder System.
 */

import api from '../api.js';
import auth from '../auth.js';
import { socketManager } from '../socket.js';
import { openModal, openFacultyModal, openCandidateProfileModal } from './modals.js';

// 1. Student Dashboard
export async function renderStudentDashboard(container, { navigate, onOpenFacultyModal }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const [profRes, notifRes, teamRes, suggestedRes] = await Promise.all([
      api.getStudentProfile(),
      api.getNotifications(),
      api.getMyTeam().catch(() => null),
      api.getAvailableTeamsToJoin().catch(() => ({ teams: [] }))
    ]);

    const p = profRes.profile || {};
    const projects = profRes.projects || [];
    const notifications = notifRes.notifications || [];
    const activeTeam = teamRes?.team;
    const topSuggestions = (suggestedRes?.teams || []).slice(0, 3);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Welcome Banner -->
        <div class="card" style="background: linear-gradient(135deg, #4338CA 0%, #6366F1 100%); color: #fff; padding: 28px 32px; border-radius: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.4);">
          <div>
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85;">
              Student Capstone Workspace
            </span>
            <h2 style="font-size: 24px; font-weight: 800; margin-top: 4px; margin-bottom: 8px;">
              Welcome back, ${p.name || 'Student'}
            </h2>
            <p style="font-size: 14px; opacity: 0.9; max-width: 600px; margin: 0;">
              Form or join a capstone team, collaborate with your mentor, build your portfolio, and stay updated on academic deadlines.
            </p>
          </div>
          <div style="display: flex; gap: 12px;">
            <button id="btn-std-dash-teams" style="background-color: #fff; color: #4338CA; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; border: none; cursor: pointer; box-shadow: var(--shadow-sm);">
              <i class="fa-solid fa-people-group mr-2"></i> Project Teams
            </button>
            <button id="btn-std-dash-chat" style="background-color: rgba(255, 255, 255, 0.2); color: #fff; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; border: 1px solid rgba(255, 255, 255, 0.4); cursor: pointer;">
              <i class="fa-solid fa-comments mr-2"></i> Team Chat
            </button>
          </div>
        </div>

        <!-- Mentorship & Active Team Overview Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <!-- Assigned Mentor Card -->
          <div class="card hover-lift" style="padding: 22px;">
            <div class="card-title-row" style="margin-bottom: 14px;">
              <h3 class="card-main-title" style="font-size: 15px;">
                <i class="fa-solid fa-chalkboard-user text-indigo mr-2"></i> Assigned Faculty Mentor
              </h3>
              ${p.faculty_id ? `
                <span class="badge badge-emerald">Assigned</span>
              ` : `
                <span class="badge badge-amber">Unassigned</span>
              `}
            </div>

            ${p.faculty_id ? `
              <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 14px;">
                <img src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="" style="width: 48px; height: 48px; border-radius: 12px;" />
                <div>
                  <h4 style="font-size: 15px; font-weight: 800; margin: 0 0 2px 0;">${p.faculty_name}</h4>
                  <div style="font-size: 12px; color: var(--text-secondary);">${p.faculty_designation} • ${p.faculty_department}</div>
                  <div style="font-size: 12px; color: var(--color-primary); margin-top: 2px;">${p.faculty_email}</div>
                </div>
              </div>

              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">
                <strong>Specialization:</strong> ${p.faculty_subjects || 'Computer Science Guidance'}
              </div>

              <div style="display: flex; gap: 8px;">
                <button id="btn-view-my-mentor-profile" class="btn btn-sm btn-subtle" style="flex: 1;">
                  <i class="fa-solid fa-id-card mr-1"></i> View Profile
                </button>
                <button id="btn-request-change-mentor" class="btn btn-sm btn-subtle" style="flex: 1; color: var(--color-amber);">
                  <i class="fa-solid fa-arrow-right-arrow-left mr-1"></i> Change Mentor
                </button>
              </div>
            ` : `
              <div style="padding: 20px 0; text-align: center;">
                <i class="fa-solid fa-user-clock text-amber text-3xl" style="margin-bottom: 8px;"></i>
                <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 12px 0;">
                  You have not been assigned to a faculty mentor yet. The HOD will assign you based on your specialization and portfolio.
                </p>
                <button id="btn-browse-fac-dir" class="btn btn-sm btn-subtle">
                  Browse Faculty Directory
                </button>
              </div>
            `}
          </div>

          <!-- My Capstone Team Card -->
          <div class="card hover-lift" style="padding: 22px;">
            <div class="card-title-row" style="margin-bottom: 14px;">
              <h3 class="card-main-title" style="font-size: 15px;">
                <i class="fa-solid fa-people-group text-violet mr-2"></i> My Project Team
              </h3>
              ${activeTeam ? `
                <span class="badge ${activeTeam.status === 'approved' ? 'badge-emerald' : 'badge-warning'}">
                  ${activeTeam.status.replace('_', ' ').toUpperCase()}
                </span>
              ` : `
                <span class="badge badge-subtle">No Team</span>
              `}
            </div>

            ${activeTeam ? `
              <h4 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                ${activeTeam.name}
              </h4>
              <div style="font-size: 13px; color: var(--color-primary); font-weight: 600; margin-bottom: 8px;">
                ${activeTeam.project_title || 'Capstone Project'}
              </div>
              <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 14px; max-height: 48px; overflow: hidden;">
                ${activeTeam.description || 'No description provided.'}
              </p>

              <div style="display: flex; gap: 8px;">
                ${activeTeam.chat_group_id ? `
                  <button id="btn-dash-open-chat" class="btn btn-sm btn-primary" style="flex: 1;">
                    <i class="fa-solid fa-comments mr-1"></i> Team Chat
                  </button>
                ` : ''}
                <button id="btn-dash-manage-team" class="btn btn-sm btn-subtle" style="flex: 1;">
                  <i class="fa-solid fa-users mr-1"></i> Manage Team
                </button>
              </div>
            ` : `
              <div style="padding: 20px 0; text-align: center;">
                <i class="fa-solid fa-users-slash text-muted text-3xl" style="margin-bottom: 8px;"></i>
                <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 12px 0;">
                  You are not currently enrolled in a capstone team. Browse open teams or propose your own!
                </p>
                <div style="display: flex; gap: 8px; justify-content: center;">
                  <button id="btn-dash-browse-teams" class="btn btn-sm btn-primary">
                    <i class="fa-solid fa-magnifying-glass mr-1"></i> Browse Open Teams
                  </button>
                  <button id="btn-dash-propose-team" class="btn btn-sm btn-subtle">
                    <i class="fa-solid fa-plus mr-1"></i> Propose Team
                  </button>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- Recommended Teams Section -->
        ${!activeTeam && topSuggestions.length > 0 ? `
          <div class="card" style="padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                  <i class="fa-solid fa-wand-magic-sparkles text-indigo mr-1"></i> Top Team Matches For You
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Ranked by algorithmic compatibility with your tech stack (${p.strength || 'technical'} profile)
                </span>
              </div>
              <button id="btn-see-all-available-teams" class="btn btn-sm btn-subtle">
                See All (${suggestedRes?.teams?.length || 0})
              </button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;">
              ${topSuggestions.map((st) => `
                <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: 14px; background-color: #fff; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                      <h4 style="font-size: 15px; font-weight: 800; margin: 0;">${st.name}</h4>
                      <span class="badge ${st.compatibilityScore >= 80 ? 'badge-emerald' : 'badge-indigo'}">
                        ${st.compatibilityScore}% Match
                      </span>
                    </div>
                    <div style="font-size: 12px; color: var(--color-primary); font-weight: 600; margin-bottom: 6px;">
                      ${st.project_title || st.domain}
                    </div>
                    <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 10px;">
                      ${st.matchExplanation}
                    </p>
                  </div>

                  <div style="border-top: 1px solid var(--border-light); padding-top: 10px; display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 11px; color: var(--text-muted);">
                      ${(st.members || []).length}/${st.max_members || 4} members
                    </span>
                    <button class="btn btn-sm btn-primary btn-quick-join-team" data-id="${st.id}" data-name="${st.name}" data-title="${st.project_title || st.name}">
                      Join Team
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Department Announcements Preview -->
        <div class="card" style="padding: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
              <i class="fa-regular fa-bell text-indigo mr-2"></i> Department Announcements & Deadlines
            </h3>
            <button id="btn-see-all-notifs" class="btn btn-sm btn-subtle">
              View All (${notifications.length})
            </button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${notifications.slice(0, 3).map((n) => `
              <div style="padding: 10px 14px; border-radius: 10px; background-color: var(--bg-subtle); display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div>
                  <strong style="font-size: 13px; color: var(--text-primary);">${n.title}</strong>
                  <p style="font-size: 12px; color: var(--text-secondary); margin: 2px 0 0 0;">${n.body}</p>
                </div>
                ${n.deadline ? `
                  <span class="badge badge-amber text-xs" style="flex-shrink: 0;">
                    Due: ${new Date(n.deadline).toLocaleDateString()}
                  </span>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Event handlers
    container.querySelector('#btn-std-dash-teams')?.addEventListener('click', () => navigate('project-teams'));
    container.querySelector('#btn-std-dash-chat')?.addEventListener('click', () => navigate('student-chat'));

    container.querySelector('#btn-view-my-mentor-profile')?.addEventListener('click', () => {
      if (p.faculty_id) onOpenFacultyModal(p.faculty_id);
    });

    container.querySelector('#btn-request-change-mentor')?.addEventListener('click', () => {
      navigate('change-request');
    });

    container.querySelector('#btn-browse-fac-dir')?.addEventListener('click', () => {
      navigate('faculty-directory');
    });

    container.querySelector('#btn-dash-open-chat')?.addEventListener('click', () => {
      navigate('student-chat');
    });

    container.querySelector('#btn-dash-manage-team')?.addEventListener('click', () => {
      navigate('project-teams', { initialTab: 'my-team' });
    });

    container.querySelector('#btn-dash-browse-teams')?.addEventListener('click', () => {
      navigate('project-teams', { initialTab: 'join-teams' });
    });

    container.querySelector('#btn-dash-propose-team')?.addEventListener('click', () => {
      navigate('project-teams', { initialTab: 'propose-team' });
    });

    container.querySelector('#btn-see-all-available-teams')?.addEventListener('click', () => {
      navigate('project-teams', { initialTab: 'join-teams' });
    });

    container.querySelector('#btn-see-all-notifs')?.addEventListener('click', () => {
      navigate('notifications');
    });

    // Quick Join Buttons
    container.querySelectorAll('.btn-quick-join-team').forEach((btn) => {
      btn.addEventListener('click', () => {
        const teamId = btn.dataset.id;
        const teamName = btn.dataset.name;
        const teamTitle = btn.dataset.title;

        openModal({
          title: `Request to Join "${teamName}"`,
          maxWidth: '480px',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <span style="font-size: 12px; color: var(--color-primary); font-weight: 700;">Project: ${teamTitle}</span>
                <p style="font-size: 13px; color: var(--text-secondary); margin: 4px 0 0 0;">
                  Send a brief message to the student team leader explaining how your technical skills can contribute to this project.
                </p>
              </div>
              <textarea id="modal-join-msg" rows="3" placeholder="Hi! I would love to contribute my skills to this project..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;">Hi! I would love to contribute to "${teamTitle}". My skills align well with your project objectives.</textarea>
              <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn btn-primary" id="btn-submit-quick-join">
                  Send Join Request
                </button>
              </div>
            </div>
          `
        });

        document.getElementById('btn-submit-quick-join').addEventListener('click', async (e) => {
          const msg = document.getElementById('modal-join-msg').value;
          e.target.disabled = true;
          e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

          try {
            await api.requestToJoinTeam(teamId, msg);
            alert(`Join request successfully submitted to team "${teamName}"!`);
            document.querySelector('.modal-backdrop-layer')?.remove();
            renderStudentDashboard(container, { navigate, onOpenFacultyModal });
          } catch (err) {
            alert(err.message || 'Failed to submit join request.');
            e.target.disabled = false;
            e.target.textContent = 'Send Join Request';
          }
        });
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load student dashboard.'}</div>`;
  }
}


// 2. Student Profile & Projects
export async function renderStudentProfile(container, { navigate, onOpenFacultyModal }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const data = await api.getStudentProfile();
    const p = data.profile || {};
    const projects = data.projects || [];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 800px; margin: 0 auto;">
        <!-- Profile Header Card -->
        <div class="card" style="padding: 28px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-light);">
            <div style="display: flex; align-items: center; gap: 18px;">
              <div style="position: relative;">
                <img id="img-profile-preview" src="${p.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 72px; height: 72px; border-radius: 18px; object-fit: cover;" />
                <label for="input-avatar-file" style="position: absolute; bottom: -4px; right: -4px; width: 26px; height: 26px; border-radius: 50%; background-color: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; box-shadow: var(--shadow-sm);" title="Upload photo">
                  <i class="fa-solid fa-camera"></i>
                </label>
                <input id="input-avatar-file" type="file" accept="image/*" style="display: none;" />
              </div>

              <div>
                <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 2px 0;">${p.name}</h3>
                <div style="font-size: 13px; color: var(--text-secondary);">${p.email}</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                  <span class="badge badge-indigo text-xs">${p.reg_no}</span>
                  <span class="badge ${p.cgpa >= 8.5 ? 'badge-emerald' : 'badge-subtle'} text-xs">CGPA ${p.cgpa}</span>
                  <span class="badge badge-indigo text-xs" style="text-transform: capitalize;">${p.strength}</span>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 8px;">
              <button id="btn-remove-avatar" class="btn btn-sm btn-subtle" style="color: var(--color-danger);">
                <i class="fa-solid fa-trash mr-1"></i> Remove Photo
              </button>
            </div>
          </div>

          <div id="student-profile-success" style="display: none; background-color: var(--color-success-light); color: var(--color-success); padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 16px;">
            <i class="fa-solid fa-circle-check mr-2"></i> Profile details saved successfully!
          </div>

          <!-- Edit Profile Form -->
          <form id="form-student-profile" style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Full Name</label>
                <input id="std-name" type="text" value="${p.name || ''}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Headline / Professional Title</label>
                <input id="std-headline" type="text" value="${p.headline || ''}" placeholder="e.g. Full-Stack Developer & ML Enthusiast" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Core Strength *</label>
                <select id="std-strength" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; background-color: #fff;">
                  <option value="fullstack" ${p.strength === 'fullstack' ? 'selected' : ''}>Full-Stack</option>
                  <option value="frontend" ${p.strength === 'frontend' ? 'selected' : ''}>Frontend</option>
                  <option value="backend" ${p.strength === 'backend' ? 'selected' : ''}>Backend</option>
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Semester</label>
                <input id="std-semester" type="number" value="${p.semester || 6}" min="1" max="8" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">CGPA</label>
                <input id="std-cgpa" type="number" step="0.01" min="0" max="10" value="${p.cgpa || 8.0}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Programming Languages Known *</label>
              <input id="std-languages" type="text" value="${p.languages || ''}" placeholder="e.g. JavaScript, Python, TypeScript, SQL" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Technical Skills</label>
                <input id="std-skills" type="text" value="${p.technical_skills || ''}" placeholder="e.g. REST APIs, Microservices, Docker" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Frameworks & Libraries</label>
                <input id="std-frameworks" type="text" value="${p.frameworks || ''}" placeholder="e.g. React, Flask, Node.js, Express" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">LinkedIn URL</label>
                <input id="std-linkedin" type="url" value="${p.linkedin_url || ''}" placeholder="https://linkedin.com/in/username" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">GitHub URL</label>
                <input id="std-github" type="url" value="${p.github_url || ''}" placeholder="https://github.com/username" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Bio / Technical Summary</label>
              <textarea id="std-bio" rows="3" placeholder="Brief technical statement..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit; line-height: 1.4;">${p.bio || ''}</textarea>
            </div>

            <button id="btn-save-student-profile" type="submit" class="btn btn-primary" style="padding: 12px; margin-top: 4px;">
              Save Profile Changes
            </button>
          </form>
        </div>

        <!-- Projects Portfolio Section -->
        <div class="card" style="padding: 28px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                Academic Projects & Capstone Experience
              </h3>
              <span style="font-size: 12px; color: var(--text-secondary);">
                Track ongoing capstone submissions and showcase completed academic work to mentors.
              </span>
            </div>
            <button id="btn-open-add-project" class="btn btn-sm btn-primary">
              <i class="fa-solid fa-plus mr-1"></i> Add Project
            </button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${projects.length === 0 ? `
              <div class="p-6 text-center text-muted" style="background-color: var(--bg-subtle); border-radius: 12px;">
                No academic projects added yet. Click "Add Project" to log your capstone or side projects.
              </div>
            ` : projects.map((prj) => `
              <div style="padding: 16px; border: 1px solid var(--border-color); border-radius: 12px; background-color: #fff; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <strong style="font-size: 15px; color: var(--text-primary);">${prj.title}</strong>
                    <span class="badge ${prj.status === 'completed' ? 'badge-emerald' : 'badge-indigo'} text-xs">
                      ${prj.status}
                    </span>
                    ${prj.team_name ? `<span class="badge badge-subtle text-xs">Team: ${prj.team_name}</span>` : ''}
                  </div>
                  <p style="font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                    ${prj.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Avatar upload handler
    const fileInput = container.querySelector('#input-avatar-file');
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const res = await api.uploadAvatar(file);
        container.querySelector('#img-profile-preview').src = res.avatarUrl;
        await auth.refreshUser();
      } catch (err) {
        alert(err.message || 'Failed to upload photo.');
      }
    });

    container.querySelector('#btn-remove-avatar').addEventListener('click', async () => {
      if (!confirm('Remove profile photo and restore default?')) return;
      try {
        const res = await api.removeAvatar();
        container.querySelector('#img-profile-preview').src = res.avatarUrl;
        await auth.refreshUser();
      } catch (err) {
        alert(err.message || 'Failed to remove photo.');
      }
    });

    // Form submit handler
    container.querySelector('#form-student-profile').addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = container.querySelector('#btn-save-student-profile');
      const successBox = container.querySelector('#student-profile-success');

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

      try {
        await api.updateStudentProfile({
          name: container.querySelector('#std-name').value.trim(),
          headline: container.querySelector('#std-headline').value.trim(),
          strength: container.querySelector('#std-strength').value,
          semester: Number(container.querySelector('#std-semester').value),
          cgpa: Number(container.querySelector('#std-cgpa').value),
          languages: container.querySelector('#std-languages').value.trim(),
          technical_skills: container.querySelector('#std-skills').value.trim(),
          frameworks: container.querySelector('#std-frameworks').value.trim(),
          linkedin_url: container.querySelector('#std-linkedin').value.trim(),
          github_url: container.querySelector('#std-github').value.trim(),
          bio: container.querySelector('#std-bio').value.trim()
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

    // Add Project Modal
    container.querySelector('#btn-open-add-project').addEventListener('click', () => {
      openModal({
        title: 'Add Academic Capstone Project',
        maxWidth: '480px',
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Project Title *</label>
              <input id="modal-prj-title" type="text" placeholder="e.g. Distributed In-Memory Cache" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Project Status *</label>
              <select id="modal-prj-status" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;">
                <option value="ongoing">Ongoing (In Progress)</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Description</label>
              <textarea id="modal-prj-desc" rows="3" placeholder="Brief architecture summary or objectives..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;"></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
              <button class="btn btn-primary" id="btn-submit-modal-project">
                Save Project
              </button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-submit-modal-project').addEventListener('click', async (e) => {
        const title = document.getElementById('modal-prj-title').value.trim();
        const status = document.getElementById('modal-prj-status').value;
        const description = document.getElementById('modal-prj-desc').value.trim();

        if (!title) {
          alert('Please enter a project title.');
          return;
        }

        e.target.disabled = true;
        e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        try {
          await api.addProject({ title, status, description });
          alert('Project created successfully!');
          document.querySelector('.modal-backdrop-layer')?.remove();
          renderStudentProfile(container, { navigate, onOpenFacultyModal });
        } catch (err) {
          alert(err.message || 'Failed to save project.');
          e.target.disabled = false;
          e.target.textContent = 'Save Project';
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load profile.'}</div>`;
  }
}


// 3. Project Teams Workspace (Full 5-Page Connected Workflow)
export async function renderStudentTeams(container, { navigate, onOpenFacultyModal, viewParams = {} }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  // Navigation State & Context Preservation (URL Params, Hash, ViewParams, SessionStorage)
  const urlParams = new URLSearchParams(window.location.search);
  const hashVal = window.location.hash || '';
  let urlTeamId = urlParams.get('team_id') || urlParams.get('teamId');
  if (!urlTeamId && hashVal.includes('team_id=')) {
    const match = hashVal.match(/team_id=(\d+)/);
    if (match) urlTeamId = match[1];
  }
  let selectedTeamId = urlTeamId ? Number(urlTeamId) : (viewParams.teamId ? Number(viewParams.teamId) : (sessionStorage.getItem('tp_team_id') ? Number(sessionStorage.getItem('tp_team_id')) : null));
  let mainTab = urlParams.get('tab') || viewParams.tab || viewParams.initialTab || sessionStorage.getItem('tp_main_tab') || (selectedTeamId ? 'my-teams' : 'my-teams');
  let myTeamsView = urlParams.get('page') || viewParams.page || sessionStorage.getItem('tp_view') || (selectedTeamId ? 'workspace' : 'list');
  let workspaceSection = urlParams.get('section') || viewParams.section || sessionStorage.getItem('tp_ws_section') || 'overview';
  
  let taskFilter = 'all'; // 'all' | 'my' | 'in_progress' | 'completed' | 'not_started'
  let appFilter = 'all'; // 'all' | 'pending' | 'accepted' | 'rejected'
  let searchQuery = '';
  
  // Data stores
  let myTeamData = null;
  let availableTeams = [];
  let applicationsData = null;
  let candidatesData = null;
  let candidatesLoading = false;
  let appsLoading = false;
  let createdSuccess = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDeadline(dateStr) {
    if (!dateStr) return 'No deadline set';
    try {
      const clean = String(dateStr).split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return dateStr;
    } catch (_) {
      return dateStr;
    }
  }

  function isOverdue(deadlineStr, status) {
    if (!deadlineStr || status === 'completed') return false;
    const today = new Date().toISOString().split('T')[0];
    return String(deadlineStr).split('T')[0] < today;
  }

  function saveNavState() {
    sessionStorage.setItem('tp_main_tab', mainTab);
    sessionStorage.setItem('tp_view', myTeamsView);
    sessionStorage.setItem('tp_ws_section', workspaceSection);
    if (selectedTeamId) {
      sessionStorage.setItem('tp_team_id', String(selectedTeamId));
    } else {
      sessionStorage.removeItem('tp_team_id');
    }
  }

  const loadData = async () => {
    try {
      if (selectedTeamId && typeof socketManager !== 'undefined') {
        socketManager.joinTeam(selectedTeamId);
      }
      const teamParam = selectedTeamId ? selectedTeamId : (myTeamsView === 'list' ? 'list' : null);
      const [teamRes, availRes] = await Promise.all([
        api.getMyTeam(teamParam).catch(() => null),
        api.getAvailableTeamsToJoin().catch(() => ({ teams: [] }))
      ]);

      myTeamData = teamRes;
      availableTeams = availRes?.teams || [];

      // Auto-validate selectedTeamId against authorized memberships
      const myTeamsList = myTeamData?.myTeamsList || [];
      if (selectedTeamId) {
        const hasTeam = myTeamsList.some(t => t.id === selectedTeamId);
        if (!hasTeam && myTeamData?.team?.id !== selectedTeamId) {
          // If not member, revert to list
          selectedTeamId = null;
          myTeamsView = 'list';
          saveNavState();
        }
      }

      if (myTeamsView === 'applications' && selectedTeamId) {
        await loadApplications(false);
      } else if (myTeamsView === 'smart-match' && selectedTeamId) {
        await loadCandidates(false);
      } else {
        render();
      }
    } catch (err) {
      container.innerHTML = `
        <div class="card p-8 text-center text-danger" style="margin-top: 20px;">
          <i class="fa-solid fa-triangle-exclamation text-3xl mb-3 text-danger"></i>
          <h4 style="font-size: 16px; font-weight: 800; margin: 0 0 6px 0;">Error Loading Project Teams</h4>
          <p style="font-size: 13px; color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px auto;">${escapeHtml(err.message || 'Could not communicate with server.')}</p>
          <button id="btn-retry-load" class="btn btn-primary btn-sm"><i class="fa-solid fa-rotate-right mr-1"></i> Retry</button>
        </div>
      `;
      container.querySelector('#btn-retry-load')?.addEventListener('click', () => loadData());
    }
  };

  const loadApplications = async (doRender = true) => {
    const team = myTeamData?.team;
    const teamId = selectedTeamId || team?.id;
    if (!teamId) return;
    appsLoading = true;
    if (doRender) render();
    try {
      const res = await api.getTeamApplications(teamId);
      applicationsData = res;
    } catch (err) {
      console.error('Failed to load applications:', err);
      applicationsData = { applications: [], error: err.message };
    } finally {
      appsLoading = false;
      render();
    }
  };

  const loadCandidates = async (doRender = true) => {
    const team = myTeamData?.team;
    const teamId = selectedTeamId || team?.id;
    if (!teamId) return;
    candidatesLoading = true;
    if (doRender) render();
    try {
      const res = await api.getTeamCandidates(teamId);
      candidatesData = res;
    } catch (err) {
      console.error('Failed to load candidate recommendations:', err);
      candidatesData = { candidates: [], error: err.message };
    } finally {
      candidatesLoading = false;
      render();
    }
  };

  // Modals
  const openCreateTaskModal = (team) => {
    const members = myTeamData?.members || [];

    // Intelligent Assignee Suggestion Helper
    const getSuggestedAssignee = (titleText, descText) => {
      if (!members || members.length === 0) return null;
      const combined = (titleText + ' ' + descText).toLowerCase();
      let best = null;
      let highestScore = -100;

      members.forEach(m => {
        let score = 0;
        const role = (m.role_title || m.team_role || '').toLowerCase();
        const str = (m.strength || '').toLowerCase();
        const langs = (m.languages || '').toLowerCase();
        const activeWorkload = Math.max(0, (m.total_tasks || 0) - (m.completed_tasks || 0));

        if (/ui|front|client|design|css|html|react|view|layout/i.test(combined)) {
          if (str === 'frontend' || /react|html|css|javascript/i.test(langs)) score += 6;
          if (/front/i.test(role)) score += 8;
        }
        if (/api|back|server|db|database|sql|flask|fastapi|docker|endpoint|route/i.test(combined)) {
          if (str === 'backend' || /python|sql|database|api|flask/i.test(langs)) score += 6;
          if (/back|data|server/i.test(role)) score += 8;
        }
        if (/test|qa|validat|verif|integrat|check/i.test(combined)) {
          if (/test|qa/i.test(role)) score += 8;
          else score += 3;
        }
        // Workload factor: prioritize members with fewer active open tasks
        score += Math.max(0, 10 - (activeWorkload * 2));

        if (score > highestScore) {
          highestScore = score;
          best = { member: m, activeWorkload, roleTitle: m.role_title || (m.team_role === 'leader' ? 'Leader' : 'Member') };
        }
      });
      return best;
    };

    openModal({
      title: 'Create Project Task',
      maxWidth: '540px',
      contentHtml: `
        <div id="task-modal-error" style="display: none; padding: 10px 14px; border-radius: 8px; background-color: #FEE2E2; color: #DC2626; font-size: 13px; font-weight: 600; margin-bottom: 14px;"></div>
        <form id="form-create-task" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Task Title *</label>
            <input type="text" id="task-title" class="form-input" placeholder="e.g. Design Relational Database Schema" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Description & Deliverables</label>
            <textarea id="task-description" class="form-input" rows="3" placeholder="Specific deliverables and requirements for this task..." style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;"></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Assign To Project Member</label>
              <select id="task-assignee" class="form-input" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;">
                <option value="">Unassigned</option>
                ${members.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.role_title || m.team_role || 'member')})</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Task Priority</label>
              <select id="task-priority" class="form-input" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;">
                <option value="low">Low Priority</option>
                <option value="medium" selected>Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
            </div>
          </div>
          <div id="assignee-suggestion-box" style="display: none; background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #3730A3;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> <span id="assignee-suggestion-label"></span></span>
              <button type="button" id="btn-apply-suggested-assignee" class="btn btn-xs btn-primary" style="font-size: 10px; padding: 2px 8px;">Use Suggestion</button>
            </div>
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Deadline</label>
            <input type="date" id="task-deadline" class="form-input" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;" />
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
            <button type="button" class="btn btn-subtle" onclick="document.querySelector('.modal-backdrop-layer')?.remove()">Cancel</button>
            <button type="submit" id="btn-submit-create-task" class="btn btn-primary"><i class="fa-solid fa-plus mr-1"></i> Create Task</button>
          </div>
        </form>
      `
    });

    const form = document.getElementById('form-create-task');
    const errorBanner = document.getElementById('task-modal-error');

    // Dynamic Suggestion logic
    const updateSuggestionUI = () => {
      const title = document.getElementById('task-title')?.value || '';
      const desc = document.getElementById('task-description')?.value || '';
      const sugg = getSuggestedAssignee(title, desc);
      const box = document.getElementById('assignee-suggestion-box');
      const label = document.getElementById('assignee-suggestion-label');
      if (sugg && box && label) {
        box.style.display = 'block';
        label.innerHTML = `Suggested: <strong>${escapeHtml(sugg.member.name)}</strong> (${escapeHtml(sugg.roleTitle)}, ${sugg.activeWorkload} active tasks)`;
        box.dataset.suggestedId = String(sugg.member.id);
      }
    };
    document.getElementById('task-title')?.addEventListener('input', updateSuggestionUI);
    document.getElementById('task-description')?.addEventListener('input', updateSuggestionUI);
    document.getElementById('btn-apply-suggested-assignee')?.addEventListener('click', () => {
      const box = document.getElementById('assignee-suggestion-box');
      const sel = document.getElementById('task-assignee');
      if (box?.dataset.suggestedId && sel) {
        sel.value = box.dataset.suggestedId;
      }
    });
    updateSuggestionUI();

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title').value.trim();
      const description = document.getElementById('task-description').value.trim();
      const assignedTo = document.getElementById('task-assignee').value || null;
      const priority = document.getElementById('task-priority').value || 'medium';
      const deadline = document.getElementById('task-deadline').value || null;
      const btn = document.getElementById('btn-submit-create-task');

      if (!title) {
        if (errorBanner) {
          errorBanner.textContent = 'Please enter a task title.';
          errorBanner.style.display = 'block';
        }
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Creating...';
      }
      if (errorBanner) errorBanner.style.display = 'none';

      try {
        await api.createTeamTask(team.id, {
          title, description, assigned_to: assignedTo, priority, deadline
        });
        document.querySelector('.modal-backdrop-layer')?.remove();
        workspaceSection = 'tasks';
        saveNavState();
        await loadData();
      } catch (err) {
        if (errorBanner) {
          errorBanner.textContent = err.message || 'Failed to create task.';
          errorBanner.style.display = 'block';
        } else {
          alert(err.message || 'Failed to create task.');
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Create Task';
        }
      }
    });
  };

  const openEditTaskModal = (team, task) => {
    const members = myTeamData?.members || [];
    openModal({
      title: 'Edit Project Task',
      maxWidth: '520px',
      contentHtml: `
        <div id="edit-task-modal-error" style="display: none; padding: 10px 14px; border-radius: 8px; background-color: #FEE2E2; color: #DC2626; font-size: 13px; font-weight: 600; margin-bottom: 14px;"></div>
        <form id="form-edit-task" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Task Title *</label>
            <input type="text" id="edit-task-title" class="form-input" value="${escapeHtml(task.title)}" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Description & Objectives</label>
            <textarea id="edit-task-description" class="form-input" rows="3" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;">${escapeHtml(task.description || '')}</textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Assignee</label>
              <select id="edit-task-assignee" class="form-input" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;">
                <option value="">Unassigned</option>
                ${members.map(m => `<option value="${m.id}" ${task.assigned_to === m.id ? 'selected' : ''}>${escapeHtml(m.name)} (${escapeHtml(m.role_title || m.team_role || 'member')})</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Priority</label>
              <select id="edit-task-priority" class="form-input" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;">
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                <option value="medium" ${!task.priority || task.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High Priority</option>
                <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent Priority</option>
              </select>
            </div>
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Deadline</label>
            <input type="date" id="edit-task-deadline" class="form-input" value="${escapeHtml(task.deadline || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;" />
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
            <button type="button" class="btn btn-subtle" onclick="document.querySelector('.modal-backdrop-layer')?.remove()">Cancel</button>
            <button type="submit" id="btn-submit-edit-task" class="btn btn-primary"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Changes</button>
          </div>
        </form>
      `
    });

    const form = document.getElementById('form-edit-task');
    const errorBanner = document.getElementById('edit-task-modal-error');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('edit-task-title').value.trim();
      const description = document.getElementById('edit-task-description').value.trim();
      const assignedTo = document.getElementById('edit-task-assignee').value || null;
      const priority = document.getElementById('edit-task-priority').value || 'medium';
      const deadline = document.getElementById('edit-task-deadline').value || null;
      const btn = document.getElementById('btn-submit-edit-task');

      if (!title) {
        if (errorBanner) {
          errorBanner.textContent = 'Please enter a task title.';
          errorBanner.style.display = 'block';
        }
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';
      }

      try {
        await api.updateTeamTask(team.id, task.id, {
          title, description, assigned_to: assignedTo, priority, deadline
        });
        document.querySelector('.modal-backdrop-layer')?.remove();
        await loadData();
      } catch (err) {
        if (errorBanner) {
          errorBanner.textContent = err.message || 'Failed to update task.';
          errorBanner.style.display = 'block';
        } else {
          alert(err.message || 'Failed to update task.');
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> Save Changes';
        }
      }
    });
  };

  const openAssignRoleModal = (team, member) => {
    // Dynamic Skill-Based Role & Responsibilities Suggestion
    const suggestRole = (mem, tm) => {
      const strength = (mem.strength || '').toLowerCase();
      const langs = (mem.languages || '').toLowerCase();
      const tech = (tm.technologies || '').toLowerCase();
      const req = (tm.required_skills || '').toLowerCase();

      let title = 'Fullstack Engineer';
      let resp = `Collaborate across user-facing views and backend architecture to implement core milestone modules for ${tm.name}.`;

      if (strength === 'frontend' || /react|html|css|javascript|vue|ui|tailwind/i.test(langs)) {
        title = 'Frontend Developer';
        resp = `Design and implement responsive UI pages, state management, client components, and interactive user interfaces using ${tm.technologies || 'HTML5/CSS3/JavaScript'}.`;
      } else if (strength === 'backend' || /python|flask|fastapi|django|node|express|api/i.test(langs)) {
        if (/sql|db|database|mysql|sqlite|postgres|mongodb/i.test(langs) && !/node|express|flask/i.test(langs)) {
          title = 'Database Developer';
          resp = `Architect relational data models, manage database schema migrations, optimize queries, and safeguard data consistency for ${tm.name}.`;
        } else {
          title = 'Backend Developer';
          resp = `Architect RESTful API endpoints, server-side data models, secure business logic, and backend controllers using ${tm.technologies || 'Python/Flask'}.`;
        }
      } else if (/test|qa|pytest|jest|cypress|selenium/i.test(langs)) {
        title = 'Testing & Integration Specialist';
        resp = `Develop unit and integration test suites, validate API contracts, verify end-to-end user workflows, and ensure cross-module reliability.`;
      } else if (/cloud|docker|kubernetes|aws|devops/i.test(langs)) {
        title = 'DevOps & Deployment Specialist';
        resp = `Manage containerization, CI/CD pipelines, runtime environments, and deployment configurations for the project.`;
      }
      return { title, resp };
    };

    const roleSuggestion = suggestRole(member, team);

    openModal({
      title: `Assign Project Role: ${escapeHtml(member.name)}`,
      maxWidth: '540px',
      contentHtml: `
        <div id="role-modal-error" style="display: none; padding: 10px 14px; border-radius: 8px; background-color: #FEE2E2; color: #DC2626; font-size: 13px; font-weight: 600; margin-bottom: 14px;"></div>
        <form id="form-assign-role" style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Skill-Based Role Suggestion Box -->
          <div style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 10px; padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase;">
                <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Suggested Role (Based on Skills & Requirements)
              </span>
              <button type="button" id="btn-apply-role-suggestion" class="btn btn-xs btn-primary" style="font-size: 10px; padding: 2px 8px;">
                Apply Suggestion
              </button>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 3px;">
              ${escapeHtml(roleSuggestion.title)}
            </div>
            <p style="font-size: 11px; color: var(--text-secondary); margin: 0; line-height: 1.45;">
              ${escapeHtml(roleSuggestion.resp)}
            </p>
          </div>

          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Role Title *</label>
            <input type="text" id="role-title-input" class="form-input" placeholder="e.g. Frontend Lead, ML Specialist, Database Lead" value="${escapeHtml(member.role_title || '')}" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;" />
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
              ${['Frontend Developer', 'Backend Developer', 'Database Developer', 'Testing & Integration', 'Fullstack Engineer', 'DevOps Specialist'].map(preset => `
                <button type="button" class="btn btn-xs btn-subtle btn-preset-role" data-preset="${preset}" style="font-size: 10px; padding: 2px 7px;">
                  + ${preset}
                </button>
              `).join('')}
            </div>
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Assigned Responsibilities</label>
            <textarea id="responsibilities-input" class="form-input" rows="4" placeholder="Detail specific modules, architectural areas, or project milestones this member leads..." style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;">${escapeHtml(member.responsibilities || '')}</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
            <button type="button" class="btn btn-subtle" onclick="document.querySelector('.modal-backdrop-layer')?.remove()">Cancel</button>
            <button type="submit" id="btn-submit-assign-role" class="btn btn-primary"><i class="fa-solid fa-check mr-1"></i> Save Role</button>
          </div>
        </form>
      `
    });

    document.getElementById('btn-apply-role-suggestion')?.addEventListener('click', () => {
      const titleInp = document.getElementById('role-title-input');
      const respInp = document.getElementById('responsibilities-input');
      if (titleInp) titleInp.value = roleSuggestion.title;
      if (respInp) respInp.value = roleSuggestion.resp;
    });

    document.querySelectorAll('.btn-preset-role').forEach(b => {
      b.addEventListener('click', () => {
        const inp = document.getElementById('role-title-input');
        if (inp) inp.value = b.dataset.preset;
      });
    });

    const form = document.getElementById('form-assign-role');
    const errorBanner = document.getElementById('role-modal-error');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const role_title = document.getElementById('role-title-input').value.trim();
      const responsibilities = document.getElementById('responsibilities-input').value.trim();
      const btn = document.getElementById('btn-submit-assign-role');

      if (!role_title) {
        if (errorBanner) {
          errorBanner.textContent = 'Please enter a role title.';
          errorBanner.style.display = 'block';
        }
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';
      }

      try {
        await api.updateMemberRole(team.id, member.id, { role_title, responsibilities });
        document.querySelector('.modal-backdrop-layer')?.remove();
        workspaceSection = 'members';
        saveNavState();
        await loadData();
      } catch (err) {
        if (errorBanner) {
          errorBanner.textContent = err.message || 'Failed to update role.';
          errorBanner.style.display = 'block';
        } else {
          alert(err.message || 'Failed to update role.');
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Save Role';
        }
      }
    });
  };

  const openInviteModal = (team, cand) => {
    const missing = cand.missingSkillsContributed ? cand.missingSkillsContributed.join(', ') : '';
    const defaultMsg = missing
      ? `Hi ${cand.name}! We noticed your strong skills in ${missing} and would love to invite you to join our project team "${team.name}".`
      : `Hi ${cand.name}! We would love to have you join our capstone project team "${team.name}".`;

    openModal({
      title: `Invite ${cand.name} to Join Team`,
      maxWidth: '480px',
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="font-size: 13px; color: var(--color-primary); font-weight: 700;">
            Team: ${escapeHtml(team.name)} (${team.vacancies ?? 0} vacancies remaining)
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">Invitation Message:</label>
            <textarea id="modal-invite-msg" rows="3" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;">${escapeHtml(defaultMsg)}</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-subtle" onclick="document.querySelector('.modal-backdrop-layer')?.remove()">Cancel</button>
            <button class="btn btn-primary" id="btn-submit-send-invite">
              <i class="fa-solid fa-paper-plane mr-1"></i> Send Invitation
            </button>
          </div>
        </div>
      `
    });

    document.getElementById('btn-submit-send-invite')?.addEventListener('click', async (e) => {
      const msg = document.getElementById('modal-invite-msg').value;
      e.target.disabled = true;
      e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

      try {
        await api.sendTeamInvitation(team.id, cand.id, msg);
        document.querySelector('.modal-backdrop-layer')?.remove();
        cand.invitationStatus = 'pending';
        render();
      } catch (err) {
        alert(err.message || 'Failed to send invitation.');
        e.target.disabled = false;
        e.target.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i> Send Invitation';
      }
    });
  };

  const openApplyModal = (team) => {
    openModal({
      title: `Apply to Join "${team.name}"`,
      maxWidth: '480px',
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="font-size: 13px; color: var(--color-primary); font-weight: 700;">Project: ${escapeHtml(team.project_title || team.name)}</div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">Message to Team Leader:</label>
            <textarea id="modal-apply-msg" rows="3" placeholder="Explain your skills and how you can contribute to this project..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;">Hi! I would love to contribute to "${escapeHtml(team.project_title || team.name)}". My technical skills align well with your objectives.</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-subtle" onclick="document.querySelector('.modal-backdrop-layer')?.remove()">Cancel</button>
            <button class="btn btn-primary" id="btn-submit-apply">
              <i class="fa-solid fa-paper-plane mr-1"></i> Send Application
            </button>
          </div>
        </div>
      `
    });

    document.getElementById('btn-submit-apply')?.addEventListener('click', async (e) => {
      const msg = document.getElementById('modal-apply-msg').value;
      e.target.disabled = true;
      e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

      try {
        await api.requestToJoinTeam(team.id, msg);
        document.querySelector('.modal-backdrop-layer')?.remove();
        await loadData();
      } catch (err) {
        alert(err.message || 'Failed to submit application.');
        e.target.disabled = false;
        e.target.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i> Send Application';
      }
    });
  };

  // Main Render Routine
  const render = () => {
    const user = auth.getUser();
    const myTeams = myTeamData?.myTeamsList || [];
    const myTeamsCount = myTeams.length;
    const team = myTeamData?.team;
    const members = myTeamData?.members || [];
    const tasks = myTeamData?.tasks || [];
    const myTasks = myTeamData?.myTasks || [];
    const teamProgress = myTeamData?.teamProgress || { total: 0, completed: 0, percentage: 0 };
    const individualProgress = myTeamData?.individualProgress || { total: 0, completed: 0, percentage: 0 };
    const isLeader = team && (team.leader_id === user?.id || team.my_role === 'leader');
    const confirmedCount = team?.confirmed_members ?? members.length;
    const maxMembers = team?.max_members || 4;
    const vacancies = team?.vacancies ?? Math.max(0, maxMembers - confirmedCount);
    const incomingRequests = myTeamData?.incomingRequests || [];
    const pendingRequests = incomingRequests.filter(r => r.status === 'pending');

    const filteredAvailable = availableTeams.filter((t) => {
      const q = searchQuery.toLowerCase();
      return !q ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.project_title && t.project_title.toLowerCase().includes(q)) ||
        (t.domain && t.domain.toLowerCase().includes(q)) ||
        (t.technologies && t.technologies.toLowerCase().includes(q));
    });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- PAGE ONE: HEADER BANNER (Purple/Indigo Theme) -->
        <div class="card" style="background: linear-gradient(135deg, #312E81 0%, #4338CA 50%, #4F46E5 100%); color: #fff; padding: 24px 28px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.35);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 4px 0; color: #fff; letter-spacing: -0.3px;">
                Project Teams
              </h2>
              <p style="font-size: 13px; opacity: 0.92; margin: 0; color: rgba(255, 255, 255, 0.9);">
                Build your team. Find your people. Create together.
              </p>
            </div>

            <!-- Main Navigation (My Teams / Available Teams / Create Team) -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; background-color: rgba(0, 0, 0, 0.18); padding: 5px; border-radius: 12px;">
              <button id="nav-tab-my-teams" class="btn btn-sm" style="${mainTab === 'my-teams' ? 'background-color: #fff; color: #4338CA; font-weight: 700;' : 'color: #fff; background: transparent; border: none; font-weight: 500;'}">
                <i class="fa-solid fa-users mr-1"></i> My Teams <span style="font-size: 11px; padding: 2px 6px; border-radius: 10px; background: ${mainTab === 'my-teams' ? '#EEF2FF' : 'rgba(255,255,255,0.2)'}; color: ${mainTab === 'my-teams' ? '#4338CA' : '#fff'}; margin-left: 4px;">${myTeamsCount}</span>
              </button>
              <button id="nav-tab-available-teams" class="btn btn-sm" style="${mainTab === 'available-teams' ? 'background-color: #fff; color: #4338CA; font-weight: 700;' : 'color: #fff; background: transparent; border: none; font-weight: 500;'}">
                <i class="fa-solid fa-magnifying-glass mr-1"></i> Available Teams <span style="font-size: 11px; padding: 2px 6px; border-radius: 10px; background: ${mainTab === 'available-teams' ? '#EEF2FF' : 'rgba(255,255,255,0.2)'}; color: ${mainTab === 'available-teams' ? '#4338CA' : '#fff'}; margin-left: 4px;">${availableTeams.length}</span>
              </button>
              <button id="nav-tab-create-team" class="btn btn-sm" style="${mainTab === 'create-team' ? 'background-color: #fff; color: #4338CA; font-weight: 700;' : 'color: #fff; background: transparent; border: none; font-weight: 500;'}">
                <i class="fa-solid fa-plus mr-1"></i> Create Team
              </button>
            </div>
          </div>
        </div>

        <!-- MAIN TAB 1: MY TEAMS -->
        ${mainTab === 'my-teams' ? `
          <!-- VIEW 1: MY TEAMS LIST -->
          ${myTeamsView === 'list' ? `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">My Project Teams</h3>
                  <span style="font-size: 12px; color: var(--text-secondary);">Teams and capstone formations you are a confirmed member of.</span>
                </div>
                <div>
                  <span class="badge badge-indigo" style="font-weight: 700;">${myTeamsCount} Confirmed ${myTeamsCount === 1 ? 'Team' : 'Teams'}</span>
                </div>
              </div>

              ${myTeamsCount === 0 ? `
                <div class="card p-8 text-center text-muted" style="border: 1px dashed var(--border-color); background-color: var(--bg-subtle); padding: 48px 24px; border-radius: 16px;">
                  <i class="fa-solid fa-people-group text-4xl mb-3 text-indigo" style="opacity: 0.6;"></i>
                  <h4 style="font-size: 16px; font-weight: 800; margin: 0 0 6px 0; color: var(--text-primary);">You haven't joined any teams yet</h4>
                  <p style="font-size: 13px; color: var(--text-secondary); max-width: 480px; margin: 0 auto 20px auto; line-height: 1.5;">
                    Explore approved teams currently recruiting members that match your tech stack, or submit a new capstone proposal to lead your own team.
                  </p>
                  <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button id="btn-empty-goto-available" class="btn btn-primary btn-sm"><i class="fa-solid fa-magnifying-glass mr-1"></i> Browse Available Teams</button>
                    <button id="btn-empty-goto-create" class="btn btn-subtle btn-sm"><i class="fa-solid fa-plus mr-1"></i> Create Team</button>
                  </div>
                </div>
              ` : `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px;">
                  ${myTeams.map(t => {
                    const isLead = t.leader_id === user?.id || t.my_role === 'leader';
                    const totTasks = t.total_tasks || 0;
                    const compTasks = t.completed_tasks || 0;
                    const progPct = t.progress_percentage || 0;
                    const memCount = t.member_count || 1;
                    const maxMem = t.max_members || 4;
                    const vac = Math.max(0, maxMem - memCount);

                    return `
                      <div class="card hover-lift" style="padding: 20px 22px; border: 1px solid var(--border-color); border-radius: 14px; background-color: #fff; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                          <!-- Card Top Row: Badges -->
                          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px;">
                            <span style="font-size: 11px; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
                              ${escapeHtml(t.domain || 'Capstone')}
                            </span>
                            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                              <span class="badge ${t.status === 'approved' ? 'badge-emerald' : 'badge-amber'}" style="font-size: 10px;">
                                ${escapeHtml((t.status || 'pending').replace('_', ' ').toUpperCase())}
                              </span>
                              <span class="badge ${isLead ? 'badge-amber' : 'badge-indigo'}" style="font-size: 10px;">
                                ${isLead ? 'Leader' : 'Member'}
                              </span>
                            </div>
                          </div>

                          <!-- Project / Team Title -->
                          <h4 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0 0 3px 0; line-height: 1.3;">
                            ${escapeHtml(t.name)}
                          </h4>
                          <div style="font-size: 13px; font-weight: 600; color: #4338CA; margin-bottom: 8px;">
                            ${escapeHtml(t.project_title || 'Capstone Project')}
                          </div>

                          <!-- Description -->
                          <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; margin: 0 0 14px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${escapeHtml(t.description || 'No description provided.')}
                          </p>

                          <!-- Compact Meta Row -->
                          <div style="display: flex; flex-direction: column; gap: 8px; background-color: var(--bg-subtle); padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; font-size: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                              <span style="color: var(--text-muted);">Team Leader:</span>
                              <strong style="color: var(--text-primary);">${escapeHtml(t.leader_name || 'N/A')}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                              <span style="color: var(--text-muted);">Capacity:</span>
                              <span style="font-weight: 600; color: var(--text-primary);">${memCount} / ${maxMem} members (${vac} vacancies)</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                              <span style="color: var(--text-muted);">My Role:</span>
                              <span style="font-weight: 600; color: #4338CA;">${escapeHtml(t.my_role_title || (isLead ? 'Project Leader' : 'Team Member'))}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                              <span style="color: var(--text-muted);">Deadline:</span>
                              <span style="font-weight: 600; color: var(--text-primary);">${formatDeadline(t.target_date)}</span>
                            </div>
                          </div>

                          <!-- Real Task Progress Row -->
                          <div style="margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 4px;">
                              <span style="font-weight: 700; color: var(--text-secondary);">Task Progress:</span>
                              ${totTasks > 0 ? `
                                <strong style="color: #4338CA;">${compTasks}/${totTasks} completed (${progPct}%)</strong>
                              ` : `
                                <span style="color: var(--text-muted); font-style: italic;">No tasks yet</span>
                              `}
                            </div>
                            ${totTasks > 0 ? `
                              <div style="width: 100%; height: 6px; background-color: #EEF2FF; border-radius: 3px; overflow: hidden;">
                                <div style="width: ${progPct}%; height: 100%; background: linear-gradient(90deg, #4338CA, #10B981); border-radius: 3px;"></div>
                              </div>
                            ` : ''}
                          </div>
                        </div>

                        <!-- Primary Action: Open Workspace -->
                        <button class="btn btn-primary btn-sm btn-open-workspace" data-id="${t.id}" style="width: 100%;">
                          <i class="fa-solid fa-arrow-right mr-1"></i> Open Team / Workspace
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          ` : myTeamsView === 'workspace' && team ? `
            <!-- VIEW 2: SELECTED PROJECT WORKSPACE -->
            <div class="card" style="padding: 24px; border-radius: 16px;">
              <!-- Workspace Compact Header -->
              <div style="border-bottom: 1px solid var(--border-light); padding-bottom: 18px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                  <button id="btn-back-to-teams-list" class="btn btn-xs btn-subtle">
                    <i class="fa-solid fa-arrow-left mr-1"></i> Back to My Teams
                  </button>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <span style="font-size: 11px; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
                      ${escapeHtml(team.domain || 'Capstone')}
                    </span>
                    <span class="badge ${team.status === 'approved' ? 'badge-emerald' : 'badge-amber'}">
                      ${escapeHtml((team.status || 'pending').replace('_', ' ').toUpperCase())}
                    </span>
                    <span class="badge ${isLeader ? 'badge-amber' : 'badge-indigo'}">
                      ${isLeader ? 'Leader' : 'Member'}
                    </span>
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
                  <div>
                    <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                      ${escapeHtml(team.name)}
                    </h3>
                    <div style="font-size: 14px; font-weight: 600; color: #4338CA;">
                      ${escapeHtml(team.project_title || 'Capstone Project')}
                    </div>
                    ${team.description ? `
                      <p style="font-size: 12px; color: var(--text-secondary); margin: 6px 0 0 0; max-width: 680px; line-height: 1.45;">
                        ${escapeHtml(team.description)}
                      </p>
                    ` : ''}
                  </div>

                  <!-- Leader Separate Navigation Actions (Applications & Smart Match) -->
                  <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    ${isLeader ? `
                      <button id="btn-header-create-task" class="btn btn-sm btn-primary">
                        <i class="fa-solid fa-plus mr-1"></i> Create Task
                      </button>
                      <button id="btn-header-assign-roles" class="btn btn-sm btn-subtle">
                        <i class="fa-solid fa-users-gear mr-1"></i> Assign Roles
                      </button>
                      <button id="btn-nav-applications" class="btn btn-sm btn-subtle">
                        <i class="fa-solid fa-clipboard-list mr-1"></i> Applications
                        ${pendingRequests.length > 0 ? `<span class="badge badge-amber" style="margin-left: 5px; font-size: 10px;">${pendingRequests.length}</span>` : ''}
                      </button>
                      <button id="btn-nav-smart-match" class="btn btn-sm btn-primary">
                        <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Smart Match
                        <span class="badge badge-indigo" style="margin-left: 5px; font-size: 10px; background-color: rgba(255,255,255,0.25); color: #fff;">${vacancies} Open</span>
                      </button>
                    ` : ''}
                  </div>
                </div>

                <!-- Metrics Strip -->
                <div style="display: flex; gap: 20px; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-light); flex-wrap: wrap; font-size: 12px; color: var(--text-secondary);">
                  <div>Leader: <strong style="color: var(--text-primary);">${escapeHtml(team.leader_name || 'N/A')}</strong></div>
                  <div>Members: <strong style="color: var(--text-primary);">${confirmedCount} / ${maxMembers}</strong> (${vacancies} vacancies)</div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Recruiting:</span>
                    <span class="badge ${team.is_accepting_members ? 'badge-emerald' : 'badge-subtle'}" style="font-size: 10px;">
                      ${team.is_accepting_members ? 'Open' : 'Closed'}
                    </span>
                    ${isLeader ? `
                      <button id="btn-toggle-recruiting" class="btn btn-xs btn-subtle" style="font-size: 10px; padding: 1px 6px;">
                        ${team.is_accepting_members ? 'Close' : 'Open'}
                      </button>
                    ` : ''}
                  </div>
                  <div>Deadline: <strong style="color: var(--text-primary);">${formatDeadline(team.target_date)}</strong></div>
                </div>
              </div>

              <!-- Workspace Navigation Tabs (4 Core Sections) -->
              <div style="display: flex; gap: 6px; border-bottom: 2px solid var(--border-light); margin-bottom: 20px; overflow-x: auto; padding-bottom: 2px;">
                <button id="ws-tab-overview" class="btn btn-sm ${workspaceSection === 'overview' ? 'btn-primary' : 'btn-subtle'}" style="border-radius: 8px 8px 0 0; ${workspaceSection === 'overview' ? 'font-weight: 700;' : ''}">
                  <i class="fa-solid fa-chart-line mr-1"></i> Overview
                </button>
                <button id="ws-tab-tasks" class="btn btn-sm ${workspaceSection === 'tasks' ? 'btn-primary' : 'btn-subtle'}" style="border-radius: 8px 8px 0 0; ${workspaceSection === 'tasks' ? 'font-weight: 700;' : ''}">
                  <i class="fa-solid fa-list-check mr-1"></i> Tasks & Progress
                  <span class="badge ${workspaceSection === 'tasks' ? 'badge-subtle' : 'badge-indigo'}" style="margin-left: 4px; font-size: 10px;">${tasks.length}</span>
                </button>
                <button id="ws-tab-members" class="btn btn-sm ${workspaceSection === 'members' ? 'btn-primary' : 'btn-subtle'}" style="border-radius: 8px 8px 0 0; ${workspaceSection === 'members' ? 'font-weight: 700;' : ''}">
                  <i class="fa-solid fa-users-gear mr-1"></i> Members & Roles
                  <span class="badge ${workspaceSection === 'members' ? 'badge-subtle' : 'badge-indigo'}" style="margin-left: 4px; font-size: 10px;">${members.length}</span>
                </button>
                <button id="ws-tab-files" class="btn btn-sm ${workspaceSection === 'files' ? 'btn-primary' : 'btn-subtle'}" style="border-radius: 8px 8px 0 0; ${workspaceSection === 'files' ? 'font-weight: 700;' : ''}">
                  <i class="fa-solid fa-folder-open mr-1"></i> Chat & Files
                </button>
              </div>

              <!-- SECTION 1: OVERVIEW -->
              ${workspaceSection === 'overview' ? `
                <div style="display: flex; flex-direction: column; gap: 20px;">
                  <!-- Project Objectives & Details Card -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                    <!-- Overall Progress Card -->
                    <div class="card" style="padding: 18px 20px; border: 1px solid var(--border-color); border-radius: 12px; background-color: #fff;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 13px; font-weight: 800; color: var(--text-primary);"><i class="fa-solid fa-chart-pie text-indigo mr-1"></i> Overall Task Completion</span>
                        <strong style="font-size: 16px; color: #4338CA;">${teamProgress.total > 0 ? `${teamProgress.percentage}%` : 'No tasks yet'}</strong>
                      </div>
                      ${teamProgress.total > 0 ? `
                        <div style="width: 100%; height: 8px; background-color: #EEF2FF; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
                          <div style="width: ${teamProgress.percentage}%; height: 100%; background: linear-gradient(90deg, #4338CA, #10B981); border-radius: 4px;"></div>
                        </div>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; font-size: 11px;">
                          <span class="badge badge-emerald"><i class="fa-solid fa-check mr-1"></i>${teamProgress.completed} Completed</span>
                          <span class="badge badge-amber"><i class="fa-solid fa-clock mr-1"></i>${teamProgress.in_progress} In Progress</span>
                          <span class="badge badge-subtle">${teamProgress.not_started} Not Started</span>
                          ${teamProgress.overdue > 0 ? `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${teamProgress.overdue} Overdue</span>` : ''}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 10px; margin-top: 12px;">
                          <span style="font-size: 11px; color: var(--text-muted);"><strong>${teamProgress.total}</strong> total project deliverables</span>
                          ${isLeader ? `<button id="btn-overview-create-task" class="btn btn-xs btn-primary"><i class="fa-solid fa-plus mr-1"></i> Create Task</button>` : ''}
                        </div>
                      ` : `
                        <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 12px 0; font-style: italic;">
                          No tasks created yet for this project team.
                        </p>
                        ${isLeader ? `
                          <button id="btn-overview-create-task" class="btn btn-xs btn-primary"><i class="fa-solid fa-plus mr-1"></i> Create First Task</button>
                        ` : ''}
                      `}
                    </div>

                    <!-- My Role Card -->
                    <div class="card" style="padding: 18px 20px; border: 1px solid var(--border-color); border-radius: 12px; background-color: #fff;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 11px; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">My Project Role</span>
                        <span class="badge ${isLeader ? 'badge-amber' : 'badge-indigo'}">${isLeader ? 'Leader' : 'Member'}</span>
                      </div>
                      <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                        ${escapeHtml(team.role_title || (isLeader ? 'Project Leader' : 'Team Member'))}
                      </h4>
                      <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; margin: 0 0 12px 0;">
                        ${escapeHtml(team.responsibilities || 'Responsible for module implementation and milestone deliverables.')}
                      </p>
                      <div style="border-top: 1px solid var(--border-light); padding-top: 8px; font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
                        <span>My Assigned Work:</span>
                        ${individualProgress.total > 0 ? `
                          <strong style="color: #4338CA;">${individualProgress.completed}/${individualProgress.total} completed (${individualProgress.percentage}%)</strong>
                        ` : `
                          <span style="color: var(--text-muted);">No tasks assigned</span>
                        `}
                      </div>
                    </div>
                  </div>

                  <!-- Description & Technologies Bar -->
                  <div class="card" style="padding: 18px 20px; border: 1px solid var(--border-color); border-radius: 12px; background-color: var(--bg-subtle);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                      <div>
                        <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">Target Technologies</span>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                          ${team.technologies ? team.technologies.split(',').map(t => `<span class="badge badge-indigo text-xs">${escapeHtml(t.trim())}</span>`).join('') : '<span style="font-size: 12px; color: var(--text-muted);">None listed</span>'}
                        </div>
                      </div>
                      <div>
                        <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">Faculty Guide / Mentor</span>
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: gap; gap: 8px;">
                          <div>
                            <strong style="font-size: 13px; color: var(--text-primary); display: block;">${escapeHtml(team.faculty_name || 'Awaiting HOD allocation')}</strong>
                            ${team.faculty_email ? `<span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(team.faculty_email)}</span>` : ''}
                          </div>
                          ${team.faculty_id ? `
                            <button class="btn btn-xs btn-subtle btn-inspect-team-fac" data-id="${team.faculty_id}"><i class="fa-solid fa-eye mr-1"></i> View Mentor</button>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ` : workspaceSection === 'tasks' ? `
                <!-- SECTION 2: TASKS & PROGRESS -->
                <div style="display: flex; flex-direction: column; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                      <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">Project Tasks & Deliverables</h4>
                      <span style="font-size: 12px; color: var(--text-secondary);">Track implementation milestones, deadlines, and individual task completion.</span>
                    </div>
                    ${isLeader ? `
                      <button id="btn-ws-create-task" class="btn btn-sm btn-primary">
                        <i class="fa-solid fa-plus mr-1"></i> Create Task
                      </button>
                    ` : ''}
                  </div>

                  <!-- Task Filter Tabs -->
                  <div style="display: flex; gap: 6px; flex-wrap: wrap; background-color: var(--bg-subtle); padding: 4px; border-radius: 10px;">
                    <button class="btn btn-xs btn-task-filter ${taskFilter === 'all' ? 'btn-primary' : 'btn-subtle'}" data-filter="all">All (${tasks.length})</button>
                    <button class="btn btn-xs btn-task-filter ${taskFilter === 'my' ? 'btn-primary' : 'btn-subtle'}" data-filter="my">My Tasks (${myTasks.length})</button>
                    <button class="btn btn-xs btn-task-filter ${taskFilter === 'in_progress' ? 'btn-primary' : 'btn-subtle'}" data-filter="in_progress">In Progress (${teamProgress.in_progress || 0})</button>
                    <button class="btn btn-xs btn-task-filter ${taskFilter === 'completed' ? 'btn-primary' : 'btn-subtle'}" data-filter="completed">Completed (${teamProgress.completed || 0})</button>
                    <button class="btn btn-xs btn-task-filter ${taskFilter === 'not_started' ? 'btn-primary' : 'btn-subtle'}" data-filter="not_started">Not Started (${teamProgress.not_started || 0})</button>
                  </div>

                  <!-- Tasks List -->
                  ${(() => {
                    const filteredTasks = tasks.filter(t => {
                      if (taskFilter === 'my') return t.assigned_to === user?.id;
                      if (taskFilter === 'in_progress') return t.status === 'in_progress';
                      if (taskFilter === 'completed') return t.status === 'completed';
                      if (taskFilter === 'not_started') return t.status === 'not_started';
                      return true;
                    });

                    if (filteredTasks.length === 0) {
                      return `
                        <div class="card p-8 text-center text-muted" style="border: 1px dashed var(--border-color); background-color: var(--bg-subtle); border-radius: 12px;">
                          <i class="fa-solid fa-list-check text-3xl mb-2" style="opacity: 0.5;"></i>
                          <h4 style="font-size: 14px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">No tasks found</h4>
                          <p style="font-size: 12px; margin: 0;">${taskFilter === 'all' ? 'No project tasks created yet.' : 'No tasks match the selected filter.'}</p>
                        </div>
                      `;
                    }

                    return `
                      <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${filteredTasks.map(t => {
                          const overdue = isOverdue(t.deadline, t.status);
                          const canUpdate = (t.assigned_to === user?.id) || isLeader;

                          return `
                            <div class="card" style="padding: 16px 18px; border: 1px solid var(--border-color); border-radius: 12px; background-color: #fff;">
                              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                                <div>
                                  <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="badge ${t.status === 'completed' ? 'badge-emerald' : t.status === 'in_progress' ? 'badge-amber' : 'badge-subtle'}">
                                      ${t.status === 'completed' ? 'Completed' : t.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                                    </span>
                                    ${(() => {
                                      const p = (t.priority || 'medium').toLowerCase();
                                      if (p === 'urgent') return '<span class="badge badge-danger" style="font-size: 10px;"><i class="fa-solid fa-fire mr-1"></i>Urgent</span>';
                                      if (p === 'high') return '<span class="badge badge-amber" style="font-size: 10px;"><i class="fa-solid fa-arrow-up mr-1"></i>High</span>';
                                      if (p === 'low') return '<span class="badge badge-subtle" style="font-size: 10px;">Low</span>';
                                      return '<span class="badge badge-indigo" style="font-size: 10px;">Medium</span>';
                                    })()}
                                    <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0;">${escapeHtml(t.title)}</h4>
                                  </div>
                                  ${t.description ? `<p style="font-size: 12px; color: var(--text-secondary); margin: 6px 0 0 0; line-height: 1.4;">${escapeHtml(t.description)}</p>` : ''}
                                </div>
                                ${isLeader ? `
                                  <div style="display: flex; gap: 6px;">
                                    <button class="btn btn-xs btn-subtle btn-edit-task" data-id="${t.id}" title="Edit Task"><i class="fa-solid fa-pencil"></i></button>
                                    <button class="btn btn-xs btn-danger btn-delete-task" data-id="${t.id}" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
                                  </div>
                                ` : ''}
                              </div>

                              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 10px; flex-wrap: wrap; gap: 10px; font-size: 12px;">
                                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                                  <div style="display: flex; align-items: center; gap: 6px;">
                                    <img src="${t.assigned_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" />
                                    <span style="color: var(--text-secondary);">Assigned to: <strong style="color: var(--text-primary);">${escapeHtml(t.assigned_name || 'Unassigned')}</strong></span>
                                  </div>
                                  <div style="color: ${overdue ? '#DC2626' : 'var(--text-muted)'}; display: flex; align-items: center; gap: 4px;">
                                    <i class="fa-regular fa-calendar"></i>
                                    <span>Deadline: <strong>${formatDeadline(t.deadline)}</strong></span>
                                  </div>
                                </div>

                                <div style="display: flex; align-items: center; gap: 6px;">
                                  ${canUpdate ? `
                                    ${t.status === 'not_started' ? `
                                      <button class="btn btn-xs btn-primary btn-task-status-toggle" data-task-id="${t.id}" data-status="in_progress"><i class="fa-solid fa-play mr-1"></i> Start Work</button>
                                      <button class="btn btn-xs btn-subtle btn-task-status-toggle" data-task-id="${t.id}" data-status="completed"><i class="fa-solid fa-check mr-1"></i> Complete</button>
                                    ` : t.status === 'in_progress' ? `
                                      <button class="btn btn-xs btn-emerald btn-task-status-toggle" data-task-id="${t.id}" data-status="completed" style="background-color: #10B981; color: #fff;"><i class="fa-solid fa-check mr-1"></i> Mark Complete</button>
                                      <button class="btn btn-xs btn-subtle btn-task-status-toggle" data-task-id="${t.id}" data-status="not_started">Reset</button>
                                    ` : `
                                      <span style="font-size: 11px; font-weight: 700; color: #10B981;"><i class="fa-solid fa-circle-check mr-1"></i> Done</span>
                                      <button class="btn btn-xs btn-subtle btn-task-status-toggle" data-task-id="${t.id}" data-status="in_progress" style="margin-left: 6px;">Reopen</button>
                                    `}
                                  ` : `
                                    <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Assigned to ${escapeHtml(t.assigned_name || 'teammate')}</span>
                                  `}
                                </div>
                              </div>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    `;
                  })()}
                </div>
              ` : workspaceSection === 'members' ? `
                <!-- SECTION 3: MEMBERS & ROLES -->
                <div style="display: flex; flex-direction: column; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                      <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">Confirmed Team Members & Roles</h4>
                      <span style="font-size: 12px; color: var(--text-secondary);">Assign specific responsibilities and track individual deliverable progress.</span>
                    </div>
                    ${isLeader ? `
                      <button id="btn-roster-assign-roles" class="btn btn-xs btn-primary">
                        <i class="fa-solid fa-users-gear mr-1"></i> Manage Member Roles
                      </button>
                    ` : ''}
                  </div>

                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
                    ${members.map(m => {
                      const mTot = m.total_tasks || 0;
                      const mComp = m.completed_tasks || 0;
                      const mPct = m.progress_percentage || 0;

                      return `
                        <div class="card" style="padding: 18px 20px; border: 1px solid var(--border-color); border-radius: 12px; background-color: #fff; display: flex; flex-direction: column; justify-content: space-between;">
                          <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                              <div style="display: flex; align-items: center; gap: 12px;">
                                <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" />
                                <div>
                                  <strong style="font-size: 15px; color: var(--text-primary); display: block;">${escapeHtml(m.name)}</strong>
                                  <span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(m.email)}</span>
                                </div>
                              </div>
                              <span class="badge ${m.team_role === 'leader' ? 'badge-amber' : 'badge-indigo'}">
                                ${m.team_role === 'leader' ? 'Leader' : 'Member'}
                              </span>
                            </div>

                            <div style="background-color: var(--bg-subtle); padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 12px;">
                              <div style="font-weight: 700; color: #4338CA; margin-bottom: 2px;">
                                ${escapeHtml(m.role_title || (m.team_role === 'leader' ? 'Project Leader' : 'Team Member'))}
                              </div>
                              <p style="margin: 0; color: var(--text-secondary); line-height: 1.4;">
                                ${escapeHtml(m.responsibilities || 'Responsible for contributing to core capstone modules and scheduled milestone deliverables.')}
                              </p>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary); margin-bottom: 14px;">
                              <span>Individual Task Progress:</span>
                              ${mTot > 0 ? `
                                <strong style="color: #4338CA;">${mComp}/${mTot} tasks completed (${mPct}%)</strong>
                              ` : `
                                <span style="color: var(--text-muted);">No tasks assigned</span>
                              `}
                            </div>
                          </div>

                          ${isLeader ? `
                            <button class="btn btn-xs btn-subtle btn-assign-member-role" data-id="${m.id}" data-name="${escapeHtml(m.name)}" data-title="${escapeHtml(m.role_title || '')}" data-resp="${escapeHtml(m.responsibilities || '')}" style="width: 100%;">
                              <i class="fa-solid fa-pencil mr-1"></i> Assign Role & Responsibilities
                            </button>
                          ` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              ` : `
                <!-- SECTION 4: CHAT & FILES -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                  <div class="card" style="padding: 24px; border: 1px solid var(--border-color); border-radius: 14px; background-color: #fff;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 14px;">
                      <i class="fa-solid fa-comments"></i>
                    </div>
                    <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">Team Group Chat</h4>
                    <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 16px 0; line-height: 1.45;">
                      Connect in real time with your confirmed team members and assigned faculty guide for discussions and project milestones.
                    </p>
                    <button id="btn-ws-open-chat" class="btn btn-primary" style="width: 100%;">
                      <i class="fa-solid fa-comment-dots mr-1"></i> Open Team & Mentor Chat
                    </button>
                  </div>

                  <div class="card" style="padding: 24px; border: 1px solid var(--border-color); border-radius: 14px; background-color: #fff;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 14px;">
                      <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">Project Deliverables & Files</h4>
                    <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 16px 0; line-height: 1.45;">
                      Project milestone reports, software architectures, and codebase repositories are submitted and verified in coordination with your faculty mentor during scheduled reviews.
                    </p>
                    <span class="badge badge-indigo" style="padding: 6px 12px; font-size: 11px;">Active Workspace Deliverables</span>
                  </div>
                </div>
              `}
            </div>
          ` : myTeamsView === 'applications' && team ? `
            <!-- VIEW 3: APPLICATIONS (SEPARATE PAGE) -->
            <div class="card" style="padding: 24px; border-radius: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; gap: 8px;">
                  <button id="btn-app-back-workspace" class="btn btn-sm btn-subtle">
                    <i class="fa-solid fa-arrow-left mr-1"></i> Back to Workspace
                  </button>
                  <button id="btn-app-back-my-teams" class="btn btn-sm btn-subtle">
                    <i class="fa-solid fa-list mr-1"></i> Back to My Teams
                  </button>
                </div>
                <div style="text-align: right;">
                  <span class="badge badge-indigo">
                    ${(applicationsData?.applications || []).length} Total Applications
                  </span>
                </div>
              </div>

              <div style="margin-bottom: 18px;">
                <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                  Applications — ${escapeHtml(team.name)}
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Review candidate profiles and manually accept or reject student applications for this project.
                </span>
              </div>

              <!-- Application Filters -->
              <div style="display: flex; gap: 6px; flex-wrap: wrap; background-color: var(--bg-subtle); padding: 4px; border-radius: 10px; margin-bottom: 16px;">
                ${['all', 'pending', 'accepted', 'rejected'].map(f => `
                  <button class="btn btn-xs btn-app-filter ${appFilter === f ? 'btn-primary' : 'btn-subtle'}" data-filter="${f}" style="text-transform: capitalize;">
                    ${f} (${(applicationsData?.applications || []).filter(a => f === 'all' || a.status === f).length})
                  </button>
                `).join('')}
              </div>

              ${appsLoading ? `
                <div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo mb-2"></i><div>Loading applications...</div></div>
              ` : (() => {
                const appList = (applicationsData?.applications || []).filter(a => appFilter === 'all' || a.status === appFilter);
                if (appList.length === 0) {
                  return `
                    <div class="card p-8 text-center text-muted" style="border: 1px dashed var(--border-color); background-color: var(--bg-subtle); border-radius: 12px;">
                      <i class="fa-solid fa-inbox text-3xl mb-2" style="opacity: 0.5;"></i>
                      <h4 style="font-size: 15px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">No applications found</h4>
                      <p style="font-size: 12px; margin: 0;">${appFilter === 'all' ? 'No applications received yet for this project.' : `No applications match the ${appFilter} status.`}</p>
                    </div>
                  `;
                }

                return `
                  <div style="display: flex; flex-direction: column; gap: 14px;">
                    ${appList.map(req => `
                      <div class="card" style="padding: 18px 20px; border: 1px solid var(--border-color); border-radius: 12px; background-color: #fff;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                          <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${req.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" />
                            <div>
                              <strong style="font-size: 15px; color: var(--text-primary);">${escapeHtml(req.student_name)}</strong>
                              <div style="font-size: 12px; color: var(--text-secondary);">
                                ${escapeHtml(req.reg_no || '')} • ${escapeHtml(req.department || 'Computer Science')} • <span style="text-transform: capitalize;">${escapeHtml(req.strength || 'Fullstack')}</span>
                              </div>
                            </div>
                          </div>

                          <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge ${req.compatibility_score >= 80 ? 'badge-emerald' : 'badge-indigo'}" style="font-weight: 700;">
                              ${req.compatibility_score}% Skill Match
                            </span>
                            <span class="badge ${req.status === 'accepted' ? 'badge-emerald' : req.status === 'rejected' ? 'badge-danger' : 'badge-amber'}" style="text-transform: uppercase;">
                              ${escapeHtml(req.status)}
                            </span>
                          </div>
                        </div>

                        ${req.message ? `
                          <div style="background-color: var(--bg-subtle); padding: 10px 14px; border-radius: 8px; font-size: 12px; color: var(--text-primary); margin-bottom: 10px; font-style: italic;">
                            "${escapeHtml(req.message)}"
                          </div>
                        ` : ''}

                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-top: 1px solid var(--border-light); padding-top: 12px;">
                          <div style="font-size: 12px; color: var(--text-secondary);">
                            <strong>Skills:</strong> ${escapeHtml(req.languages || 'None listed')}
                          </div>

                          <div style="display: flex; gap: 8px; align-items: center;">
                            <button class="btn btn-sm btn-subtle btn-inspect-candidate" data-id="${req.student_id}">
                              <i class="fa-solid fa-eye mr-1"></i> View Profile
                            </button>
                            ${req.status === 'pending' ? `
                              <button class="btn btn-sm btn-danger btn-decide-join" data-id="${req.id}" data-action="reject">
                                Reject
                              </button>
                              <button class="btn btn-sm btn-primary btn-decide-join" data-id="${req.id}" data-action="accept" ${vacancies === 0 ? 'disabled title="Team is full"' : ''}>
                                Accept
                              </button>
                              ${vacancies === 0 ? '<span style="font-size: 11px; color: var(--color-danger); font-weight: 600;">Team Complete (0 vacancies)</span>' : ''}
                            ` : ''}
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `;
              })()}
            </div>
          ` : myTeamsView === 'smart-match' && team ? `
            <!-- VIEW 4: SMART MATCH (SEPARATE PAGE) -->
            <div class="card" style="padding: 24px; border-radius: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; gap: 8px;">
                  <button id="btn-sm-back-workspace" class="btn btn-sm btn-subtle">
                    <i class="fa-solid fa-arrow-left mr-1"></i> Back to Workspace
                  </button>
                  <button id="btn-sm-back-my-teams" class="btn btn-sm btn-subtle">
                    <i class="fa-solid fa-list mr-1"></i> Back to My Teams
                  </button>
                </div>
                <div style="text-align: right;">
                  <span class="badge ${vacancies > 0 ? 'badge-emerald' : 'badge-danger'}">
                    ${vacancies} Vacancies Remaining
                  </span>
                </div>
              </div>

              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                  Smart Match — ${escapeHtml(team.name)}
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Fill project vacancies with compatible students who contribute missing team skills.
                </span>
              </div>

              <!-- Skill Balance Card -->
              <div style="border: 1px solid var(--border-color); border-radius: 14px; padding: 20px 22px; margin-bottom: 24px;">
                <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 10px 0;">Team Skill Balance & Gap Analysis</h4>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
                  ${(candidatesData?.skillBalance?.categories || [
                    { name: 'Python / Backend', status: 'Covered' },
                    { name: 'Frontend / UI', status: 'Needed' },
                    { name: 'Testing / QA', status: 'Needed' },
                    { name: 'Database', status: 'Covered' }
                  ]).map(cat => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; background-color: var(--bg-subtle);">
                      <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${escapeHtml(cat.name)}</span>
                      <span class="badge ${cat.status === 'Covered' ? 'badge-emerald' : 'badge-amber'}" style="font-weight: 700; font-size: 11px;">
                        ${escapeHtml(cat.status)}
                      </span>
                    </div>
                  `).join('')}
                </div>
                <div style="background-color: #EEF2FF; border-left: 4px solid #4338CA; border-radius: 8px; padding: 12px 16px;">
                  <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 12px; color: #4338CA; margin-bottom: 2px;">
                    <i class="fa-regular fa-comment-dots"></i> Recommended Next Step
                  </div>
                  <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                    ${escapeHtml(candidatesData?.skillBalance?.recommendedNextStep || 'Prioritize students who can contribute missing team skills.')}
                  </div>
                </div>
              </div>

              <!-- Candidate Recommendations List -->
              ${vacancies === 0 ? `
                <div class="card p-8 text-center" style="background-color: var(--bg-subtle); border-radius: 14px;">
                  <i class="fa-solid fa-circle-check text-emerald text-3xl mb-2"></i>
                  <h4 style="font-weight: 800; font-size: 16px; margin: 0 0 6px 0; color: var(--text-primary);">Team Complete</h4>
                  <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">
                    Your team has reached maximum capacity (${maxMembers} / ${maxMembers} members). No vacancies remaining.
                  </p>
                </div>
              ` : candidatesLoading ? `
                <div class="p-8 text-center">
                  <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo mb-2"></i>
                  <div style="font-size: 13px; color: var(--text-secondary);">Calculating student compatibility and skill matching...</div>
                </div>
              ` : (candidatesData?.candidates || []).length === 0 ? `
                <div class="card p-8 text-center text-muted" style="border: 1px dashed var(--border-color); background-color: var(--bg-subtle);">
                  <i class="fa-solid fa-user-xmark text-3xl mb-2" style="opacity: 0.5;"></i>
                  <h4 style="font-size: 15px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">No eligible compatible candidates available.</h4>
                  <p style="font-size: 12px; margin: 0; color: var(--text-secondary);">All registered students are either confirmed members of this team or have pending invitations.</p>
                </div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 14px;">
                  ${(candidatesData?.candidates || []).map(cand => `
                    <div class="card hover-lift" style="padding: 18px 20px; border: 1px solid var(--border-color); border-radius: 12px; background-color: #fff;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <img src="${cand.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" />
                          <div>
                            <strong style="font-size: 15px; color: var(--text-primary);">${escapeHtml(cand.name)}</strong>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                              ${escapeHtml(cand.reg_no)} • ${escapeHtml(cand.department)} • <span style="text-transform: capitalize;">${escapeHtml(cand.strength)}</span>
                            </div>
                          </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <span class="badge badge-subtle" style="font-size: 11px;">Project: <strong>${cand.projectCompatibility}%</strong></span>
                          <span class="badge badge-subtle" style="font-size: 11px;">Team: <strong>${cand.teamCompatibility}%</strong></span>
                          <span class="badge badge-emerald" style="font-weight: 800; font-size: 12px;">Overall: ${cand.overallCompatibility}%</span>
                        </div>
                      </div>

                      ${cand.bio ? `<p style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; margin: 0 0 10px 0;">${escapeHtml(cand.bio)}</p>` : ''}

                      <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; background-color: var(--bg-subtle); padding: 10px 14px; border-radius: 8px; font-size: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Matching Skills:</span>
                          ${cand.matchingSkills && cand.matchingSkills.length > 0 ? cand.matchingSkills.map(s => `<span class="badge badge-indigo text-xs">${escapeHtml(s)}</span>`).join(' ') : '<span class="text-xs text-muted">None specified</span>'}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <span style="font-size: 11px; font-weight: 700; color: #4338CA; text-transform: uppercase;">Missing Skills Contributed:</span>
                          ${cand.missingSkillsContributed && cand.missingSkillsContributed.length > 0 ? cand.missingSkillsContributed.map(s => `<span class="badge badge-emerald text-xs"><i class="fa-solid fa-check mr-1"></i>${escapeHtml(s)}</span>`).join(' ') : '<span class="text-xs text-muted">No gap skills contributed</span>'}
                        </div>
                      </div>

                      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 12px;">
                        <button class="btn btn-sm btn-subtle btn-inspect-candidate" data-id="${cand.id}"><i class="fa-solid fa-eye mr-1"></i> View Profile</button>
                        ${cand.invitationStatus === 'pending' ? `
                          <button class="btn btn-sm btn-subtle" disabled style="opacity: 0.7;"><i class="fa-solid fa-clock mr-1"></i> Invitation Pending</button>
                        ` : `
                          <button class="btn btn-sm btn-primary btn-invite-cand" data-id="${cand.id}" data-name="${escapeHtml(cand.name)}"><i class="fa-solid fa-paper-plane mr-1"></i> Invite to Join</button>
                        `}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          ` : ''}
        ` : mainTab === 'available-teams' ? `
          <!-- MAIN TAB 2: AVAILABLE TEAMS -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="card" style="padding: 16px;">
              <input
                id="input-search-avail-teams"
                type="text"
                value="${searchQuery}"
                placeholder="Search open teams by title, tech stack, domain..."
                style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;"
              />
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${filteredAvailable.length === 0 ? `
                <div class="card p-8 text-center text-muted">
                  No open teams found matching your search.
                </div>
              ` : filteredAvailable.map((t) => `
                <div class="card" style="padding: 22px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                        <span style="font-size: 11px; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
                          ${escapeHtml(t.domain || 'Capstone')}
                        </span>
                        <span class="badge ${t.compatibilityScore >= 80 ? 'badge-emerald' : 'badge-indigo'}">
                          ${t.compatibilityScore}% Skill Compatibility
                        </span>
                      </div>
                      <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                        ${escapeHtml(t.name)}
                      </h3>
                      <div style="font-size: 13px; color: var(--color-primary); font-weight: 600;">
                        ${escapeHtml(t.project_title || 'Project')}
                      </div>
                    </div>

                    <div>
                      ${t.requestStatus === 'pending' ? `
                        <span class="badge badge-amber"><i class="fa-solid fa-clock mr-1"></i> Request Pending</span>
                      ` : t.requestStatus === 'rejected' ? `
                        <span class="badge badge-danger">Request Declined</span>
                      ` : `
                        <button class="btn btn-sm btn-primary btn-apply-join-team" data-id="${t.id}" data-name="${escapeHtml(t.name)}" data-title="${escapeHtml(t.project_title || t.name)}">
                          <i class="fa-solid fa-paper-plane mr-1"></i> Apply to Join
                        </button>
                      `}
                    </div>
                  </div>

                  <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px;">
                    ${escapeHtml(t.description || 'No description provided.')}
                  </p>

                  <div style="background-color: var(--bg-subtle); padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 12px;">
                    <strong>Match Analysis:</strong> ${escapeHtml(t.matchExplanation || 'Calculated from profile skills.')}
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); flex-wrap: wrap; gap: 8px;">
                    <span>Leader: <strong>${escapeHtml(t.leader_name || 'N/A')}</strong></span>
                    <span>Required: <strong>${escapeHtml(t.required_skills || 'None')}</strong></span>
                    <span>Capacity: <strong>${t.current_members_count}/${t.max_members || 4} members</strong></span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <!-- MAIN TAB 3: CREATE TEAM -->
          ${createdSuccess ? `
            <div class="card" style="padding: 32px; max-width: 620px; margin: 0 auto; border-radius: 16px; text-align: center;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #ECFDF5; color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 16px auto;">
                <i class="fa-solid fa-check"></i>
              </div>
              <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
                Capstone Team Proposal Created!
              </h3>
              <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 20px 0; line-height: 1.5;">
                Your proposal <strong>"${escapeHtml(createdSuccess.name)}"</strong> has been submitted to the HOD for approval and mentor assignment. You can now use Smart Match to invite students to fill team vacancies.
              </p>

              <div style="background-color: var(--bg-subtle); padding: 14px 18px; border-radius: 12px; margin-bottom: 24px; text-align: left; font-size: 12px;">
                <div style="margin-bottom: 6px;"><strong>Project Title:</strong> ${escapeHtml(createdSuccess.project_title)}</div>
                <div><strong>Domain:</strong> ${escapeHtml(createdSuccess.domain)}</div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="btn-created-goto-smart-match" class="btn btn-primary" style="padding: 12px;">
                  <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Find Students with Smart Match
                </button>
                <div style="display: flex; gap: 10px; justify-content: center;">
                  <button id="btn-created-goto-workspace" class="btn btn-subtle btn-sm">
                    Open Project Workspace
                  </button>
                  <button id="btn-created-goto-my-teams" class="btn btn-subtle btn-sm">
                    Back to My Teams
                  </button>
                </div>
              </div>
            </div>
          ` : `
            <div class="card" style="padding: 28px; max-width: 680px; margin: 0 auto; border-radius: 16px;">
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
                  Submit Capstone Project Team Proposal
                </h3>
                <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
                  Propose a new capstone team as student leader. The proposal will be submitted to the HOD for review and faculty mentor assignment.
                </p>
              </div>

              <form id="form-propose-team" style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                  <div>
                    <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Team Name *</label>
                    <input id="prop-team-name" type="text" required placeholder="e.g. Distributed AI Squad" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Project Title *</label>
                    <input id="prop-proj-title" type="text" required placeholder="e.g. Edge Computing Model Serving" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                  </div>
                </div>

                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Domain Specialization *</label>
                  <input id="prop-domain" type="text" value="Cloud Computing & Distributed Systems" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                  <div>
                    <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Target Technologies</label>
                    <input id="prop-tech" type="text" placeholder="e.g. Python, Docker, Go, Redis" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Required Teammate Skills</label>
                    <input id="prop-skills" type="text" placeholder="e.g. Backend API, Kubernetes" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                  </div>
                </div>

                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Project Description & Scope</label>
                  <textarea id="prop-desc" rows="3" placeholder="Explain the problem statement and technical architecture..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit; line-height: 1.4;"></textarea>
                </div>

                <button id="btn-submit-proposal" type="submit" class="btn btn-primary" style="padding: 12px; margin-top: 6px;">
                  Submit Proposal to HOD
                </button>
              </form>
            </div>
          `}
        `}
      </div>
    `;

    // Attach Event Listeners
    // Main Nav Tabs
    container.querySelector('#nav-tab-my-teams')?.addEventListener('click', () => {
      mainTab = 'my-teams';
      myTeamsView = 'list';
      selectedTeamId = null;
      saveNavState();
      render();
    });
    container.querySelector('#nav-tab-available-teams')?.addEventListener('click', () => {
      mainTab = 'available-teams';
      saveNavState();
      render();
    });
    container.querySelector('#nav-tab-create-team')?.addEventListener('click', () => {
      mainTab = 'create-team';
      createdSuccess = null;
      saveNavState();
      render();
    });

    // Empty state redirects
    container.querySelector('#btn-empty-goto-available')?.addEventListener('click', () => {
      mainTab = 'available-teams';
      saveNavState();
      render();
    });
    container.querySelector('#btn-empty-goto-create')?.addEventListener('click', () => {
      mainTab = 'create-team';
      createdSuccess = null;
      saveNavState();
      render();
    });

    // Open Workspace button on team card in list
    container.querySelectorAll('.btn-open-workspace').forEach(btn => {
      btn.addEventListener('click', async () => {
        selectedTeamId = Number(btn.dataset.id);
        myTeamsView = 'workspace';
        workspaceSection = 'overview';
        saveNavState();
        await loadData();
      });
    });

    // Back to My Teams buttons
    const backToTeamsListHandler = async () => {
      myTeamsView = 'list';
      selectedTeamId = null;
      saveNavState();
      await loadData();
    };
    container.querySelector('#btn-back-to-teams-list')?.addEventListener('click', backToTeamsListHandler);
    container.querySelector('#btn-app-back-my-teams')?.addEventListener('click', backToTeamsListHandler);
    container.querySelector('#btn-sm-back-my-teams')?.addEventListener('click', backToTeamsListHandler);
    container.querySelector('#btn-created-goto-my-teams')?.addEventListener('click', () => {
      mainTab = 'my-teams';
      myTeamsView = 'list';
      selectedTeamId = null;
      saveNavState();
      loadData();
    });

    // Back to Workspace buttons
    const backToWorkspaceHandler = () => {
      myTeamsView = 'workspace';
      saveNavState();
      render();
    };
    container.querySelector('#btn-app-back-workspace')?.addEventListener('click', backToWorkspaceHandler);
    container.querySelector('#btn-sm-back-workspace')?.addEventListener('click', backToWorkspaceHandler);
    container.querySelector('#btn-created-goto-workspace')?.addEventListener('click', () => {
      if (createdSuccess) {
        selectedTeamId = createdSuccess.teamId;
        mainTab = 'my-teams';
        myTeamsView = 'workspace';
        workspaceSection = 'overview';
        saveNavState();
        loadData();
      }
    });

    // Leader separate nav: Applications & Smart Match
    container.querySelector('#btn-nav-applications')?.addEventListener('click', () => {
      myTeamsView = 'applications';
      saveNavState();
      loadApplications();
    });
    container.querySelector('#btn-nav-smart-match')?.addEventListener('click', () => {
      myTeamsView = 'smart-match';
      saveNavState();
      loadCandidates();
    });
    container.querySelector('#btn-created-goto-smart-match')?.addEventListener('click', () => {
      if (createdSuccess) {
        selectedTeamId = createdSuccess.teamId;
        mainTab = 'my-teams';
        myTeamsView = 'smart-match';
        saveNavState();
        loadData();
      }
    });

    // Workspace Section Tabs
    container.querySelector('#ws-tab-overview')?.addEventListener('click', () => {
      workspaceSection = 'overview';
      saveNavState();
      render();
    });
    container.querySelector('#ws-tab-tasks')?.addEventListener('click', () => {
      workspaceSection = 'tasks';
      saveNavState();
      render();
    });
    container.querySelector('#ws-tab-members')?.addEventListener('click', () => {
      workspaceSection = 'members';
      saveNavState();
      render();
    });
    container.querySelector('#ws-tab-files')?.addEventListener('click', () => {
      workspaceSection = 'files';
      saveNavState();
      render();
    });

    // Create Task triggers
    const triggerCreateTask = () => {
      if (team) openCreateTaskModal(team);
    };
    container.querySelector('#btn-header-create-task')?.addEventListener('click', triggerCreateTask);
    container.querySelector('#btn-ws-create-task')?.addEventListener('click', triggerCreateTask);
    container.querySelector('#btn-overview-create-task')?.addEventListener('click', triggerCreateTask);
    container.querySelector('#btn-ws-overview-add-task')?.addEventListener('click', triggerCreateTask);

    container.querySelector('#btn-header-assign-roles')?.addEventListener('click', () => {
      workspaceSection = 'members';
      saveNavState();
      render();
    });
    container.querySelector('#btn-roster-assign-roles')?.addEventListener('click', () => {
      workspaceSection = 'members';
      saveNavState();
      render();
    });

    // Edit Task
    container.querySelectorAll('.btn-edit-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = Number(btn.dataset.id);
        const task = tasks.find(t => t.id === taskId);
        if (task && team) openEditTaskModal(team, task);
      });
    });

    // Delete Task
    container.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', async () => {
        const taskId = Number(btn.dataset.id);
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
          await api.deleteTeamTask(team.id, taskId);
          await loadData();
        } catch (err) {
          alert(err.message || 'Failed to delete task.');
        }
      });
    });

    // Task Status Toggles
    container.querySelectorAll('.btn-task-status-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        const newStatus = btn.dataset.status;
        btn.disabled = true;
        try {
          await api.updateTaskStatus(team.id, taskId, newStatus);
          await loadData();
        } catch (err) {
          alert(err.message || 'Failed to update task status.');
          btn.disabled = false;
        }
      });
    });

    // Task Filter Tabs
    container.querySelectorAll('.btn-task-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        taskFilter = btn.dataset.filter;
        render();
      });
    });

    // Application Filters
    container.querySelectorAll('.btn-app-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        appFilter = btn.dataset.filter;
        render();
      });
    });

    // Assign Member Role Modal
    container.querySelectorAll('.btn-assign-member-role').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberId = Number(btn.dataset.id);
        const member = members.find(m => m.id === memberId);
        if (member && team) openAssignRoleModal(team, member);
      });
    });

    // Toggle Recruiting
    container.querySelector('#btn-toggle-recruiting')?.addEventListener('click', async () => {
      try {
        await api.toggleTeamRecruiting(team.id);
        await loadData();
      } catch (err) {
        alert(err.message || 'Failed to toggle recruiting.');
      }
    });

    // Open Chat
    container.querySelector('#btn-ws-open-chat')?.addEventListener('click', () => {
      if (team?.chat_group_id) {
        navigate('student-chat', { initialGroupId: team.chat_group_id });
      } else {
        navigate('student-chat');
      }
    });

    // Inspect Mentor
    container.querySelectorAll('.btn-inspect-team-fac').forEach(btn => {
      btn.addEventListener('click', () => onOpenFacultyModal(btn.dataset.id));
    });

    // Inspect Candidate / Applicant Profile
    container.querySelectorAll('.btn-inspect-candidate').forEach(btn => {
      btn.addEventListener('click', () => openCandidateProfileModal(btn.dataset.id));
    });

    // Applications Accept / Reject
    container.querySelectorAll('.btn-decide-join').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reqId = btn.dataset.id;
        const action = btn.dataset.action;
        btn.disabled = true;
        try {
          await api.decideJoinRequest(reqId, action);
          await loadApplications();
        } catch (err) {
          alert(err.message || 'Failed to process application decision.');
          btn.disabled = false;
        }
      });
    });

    // Invite Candidate button (Smart Match)
    container.querySelectorAll('.btn-invite-cand').forEach(btn => {
      btn.addEventListener('click', () => {
        const candId = Number(btn.dataset.id);
        const cand = (candidatesData?.candidates || []).find(c => c.id === candId);
        if (cand && team) openInviteModal(team, cand);
      });
    });

    // Search Available Teams
    const searchInput = container.querySelector('#input-search-avail-teams');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
        const ref = container.querySelector('#input-search-avail-teams');
        if (ref) {
          ref.focus();
          ref.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    // Apply to Join Modal
    container.querySelectorAll('.btn-apply-join-team').forEach(btn => {
      btn.addEventListener('click', () => {
        const teamObj = availableTeams.find(t => String(t.id) === String(btn.dataset.id));
        if (teamObj) openApplyModal(teamObj);
      });
    });

    // Propose Team Form Submit
    const propForm = container.querySelector('#form-propose-team');
    if (propForm) {
      propForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = container.querySelector('#btn-submit-proposal');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        const name = container.querySelector('#prop-team-name').value.trim();
        const project_title = container.querySelector('#prop-proj-title').value.trim();
        const domain = container.querySelector('#prop-domain').value.trim();
        const technologies = container.querySelector('#prop-tech').value.trim();
        const required_skills = container.querySelector('#prop-skills').value.trim();
        const description = container.querySelector('#prop-desc').value.trim();

        try {
          const res = await api.createTeamProposal({
            name,
            project_title,
            domain,
            technologies,
            required_skills,
            description,
            max_members: 4
          });

          createdSuccess = {
            teamId: res.teamId || res.team?.id,
            name,
            project_title,
            domain
          };
          render();
        } catch (err) {
          alert(err.message || 'Failed to submit proposal.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Proposal to HOD';
        }
      });
    }
  };

  // Real-Time Event Handlers
  const onTasksUpdated = (e) => {
    const tId = Number(e.detail?.team_id);
    if (!selectedTeamId || tId === selectedTeamId) {
      loadData();
    }
  };
  const onRolesUpdated = (e) => {
    const tId = Number(e.detail?.team_id);
    if (!selectedTeamId || tId === selectedTeamId) {
      loadData();
    }
  };
  const onMembershipUpdated = (e) => {
    const tId = Number(e.detail?.team_id);
    const u = auth.getUser();
    if (!selectedTeamId || tId === selectedTeamId || (u && Number(e.detail?.student_id) === Number(u.id))) {
      loadData();
    }
  };
  const onAppsUpdated = (e) => {
    const tId = Number(e.detail?.team_id);
    if (selectedTeamId && tId === selectedTeamId) {
      if (myTeamsView === 'applications') loadApplications(false);
      else loadData();
    }
  };
  const onInvsUpdated = (e) => {
    const tId = Number(e.detail?.team_id);
    if (selectedTeamId && tId === selectedTeamId) {
      if (myTeamsView === 'smart-match') loadCandidates(false);
      else loadData();
    }
  };
  const onTeamUpdated = (e) => {
    const tId = Number(e.detail?.team_id);
    if (selectedTeamId && tId === selectedTeamId) {
      loadData();
    }
  };
  const onAvailUpdated = () => {
    if (mainTab === 'available-teams') loadData();
  };
  const onSocketReconnect = () => {
    loadData();
  };

  if (window._studentTeamsCleanup) {
    try { window._studentTeamsCleanup(); } catch (_) {}
  }
  window.addEventListener('portal:team-tasks-updated', onTasksUpdated);
  window.addEventListener('portal:team-roles-updated', onRolesUpdated);
  window.addEventListener('portal:team-membership-updated', onMembershipUpdated);
  window.addEventListener('portal:team-applications-updated', onAppsUpdated);
  window.addEventListener('portal:team-invitations-updated', onInvsUpdated);
  window.addEventListener('portal:team-updated', onTeamUpdated);
  window.addEventListener('portal:available-teams-updated', onAvailUpdated);
  window.addEventListener('portal:socket-reconnected', onSocketReconnect);

  window._studentTeamsCleanup = () => {
    window.removeEventListener('portal:team-tasks-updated', onTasksUpdated);
    window.removeEventListener('portal:team-roles-updated', onRolesUpdated);
    window.removeEventListener('portal:team-membership-updated', onMembershipUpdated);
    window.removeEventListener('portal:team-applications-updated', onAppsUpdated);
    window.removeEventListener('portal:team-invitations-updated', onInvsUpdated);
    window.removeEventListener('portal:team-updated', onTeamUpdated);
    window.removeEventListener('portal:available-teams-updated', onAvailUpdated);
    window.removeEventListener('portal:socket-reconnected', onSocketReconnect);
  };

  loadData();
}



// 4. Faculty Directory for Students
export async function renderFacultyDirectory(container, { navigate, onOpenFacultyModal }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const data = await api.getFacultyDirectory();
    const faculty = data.faculty || [];
    let searchQuery = '';

    const render = () => {
      const q = searchQuery.toLowerCase();
      const filtered = faculty.filter((f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.subjects.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q) ||
        f.languages.toLowerCase().includes(q)
      );

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="card" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                Department Faculty Mentors Directory (${faculty.length})
              </h3>
              <span style="font-size: 12px; color: var(--text-secondary);">
                Explore faculty research domains, guidance subjects, and programming languages to discover mentors aligned with your capstone project goals.
              </span>
            </div>

            <input
              id="input-fac-dir-search"
              type="text"
              value="${searchQuery}"
              placeholder="Search faculty by name, subject, language..."
              style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; width: 300px;"
            />
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px;">
            ${filtered.length === 0 ? `
              <div class="card p-8 text-center text-muted" style="grid-column: 1 / -1;">
                No faculty mentors found matching current search.
              </div>
            ` : filtered.map((f) => `
              <div class="card hover-lift" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <img src="${f.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="" style="width: 50px; height: 50px; border-radius: 14px;" />
                    <div>
                      <h4 style="font-size: 15px; font-weight: 800; margin: 0 0 2px 0;">${f.name}</h4>
                      <div style="font-size: 12px; color: var(--text-secondary);">${f.designation}</div>
                      <div style="font-size: 11px; color: var(--color-primary);">${f.department}</div>
                    </div>
                  </div>

                  <div style="margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 2px;">Guidance Subjects</span>
                    <div style="font-size: 12px; color: var(--text-primary); font-weight: 600;">${f.subjects}</div>
                  </div>

                  <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">Languages Known</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                      ${(f.languages || '').split(',').map((l) => `<span class="badge badge-indigo text-xs">${l.trim()}</span>`).join('')}
                    </div>
                  </div>
                </div>

                <div style="border-top: 1px solid var(--border-light); padding-top: 12px; display: flex; align-items: center; justify-content: space-between;">
                  <span class="badge badge-subtle text-xs">${f.workload || 0} active mentees</span>
                  <button class="btn btn-sm btn-primary btn-inspect-modal-fac" data-id="${f.id}">
                    <i class="fa-solid fa-id-card mr-1"></i> View Profile
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      const searchInput = container.querySelector('#input-fac-dir-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchQuery = e.target.value;
          render();
          const ref = container.querySelector('#input-fac-dir-search');
          if (ref) {
            ref.focus();
            ref.setSelectionRange(searchQuery.length, searchQuery.length);
          }
        });
      }

      container.querySelectorAll('.btn-inspect-modal-fac').forEach((btn) => {
        btn.addEventListener('click', () => onOpenFacultyModal(btn.dataset.id));
      });
    };

    render();

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load directory.'}</div>`;
  }
}


// 5. Student Change Request Page
export async function renderStudentChangeRequest(container, { navigate, onOpenFacultyModal }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const [profRes, facRes] = await Promise.all([
      api.getStudentProfile(),
      api.getFacultyDirectory()
    ]);

    const p = profRes.profile || {};
    const changeRequests = profRes.changeRequests || [];
    const facultyList = facRes.faculty || [];
    const hasPending = profRes.hasPendingRequest;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 680px; margin: 0 auto;">
        <!-- Header & Policy Card -->
        <div class="card" style="padding: 24px;">
          <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
            Request Faculty Mentor Change
          </h3>
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.4;">
            Under department policy, students can request a change of mentor if project technical objectives diverge from current faculty guidance areas. Only one pending request is permitted at a time.
          </p>
        </div>

        <!-- Current Mentor Overview -->
        <div class="card" style="padding: 20px;">
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 6px;">
            Currently Assigned Mentor
          </span>
          ${p.faculty_id ? `
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <strong style="font-size: 16px; color: var(--text-primary);">${p.faculty_name}</strong>
                <div style="font-size: 12px; color: var(--text-secondary);">${p.faculty_designation} • ${p.faculty_department}</div>
                <div style="font-size: 12px; color: var(--color-primary); margin-top: 2px;">${p.faculty_email}</div>
              </div>
              <button id="btn-inspect-curr-fac" class="btn btn-sm btn-subtle" data-id="${p.faculty_id}">
                View Mentor Details
              </button>
            </div>
          ` : `
            <div class="badge badge-amber">No mentor currently assigned to request change from.</div>
          `}
        </div>

        <!-- Submit Request Form -->
        <div class="card" style="padding: 24px;">
          <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 14px 0;">
            Submit New Request
          </h4>

          ${hasPending ? `
            <div style="background-color: var(--color-warning-light); color: var(--color-warning); padding: 14px 18px; border-radius: 12px; font-size: 13px; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-clock-rotate-left text-lg"></i>
              <div>
                <strong>Active Pending Request:</strong> You already have a faculty change request submitted to the HOD. Please wait for an executive decision.
              </div>
            </div>
          ` : !p.faculty_id ? `
            <div style="font-size: 13px; color: var(--text-muted);">
              You must have an assigned mentor before submitting a change request.
            </div>
          ` : `
            <form id="form-submit-cr" style="display: flex; flex-direction: column; gap: 16px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Preferred Replacement Faculty (Optional)</label>
                <select id="cr-pref-fac" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; background-color: #fff;">
                  <option value="">-- Open Choice (HOD Discretion) --</option>
                  ${facultyList.filter((f) => f.id !== p.faculty_id).map((f) => `
                    <option value="${f.id}">${f.name} (${f.designation} • ${f.subjects})</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Reason for Request *</label>
                <textarea id="cr-reason" required rows="4" placeholder="Explain the technical or project domain reasons for this request..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit; line-height: 1.4;"></textarea>
              </div>

              <button id="btn-submit-change-request" type="submit" class="btn btn-primary" style="padding: 12px;">
                Submit Request to HOD
              </button>
            </form>
          `}
        </div>

        <!-- History of Requests -->
        <div class="card" style="padding: 24px;">
          <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 12px 0;">
            Request History
          </h4>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${changeRequests.length === 0 ? `
              <span style="font-size: 13px; color: var(--text-muted);">No previous change requests.</span>
            ` : changeRequests.map((cr) => `
              <div style="padding: 14px; border: 1px solid var(--border-light); border-radius: 10px; background-color: var(--bg-subtle);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span class="badge ${cr.status === 'approved' ? 'badge-emerald' : cr.status === 'pending' ? 'badge-warning' : 'badge-danger'}">
                    ${cr.status.toUpperCase()}
                  </span>
                  <span style="font-size: 11px; color: var(--text-muted);">${new Date(cr.created_at).toLocaleDateString()}</span>
                </div>
                <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 4px;">
                  From <strong>${cr.current_faculty_name}</strong> to <strong>${cr.requested_faculty_name || 'Open'}</strong>
                </div>
                <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 4px 0;">
                  "${cr.reason}"
                </p>
                ${cr.hod_remark ? `
                  <div style="font-size: 11px; color: var(--color-primary); font-weight: 600;">
                    HOD Remark: ${cr.hod_remark}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-inspect-curr-fac')?.addEventListener('click', () => {
      onOpenFacultyModal(p.faculty_id);
    });

    const form = container.querySelector('#form-submit-cr');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = container.querySelector('#btn-submit-change-request');
        const reason = container.querySelector('#cr-reason').value.trim();
        const prefFacId = container.querySelector('#cr-pref-fac').value;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        try {
          await api.submitChangeRequest({
            reason,
            requested_faculty_id: prefFacId ? Number(prefFacId) : null
          });
          alert('Faculty change request submitted to HOD!');
          renderStudentChangeRequest(container, { navigate, onOpenFacultyModal });
        } catch (err) {
          alert(err.message || 'Failed to submit request.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Request to HOD';
        }
      });
    }

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load change requests.'}</div>`;
  }
}

export const renderStudentProjectTeams = renderStudentTeams;
export const renderStudentFacultyDirectory = renderFacultyDirectory;

// 6. Student Invitations Workspace (Sent & Received Invitations)
export async function renderStudentInvitations(container, { navigate, onOpenFacultyModal, viewParams = {} }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  let activeTab = viewParams.initialTab || 'all'; // 'all' | 'sent' | 'received'
  let invitationsData = { sent: [], received: [] };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatInvitationDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
  }

  const loadData = async () => {
    try {
      invitationsData = await api.getMyInvitations();
      render();
    } catch (err) {
      container.innerHTML = `<div class="card p-8 text-center text-danger">${escapeHtml(err.message || 'Failed to load invitations.')}</div>`;
    }
  };

  const openInvitationDetailModal = (inv, type) => {
    const isSent = type === 'sent';
    openModal({
      title: 'Invitation Details',
      maxWidth: '520px',
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 14px;">
            <div>
              <span style="font-size: 11px; font-weight: 700; color: var(--color-primary); text-transform: uppercase;">
                ${escapeHtml(inv.domain || 'Project Team')}
              </span>
              <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 2px 0 2px 0;">
                ${escapeHtml(inv.project_title || inv.team_name)}
              </h3>
              <div style="font-size: 12px; color: var(--text-muted);">
                Team: <strong>${escapeHtml(inv.team_name)}</strong>
              </div>
            </div>
            <div>
              ${inv.status === 'pending' ? `
                <span class="badge badge-warning" style="padding: 6px 14px; border-radius: 20px; font-weight: 700;">
                  <i class="fa-regular fa-clock mr-1"></i> Pending
                </span>
              ` : inv.status === 'accepted' ? `
                <span class="badge badge-emerald" style="padding: 6px 14px; border-radius: 20px; font-weight: 700;">
                  <i class="fa-solid fa-check mr-1"></i> Accepted
                </span>
              ` : `
                <span class="badge badge-danger" style="padding: 6px 14px; border-radius: 20px; font-weight: 700;">
                  <i class="fa-solid fa-xmark mr-1"></i> Rejected
                </span>
              `}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
            <div style="background-color: var(--bg-subtle); padding: 10px 14px; border-radius: 8px;">
              <span style="font-size: 11px; color: var(--text-muted); display: block; font-weight: 700; text-transform: uppercase;">Sender</span>
              <strong style="color: var(--text-primary);">${escapeHtml(inv.sender_name || 'Team Leader')}</strong>
            </div>
            <div style="background-color: var(--bg-subtle); padding: 10px 14px; border-radius: 8px;">
              <span style="font-size: 11px; color: var(--text-muted); display: block; font-weight: 700; text-transform: uppercase;">Recipient</span>
              <strong style="color: var(--text-primary);">${escapeHtml(inv.recipient_name || auth.user?.name)}</strong>
            </div>
          </div>

          ${inv.message ? `
            <div>
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">
                Invitation Message
              </span>
              <div style="background-color: #F8FAFC; border: 1px solid var(--border-light); border-left: 4px solid #4338CA; padding: 12px 14px; border-radius: 8px; font-size: 13px; color: var(--text-primary); font-style: italic; line-height: 1.45;">
                "${escapeHtml(inv.message)}"
              </div>
            </div>
          ` : ''}

          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-light); padding-top: 12px;">
            <div><i class="fa-regular fa-calendar mr-1"></i> Sent On: <strong>${formatInvitationDate(inv.created_at)}</strong></div>
            ${inv.decided_at ? `<div><i class="fa-solid fa-clock-rotate-left mr-1"></i> Decision On: <strong>${formatInvitationDate(inv.decided_at)}</strong></div>` : ''}
          </div>

          ${!isSent && inv.status === 'pending' ? `
            <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 14px;">
              <button class="btn btn-sm btn-decide-invitation-modal" data-id="${inv.id}" data-action="reject" style="background-color: #FEE2E2; border: 1px solid #FECACA; color: #EF4444; font-weight: 700; padding: 7px 18px; border-radius: 8px; cursor: pointer;">
                <i class="fa-solid fa-xmark mr-1"></i> Reject
              </button>
              <button class="btn btn-sm btn-decide-invitation-modal" data-id="${inv.id}" data-action="accept" style="background-color: #10B981; border: 1px solid #10B981; color: #fff; font-weight: 700; padding: 7px 18px; border-radius: 8px; cursor: pointer;">
                <i class="fa-solid fa-check mr-1"></i> Accept
              </button>
            </div>
          ` : ''}
        </div>
      `
    });

    document.querySelectorAll('.btn-decide-invitation-modal').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const invId = btn.dataset.id;
        const action = btn.dataset.action;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        try {
          const res = await api.decideTeamInvitation(invId, action);
          alert(res.message || `Invitation successfully ${action === 'accept' ? 'accepted' : 'rejected'}!`);
          document.querySelector('.modal-backdrop-layer')?.remove();
          loadData();
        } catch (err) {
          alert(err.message || 'Failed to process invitation.');
          btn.disabled = false;
          btn.textContent = action === 'accept' ? 'Accept' : 'Reject';
        }
      });
    });
  };

  const render = () => {
    const sentList = invitationsData.sent || [];
    const receivedList = invitationsData.received || [];

    container.innerHTML = `
      <div style="max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">
        <!-- Header Card -->
        <div class="card" style="padding: 22px 26px; border-radius: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 14px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; box-shadow: 0 2px 6px rgba(67, 56, 202, 0.12);">
              <i class="fa-solid fa-envelope"></i>
            </div>
            <div>
              <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0; letter-spacing: -0.3px;">
                Invitations
              </h2>
              <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
                View and manage your project team invitations.
              </p>
            </div>
          </div>
        </div>

        <!-- Tab Selector Row -->
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button id="tab-sent-invitations" class="btn btn-sm ${activeTab === 'sent' || activeTab === 'all' ? 'btn-primary' : 'btn-subtle'}" style="${activeTab === 'sent' ? 'background-color: #fff; color: #4338CA; border: 1px solid var(--border-color); font-weight: 700; box-shadow: var(--shadow-sm);' : 'background-color: #F8FAFC; color: var(--text-secondary); border: 1px solid var(--border-color);'}">
            <i class="fa-solid fa-paper-plane mr-2" style="color: ${activeTab === 'sent' ? '#4338CA' : 'inherit'};"></i>
            <span>Sent Invitations</span>
            <span class="badge ${activeTab === 'sent' ? 'badge-indigo' : 'badge-subtle'}" style="margin-left: 8px; border-radius: 12px; font-size: 11px;">${sentList.length}</span>
          </button>

          <button id="tab-received-invitations" class="btn btn-sm ${activeTab === 'received' ? 'btn-primary' : 'btn-subtle'}" style="${activeTab === 'received' ? 'background-color: #fff; color: #4338CA; border: 1px solid var(--border-color); font-weight: 700; box-shadow: var(--shadow-sm);' : 'background-color: #F8FAFC; color: var(--text-secondary); border: 1px solid var(--border-color);'}">
            <i class="fa-solid fa-inbox mr-2" style="color: ${activeTab === 'received' ? '#4338CA' : 'inherit'};"></i>
            <span>Received Invitations</span>
            <span class="badge ${activeTab === 'received' ? 'badge-indigo' : 'badge-subtle'}" style="margin-left: 8px; border-radius: 12px; font-size: 11px;">${receivedList.length}</span>
          </button>

          <button id="tab-all-invitations" class="btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-subtle'}" style="${activeTab === 'all' ? 'background-color: #fff; color: #4338CA; border: 1px solid var(--border-color); font-weight: 700; box-shadow: var(--shadow-sm);' : 'background-color: #F8FAFC; color: var(--text-secondary); border: 1px solid var(--border-color);'}">
            <span>View Both</span>
          </button>
        </div>

        <!-- Section 1: Sent Invitations (Visible if 'sent' or 'all') -->
        ${activeTab === 'sent' || activeTab === 'all' ? `
          <div id="inv-section-sent" class="card" style="padding: 24px; border-radius: 16px;">
            <div style="margin-bottom: 18px;">
              <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                Sent Invitations
              </h3>
              <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">
                Track the status of invitations you have sent to other students.
              </p>
            </div>

            ${sentList.length === 0 ? `
              <div style="padding: 36px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; background-color: var(--bg-subtle);">
                <i class="fa-solid fa-paper-plane text-2xl mb-2" style="opacity: 0.4;"></i>
                <h4 style="font-size: 14px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">No sent invitations</h4>
                <p style="font-size: 12px; margin: 0;">When you invite students to fill vacancies from Find Members, they will appear here.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${sentList.map(inv => `
                  <div class="invitation-row-card hover-lift" data-id="${inv.id}" data-type="sent" style="padding: 16px 20px; border: 1px solid var(--border-color); border-radius: 14px; background-color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; transition: all 0.2s; cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 16px; flex: 1; min-width: 240px;">
                      <div style="width: 44px; height: 44px; border-radius: 12px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                        <i class="fa-solid fa-users"></i>
                      </div>
                      <div>
                        <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                          ${escapeHtml(inv.project_title || inv.team_name)}
                        </h4>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 3px;">
                          Project Team
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 5px;">
                          <i class="fa-solid fa-user text-xs"></i>
                          <span>To: <strong>${escapeHtml(inv.recipient_name)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-muted);">
                        <i class="fa-regular fa-calendar"></i>
                        <span>Sent on ${formatInvitationDate(inv.created_at)}</span>
                      </div>

                      <div>
                        ${inv.status === 'pending' ? `
                          <span class="badge badge-warning" style="padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px; background-color: #FEF3C7; color: #D97706;">
                            <i class="fa-regular fa-clock"></i> Pending
                          </span>
                        ` : inv.status === 'accepted' ? `
                          <span class="badge badge-emerald" style="padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px; background-color: #DCFCE7; color: #16A34A;">
                            <i class="fa-solid fa-check"></i> Accepted
                          </span>
                        ` : `
                          <span class="badge badge-danger" style="padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px; background-color: #FEE2E2; color: #DC2626;">
                            <i class="fa-solid fa-xmark"></i> Rejected
                          </span>
                        `}
                      </div>

                      <button class="btn-view-inv-details" data-id="${inv.id}" data-type="sent" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; display: flex; align-items: center;" title="View Details">
                        <i class="fa-solid fa-chevron-right text-sm"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}

        <!-- Section 2: Received Invitations (Visible if 'received' or 'all') -->
        ${activeTab === 'received' || activeTab === 'all' ? `
          <div id="inv-section-received" class="card" style="padding: 24px; border-radius: 16px;">
            <div style="margin-bottom: 18px;">
              <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                Received Invitations
              </h3>
              <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">
                Respond to invitations from team leaders and other students.
              </p>
            </div>

            ${receivedList.length === 0 ? `
              <div style="padding: 36px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px; background-color: var(--bg-subtle);">
                <i class="fa-solid fa-inbox text-2xl mb-2" style="opacity: 0.4;"></i>
                <h4 style="font-size: 14px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">No received invitations</h4>
                <p style="font-size: 12px; margin: 0;">You have not received any invitations to join project teams yet.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${receivedList.map(inv => `
                  <div class="invitation-row-card hover-lift" data-id="${inv.id}" data-type="received" style="padding: 16px 20px; border: 1px solid var(--border-color); border-radius: 14px; background-color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; transition: all 0.2s; cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 16px; flex: 1; min-width: 240px;">
                      <div style="width: 44px; height: 44px; border-radius: 12px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                        <i class="fa-solid fa-users"></i>
                      </div>
                      <div>
                        <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                          ${escapeHtml(inv.project_title || inv.team_name)}
                        </h4>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 3px;">
                          Project Team
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 5px;">
                          <i class="fa-solid fa-user text-xs"></i>
                          <span>From: <strong>${escapeHtml(inv.sender_name)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-muted);">
                        <i class="fa-regular fa-calendar"></i>
                        <span>Received on ${formatInvitationDate(inv.created_at)}</span>
                      </div>

                      <div>
                        ${inv.status === 'pending' ? `
                          <span class="badge badge-warning" style="padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px; background-color: #FEF3C7; color: #D97706;">
                            <i class="fa-regular fa-clock"></i> Pending
                          </span>
                        ` : inv.status === 'accepted' ? `
                          <span class="badge badge-emerald" style="padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px; background-color: #DCFCE7; color: #16A34A;">
                            <i class="fa-solid fa-check"></i> Accepted
                          </span>
                        ` : `
                          <span class="badge badge-danger" style="padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px; background-color: #FEE2E2; color: #DC2626;">
                            <i class="fa-solid fa-xmark"></i> Rejected
                          </span>
                        `}
                      </div>

                      ${inv.status === 'pending' ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <button class="btn btn-sm btn-action-inv btn-inv-accept" data-id="${inv.id}" data-action="accept" data-team="${escapeHtml(inv.team_name)}" style="background-color: #10B981; border: 1px solid #10B981; color: #fff; font-weight: 700; padding: 6px 16px; border-radius: 8px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;">
                            <i class="fa-solid fa-check"></i> Accept
                          </button>
                          <button class="btn btn-sm btn-action-inv btn-inv-reject" data-id="${inv.id}" data-action="reject" data-team="${escapeHtml(inv.team_name)}" style="background-color: #FEE2E2; border: 1px solid #FECACA; color: #EF4444; font-weight: 700; padding: 6px 16px; border-radius: 8px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;">
                            <i class="fa-solid fa-xmark"></i> Reject
                          </button>
                        </div>
                      ` : `
                        <button class="btn-view-inv-details" data-id="${inv.id}" data-type="received" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; display: flex; align-items: center;" title="View Details">
                          <i class="fa-solid fa-chevron-right text-sm"></i>
                        </button>
                      `}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}

        <!-- Bottom Informational Banner (Matching Reference) -->
        <div style="background-color: #EEF2FF; border: 1px solid #E0E7FF; border-radius: 12px; padding: 14px 20px; display: flex; align-items: center; gap: 12px; font-size: 12px; color: #4338CA;">
          <i class="fa-solid fa-circle-info text-base" style="flex-shrink: 0;"></i>
          <span>You can only accept or reject invitations received from other students. Sent invitations can only be tracked, not modified.</span>
        </div>
      </div>
    `;

    // Tab Event Listeners
    container.querySelector('#tab-sent-invitations')?.addEventListener('click', () => {
      activeTab = 'sent';
      render();
    });
    container.querySelector('#tab-received-invitations')?.addEventListener('click', () => {
      activeTab = 'received';
      render();
    });
    container.querySelector('#tab-all-invitations')?.addEventListener('click', () => {
      activeTab = 'all';
      render();
    });

    // Accept / Reject Actions
    container.querySelectorAll('.btn-action-inv').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const invId = btn.dataset.id;
        const action = btn.dataset.action;

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        try {
          const res = await api.decideTeamInvitation(invId, action);
          alert(res.message || `Invitation successfully ${action === 'accept' ? 'accepted' : 'rejected'}!`);
          await loadData();
        } catch (err) {
          alert(err.message || 'Failed to process invitation.');
          await loadData();
        }
      });
    });

    // View Details Click Handlers
    container.querySelectorAll('.btn-view-inv-details').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const invId = Number(btn.dataset.id);
        const type = btn.dataset.type;
        const list = type === 'sent' ? sentList : receivedList;
        const item = list.find(i => i.id === invId);
        if (item) {
          openInvitationDetailModal(item, type);
        }
      });
    });

    // Card Row Click (opens modal)
    container.querySelectorAll('.invitation-row-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const invId = Number(card.dataset.id);
        const type = card.dataset.type;
        const list = type === 'sent' ? sentList : receivedList;
        const item = list.find(i => i.id === invId);
        if (item) {
          openInvitationDetailModal(item, type);
        }
      });
    });
  };

  loadData();
}
