/**
 * Modal Dialog Components for Smart Real-Time Project Team Finder System.
 */

import api from '../api.js';

export function openModal({ title, contentHtml, maxWidth = '600px', onClose = null }) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop-layer';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = `
    width: 100%;
    max-width: ${maxWidth};
    max-height: 90vh;
    overflow-y: auto;
    background-color: #fff;
    border-radius: 18px;
    box-shadow: var(--shadow-modal);
    padding: 24px;
    position: relative;
  `;

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 1px solid var(--border-color); margin-bottom: 20px;">
      <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0;">${title}</h3>
      <button class="modal-close-trigger" style="background: none; border: none; font-size: 18px; color: var(--text-muted); cursor: pointer; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="modal-body-content">
      ${contentHtml}
    </div>
  `;

  const close = () => {
    backdrop.remove();
    if (onClose) onClose();
  };

  card.querySelector('.modal-close-trigger').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.appendChild(card);
  container.appendChild(backdrop);
  return { card, backdrop, close };
}

export async function openFacultyModal(facultyId) {
  const { card, close } = openModal({
    title: 'Faculty Mentor Profile',
    contentHtml: '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>',
    maxWidth: '560px'
  });

  try {
    const data = await api.getFacultyDetail(facultyId);
    const faculty = data.faculty;

    if (!faculty) {
      card.querySelector('.modal-body-content').innerHTML = '<div class="p-4 text-center text-muted">Faculty member not found.</div>';
      return;
    }

    const languagesList = (faculty.languages || '').split(',').map((l) => l.trim()).filter((l) => l.length > 0);
    const langBadges = languagesList.map((l) => `
      <span style="background-color: #EEF2FF; color: #4338CA; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">
        ${l}
      </span>
    `).join('');

    card.querySelector('.modal-body-content').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border-light);">
          <img
            src="${faculty.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}"
            alt="${faculty.name}"
            class="avatar avatar-xl"
            style="width: 64px; height: 64px; border-radius: 14px;"
          />
          <div>
            <h3 style="font-size: 18px; font-weight: 800; margin: 0 0 2px 0;">${faculty.name}</h3>
            <div style="font-size: 13px; color: var(--text-secondary);">
              ${faculty.designation} • ${faculty.department}
            </div>
            <div style="font-size: 12px; color: var(--color-primary); margin-top: 2px;">
              <i class="fa-regular fa-envelope mr-1"></i> ${faculty.email}
            </div>
          </div>
        </div>

        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">
            Specialization & Guidance Subjects
          </span>
          <div style="font-size: 13px; color: var(--text-primary); font-weight: 600;">
            ${faculty.subjects || 'General Computer Science'}
          </div>
        </div>

        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 6px;">
            Programming Languages Known
          </span>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${langBadges || '<span class="text-xs text-muted">None specified</span>'}
          </div>
        </div>

        ${faculty.bio ? `
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">
              Faculty Bio / Mentorship Statement
            </span>
            <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0;">
              ${faculty.bio}
            </p>
          </div>
        ` : ''}

        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border-light);">
          <span class="badge badge-indigo">
            ${faculty.workload || 0} Active Mentees
          </span>
          ${faculty.linkedin_url ? `
            <a
              href="${faculty.linkedin_url}"
              target="_blank"
              rel="noreferrer"
              class="btn btn-sm btn-subtle"
              style="color: #0A66C2;"
            >
              <i class="fa-brands fa-linkedin mr-1"></i> View LinkedIn
            </a>
          ` : ''}
        </div>
      </div>
    `;

  } catch (err) {
    card.querySelector('.modal-body-content').innerHTML = `<div class="p-4 text-center text-danger">${err.message || 'Failed to load details.'}</div>`;
  }
}

export const openFacultyDetailModal = openFacultyModal;

export async function openCandidateProfileModal(studentId) {
  const { card } = openModal({
    title: 'Student Profile & Portfolio',
    contentHtml: '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>',
    maxWidth: '580px'
  });

  try {
    const data = await api.getCandidateProfile(studentId);
    const student = data.student;
    const projects = data.projects || [];

    if (!student) {
      card.querySelector('.modal-body-content').innerHTML = '<div class="p-4 text-center text-muted">Student profile not found.</div>';
      return;
    }

    const languagesList = (student.languages || '').split(',').map((l) => l.trim()).filter((l) => l.length > 0);
    const langBadges = languagesList.map((l) => `
      <span style="background-color: #EEF2FF; color: #4338CA; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">
        ${l}
      </span>
    `).join('');

    card.querySelector('.modal-body-content').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border-light);">
          <img
            src="${student.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}"
            alt="${student.name}"
            style="width: 64px; height: 64px; border-radius: 14px; object-fit: cover;"
          />
          <div>
            <h3 style="font-size: 18px; font-weight: 800; margin: 0 0 2px 0;">${student.name}</h3>
            <div style="font-size: 13px; color: var(--text-secondary);">
              ${student.reg_no || ''} • ${student.department || 'Computer Science'} • Sem ${student.semester || 'N/A'}
            </div>
            <div style="font-size: 12px; color: var(--color-primary); margin-top: 2px;">
              <i class="fa-regular fa-envelope mr-1"></i> ${student.email}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="background-color: var(--bg-subtle); padding: 10px 12px; border-radius: 8px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Primary Focus</span>
            <strong style="text-transform: capitalize; font-size: 13px; color: var(--text-primary);">${student.strength || 'Fullstack'}</strong>
          </div>
          <div style="background-color: var(--bg-subtle); padding: 10px 12px; border-radius: 8px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">CGPA</span>
            <strong style="font-size: 13px; color: var(--text-primary);">${student.cgpa || 'N/A'}</strong>
          </div>
        </div>

        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 6px;">
            Skills & Languages
          </span>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${langBadges || '<span class="text-xs text-muted">No languages listed</span>'}
          </div>
        </div>

        ${student.bio ? `
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">
              Bio / Interests
            </span>
            <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0;">
              ${student.bio}
            </p>
          </div>
        ` : ''}

        ${projects.length > 0 ? `
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 6px;">
              Academic Projects (${projects.length})
            </span>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${projects.map((pr) => `
                <div style="padding: 10px 12px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 12px;">
                  <strong style="color: var(--text-primary);">${pr.title}</strong>
                  ${pr.description ? `<p style="margin: 4px 0 0 0; color: var(--text-secondary);">${pr.description}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 14px; border-top: 1px solid var(--border-light);">
          ${student.github_url ? `
            <a href="${student.github_url}" target="_blank" rel="noreferrer" class="btn btn-sm btn-subtle">
              <i class="fa-brands fa-github mr-1"></i> GitHub
            </a>
          ` : ''}
          ${student.linkedin_url ? `
            <a href="${student.linkedin_url}" target="_blank" rel="noreferrer" class="btn btn-sm btn-subtle" style="color: #0A66C2;">
              <i class="fa-brands fa-linkedin mr-1"></i> LinkedIn
            </a>
          ` : ''}
        </div>
      </div>
    `;
  } catch (err) {
    card.querySelector('.modal-body-content').innerHTML = `<div class="p-4 text-center text-danger">${err.message || 'Failed to load details.'}</div>`;
  }
}
