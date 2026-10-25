/**
 * Student Workspace Views for Smart Real-Time Project Team Finder System.
 */

import api from '../api.js';
import auth from '../auth.js';
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


// 3. Project Teams Workspace (Tabs: My Teams, Available Teams, Create Team)
export async function renderStudentTeams(container, { navigate, onOpenFacultyModal, viewParams = {} }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  let activeTab = viewParams.initialTab || 'my-team';
  let myTeamSubView = 'overview'; // 'overview' | 'applications' | 'smart-match'
  let workspaceSection = 'overview'; // 'overview' | 'tasks' | 'members' | 'files'
  let taskFilter = 'all'; // 'all' | 'my' | 'in_progress' | 'completed' | 'not_started'
  let selectedTeamId = viewParams.teamId || null;
  let myTeamData = null;
  let availableTeams = [];
  let searchQuery = '';
  let candidatesData = null;
  let candidatesLoading = false;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDeadline(dateStr) {
    if (!dateStr) return 'No deadline';
    try {
      const parts = dateStr.split('-');
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
    return deadlineStr < today;
  }

  const loadData = async () => {
    try {
      const [teamRes, availRes] = await Promise.all([
        api.getMyTeam(selectedTeamId).catch(() => null),
        api.getAvailableTeamsToJoin().catch(() => ({ teams: [] }))
      ]);

      myTeamData = teamRes;
      availableTeams = availRes?.teams || [];
      render();
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load teams.'}</div>`;
    }
  };

  const loadCandidates = async () => {
    const team = myTeamData?.team;
    if (!team) return;
    candidatesLoading = true;
    render();
    try {
      const res = await api.getTeamCandidates(team.id);
      candidatesData = res;
    } catch (err) {
      console.error('Failed to load candidate recommendations:', err);
      candidatesData = { candidates: [], error: err.message };
    } finally {
      candidatesLoading = false;
      render();
    }
  };

  const openCreateTaskModal = (team) => {
    const members = myTeamData?.members || [];
    openModal({
      title: 'Create Project Task',
      maxWidth: '520px',
      contentHtml: `
        <form id="form-create-task" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Task Title *</label>
            <input type="text" id="task-title" class="form-input" placeholder="e.g. Design relational database schema" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Description & Objectives</label>
            <textarea id="task-description" class="form-input" rows="3" placeholder="Specific deliverables and requirements for this task..." style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;"></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Assign To</label>
              <select id="task-assignee" class="form-input" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;">
                <option value="">Unassigned</option>
                ${members.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.team_role)})</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Deadline</label>
              <input type="date" id="task-deadline" class="form-input" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;" />
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
            <button type="submit" id="btn-submit-create-task" class="btn btn-primary">Create Task</button>
          </div>
        </form>
      `
    });

    const form = document.getElementById('form-create-task');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title').value.trim();
      const description = document.getElementById('task-description').value.trim();
      const assignedTo = document.getElementById('task-assignee').value || null;
      const deadline = document.getElementById('task-deadline').value || null;
      const btn = document.getElementById('btn-submit-create-task');
      if (btn) btn.disabled = true;

      try {
        await api.createTeamTask(team.id, {
          title, description, assigned_to: assignedTo, deadline
        });
        document.querySelector('.modal-backdrop-layer')?.remove();
        await loadData();
      } catch (err) {
        alert(err.message || 'Failed to create task.');
        if (btn) btn.disabled = false;
      }
    });
  };

  const openEditTaskModal = (team, task) => {
    const members = myTeamData?.members || [];
    openModal({
      title: 'Edit Project Task',
      maxWidth: '520px',
      contentHtml: `
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
              <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Assign To</label>
              <select id="edit-task-assignee" class="form-input" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;">
                <option value="">Unassigned</option>
                ${members.map(m => `<option value="${m.id}" ${task.assigned_to === m.id ? 'selected' : ''}>${escapeHtml(m.name)} (${escapeHtml(m.team_role)})</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Deadline</label>
              <input type="date" id="edit-task-deadline" class="form-input" value="${escapeHtml(task.deadline || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;" />
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
            <button type="submit" id="btn-submit-edit-task" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      `
    });

    const form = document.getElementById('form-edit-task');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('edit-task-title').value.trim();
      const description = document.getElementById('edit-task-description').value.trim();
      const assignedTo = document.getElementById('edit-task-assignee').value || null;
      const deadline = document.getElementById('edit-task-deadline').value || null;
      const btn = document.getElementById('btn-submit-edit-task');
      if (btn) btn.disabled = true;

      try {
        await api.updateTeamTask(team.id, task.id, {
          title, description, assigned_to: assignedTo, deadline
        });
        document.querySelector('.modal-backdrop-layer')?.remove();
        await loadData();
      } catch (err) {
        alert(err.message || 'Failed to update task.');
        if (btn) btn.disabled = false;
      }
    });
  };

  const openAssignRoleModal = (team, member) => {
    openModal({
      title: `Assign Role: ${escapeHtml(member.name)}`,
      maxWidth: '500px',
      contentHtml: `
        <form id="form-assign-role" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Role Title *</label>
            <input type="text" id="role-title-input" class="form-input" placeholder="e.g. Frontend Lead, ML Specialist, DevOps Architect" value="${escapeHtml(member.role_title || '')}" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: block;">Assigned Responsibilities</label>
            <textarea id="responsibilities-input" class="form-input" rows="4" placeholder="Detail specific modules, architectural areas, or project milestones this member leads..." style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px;">${escapeHtml(member.responsibilities || '')}</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
            <button type="submit" id="btn-submit-assign-role" class="btn btn-primary">Save Role</button>
          </div>
        </form>
      `
    });

    const form = document.getElementById('form-assign-role');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const role_title = document.getElementById('role-title-input').value.trim();
      const responsibilities = document.getElementById('responsibilities-input').value.trim();
      const btn = document.getElementById('btn-submit-assign-role');
      if (btn) btn.disabled = true;

      try {
        await api.updateMemberRole(team.id, member.id, { role_title, responsibilities });
        document.querySelector('.modal-backdrop-layer')?.remove();
        await loadData();
      } catch (err) {
        alert(err.message || 'Failed to update role.');
        if (btn) btn.disabled = false;
      }
    });
  };

  const render = () => {
    const team = myTeamData?.team;
    const members = myTeamData?.members || [];
    const incomingRequests = myTeamData?.incomingRequests || [];
    const skillBalance = myTeamData?.skillBalance || team?.skill_balance || {
      categories: [
        { name: 'Python / Backend', status: 'Covered' },
        { name: 'Frontend / UI', status: 'Needed' },
        { name: 'Testing / QA', status: 'Needed' },
        { name: 'Database', status: 'Covered' }
      ],
      recommendedNextStep: 'Prioritize students who can contribute frontend and testing skills, while also checking project compatibility and teamwork fit.'
    };

    const isLeader = team && (team.leader_id === auth.user?.id || team.my_role === 'leader');
    const confirmedCount = team?.confirmed_members ?? members.length;
    const maxMembers = team?.max_members || 4;
    const vacancies = team?.vacancies ?? Math.max(0, maxMembers - confirmedCount);
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
        <!-- Header Banner (Purple Theme) -->
        <div class="card" style="background: linear-gradient(135deg, #4338CA 0%, #4F46E5 100%); color: #fff; padding: 24px 28px; border-radius: 16px; box-shadow: 0 8px 20px -4px rgba(67, 56, 202, 0.35);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 4px 0; color: #fff; letter-spacing: -0.3px;">
                Project Teams
              </h2>
              <p style="font-size: 13px; opacity: 0.92; margin: 0; color: rgba(255, 255, 255, 0.9);">
                Build your team. Find your people. Create together.
              </p>
            </div>

            <!-- Main Tab Navigation -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; background-color: rgba(0, 0, 0, 0.15); padding: 5px; border-radius: 12px;">
              <button id="tab-my-team" class="btn btn-sm ${activeTab === 'my-team' ? 'btn-primary' : 'btn-subtle'}" style="${activeTab === 'my-team' ? 'background-color: #fff; color: #4338CA; font-weight: 700;' : 'color: #fff; background: transparent; border: none;'}">
                <i class="fa-solid fa-users mr-1"></i> My Teams ${team ? `(${confirmedCount})` : ''}
              </button>
              <button id="tab-join-teams" class="btn btn-sm ${activeTab === 'join-teams' ? 'btn-primary' : 'btn-subtle'}" style="${activeTab === 'join-teams' ? 'background-color: #fff; color: #4338CA; font-weight: 700;' : 'color: #fff; background: transparent; border: none;'}">
                <i class="fa-solid fa-magnifying-glass mr-1"></i> Available Teams (${availableTeams.length})
              </button>
              <button id="tab-propose-team" class="btn btn-sm ${activeTab === 'propose-team' ? 'btn-primary' : 'btn-subtle'}" style="${activeTab === 'propose-team' ? 'background-color: #fff; color: #4338CA; font-weight: 700;' : 'color: #fff; background: transparent; border: none;'}">
                <i class="fa-solid fa-plus mr-1"></i> Create Team
              </button>
            </div>
          </div>
        </div>

        <!-- Tab 1: My Teams -->
        ${activeTab === 'my-team' ? `
          ${!team ? `
            <div class="card p-8 text-center text-muted">
              <i class="fa-solid fa-people-roof text-4xl mb-3" style="color: var(--color-primary); opacity: 0.6;"></i>
              <h4 style="font-size: 16px; font-weight: 800; margin: 0 0 6px 0; color: var(--text-primary);">You are not in a team yet</h4>
              <p style="font-size: 13px; color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px auto;">
                You can browse approved teams that have openings and match your tech stack, or submit a new capstone team proposal.
              </p>
              <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="btn-goto-available" class="btn btn-primary">Browse Available Teams</button>
                <button id="btn-goto-propose" class="btn btn-subtle">Create Team Proposal</button>
              </div>
            </div>
          ` : `
            <!-- Sub-View: Team Overview & Project Workspace -->
            ${myTeamSubView === 'overview' ? `
              <div class="card" style="padding: 24px; border-radius: 16px;">
                <!-- Optional Multi-Team Switcher -->
                ${(myTeamData?.myTeamsList || []).length > 1 ? `
                  <div style="background-color: #F8FAFC; border: 1px solid var(--border-light); border-radius: 12px; padding: 10px 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <i class="fa-solid fa-layer-group text-indigo"></i>
                      <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">My Project Teams (${myTeamData.myTeamsList.length}):</span>
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      ${myTeamData.myTeamsList.map(t => `
                        <button class="btn btn-xs ${t.id === team.id ? 'btn-primary' : 'btn-subtle'} btn-switch-team" data-id="${t.id}" style="font-size: 11px;">
                          ${escapeHtml(t.name)} ${t.my_role === 'leader' ? '👑' : ''}
                        </button>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- Team Title & Status Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                      <span style="font-size: 11px; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
                        ${escapeHtml(team.domain || 'Capstone')}
                      </span>
                      <span class="badge ${team.status === 'approved' ? 'badge-emerald' : 'badge-warning'}">
                        ${team.status.replace('_', ' ').toUpperCase()}
                      </span>
                      ${isLeader ? '<span class="badge badge-amber">Leader</span>' : ''}
                    </div>
                    <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                      My Team — ${escapeHtml(team.name)}
                    </h3>
                    <div style="font-size: 14px; color: var(--color-primary); font-weight: 600;">
                      ${escapeHtml(team.project_title || 'Capstone Project')}
                    </div>
                    ${team.description ? `
                      <p style="font-size: 12px; color: var(--text-secondary); margin: 6px 0 0 0; max-width: 680px; line-height: 1.45;">
                        ${escapeHtml(team.description)}
                      </p>
                    ` : ''}
                  </div>

                  <div style="display: flex; gap: 8px; align-items: center;">
                    ${team.chat_group_id ? `
                      <button id="btn-open-team-chat-page" class="btn btn-sm btn-subtle">
                        <i class="fa-solid fa-comments mr-1"></i> Team Chat
                      </button>
                    ` : ''}
                  </div>
                </div>

                <!-- Workspace Sub-Navigation Tabs -->
                <div style="display: flex; gap: 8px; align-items: center; border-bottom: 2px solid var(--border-light); padding-bottom: 12px; margin-bottom: 22px; flex-wrap: wrap;">
                  <button id="ws-tab-overview" class="btn btn-sm ${workspaceSection === 'overview' ? 'btn-primary' : 'btn-subtle'}" style="${workspaceSection === 'overview' ? 'font-weight: 700; box-shadow: var(--shadow-sm);' : ''}">
                    <i class="fa-solid fa-gauge mr-1"></i> Overview & Progress
                  </button>
                  <button id="ws-tab-tasks" class="btn btn-sm ${workspaceSection === 'tasks' ? 'btn-primary' : 'btn-subtle'}" style="${workspaceSection === 'tasks' ? 'font-weight: 700; box-shadow: var(--shadow-sm);' : ''}">
                    <i class="fa-solid fa-list-check mr-1"></i> Tasks & Work
                    <span class="badge ${workspaceSection === 'tasks' ? 'badge-subtle' : 'badge-indigo'}" style="margin-left: 6px; font-size: 10px;">${(myTeamData?.tasks || []).length}</span>
                  </button>
                  <button id="ws-tab-members" class="btn btn-sm ${workspaceSection === 'members' ? 'btn-primary' : 'btn-subtle'}" style="${workspaceSection === 'members' ? 'font-weight: 700; box-shadow: var(--shadow-sm);' : ''}">
                    <i class="fa-solid fa-users-gear mr-1"></i> Members & Roles
                    <span class="badge ${workspaceSection === 'members' ? 'badge-subtle' : 'badge-indigo'}" style="margin-left: 6px; font-size: 10px;">${confirmedCount}</span>
                  </button>
                  <button id="ws-tab-files" class="btn btn-sm ${workspaceSection === 'files' ? 'btn-primary' : 'btn-subtle'}" style="${workspaceSection === 'files' ? 'font-weight: 700; box-shadow: var(--shadow-sm);' : ''}">
                    <i class="fa-solid fa-folder-open mr-1"></i> Chat & Files
                  </button>
                </div>

                <!-- SECTION 1: OVERVIEW & PROGRESS -->
                ${workspaceSection === 'overview' ? `
                  <!-- Metrics & Recruiting Row (Matches Mockup) -->
                  <div style="background-color: #F8FAFC; border: 1px solid var(--border-light); border-radius: 14px; padding: 18px 24px; margin-bottom: 22px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 16px;">
                      <div>
                        <div style="font-size: 28px; font-weight: 800; color: var(--text-primary); line-height: 1.1;">
                          ${confirmedCount} / ${maxMembers}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; font-weight: 600;">
                          team members
                        </div>
                      </div>
                      <div>
                        <div style="font-size: 28px; font-weight: 800; color: var(--text-primary); line-height: 1.1;">
                          ${vacancies}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; font-weight: 600;">
                          vacancies
                        </div>
                      </div>
                    </div>

                    <!-- Recruiting Status Line -->
                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 14px; flex-wrap: wrap; gap: 10px;">
                      <span style="font-size: 13px; font-weight: 700; color: var(--text-primary);">
                        Recruiting status
                      </span>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="badge ${team.is_accepting_members ? 'badge-emerald' : 'badge-danger'}" style="padding: 4px 10px; font-weight: 700;">
                          ${team.is_accepting_members ? 'Open' : 'Closed'}
                        </span>
                        ${isLeader ? `
                          <button id="btn-toggle-recruiting" class="btn btn-xs ${team.is_accepting_members ? 'btn-subtle' : 'btn-primary'}" style="font-size: 11px;">
                            ${team.is_accepting_members ? 'Close Recruiting' : 'Open Recruiting'}
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  </div>

                  <!-- Accurate Progress & My Role Cards -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 22px;">
                    <!-- Overall Team Progress -->
                    <div style="background-color: #fff; border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <i class="fa-solid fa-chart-line text-indigo"></i>
                          <h4 style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 0;">Overall Team Progress</h4>
                        </div>
                        <span style="font-size: 18px; font-weight: 800; color: #4338CA;">
                          ${(myTeamData?.teamProgress?.total || 0) > 0 ? `${myTeamData.teamProgress.percentage}%` : '0%'}
                        </span>
                      </div>

                      <div style="width: 100%; height: 8px; background-color: #EEF2FF; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
                        <div style="width: ${myTeamData?.teamProgress?.percentage || 0}%; height: 100%; background: linear-gradient(90deg, #4338CA, #10B981); border-radius: 4px; transition: width 0.3s ease;"></div>
                      </div>

                      ${(myTeamData?.teamProgress?.total || 0) === 0 ? `
                        <div style="font-size: 12px; color: var(--text-muted); font-style: italic;">
                          No tasks created yet for this project team.
                        </div>
                      ` : `
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 11px;">
                          <span class="badge badge-emerald"><i class="fa-solid fa-check mr-1"></i>${myTeamData?.teamProgress?.completed || 0} Completed</span>
                          <span class="badge badge-amber"><i class="fa-solid fa-clock mr-1"></i>${myTeamData?.teamProgress?.in_progress || 0} In Progress</span>
                          <span class="badge badge-subtle">${myTeamData?.teamProgress?.not_started || 0} Not Started</span>
                          ${(myTeamData?.teamProgress?.overdue || 0) > 0 ? `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${myTeamData.teamProgress.overdue} Overdue</span>` : ''}
                        </div>
                      `}
                    </div>

                    <!-- My Role & Work Completion -->
                    <div style="background-color: #fff; border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                          <div style="font-size: 11px; font-weight: 700; color: var(--color-primary); text-transform: uppercase;">My Project Role</div>
                          <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 2px 0 0 0;">
                            ${escapeHtml(myTeamData?.myRole?.role_title || (team.my_role === 'leader' ? 'Project Leader' : 'Team Member'))}
                          </h4>
                        </div>
                        <span class="badge ${team.my_role === 'leader' ? 'badge-amber' : 'badge-indigo'}">
                          ${team.my_role === 'leader' ? 'Team Leader' : 'Team Member'}
                        </span>
                      </div>

                      <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; margin: 0 0 10px 0;">
                        ${escapeHtml(myTeamData?.myRole?.responsibilities || (team.my_role === 'leader' ? 'Lead architecture, assign team tasks, and coordinate with mentor.' : 'Complete assigned deliverables and contribute to milestones.'))}
                      </p>

                      <div style="border-top: 1px solid var(--border-light); padding-top: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                        <span style="color: var(--text-muted);">
                          My Work: <strong>${myTeamData?.individualProgress?.completed || 0}/${myTeamData?.individualProgress?.total || 0}</strong> tasks (${myTeamData?.individualProgress?.percentage || 0}%)
                        </span>
                        <button id="btn-goto-my-tasks" class="btn btn-xs btn-subtle" style="font-size: 11px;">
                          View My Tasks <i class="fa-solid fa-arrow-right ml-1"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Two Action Cards (Applications & Smart Match) Side-by-Side (Matches Mockup) -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <!-- Card 1: Applications -->
                    <div id="card-open-applications" class="card hover-lift" style="cursor: pointer; padding: 20px; border: 1px solid var(--border-color); border-radius: 14px; transition: all 0.2s;">
                      <div style="display: flex; align-items: flex-start; gap: 14px;">
                        <div style="width: 42px; height: 42px; border-radius: 10px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                          <i class="fa-solid fa-clipboard-list text-xl"></i>
                        </div>
                        <div style="flex: 1;">
                          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                            <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">Applications</h4>
                            ${pendingRequests.length > 0 ? `
                              <span class="badge badge-amber text-xs">${pendingRequests.length} Pending</span>
                            ` : ''}
                          </div>
                          <p style="font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                            Review profiles and manually accept or reject applicants.
                          </p>
                        </div>
                      </div>
                    </div>

                    <!-- Card 2: Smart Match -->
                    <div id="card-open-smart-match" class="card hover-lift" style="cursor: pointer; padding: 20px; border: 1px solid var(--border-color); border-radius: 14px; transition: all 0.2s;">
                      <div style="display: flex; align-items: flex-start; gap: 14px;">
                        <div style="width: 42px; height: 42px; border-radius: 10px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                          <i class="fa-solid fa-wand-magic-sparkles text-xl"></i>
                        </div>
                        <div style="flex: 1;">
                          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                            <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">Smart Match</h4>
                            <span class="badge badge-indigo text-xs">Fill Vacancies</span>
                          </div>
                          <p style="font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                            Find compatible students who fill missing team skills.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Team Skill Balance Section (Matches Mockup) -->
                  <div style="border: 1px solid var(--border-color); border-radius: 14px; padding: 20px 22px; margin-bottom: 24px;">
                    <div style="margin-bottom: 14px;">
                      <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                        Team Skill Balance
                      </h4>
                      <span style="font-size: 12px; color: var(--text-secondary);">
                        Illustrative example of how the system identifies skill gaps.
                      </span>
                    </div>

                    <!-- Categories list with right-aligned status badges -->
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
                      ${skillBalance.categories.map(cat => `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; background-color: var(--bg-subtle);">
                          <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
                            ${escapeHtml(cat.name)}
                          </span>
                          <span class="badge ${cat.status === 'Covered' ? 'badge-emerald' : 'badge-amber'}" style="font-weight: 700; font-size: 11px;">
                            ${escapeHtml(cat.status)}
                          </span>
                        </div>
                      `).join('')}
                    </div>

                    <!-- Recommended Next Step Callout Banner -->
                    <div style="background-color: #EEF2FF; border-left: 4px solid #4338CA; border-radius: 8px; padding: 12px 16px;">
                      <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 12px; color: #4338CA; margin-bottom: 4px;">
                        <i class="fa-regular fa-comment-dots"></i>
                        <span>Recommended next step</span>
                      </div>
                      <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        ${escapeHtml(skillBalance.recommendedNextStep)}
                      </div>
                    </div>
                  </div>

                  <!-- Mentor Information Bar -->
                  <div style="background-color: #EEF2FF; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 10px;">
                    <div>
                      <span style="font-size: 11px; font-weight: 700; color: #4338CA; text-transform: uppercase; display: block;">Faculty Guide / Mentor</span>
                      <strong style="color: var(--text-primary); font-size: 14px;">
                        ${escapeHtml(team.faculty_name || 'Awaiting HOD Allocation')}
                      </strong>
                      ${team.faculty_email ? `<span style="font-size: 12px; color: var(--text-secondary); margin-left: 8px;">(${escapeHtml(team.faculty_email)})</span>` : ''}
                    </div>
                    ${team.faculty_id ? `
                      <button class="btn btn-sm btn-subtle btn-inspect-team-fac" data-id="${team.faculty_id}">
                        <i class="fa-solid fa-eye mr-1"></i> View Mentor
                      </button>
                    ` : ''}
                  </div>

                  <!-- Confirmed Team Members Roster -->
                  <div>
                    <h4 style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 0 0 12px 0;">
                      Confirmed Team Members (${confirmedCount} / ${maxMembers})
                    </h4>
                    <div style="background-color: var(--bg-subtle); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-light);">
                      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                          <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted); background-color: #fff;">
                            <th style="padding: 10px 14px;">Member</th>
                            <th style="padding: 10px 14px;">Role & Title</th>
                            <th style="padding: 10px 14px;">Strength / Skills</th>
                            <th style="padding: 10px 14px;">Task Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${members.map((m) => `
                            <tr style="border-bottom: 1px solid var(--border-light);">
                              <td style="padding: 10px 14px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                  <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" />
                                  <div>
                                    <strong>${escapeHtml(m.name)}</strong>
                                    <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(m.email)}</div>
                                  </div>
                                </div>
                              </td>
                              <td style="padding: 10px 14px;">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                  <span class="badge ${m.team_role === 'leader' ? 'badge-amber' : 'badge-indigo'} text-xs">
                                    ${escapeHtml(m.team_role)}
                                  </span>
                                  <strong>${escapeHtml(m.role_title || (m.team_role === 'leader' ? 'Project Leader' : 'Team Member'))}</strong>
                                </div>
                                ${m.responsibilities ? `
                                  <div style="font-size: 11px; color: var(--text-secondary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${escapeHtml(m.responsibilities)}
                                  </div>
                                ` : ''}
                              </td>
                              <td style="padding: 10px 14px;">
                                <div style="text-transform: capitalize; font-weight: 600;">${escapeHtml(m.strength || 'Fullstack')}</div>
                                <div style="font-size: 11px; color: var(--text-muted); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(m.languages || 'None')}</div>
                              </td>
                              <td style="padding: 10px 14px;">
                                ${(m.total_tasks || 0) === 0 ? `
                                  <span style="color: var(--text-muted); font-size: 11px;">No tasks assigned</span>
                                ` : `
                                  <div>
                                    <span style="font-weight: 700; color: #4338CA;">${m.completed_tasks}/${m.total_tasks} completed</span>
                                    <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">(${m.progress_percentage}%)</span>
                                  </div>
                                `}
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ` : workspaceSection === 'tasks' ? `
                  <!-- SECTION 2: TASKS & WORK COMPLETION -->
                  <div>
                    <!-- Tasks Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                      <div>
                        <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                          Tasks & Work Completion
                        </h4>
                        <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">
                          Assign, execute, and verify completion of project milestones.
                        </p>
                      </div>

                      <div style="display: flex; gap: 8px; align-items: center;">
                        ${isLeader ? `
                          <button id="btn-open-create-task" class="btn btn-sm btn-primary">
                            <i class="fa-solid fa-plus mr-1"></i> Create Task
                          </button>
                        ` : ''}
                      </div>
                    </div>

                    <!-- Tasks Filter Buttons -->
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;">
                      <button class="btn btn-xs ${taskFilter === 'all' ? 'btn-primary' : 'btn-subtle'} btn-task-filter" data-filter="all">
                        All Tasks (${(myTeamData?.tasks || []).length})
                      </button>
                      <button class="btn btn-xs ${taskFilter === 'my' ? 'btn-primary' : 'btn-subtle'} btn-task-filter" data-filter="my">
                        My Tasks (${(myTeamData?.myTasks || []).length})
                      </button>
                      <button class="btn btn-xs ${taskFilter === 'in_progress' ? 'btn-primary' : 'btn-subtle'} btn-task-filter" data-filter="in_progress">
                        In Progress (${(myTeamData?.tasks || []).filter(t => t.status === 'in_progress').length})
                      </button>
                      <button class="btn btn-xs ${taskFilter === 'completed' ? 'btn-primary' : 'btn-subtle'} btn-task-filter" data-filter="completed">
                        Completed (${(myTeamData?.tasks || []).filter(t => t.status === 'completed').length})
                      </button>
                      <button class="btn btn-xs ${taskFilter === 'not_started' ? 'btn-primary' : 'btn-subtle'} btn-task-filter" data-filter="not_started">
                        Not Started (${(myTeamData?.tasks || []).filter(t => t.status === 'not_started').length})
                      </button>
                    </div>

                    <!-- Tasks List -->
                    ${(() => {
                      const allTasks = myTeamData?.tasks || [];
                      const filtered = allTasks.filter(t => {
                        if (taskFilter === 'my') return t.assigned_to === auth.user?.id;
                        if (taskFilter === 'in_progress') return t.status === 'in_progress';
                        if (taskFilter === 'completed') return t.status === 'completed';
                        if (taskFilter === 'not_started') return t.status === 'not_started';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return `
                          <div class="card p-8 text-center text-muted" style="border: 1px dashed var(--border-color); background-color: var(--bg-subtle);">
                            <i class="fa-solid fa-list-check text-3xl mb-2" style="color: var(--color-primary); opacity: 0.5;"></i>
                            <h4 style="font-size: 15px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">No tasks found</h4>
                            <p style="font-size: 12px; margin: 0;">
                              ${isLeader ? 'Click "+ Create Task" above to assign project deliverables to your team.' : 'No tasks assigned under this filter.'}
                            </p>
                          </div>
                        `;
                      }

                      return `
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                          ${filtered.map(t => {
                            const isMyTask = t.assigned_to === auth.user?.id;
                            const canUpdate = isMyTask || isLeader;
                            const overdue = isOverdue(t.deadline, t.status);

                            return `
                              <div class="card" style="padding: 16px 20px; border: 1px solid var(--border-color); border-radius: 12px; background-color: #fff; transition: all 0.2s;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 10px;">
                                  <div style="flex: 1; min-width: 240px;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                      ${t.status === 'completed' ? `
                                        <span class="badge badge-emerald" style="font-size: 11px; font-weight: 700;">
                                          <i class="fa-solid fa-check mr-1"></i> Completed
                                        </span>
                                      ` : t.status === 'in_progress' ? `
                                        <span class="badge badge-amber" style="font-size: 11px; font-weight: 700;">
                                          <i class="fa-solid fa-clock mr-1"></i> In Progress
                                        </span>
                                      ` : `
                                        <span class="badge badge-subtle" style="font-size: 11px; font-weight: 700;">
                                          Not Started
                                        </span>
                                      `}
                                      ${overdue ? `
                                        <span class="badge badge-danger" style="font-size: 11px; font-weight: 700;">
                                          <i class="fa-solid fa-triangle-exclamation mr-1"></i> Overdue
                                        </span>
                                      ` : ''}
                                      ${isMyTask ? `
                                        <span class="badge badge-indigo" style="font-size: 10px; font-weight: 700;">
                                          Assigned to You
                                        </span>
                                      ` : ''}
                                    </div>
                                    <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                                      ${escapeHtml(t.title)}
                                    </h4>
                                    ${t.description ? `
                                      <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 8px 0; line-height: 1.4;">
                                        ${escapeHtml(t.description)}
                                      </p>
                                    ` : ''}
                                  </div>

                                  <!-- Leader Edit / Delete Controls -->
                                  ${isLeader ? `
                                    <div style="display: flex; gap: 6px; align-items: center;">
                                      <button class="btn btn-xs btn-subtle btn-edit-task" data-id="${t.id}" title="Edit Task">
                                        <i class="fa-solid fa-pencil"></i>
                                      </button>
                                      <button class="btn btn-xs btn-danger btn-delete-task" data-id="${t.id}" title="Delete Task">
                                        <i class="fa-solid fa-trash"></i>
                                      </button>
                                    </div>
                                  ` : ''}
                                </div>

                                <!-- Assignee, Deadline & Status Actions Row -->
                                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 10px; flex-wrap: wrap; gap: 10px; font-size: 12px;">
                                  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                      <img src="${t.assigned_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" />
                                      <span style="color: var(--text-secondary);">
                                        Assigned to: <strong style="color: var(--text-primary);">${escapeHtml(t.assigned_name || 'Unassigned')}</strong>
                                      </span>
                                    </div>
                                    <div style="color: ${overdue ? '#DC2626' : 'var(--text-muted)'}; display: flex; align-items: center; gap: 4px;">
                                      <i class="fa-regular fa-calendar"></i>
                                      <span>Deadline: <strong>${formatDeadline(t.deadline)}</strong></span>
                                    </div>
                                  </div>

                                  <!-- Work Status Transition Buttons -->
                                  <div style="display: flex; align-items: center; gap: 6px;">
                                    ${canUpdate ? `
                                      ${t.status === 'not_started' ? `
                                        <button class="btn btn-xs btn-primary btn-task-status-toggle" data-task-id="${t.id}" data-status="in_progress">
                                          <i class="fa-solid fa-play mr-1"></i> Start Work
                                        </button>
                                        <button class="btn btn-xs btn-subtle btn-task-status-toggle" data-task-id="${t.id}" data-status="completed">
                                          <i class="fa-solid fa-check mr-1"></i> Complete
                                        </button>
                                      ` : t.status === 'in_progress' ? `
                                        <button class="btn btn-xs btn-emerald btn-task-status-toggle" data-task-id="${t.id}" data-status="completed" style="background-color: #10B981; color: #fff;">
                                          <i class="fa-solid fa-check mr-1"></i> Mark Complete
                                        </button>
                                        <button class="btn btn-xs btn-subtle btn-task-status-toggle" data-task-id="${t.id}" data-status="not_started">
                                          Reset
                                        </button>
                                      ` : `
                                        <span style="font-size: 11px; font-weight: 700; color: #10B981;">
                                          <i class="fa-solid fa-circle-check mr-1"></i> Done
                                        </span>
                                        <button class="btn btn-xs btn-subtle btn-task-status-toggle" data-task-id="${t.id}" data-status="in_progress" style="margin-left: 6px;">
                                          Reopen
                                        </button>
                                      `}
                                    ` : `
                                      <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                                        Assigned to ${escapeHtml(t.assigned_name || 'teammate')}
                                      </span>
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
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                      <div>
                        <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                          Team Members & Roles
                        </h4>
                        <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">
                          Assign specific project roles and review individual task completion.
                        </p>
                      </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                      ${members.map(m => `
                        <div class="card" style="padding: 18px 20px; border: 1px solid var(--border-color); border-radius: 12px; background-color: #fff;">
                          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                              <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" />
                              <div>
                                <strong style="font-size: 15px; color: var(--text-primary); display: block;">
                                  ${escapeHtml(m.name)}
                                </strong>
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

                          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary); margin-bottom: 10px;">
                            <span>Individual Work Completion:</span>
                            <strong style="color: #4338CA;">${m.completed_tasks || 0}/${m.total_tasks || 0} tasks (${m.progress_percentage || 0}%)</strong>
                          </div>

                          ${isLeader ? `
                            <button class="btn btn-xs btn-subtle btn-assign-member-role" data-id="${m.id}" data-name="${escapeHtml(m.name)}" data-title="${escapeHtml(m.role_title || '')}" data-resp="${escapeHtml(m.responsibilities || '')}" style="width: 100%;">
                              <i class="fa-solid fa-pencil mr-1"></i> Assign Role & Responsibilities
                            </button>
                          ` : ''}
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : `
                  <!-- SECTION 4: TEAM CHAT & FILES -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                    <!-- Team Chat Entry -->
                    <div class="card" style="padding: 24px; border: 1px solid var(--border-color); border-radius: 14px; background-color: #fff;">
                      <div style="width: 48px; height: 48px; border-radius: 12px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 14px;">
                        <i class="fa-solid fa-comments"></i>
                      </div>
                      <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
                        Team & Mentor Group Chat
                      </h4>
                      <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 16px 0; line-height: 1.45;">
                        Connect in real time with your confirmed team members and assigned faculty mentor for quick discussions and project updates.
                      </p>
                      <button id="btn-open-workspace-chat" class="btn btn-primary" style="width: 100%;">
                        <i class="fa-solid fa-comment-dots mr-1"></i> Open Team & Mentor Chat
                      </button>
                    </div>

                    <!-- Project Files & Deliverables Info -->
                    <div class="card" style="padding: 24px; border: 1px solid var(--border-color); border-radius: 14px; background-color: #fff;">
                      <div style="width: 48px; height: 48px; border-radius: 12px; background-color: #EEF2FF; color: #4338CA; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 14px;">
                        <i class="fa-solid fa-folder-open"></i>
                      </div>
                      <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
                        Project Files & Deliverables
                      </h4>
                      <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 16px 0; line-height: 1.45;">
                        Deliverables, reports, and codebase repositories are submitted and verified directly in coordination with your assigned faculty guide during project milestone evaluations.
                      </p>
                      <div style="background-color: #F8FAFC; border: 1px dashed var(--border-color); border-radius: 10px; padding: 12px; font-size: 11px; color: var(--text-muted); text-align: center;">
                        <i class="fa-solid fa-info-circle mr-1"></i> Repository sync handled during mentor review sessions.
                      </div>
                    </div>
                  </div>
                `}
              </div>
            ` : myTeamSubView === 'applications' ? `
              <!-- Sub-View: Applications -->
              <div class="card" style="padding: 24px; border-radius: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <button id="btn-back-team-overview" class="btn btn-sm btn-subtle" style="margin-bottom: 8px;">
                      <i class="fa-solid fa-arrow-left mr-1"></i> Back to Team Overview
                    </button>
                    <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0;">
                      Applications — ${escapeHtml(team.name)}
                    </h3>
                    <span style="font-size: 12px; color: var(--text-secondary);">
                      Review applicant profiles and manually accept or reject candidates for this project.
                    </span>
                  </div>

                  <div style="text-align: right;">
                    <span class="badge badge-indigo">
                      ${incomingRequests.length} Total Applications
                    </span>
                  </div>
                </div>

                ${incomingRequests.length === 0 ? `
                  <div class="card p-8 text-center text-muted" style="border: 1px dashed var(--border-color); background-color: var(--bg-subtle);">
                    <i class="fa-solid fa-inbox text-3xl mb-2" style="color: var(--color-primary); opacity: 0.5;"></i>
                    <h4 style="font-size: 15px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">No applications received yet.</h4>
                    <p style="font-size: 12px; margin: 0; color: var(--text-secondary);">
                      When eligible students submit applications from the Available Teams board, they will be listed here.
                    </p>
                  </div>
                ` : `
                  <div style="display: flex; flex-direction: column; gap: 14px;">
                    ${incomingRequests.map((req) => `
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
                              ${req.compatibility_score}% Project Match
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
                              <button class="btn btn-sm btn-primary btn-decide-join" data-id="${req.id}" data-action="accept" ${vacancies === 0 ? 'disabled title="Team is already full"' : ''}>
                                Accept
                              </button>
                              ${vacancies === 0 ? '<span style="font-size: 11px; color: var(--color-danger); font-weight: 600;">Team Complete (0 vacancies)</span>' : ''}
                            ` : ''}
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            ` : `
              <!-- Sub-View: Smart Match / Find Members -->
              <div class="card" style="padding: 24px; border-radius: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <button id="btn-back-team-overview" class="btn btn-sm btn-subtle" style="margin-bottom: 8px;">
                      <i class="fa-solid fa-arrow-left mr-1"></i> Back to Team Overview
                    </button>
                    <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0;">
                      Smart Match / Find Members
                    </h3>
                    <span style="font-size: 12px; color: var(--text-secondary);">
                      Fill vacancies with compatible students who contribute missing team skills.
                    </span>
                  </div>

                  <div style="text-align: right;">
                    <span class="badge ${vacancies > 0 ? 'badge-emerald' : 'badge-danger'}">
                      ${vacancies} Vacancies Remaining
                    </span>
                  </div>
                </div>

                <!-- If team has no vacancies -->
                ${vacancies === 0 ? `
                  <div class="card p-8 text-center" style="background-color: var(--bg-subtle); border-radius: 14px;">
                    <i class="fa-solid fa-circle-check text-emerald text-3xl mb-2"></i>
                    <h4 style="font-weight: 800; font-size: 16px; margin: 0 0 6px 0; color: var(--text-primary);">Team Complete</h4>
                    <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">
                      Your team has reached maximum capacity (${maxMembers} / ${maxMembers} members). No vacancies remaining.
                    </p>
                  </div>
                ` : `
                  <!-- Notice if recruiting is still open -->
                  ${team.is_accepting_members ? `
                    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; padding: 12px 16px; border-radius: 10px; font-size: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-circle-info text-amber"></i>
                        <span>Recruiting is currently Open. You can close recruiting before sending direct vacancy invitations, or invite students directly below.</span>
                      </div>
                      <button id="btn-smart-close-recruiting" class="btn btn-xs btn-danger">
                        Close Recruiting
                      </button>
                    </div>
                  ` : ''}

                  <!-- Candidate Recommendations List -->
                  ${candidatesLoading ? `
                    <div class="p-8 text-center">
                      <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo mb-2"></i>
                      <div style="font-size: 13px; color: var(--text-secondary);">Evaluating candidate profiles against team skill balance...</div>
                    </div>
                  ` : (candidatesData?.candidates || []).length === 0 ? `
                    <div class="card p-8 text-center text-muted" style="border: 1px dashed var(--border-color); background-color: var(--bg-subtle);">
                      <i class="fa-solid fa-user-xmark text-3xl mb-2" style="opacity: 0.5;"></i>
                      <h4 style="font-size: 15px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">No eligible compatible candidates available.</h4>
                      <p style="font-size: 12px; margin: 0; color: var(--text-secondary);">
                        All registered students are either confirmed members of this team or have pending invitations.
                      </p>
                    </div>
                  ` : `
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                      ${(candidatesData?.candidates || []).map((cand) => `
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

                            <!-- 3 Compatibility Scores -->
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                              <span class="badge badge-subtle" style="font-size: 11px;">
                                Project: <strong>${cand.projectCompatibility}%</strong>
                              </span>
                              <span class="badge badge-subtle" style="font-size: 11px;">
                                Team: <strong>${cand.teamCompatibility}%</strong>
                              </span>
                              <span class="badge badge-emerald" style="font-weight: 800; font-size: 12px;">
                                Overall: ${cand.overallCompatibility}%
                              </span>
                            </div>
                          </div>

                          ${cand.bio ? `
                            <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; margin: 0 0 10px 0;">
                              ${escapeHtml(cand.bio)}
                            </p>
                          ` : ''}

                          <!-- Skill Contributions Rows -->
                          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; background-color: var(--bg-subtle); padding: 10px 14px; border-radius: 8px; font-size: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
                                Matching Skills:
                              </span>
                              ${cand.matchingSkills && cand.matchingSkills.length > 0 ? cand.matchingSkills.map(s => `
                                <span class="badge badge-indigo text-xs">${escapeHtml(s)}</span>
                              `).join(' ') : '<span class="text-xs text-muted">None specified</span>'}
                            </div>

                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                              <span style="font-size: 11px; font-weight: 700; color: #4338CA; text-transform: uppercase;">
                                Missing Skills Contributed:
                              </span>
                              ${cand.missingSkillsContributed && cand.missingSkillsContributed.length > 0 ? cand.missingSkillsContributed.map(s => `
                                <span class="badge badge-emerald text-xs"><i class="fa-solid fa-check mr-1"></i>${escapeHtml(s)}</span>
                              `).join(' ') : '<span class="text-xs text-muted">No gap skills contributed</span>'}
                            </div>
                          </div>

                          <!-- Actions Row -->
                          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 12px;">
                            <button class="btn btn-sm btn-subtle btn-inspect-candidate" data-id="${cand.id}">
                              <i class="fa-solid fa-eye mr-1"></i> View Profile
                            </button>
                            ${cand.invitationStatus === 'pending' ? `
                              <button class="btn btn-sm btn-subtle" disabled style="opacity: 0.7;">
                                <i class="fa-solid fa-clock mr-1"></i> Invitation Pending
                              </button>
                            ` : `
                              <button class="btn btn-sm btn-primary btn-invite-candidate" data-id="${cand.id}" data-name="${escapeHtml(cand.name)}" data-missing="${escapeHtml((cand.missingSkillsContributed || []).join(', '))}">
                                <i class="fa-solid fa-paper-plane mr-1"></i> Invite to Join
                              </button>
                            `}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  `}
                `}
              </div>
            `}
          `}
        ` : activeTab === 'join-teams' ? `
          <!-- Tab 2: Available Teams -->
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
                  No open teams found with current search keywords.
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
                        <span class="badge badge-warning">Request Pending</span>
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
                    <span>Leader: <strong>${escapeHtml(t.leader_name)}</strong></span>
                    <span>Required: <strong>${escapeHtml(t.required_skills || 'None')}</strong></span>
                    <span>Capacity: <strong>${t.current_members_count}/${t.max_members || 4} members</strong></span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <!-- Tab 3: Create Team -->
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
      </div>
    `;

    // Tab Switchers
    container.querySelector('#tab-my-team')?.addEventListener('click', () => {
      activeTab = 'my-team';
      myTeamSubView = 'overview';
      render();
    });
    container.querySelector('#tab-join-teams')?.addEventListener('click', () => {
      activeTab = 'join-teams';
      render();
    });
    container.querySelector('#tab-propose-team')?.addEventListener('click', () => {
      activeTab = 'propose-team';
      render();
    });
    container.querySelector('#btn-goto-available')?.addEventListener('click', () => {
      activeTab = 'join-teams';
      render();
    });
    container.querySelector('#btn-goto-propose')?.addEventListener('click', () => {
      activeTab = 'propose-team';
      render();
    });

    // Sub-View Switchers (Applications / Smart Match / Back)
    container.querySelector('#card-open-applications')?.addEventListener('click', () => {
      myTeamSubView = 'applications';
      render();
    });
    container.querySelector('#card-open-smart-match')?.addEventListener('click', () => {
      myTeamSubView = 'smart-match';
      loadCandidates();
    });
    container.querySelector('#btn-back-team-overview')?.addEventListener('click', () => {
      myTeamSubView = 'overview';
      render();
    });

    // Open Chat
    container.querySelector('#btn-open-team-chat-page')?.addEventListener('click', () => {
      navigate('student-chat');
    });
    container.querySelector('#btn-open-workspace-chat')?.addEventListener('click', () => {
      if (team?.chat_group_id) {
        navigate('student-chat', { initialGroupId: team.chat_group_id });
      } else {
        navigate('student-chat');
      }
    });

    // Workspace Section Tabs
    container.querySelector('#ws-tab-overview')?.addEventListener('click', () => {
      workspaceSection = 'overview';
      render();
    });
    container.querySelector('#ws-tab-tasks')?.addEventListener('click', () => {
      workspaceSection = 'tasks';
      render();
    });
    container.querySelector('#ws-tab-members')?.addEventListener('click', () => {
      workspaceSection = 'members';
      render();
    });
    container.querySelector('#ws-tab-files')?.addEventListener('click', () => {
      workspaceSection = 'files';
      render();
    });

    // Multi-Team Switcher
    container.querySelectorAll('.btn-switch-team').forEach((btn) => {
      btn.addEventListener('click', async () => {
        selectedTeamId = Number(btn.dataset.id);
        await loadData();
      });
    });

    // Go to My Tasks shortcut from Overview
    container.querySelector('#btn-goto-my-tasks')?.addEventListener('click', () => {
      workspaceSection = 'tasks';
      taskFilter = 'my';
      render();
    });

    // Task Filter Tabs
    container.querySelectorAll('.btn-task-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        taskFilter = btn.dataset.filter;
        render();
      });
    });

    // Open Create Task Modal
    container.querySelector('#btn-open-create-task')?.addEventListener('click', () => {
      if (team) openCreateTaskModal(team);
    });

    // Open Edit Task Modal
    container.querySelectorAll('.btn-edit-task').forEach((btn) => {
      btn.addEventListener('click', () => {
        const taskId = Number(btn.dataset.id);
        const task = (myTeamData?.tasks || []).find(t => t.id === taskId);
        if (task && team) openEditTaskModal(team, task);
      });
    });

    // Delete Task
    container.querySelectorAll('.btn-delete-task').forEach((btn) => {
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

    // Toggle Task Status (Start Work / Mark Complete / Reopen / Reset)
    container.querySelectorAll('.btn-task-status-toggle').forEach((btn) => {
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

    // Assign Member Role & Responsibilities Modal
    container.querySelectorAll('.btn-assign-member-role').forEach((btn) => {
      btn.addEventListener('click', () => {
        const memberId = Number(btn.dataset.id);
        const member = (myTeamData?.members || []).find(m => m.id === memberId);
        if (member && team) openAssignRoleModal(team, member);
      });
    });

    // View Mentor Profile
    container.querySelectorAll('.btn-inspect-team-fac').forEach((btn) => {
      btn.addEventListener('click', () => onOpenFacultyModal(btn.dataset.id));
    });

    // Inspect Candidate / Applicant Profile
    container.querySelectorAll('.btn-inspect-candidate').forEach((btn) => {
      btn.addEventListener('click', () => {
        openCandidateProfileModal(btn.dataset.id);
      });
    });

    // Toggle Recruiting
    const toggleRecruitingHandler = async () => {
      try {
        await api.toggleTeamRecruiting(team.id);
        loadData();
      } catch (err) {
        alert(err.message || 'Failed to toggle recruiting status.');
      }
    };
    container.querySelector('#btn-toggle-recruiting')?.addEventListener('click', toggleRecruitingHandler);
    container.querySelector('#btn-smart-close-recruiting')?.addEventListener('click', toggleRecruitingHandler);

    // Decide Join Request (Accept / Reject)
    container.querySelectorAll('.btn-decide-join').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const reqId = btn.dataset.id;
        const action = btn.dataset.action;

        try {
          await api.decideJoinRequest(reqId, action);
          await loadData();
        } catch (err) {
          alert(err.message || 'Failed to process application decision.');
        }
      });
    });

    // Invite Candidate Modal
    container.querySelectorAll('.btn-invite-candidate').forEach((btn) => {
      btn.addEventListener('click', () => {
        const candId = btn.dataset.id;
        const candName = btn.dataset.name;
        const missing = btn.dataset.missing;

        const defaultMsg = missing
          ? `Hi ${candName}! We noticed your strong skills in ${missing} and would love to invite you to join our project team "${team.name}".`
          : `Hi ${candName}! We would love to have you join our capstone project team "${team.name}".`;

        openModal({
          title: `Invite ${candName} to Join Team`,
          maxWidth: '480px',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <span style="font-size: 13px; color: var(--color-primary); font-weight: 700;">Team: ${escapeHtml(team.name)} (${vacancies} vacancies remaining)</span>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Invitation Message:</label>
              <textarea id="modal-invite-msg" rows="3" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;">${escapeHtml(defaultMsg)}</textarea>
              <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn btn-primary" id="btn-submit-send-invite">
                  <i class="fa-solid fa-paper-plane mr-1"></i> Send Invitation
                </button>
              </div>
            </div>
          `
        });

        document.getElementById('btn-submit-send-invite').addEventListener('click', async (e) => {
          const msg = document.getElementById('modal-invite-msg').value;
          e.target.disabled = true;
          e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

          try {
            await api.sendTeamInvitation(team.id, candId, msg);
            alert(`Invitation sent to ${candName}!`);
            document.querySelector('.modal-backdrop-layer')?.remove();
            loadCandidates();
          } catch (err) {
            alert(err.message || 'Failed to send invitation.');
            e.target.disabled = false;
            e.target.textContent = 'Send Invitation';
          }
        });
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

    // Apply to Join Modal (Available Teams)
    container.querySelectorAll('.btn-apply-join-team').forEach((btn) => {
      btn.addEventListener('click', () => {
        const teamId = btn.dataset.id;
        const teamName = btn.dataset.name;
        const teamTitle = btn.dataset.title;

        openModal({
          title: `Apply to Join "${teamName}"`,
          maxWidth: '480px',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <span style="font-size: 13px; color: var(--color-primary); font-weight: 700;">Project: ${escapeHtml(teamTitle)}</span>
              <textarea id="modal-apply-msg" rows="3" placeholder="Explain your skills and how you can contribute..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;">Hi! I would love to contribute to "${escapeHtml(teamTitle)}". My technical skills align well with your objectives.</textarea>
              <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn btn-primary" id="btn-submit-apply">
                  Send Application
                </button>
              </div>
            </div>
          `
        });

        document.getElementById('btn-submit-apply').addEventListener('click', async (e) => {
          const msg = document.getElementById('modal-apply-msg').value;
          e.target.disabled = true;
          e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

          try {
            await api.requestToJoinTeam(teamId, msg);
            alert('Application submitted successfully!');
            document.querySelector('.modal-backdrop-layer')?.remove();
            loadData();
          } catch (err) {
            alert(err.message || 'Failed to submit application.');
            e.target.disabled = false;
            e.target.textContent = 'Send Application';
          }
        });
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

        try {
          await api.createTeamProposal({
            name: container.querySelector('#prop-team-name').value.trim(),
            project_title: container.querySelector('#prop-proj-title').value.trim(),
            domain: container.querySelector('#prop-domain').value.trim(),
            technologies: container.querySelector('#prop-tech').value.trim(),
            required_skills: container.querySelector('#prop-skills').value.trim(),
            description: container.querySelector('#prop-desc').value.trim(),
            max_members: 4
          });

          alert('Proposal submitted to HOD! It is now pending review.');
          activeTab = 'my-team';
          myTeamSubView = 'overview';
          loadData();
        } catch (err) {
          alert(err.message || 'Failed to submit proposal.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Proposal to HOD';
        }
      });
    }
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
