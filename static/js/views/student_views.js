/**
 * Student Workspace Views for Smart Real-Time Project Team Finder System.
 */

import api from '../api.js';
import auth from '../auth.js';
import { openModal, openFacultyModal } from './modals.js';

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


// 3. Project Teams Workspace (Tabs: My Team, Join Teams, Propose Team)
export async function renderStudentTeams(container, { navigate, onOpenFacultyModal, viewParams = {} }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  let activeTab = viewParams.initialTab || 'my-team';
  let myTeamData = null;
  let availableTeams = [];
  let searchQuery = '';

  const loadData = async () => {
    try {
      const [teamRes, availRes] = await Promise.all([
        api.getMyTeam().catch(() => null),
        api.getAvailableTeamsToJoin().catch(() => ({ teams: [] }))
      ]);

      myTeamData = teamRes;
      availableTeams = availRes.teams || [];
      render();
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load teams.'}</div>`;
    }
  };

  const render = () => {
    const team = myTeamData?.team;
    const members = myTeamData?.members || [];
    const incomingRequests = myTeamData?.incomingRequests || [];
    const isLeader = team && (team.leader_id === auth.user?.id || team.my_role === 'leader');

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
        <!-- Header & Tabs -->
        <div class="card" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                Capstone Project Teams & Collaboration
              </h3>
              <span style="font-size: 12px; color: var(--text-secondary);">
                Collaborate with peers, browse open teams with skill matching, or propose your own capstone project team.
              </span>
            </div>

            <div style="display: flex; gap: 8px;">
              <button id="tab-my-team" class="btn btn-sm ${activeTab === 'my-team' ? 'btn-primary' : 'btn-subtle'}">
                <i class="fa-solid fa-users mr-1"></i> My Team ${team ? `(${members.length})` : ''}
              </button>
              <button id="tab-join-teams" class="btn btn-sm ${activeTab === 'join-teams' ? 'btn-primary' : 'btn-subtle'}">
                <i class="fa-solid fa-magnifying-glass mr-1"></i> Available Teams (${availableTeams.length})
              </button>
              <button id="tab-propose-team" class="btn btn-sm ${activeTab === 'propose-team' ? 'btn-primary' : 'btn-subtle'}">
                <i class="fa-solid fa-plus mr-1"></i> Propose New Team
              </button>
            </div>
          </div>
        </div>

        <!-- Tab 1: My Team -->
        ${activeTab === 'my-team' ? `
          ${!team ? `
            <div class="card p-8 text-center text-muted">
              <i class="fa-solid fa-people-roof text-4xl mb-3" style="color: var(--color-primary); opacity: 0.6;"></i>
              <h4 style="font-size: 16px; font-weight: 800; margin: 0 0 6px 0; color: var(--text-primary);">You are not in a team yet</h4>
              <p style="font-size: 13px; color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px auto;">
                You can browse approved teams that have openings and match your tech stack, or submit a new team proposal as leader.
              </p>
              <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="btn-goto-available" class="btn btn-primary">Browse Available Teams</button>
                <button id="btn-goto-propose" class="btn btn-subtle">Propose New Team</button>
              </div>
            </div>
          ` : `
            <div class="card" style="padding: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 11px; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
                      ${team.domain || 'Capstone'}
                    </span>
                    <span class="badge ${team.status === 'approved' ? 'badge-emerald' : 'badge-warning'}">
                      ${team.status.replace('_', ' ').toUpperCase()}
                    </span>
                    ${isLeader ? '<span class="badge badge-amber">You are Leader</span>' : ''}
                  </div>
                  <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                    ${team.name}
                  </h3>
                  <div style="font-size: 14px; color: var(--color-primary); font-weight: 600;">
                    ${team.project_title || 'Project'}
                  </div>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  ${team.chat_group_id ? `
                    <button id="btn-open-team-chat-page" class="btn btn-primary">
                      <i class="fa-solid fa-comments mr-1"></i> Open Team & Mentor Chat
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- Mentor Bar -->
              <div style="background-color: #EEF2FF; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                <div>
                  <span style="font-size: 11px; font-weight: 700; color: #4338CA; text-transform: uppercase; display: block;">Faculty Guide / Mentor</span>
                  <strong style="color: var(--text-primary); font-size: 14px;">
                    ${team.faculty_name || 'Awaiting HOD Allocation'}
                  </strong>
                  ${team.faculty_email ? `<span style="font-size: 12px; color: var(--text-secondary); margin-left: 8px;">(${team.faculty_email})</span>` : ''}
                </div>
                ${team.faculty_id ? `
                  <button class="btn btn-sm btn-subtle btn-inspect-team-fac" data-id="${team.faculty_id}">
                    <i class="fa-solid fa-eye mr-1"></i> View Mentor
                  </button>
                ` : ''}
              </div>

              <!-- Leader Controls: Recruitment Switch -->
              ${isLeader ? `
                <div style="background-color: var(--bg-subtle); padding: 14px 18px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                  <div>
                    <strong style="font-size: 13px; color: var(--text-primary); display: block;">Recruiting Openings Status</strong>
                    <span style="font-size: 12px; color: var(--text-secondary);">
                      ${team.is_accepting_members ? 'Your team is currently listed on the Available Teams board for applications.' : 'Recruiting is closed. No new applications are permitted.'}
                    </span>
                  </div>

                  <button id="btn-toggle-recruiting" class="btn btn-sm ${team.is_accepting_members ? 'btn-danger' : 'btn-primary'}">
                    ${team.is_accepting_members ? 'Close Recruiting' : 'Open Recruiting'}
                  </button>
                </div>
              ` : ''}

              <!-- Incoming Applications (If Leader) -->
              ${isLeader && incomingRequests.length > 0 ? `
                <div style="margin-bottom: 24px;">
                  <h4 style="font-size: 14px; font-weight: 800; color: var(--color-primary); margin: 0 0 10px 0;">
                    <i class="fa-solid fa-inbox mr-1"></i> Incoming Join Requests (${incomingRequests.filter((r) => r.status === 'pending').length} Pending)
                  </h4>
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${incomingRequests.map((req) => `
                      <div style="padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background-color: #fff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                          <strong style="font-size: 13px; color: var(--text-primary);">${req.student_name}</strong>
                          <span style="font-size: 12px; color: var(--text-secondary); margin-left: 6px;">(${req.reg_no} • ${req.strength} • CGPA ${req.cgpa})</span>
                          <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 0 0;">"${req.message}"</p>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                          ${req.status === 'pending' ? `
                            <button class="btn btn-sm btn-subtle btn-decide-join" data-id="${req.id}" data-action="reject" style="color: var(--color-danger);">
                              Decline
                            </button>
                            <button class="btn btn-sm btn-primary btn-decide-join" data-id="${req.id}" data-action="accept">
                              Accept Into Team
                            </button>
                          ` : `
                            <span class="badge ${req.status === 'accepted' ? 'badge-emerald' : 'badge-danger'}">${req.status.toUpperCase()}</span>
                          `}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Members Table -->
              <div>
                <h4 style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 0 0 10px 0;">
                  Team Members (${members.length} / ${team.max_members || 4})
                </h4>
                <div style="background-color: var(--bg-subtle); border-radius: 10px; overflow: hidden;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                      <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted);">
                        <th style="padding: 10px 14px;">Member</th>
                        <th style="padding: 10px 14px;">Reg No</th>
                        <th style="padding: 10px 14px;">Strength</th>
                        <th style="padding: 10px 14px;">Skills</th>
                        <th style="padding: 10px 14px;">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${members.map((m) => `
                        <tr style="border-bottom: 1px solid var(--border-light);">
                          <td style="padding: 10px 14px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                              <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 26px; height: 26px; border-radius: 50%;" />
                              <strong>${m.name}</strong>
                            </div>
                          </td>
                          <td style="padding: 10px 14px;">${m.reg_no}</td>
                          <td style="padding: 10px 14px; text-transform: capitalize;">${m.strength}</td>
                          <td style="padding: 10px 14px; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.languages || 'None'}</td>
                          <td style="padding: 10px 14px;">
                            <span class="badge ${m.team_role === 'leader' ? 'badge-amber' : 'badge-indigo'} text-xs">
                              ${m.team_role}
                            </span>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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
                          ${t.domain || 'Capstone'}
                        </span>
                        <span class="badge ${t.compatibilityScore >= 80 ? 'badge-emerald' : 'badge-indigo'}">
                          ${t.compatibilityScore}% Skill Compatibility
                        </span>
                      </div>
                      <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                        ${t.name}
                      </h3>
                      <div style="font-size: 13px; color: var(--color-primary); font-weight: 600;">
                        ${t.project_title || 'Project'}
                      </div>
                    </div>

                    <div>
                      ${t.requestStatus === 'pending' ? `
                        <span class="badge badge-warning">Request Pending</span>
                      ` : t.requestStatus === 'rejected' ? `
                        <span class="badge badge-danger">Request Declined</span>
                      ` : `
                        <button class="btn btn-sm btn-primary btn-apply-join-team" data-id="${t.id}" data-name="${t.name}" data-title="${t.project_title || t.name}">
                          <i class="fa-solid fa-paper-plane mr-1"></i> Apply to Join
                        </button>
                      `}
                    </div>
                  </div>

                  <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px;">
                    ${t.description || 'No description provided.'}
                  </p>

                  <div style="background-color: var(--bg-subtle); padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 12px;">
                    <strong>Match Analysis:</strong> ${t.matchExplanation}
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted);">
                    <span>Leader: <strong>${t.leader_name}</strong></span>
                    <span>Required: <strong>${t.required_skills || 'None'}</strong></span>
                    <span>Capacity: <strong>${t.current_members_count}/${t.max_members || 4} members</strong></span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <!-- Tab 3: Propose Team -->
          <div class="card" style="padding: 28px; max-width: 680px; margin: 0 auto;">
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

    // Tab switchers
    container.querySelector('#tab-my-team')?.addEventListener('click', () => { activeTab = 'my-team'; render(); });
    container.querySelector('#tab-join-teams')?.addEventListener('click', () => { activeTab = 'join-teams'; render(); });
    container.querySelector('#tab-propose-team')?.addEventListener('click', () => { activeTab = 'propose-team'; render(); });
    container.querySelector('#btn-goto-available')?.addEventListener('click', () => { activeTab = 'join-teams'; render(); });
    container.querySelector('#btn-goto-propose')?.addEventListener('click', () => { activeTab = 'propose-team'; render(); });

    container.querySelector('#btn-open-team-chat-page')?.addEventListener('click', () => {
      navigate('student-chat');
    });

    container.querySelectorAll('.btn-inspect-team-fac').forEach((btn) => {
      btn.addEventListener('click', () => onOpenFacultyModal(btn.dataset.id));
    });

    // Toggle Recruiting
    container.querySelector('#btn-toggle-recruiting')?.addEventListener('click', async () => {
      try {
        await api.toggleTeamRecruiting(team.id);
        loadData();
      } catch (err) {
        alert(err.message || 'Failed to toggle recruiting status.');
      }
    });

    // Decide Join Request
    container.querySelectorAll('.btn-decide-join').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const reqId = btn.dataset.id;
        const action = btn.dataset.action;

        try {
          await api.decideJoinRequest(reqId, action);
          loadData();
        } catch (err) {
          alert(err.message || 'Failed to process request.');
        }
      });
    });

    // Search available teams
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
              <span style="font-size: 13px; color: var(--color-primary); font-weight: 700;">Project: ${teamTitle}</span>
              <textarea id="modal-apply-msg" rows="3" placeholder="Explain your skills and how you can contribute..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;">Hi! I would love to contribute to "${teamTitle}". My technical skills align well with your objectives.</textarea>
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
