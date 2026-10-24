/**
 * HOD Governance Console Views for Smart Real-Time Project Team Finder System.
 */

import api from '../api.js';
import { openModal, openFacultyModal } from './modals.js';

// 1. HOD Executive Dashboard
export async function renderHodDashboard(container, { navigate }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const stats = await api.getHodStats();

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Welcome Banner -->
        <div class="card" style="background: linear-gradient(135deg, #4338CA 0%, #6366F1 100%); color: #fff; padding: 28px 32px; border-radius: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.4);">
          <div>
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85;">
              Department Executive Console
            </span>
            <h2 style="font-size: 24px; font-weight: 800; margin-top: 4px; margin-bottom: 8px;">
              Welcome, Head of Department
            </h2>
            <p style="font-size: 14px; opacity: 0.9; max-width: 600px; margin: 0;">
              Oversee capstone project guidance, faculty student allocations, mentor change requests, and department broadcasts.
            </p>
          </div>
          <div style="display: flex; gap: 12px;">
            <button id="btn-hod-dash-assign" style="background-color: #fff; color: #4338CA; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; border: none; cursor: pointer; box-shadow: var(--shadow-sm);">
              <i class="fa-solid fa-user-plus mr-2"></i> Assign Students
            </button>
            <button id="btn-hod-dash-post" style="background-color: rgba(255, 255, 255, 0.2); color: #fff; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; border: 1px solid rgba(255, 255, 255, 0.4); cursor: pointer;">
              <i class="fa-solid fa-bullhorn mr-2"></i> Post Notice
            </button>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid-four">
          <div class="card stat-card hover-lift">
            <div class="stat-icon-wrap bg-indigo-light">
              <i class="fa-solid fa-user-graduate"></i>
            </div>
            <div class="stat-info-col">
              <div class="stat-value">${stats.totalStudents || 0}</div>
              <div class="stat-label">Registered Students</div>
              <div class="stat-subtext">Undergraduate cohort</div>
            </div>
          </div>

          <div class="card stat-card hover-lift">
            <div class="stat-icon-wrap bg-violet-light">
              <i class="fa-solid fa-chalkboard-user"></i>
            </div>
            <div class="stat-info-col">
              <div class="stat-value">${stats.totalFaculty || 0}</div>
              <div class="stat-label">Faculty Mentors</div>
              <div class="stat-subtext">Department guides</div>
            </div>
          </div>

          <div class="card stat-card hover-lift">
            <div class="stat-icon-wrap ${stats.unassignedStudents > 0 ? 'bg-amber-light' : 'bg-emerald-light'}">
              <i class="fa-solid fa-user-clock"></i>
            </div>
            <div class="stat-info-col">
              <div class="stat-value">${stats.unassignedStudents || 0}</div>
              <div class="stat-label">Unassigned Students</div>
              <div class="stat-subtext">${stats.unassignedStudents > 0 ? 'Needs mentor allocation' : 'All students allocated'}</div>
            </div>
          </div>

          <div class="card stat-card hover-lift">
            <div class="stat-icon-wrap ${stats.pendingChangeRequests > 0 ? 'bg-amber-light' : 'bg-emerald-light'}">
              <i class="fa-solid fa-inbox"></i>
            </div>
            <div class="stat-info-col">
              <div class="stat-value">${stats.pendingChangeRequests || 0}</div>
              <div class="stat-label">Change Requests</div>
              <div class="stat-subtext">${stats.pendingChangeRequests > 0 ? 'Pending review' : 'Inbox clear'}</div>
            </div>
          </div>
        </div>

        <!-- Quick Action Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
          <div id="card-action-assign" class="card hover-lift" style="cursor: pointer;">
            <div class="card-title-row">
              <h3 class="card-main-title">
                <i class="fa-solid fa-users-gear text-indigo mr-2"></i> Faculty Mentorship Allocation
              </h3>
              <span class="badge badge-indigo">Manage</span>
            </div>
            <p class="card-subtitle" style="margin-bottom: 16px;">
              Balance department workloads by assigning students to faculty mentors based on specialization subjects and technical languages.
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--color-primary); font-weight: 700;">
              <span>Review workload distributions</span>
              <i class="fa-solid fa-arrow-right"></i>
            </div>
          </div>

          <div id="card-action-team-requests" class="card hover-lift" style="cursor: pointer;">
            <div class="card-title-row">
              <h3 class="card-main-title">
                <i class="fa-solid fa-clipboard-check text-indigo mr-2"></i> Project Team Proposals & Mentors
              </h3>
              <span class="badge badge-indigo">Manage</span>
            </div>
            <p class="card-subtitle" style="margin-bottom: 16px;">
              Review student project team submissions, approve capstone proposals, and allocate faculty mentors using genuine algorithmic compatibility.
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--color-primary); font-weight: 700;">
              <span>Review team proposals & mentor allocation</span>
              <i class="fa-solid fa-arrow-right"></i>
            </div>
          </div>

          <div id="card-action-change-requests" class="card hover-lift" style="cursor: pointer;">
            <div class="card-title-row">
              <h3 class="card-main-title">
                <i class="fa-solid fa-arrows-split-up-and-left text-violet mr-2"></i> Mentor Change Requests
              </h3>
              ${stats.pendingChangeRequests > 0 ? `
                <span class="badge badge-warning">${stats.pendingChangeRequests} Pending</span>
              ` : `
                <span class="badge badge-emerald">Clear</span>
              `}
            </div>
            <p class="card-subtitle" style="margin-bottom: 16px;">
              Review student applications for mentor changes, examine project alignment reasons, and approve or reject with official remarks.
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--color-secondary); font-weight: 700;">
              <span>Go to change requests inbox</span>
              <i class="fa-solid fa-arrow-right"></i>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-hod-dash-assign').addEventListener('click', () => navigate('assignments'));
    container.querySelector('#btn-hod-dash-post').addEventListener('click', () => navigate('post-notification'));
    container.querySelector('#card-action-assign').addEventListener('click', () => navigate('assignments'));
    container.querySelector('#card-action-team-requests').addEventListener('click', () => navigate('hod-team-requests'));
    container.querySelector('#card-action-change-requests').addEventListener('click', () => navigate('change-requests'));

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load dashboard.'}</div>`;
  }
}


// 2. HOD Mentorship & Workload Assignments
export async function renderHodAssignments(container, { navigate }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const [studentsRes, facultyRes, historyRes] = await Promise.all([
      api.getHodStudents(),
      api.getHodFaculty(),
      api.getAssignmentHistory()
    ]);

    const students = studentsRes.students || [];
    const facultyList = facultyRes.faculty || [];
    const history = historyRes.history || [];

    let statusFilter = 'unassigned'; // 'all', 'unassigned', 'assigned'
    let searchQuery = '';
    let selectedStudentIds = new Set();

    const render = () => {
      const filteredStudents = students.filter((s) => {
        const matchesStatus =
          statusFilter === 'all' ? true :
          statusFilter === 'unassigned' ? !s.faculty_id :
          !!s.faculty_id;

        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.reg_no && s.reg_no.toLowerCase().includes(q)) ||
          (s.strength && s.strength.toLowerCase().includes(q)) ||
          (s.languages && s.languages.toLowerCase().includes(q));

        return matchesStatus && matchesSearch;
      });

      const facultyOptions = facultyList.map((f) => `
        <option value="${f.id}">
          ${f.name} (${f.designation}) — ${f.workload || 0} Current Mentees
        </option>
      `).join('');

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Top Controls & Assignment Bar -->
          <div class="card" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                  Assign Students to Faculty Mentors
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Select students using checkboxes, pick a target faculty mentor, and assign with audit logging.
                </span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="btn-status-unassigned" class="btn btn-sm ${statusFilter === 'unassigned' ? 'btn-primary' : 'btn-subtle'}">
                  Unassigned (${students.filter((s) => !s.faculty_id).length})
                </button>
                <button id="btn-status-assigned" class="btn btn-sm ${statusFilter === 'assigned' ? 'btn-primary' : 'btn-subtle'}">
                  Assigned (${students.filter((s) => s.faculty_id).length})
                </button>
                <button id="btn-status-all" class="btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-subtle'}">
                  All Students (${students.length})
                </button>
              </div>
            </div>

            <!-- Action Panel -->
            <div style="background-color: var(--bg-subtle); padding: 16px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
              <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 300px;">
                <select id="select-destination-faculty" style="flex: 1; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; background-color: #fff;">
                  <option value="">-- Choose Destination Faculty Mentor --</option>
                  ${facultyOptions}
                </select>
                <input
                  id="input-assignment-note"
                  type="text"
                  placeholder="Assignment Note (e.g. IoT Guidance)"
                  style="flex: 1; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; background-color: #fff;"
                />
              </div>

              <div style="display: flex; align-items: center; gap: 12px;">
                <span id="label-selected-count" style="font-size: 13px; font-weight: 700; color: var(--color-primary);">
                  ${selectedStudentIds.size} student(s) selected
                </span>
                <button
                  id="btn-perform-assignment"
                  class="btn btn-primary"
                  ${selectedStudentIds.size === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                >
                  <i class="fa-solid fa-user-plus mr-1"></i> Assign Selected
                </button>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
              <input
                id="input-student-search"
                type="text"
                value="${searchQuery}"
                placeholder="Search students by name, reg no, tech skills..."
                style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; width: 320px;"
              />
              <div style="display: flex; gap: 8px;">
                <button id="btn-select-all" class="btn btn-sm btn-subtle">Select All Filtered</button>
                <button id="btn-clear-selection" class="btn btn-sm btn-subtle">Clear Selection</button>
              </div>
            </div>
          </div>

          <!-- Students Table -->
          <div class="card" style="padding: 0; overflow: hidden;">
            <table class="table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
              <thead>
                <tr style="background-color: var(--bg-subtle); border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 12px 16px; width: 40px;">#</th>
                  <th style="padding: 12px 16px;">Student</th>
                  <th style="padding: 12px 16px;">Reg No / Sem</th>
                  <th style="padding: 12px 16px;">CGPA</th>
                  <th style="padding: 12px 16px;">Strength & Skills</th>
                  <th style="padding: 12px 16px;">Current Mentor</th>
                </tr>
              </thead>
              <tbody>
                ${filteredStudents.length === 0 ? `
                  <tr>
                    <td colspan="6" style="padding: 32px; text-align: center; color: var(--text-muted);">
                      No students found matching current filters.
                    </td>
                  </tr>
                ` : filteredStudents.map((s) => `
                  <tr style="border-bottom: 1px solid var(--border-light); ${selectedStudentIds.has(s.id) ? 'background-color: #EEF2FF;' : ''}">
                    <td style="padding: 12px 16px;">
                      <input
                        type="checkbox"
                        class="student-select-chk"
                        data-id="${s.id}"
                        ${selectedStudentIds.has(s.id) ? 'checked' : ''}
                      />
                    </td>
                    <td style="padding: 12px 16px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 32px; height: 32px; border-radius: 50%;" />
                        <div>
                          <strong style="display: block; color: var(--text-primary);">${s.name}</strong>
                          <span style="font-size: 11px; color: var(--text-secondary);">${s.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 12px 16px;">
                      <span style="font-weight: 600;">${s.reg_no}</span>
                      <div style="font-size: 11px; color: var(--text-muted);">Semester ${s.semester}</div>
                    </td>
                    <td style="padding: 12px 16px;">
                      <span class="badge ${s.cgpa >= 8.5 ? 'badge-emerald' : 'badge-indigo'}">
                        ${s.cgpa}
                      </span>
                    </td>
                    <td style="padding: 12px 16px;">
                      <span class="badge badge-indigo text-xs" style="text-transform: capitalize; margin-bottom: 4px; display: inline-block;">
                        ${s.strength}
                      </span>
                      <div style="font-size: 11px; color: var(--text-secondary); max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${s.languages || 'None'}
                      </div>
                    </td>
                    <td style="padding: 12px 16px;">
                      ${s.faculty_name ? `
                        <div style="color: var(--color-primary); font-weight: 700; cursor: pointer;" class="btn-inspect-fac" data-fac-id="${s.faculty_id}">
                          <i class="fa-solid fa-chalkboard-user mr-1"></i> ${s.faculty_name}
                        </div>
                      ` : `
                        <span class="badge badge-amber">Unassigned</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Assignment Audit History -->
          <div class="card" style="padding: 20px;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 12px 0;">
              Recent Assignment Audit Trail
            </h3>
            <div style="max-height: 240px; overflow-y: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted);">
                    <th style="padding: 8px;">Date</th>
                    <th style="padding: 8px;">Student</th>
                    <th style="padding: 8px;">Assigned Mentor</th>
                    <th style="padding: 8px;">Assigned By</th>
                    <th style="padding: 8px;">Note</th>
                  </tr>
                </thead>
                <tbody>
                  ${history.slice(0, 15).map((h) => `
                    <tr style="border-bottom: 1px solid var(--border-light);">
                      <td style="padding: 8px; color: var(--text-secondary);">${new Date(h.assigned_at).toLocaleDateString()}</td>
                      <td style="padding: 8px; font-weight: 600;">${h.student_name}</td>
                      <td style="padding: 8px; color: var(--color-primary); font-weight: 600;">${h.faculty_name}</td>
                      <td style="padding: 8px;">${h.assigned_by_name}</td>
                      <td style="padding: 8px; color: var(--text-muted);">${h.note || 'Regular Allocation'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Event listeners
      container.querySelector('#btn-status-unassigned').addEventListener('click', () => { statusFilter = 'unassigned'; render(); });
      container.querySelector('#btn-status-assigned').addEventListener('click', () => { statusFilter = 'assigned'; render(); });
      container.querySelector('#btn-status-all').addEventListener('click', () => { statusFilter = 'all'; render(); });

      const searchInput = container.querySelector('#input-student-search');
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
        const inputRef = container.querySelector('#input-student-search');
        if (inputRef) {
          inputRef.focus();
          inputRef.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });

      container.querySelector('#btn-select-all').addEventListener('click', () => {
        filteredStudents.forEach((s) => selectedStudentIds.add(s.id));
        render();
      });

      container.querySelector('#btn-clear-selection').addEventListener('click', () => {
        selectedStudentIds.clear();
        render();
      });

      container.querySelectorAll('.student-select-chk').forEach((chk) => {
        chk.addEventListener('change', (e) => {
          const id = Number(e.target.dataset.id);
          if (e.target.checked) selectedStudentIds.add(id);
          else selectedStudentIds.delete(id);
          render();
        });
      });

      container.querySelectorAll('.btn-inspect-fac').forEach((btn) => {
        btn.addEventListener('click', () => {
          openFacultyModal(btn.dataset.facId);
        });
      });

      const assignBtn = container.querySelector('#btn-perform-assignment');
      if (assignBtn) {
        assignBtn.addEventListener('click', async () => {
          const facultyId = container.querySelector('#select-destination-faculty').value;
          const note = container.querySelector('#input-assignment-note').value;

          if (!facultyId) {
            alert('Please choose a destination faculty mentor.');
            return;
          }

          assignBtn.disabled = true;
          assignBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Assigning...';

          try {
            await api.assignStudents(Array.from(selectedStudentIds), facultyId, note);
            alert('Students successfully assigned!');
            renderHodAssignments(container, { navigate });
          } catch (err) {
            alert(err.message || 'Failed to assign students.');
            assignBtn.disabled = false;
            assignBtn.innerHTML = '<i class="fa-solid fa-user-plus mr-1"></i> Assign Selected';
          }
        });
      }
    };

    render();

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load assignments.'}</div>`;
  }
}


// 3. HOD Change Requests Inbox
export async function renderHodChangeRequests(container, { navigate }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const [crRes, facultyRes] = await Promise.all([
      api.getChangeRequests(),
      api.getHodFaculty()
    ]);

    const changeRequests = crRes.changeRequests || [];
    const facultyList = facultyRes.faculty || [];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div class="card" style="padding: 20px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
            Student Mentor Change Requests Inbox
          </h3>
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
            Review student requests to change allocated faculty mentors, examine technical alignment reasons, and record official approval or rejection remarks.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${changeRequests.length === 0 ? `
            <div class="card p-8 text-center text-muted">
              No change requests received. Inbox is completely clear!
            </div>
          ` : changeRequests.map((cr) => `
            <div class="card" style="padding: 20px; border-left: 4px solid ${cr.status === 'pending' ? 'var(--color-warning)' : cr.status === 'approved' ? 'var(--color-success)' : 'var(--color-danger)'};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${cr.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 40px; height: 40px; border-radius: 50%;" />
                  <div>
                    <h4 style="font-size: 15px; font-weight: 800; margin: 0 0 2px 0;">${cr.student_name}</h4>
                    <span style="font-size: 12px; color: var(--text-secondary);">${cr.reg_no} • CGPA ${cr.cgpa} • ${cr.strength}</span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge ${cr.status === 'pending' ? 'badge-warning' : cr.status === 'approved' ? 'badge-emerald' : 'badge-danger'}">
                    ${cr.status.toUpperCase()}
                  </span>
                  <span style="font-size: 11px; color: var(--text-muted);">${new Date(cr.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <!-- Mentors Row -->
              <div style="background-color: var(--bg-subtle); padding: 12px 16px; border-radius: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                <div>
                  <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 2px;">Current Mentor</span>
                  <strong style="color: var(--text-primary); font-size: 13px;">${cr.current_faculty_name}</strong>
                </div>
                <div>
                  <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 2px;">Requested Preference</span>
                  <strong style="color: var(--color-primary); font-size: 13px;">${cr.requested_faculty_name || 'Open / HOD Discretion'}</strong>
                </div>
              </div>

              <!-- Reason Statement -->
              <div style="margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 2px;">Student Justification</span>
                <p style="font-size: 13px; color: var(--text-primary); margin: 0; line-height: 1.4;">
                  "${cr.reason}"
                </p>
              </div>

              ${cr.hod_remark ? `
                <div style="background-color: #F8FAFC; padding: 10px 14px; border-radius: 8px; border: 1px dashed var(--border-color); font-size: 12px; margin-bottom: 12px;">
                  <strong>HOD Remarks:</strong> ${cr.hod_remark}
                </div>
              ` : ''}

              ${cr.status === 'pending' ? `
                <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-light); padding-top: 12px;">
                  <button class="btn btn-sm btn-subtle btn-reject-cr" data-id="${cr.id}" data-name="${cr.student_name}" style="color: var(--color-danger);">
                    <i class="fa-solid fa-xmark mr-1"></i> Decline Request
                  </button>
                  <button class="btn btn-sm btn-primary btn-approve-cr" data-id="${cr.id}" data-name="${cr.student_name}" data-req-fac="${cr.requested_faculty_id || ''}">
                    <i class="fa-solid fa-check mr-1"></i> Approve & Reassign
                  </button>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Decision handlers
    container.querySelectorAll('.btn-approve-cr').forEach((btn) => {
      btn.addEventListener('click', () => {
        const reqId = btn.dataset.id;
        const studentName = btn.dataset.name;
        const preselectedFacId = btn.dataset.reqFac;

        const facOptions = facultyList.map((f) => `
          <option value="${f.id}" ${f.id === Number(preselectedFacId) ? 'selected' : ''}>
            ${f.name} (${f.designation}) — ${f.workload || 0} Current Mentees
          </option>
        `).join('');

        openModal({
          title: `Approve Mentor Change for ${studentName}`,
          maxWidth: '500px',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Assign New Faculty Mentor *</label>
                <select id="modal-select-fac" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;">
                  ${facOptions}
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">HOD Approval Remarks</label>
                <textarea id="modal-remark" rows="2" placeholder="e.g. Approved based on technical domain fit." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;"></textarea>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
                <button class="btn btn-primary" id="btn-confirm-approve">
                  Confirm Approval & Reallocate
                </button>
              </div>
            </div>
          `
        });

        document.getElementById('btn-confirm-approve').addEventListener('click', async (e) => {
          const newFacultyId = document.getElementById('modal-select-fac').value;
          const remark = document.getElementById('modal-remark').value;

          e.target.disabled = true;
          e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Approving...';

          try {
            await api.decideChangeRequest(reqId, 'approved', newFacultyId, remark);
            alert('Change request approved!');
            document.querySelector('.modal-backdrop-layer')?.remove();
            renderHodChangeRequests(container, { navigate });
          } catch (err) {
            alert(err.message || 'Failed to approve request.');
            e.target.disabled = false;
            e.target.textContent = 'Confirm Approval & Reallocate';
          }
        });
      });
    });

    container.querySelectorAll('.btn-reject-cr').forEach((btn) => {
      btn.addEventListener('click', () => {
        const reqId = btn.dataset.id;
        const studentName = btn.dataset.name;

        openModal({
          title: `Decline Mentor Change for ${studentName}`,
          maxWidth: '460px',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Reason for Declining (Sent to Student)</label>
                <textarea id="modal-reject-remark" rows="3" placeholder="e.g. Current faculty has available capacity and adequate specialization in this area." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;"></textarea>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
                <button class="btn btn-danger" id="btn-confirm-reject">
                  Confirm Decline
                </button>
              </div>
            </div>
          `
        });

        document.getElementById('btn-confirm-reject').addEventListener('click', async (e) => {
          const remark = document.getElementById('modal-reject-remark').value;

          e.target.disabled = true;
          e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Declining...';

          try {
            await api.decideChangeRequest(reqId, 'rejected', null, remark);
            alert('Change request declined.');
            document.querySelector('.modal-backdrop-layer')?.remove();
            renderHodChangeRequests(container, { navigate });
          } catch (err) {
            alert(err.message || 'Failed to decline request.');
            e.target.disabled = false;
            e.target.textContent = 'Confirm Decline';
          }
        });
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load change requests.'}</div>`;
  }
}


// 4. HOD Project Team Proposals & Mentor Assignment
export async function renderHodTeamRequests(container, { navigate }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  let currentTab = 'pending_approval'; // 'all', 'pending_approval', 'modification_requested', 'approved', 'rejected'
  let searchQuery = '';

  const loadProposals = async () => {
    try {
      const data = await api.getHodTeamProposals({
        status: currentTab,
        search: searchQuery
      });
      const proposals = data.proposals || [];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Top Info Card -->
          <div class="card" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                  Project Team Proposals & Mentors
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Review student capstone project submissions, approve proposals, and allocate faculty mentors using mathematical skill compatibility.
                </span>
              </div>
              <input
                id="input-proposals-search"
                type="text"
                value="${searchQuery}"
                placeholder="Search proposals by title, team, domain..."
                style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; width: 280px;"
              />
            </div>

            <!-- Status Tabs -->
            <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px;">
              <button class="btn btn-sm ${currentTab === 'pending_approval' ? 'btn-primary' : 'btn-subtle'} tab-prop" data-tab="pending_approval">
                Pending Review
              </button>
              <button class="btn btn-sm ${currentTab === 'approved' ? 'btn-primary' : 'btn-subtle'} tab-prop" data-tab="approved">
                Approved
              </button>
              <button class="btn btn-sm ${currentTab === 'modification_requested' ? 'btn-primary' : 'btn-subtle'} tab-prop" data-tab="modification_requested">
                Modification Requested
              </button>
              <button class="btn btn-sm ${currentTab === 'rejected' ? 'btn-primary' : 'btn-subtle'} tab-prop" data-tab="rejected">
                Rejected
              </button>
              <button class="btn btn-sm ${currentTab === 'all' ? 'btn-primary' : 'btn-subtle'} tab-prop" data-tab="all">
                All Proposals
              </button>
            </div>
          </div>

          <!-- Proposals List -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${proposals.length === 0 ? `
              <div class="card p-8 text-center text-muted">
                No team proposals found under "${currentTab.replace('_', ' ')}".
              </div>
            ` : proposals.map((p) => `
              <div class="card" style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <span style="font-size: 11px; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
                      ${p.domain || 'Capstone Project'}
                    </span>
                    <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 2px 0 4px 0;">
                      ${p.project_title || p.name}
                    </h3>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                      Team: <strong>${p.name}</strong> • Leader: <strong>${p.leader_name}</strong> • Target: ${p.target_date || 'End of Semester'}
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge ${p.status === 'approved' ? 'badge-emerald' : p.status === 'pending_approval' ? 'badge-warning' : 'badge-danger'}">
                      ${p.status.replace('_', ' ').toUpperCase()}
                    </span>
                    ${p.faculty_name ? `
                      <span class="badge badge-indigo">
                        Mentor: ${p.faculty_name}
                      </span>
                    ` : `
                      <span class="badge badge-amber">No Mentor Allocated</span>
                    `}
                  </div>
                </div>

                <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 14px;">
                  ${p.description || 'No project description provided.'}
                </p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background-color: var(--bg-subtle); padding: 14px; border-radius: 12px; margin-bottom: 14px;">
                  <div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 2px;">Technologies</span>
                    <span style="font-size: 12px; color: var(--text-primary); font-weight: 600;">${p.technologies || 'None specified'}</span>
                  </div>
                  <div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 2px;">Required Skills Needed</span>
                    <span style="font-size: 12px; color: var(--text-primary); font-weight: 600;">${p.required_skills || 'None specified'}</span>
                  </div>
                </div>

                <!-- Team Members Chips -->
                <div style="margin-bottom: 14px;">
                  <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 6px;">
                    Team Roster (${(p.members || []).length} / ${p.max_members || 4} members)
                  </span>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${(p.members || []).map((m) => `
                      <div style="display: flex; align-items: center; gap: 6px; background-color: #fff; border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                        <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 20px; height: 20px; border-radius: 50%;" />
                        <strong>${m.name}</strong>
                        ${m.team_role === 'leader' ? '<span style="color: var(--color-amber); font-size: 10px; font-weight: 800;">LEADER</span>' : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>

                ${p.hod_remarks ? `
                  <div style="background-color: #F8FAFC; padding: 10px 14px; border-radius: 8px; border: 1px dashed var(--border-color); font-size: 12px; margin-bottom: 14px;">
                    <strong>HOD Remarks:</strong> ${p.hod_remarks}
                  </div>
                ` : ''}

                <!-- Action Controls -->
                <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-light); padding-top: 14px;">
                  <button class="btn btn-sm btn-subtle btn-inspect-mentor-match" data-team-id="${p.id}" data-team-title="${p.project_title || p.name}">
                    <i class="fa-solid fa-wand-magic-sparkles text-indigo mr-1"></i>
                    ${p.faculty_id ? 'Reassign Mentor Compatibility' : 'Match & Assign Mentor'}
                  </button>

                  <button class="btn btn-sm btn-primary btn-review-proposal" data-team-id="${p.id}" data-team-name="${p.name}">
                    <i class="fa-solid fa-clipboard-check mr-1"></i> Review Proposal Decision
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // Tab switcher
      container.querySelectorAll('.tab-prop').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentTab = btn.dataset.tab;
          loadProposals();
        });
      });

      const searchInput = container.querySelector('#input-proposals-search');
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        loadProposals();
      });

      // Review Decision Modal
      container.querySelectorAll('.btn-review-proposal').forEach((btn) => {
        btn.addEventListener('click', () => {
          const teamId = btn.dataset.teamId;
          const teamName = btn.dataset.teamName;

          openModal({
            title: `Review Decision: ${teamName}`,
            maxWidth: '500px',
            contentHtml: `
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Proposal Status Action *</label>
                  <select id="modal-proposal-action" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;">
                    <option value="approve">Approve Capstone Proposal</option>
                    <option value="request_modification">Request Modifications from Team</option>
                    <option value="reject">Reject Proposal</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Official Remarks & Instructions</label>
                  <textarea id="modal-proposal-remarks" rows="3" placeholder="Provide clear feedback or approval notes for the student team..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;"></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
                  <button class="btn btn-primary" id="btn-submit-proposal-decision">
                    Record Decision
                  </button>
                </div>
              </div>
            `
          });

          document.getElementById('btn-submit-proposal-decision').addEventListener('click', async (e) => {
            const action = document.getElementById('modal-proposal-action').value;
            const remarks = document.getElementById('modal-proposal-remarks').value;

            e.target.disabled = true;
            e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            try {
              await api.decideHodProposal(teamId, action, remarks);
              alert('Proposal decision saved!');
              document.querySelector('.modal-backdrop-layer')?.remove();
              loadProposals();
            } catch (err) {
              alert(err.message || 'Failed to save decision.');
              e.target.disabled = false;
              e.target.textContent = 'Record Decision';
            }
          });
        });
      });

      // Mentor Match Modal
      container.querySelectorAll('.btn-inspect-mentor-match').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const teamId = btn.dataset.teamId;
          const teamTitle = btn.dataset.teamTitle;

          const { card, close } = openModal({
            title: `Algorithmic Mentor Match: ${teamTitle}`,
            maxWidth: '680px',
            contentHtml: '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i> Calculating compatibility...</div>'
          });

          try {
            const recData = await api.getHodMentorRecommendations(teamId);
            const recommendations = recData.recommendations || [];

            card.querySelector('.modal-body-content').innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
                  Mathematical match scores calculated from project domain keywords, required technologies, and faculty workload capacity.
                </p>

                <div style="display: flex; flex-direction: column; gap: 12px; max-height: 420px; overflow-y: auto;">
                  ${recommendations.map((r, idx) => `
                    <div style="border: 2px solid ${idx === 0 ? 'var(--color-primary)' : 'var(--border-color)'}; padding: 14px; border-radius: 12px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; background-color: ${idx === 0 ? '#F5F3FF' : '#fff'};">
                      <div style="display: flex; gap: 12px;">
                        <img src="${r.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="" style="width: 44px; height: 44px; border-radius: 10px;" />
                        <div>
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="font-size: 14px; color: var(--text-primary);">${r.facultyName}</strong>
                            <span class="badge ${r.compatibilityScore >= 80 ? 'badge-emerald' : 'badge-indigo'}">
                              ${r.compatibilityScore}% Match
                            </span>
                            ${idx === 0 ? '<span class="badge badge-indigo">Top Recommended</span>' : ''}
                          </div>
                          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                            ${r.designation} • ${r.department} • <strong>${r.activeMentoredCount} active team(s)</strong>
                          </div>
                          <div style="font-size: 12px; color: var(--text-primary); margin-top: 4px; line-height: 1.3;">
                            ${r.explanation}
                          </div>
                          <div style="display: flex; gap: 10px; font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                            <span>Domain: <strong>${r.domainScore}/45</strong></span>
                            <span>Tech: <strong>${r.techScore}/30</strong></span>
                            <span>Workload: <strong>${r.workloadScore}/25</strong></span>
                          </div>
                        </div>
                      </div>

                      <button class="btn btn-sm btn-primary btn-assign-this-mentor" data-fac-id="${r.facultyId}" data-fac-name="${r.facultyName}" style="flex-shrink: 0;">
                        Assign Mentor
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;

            card.querySelectorAll('.btn-assign-this-mentor').forEach((assignBtn) => {
              assignBtn.addEventListener('click', async () => {
                const facId = assignBtn.dataset.facId;
                const facName = assignBtn.dataset.facName;

                if (!confirm(`Confirm assigning ${facName} as mentor for this team?`)) return;

                assignBtn.disabled = true;
                assignBtn.textContent = 'Assigning...';

                try {
                  await api.assignHodMentor(teamId, facId, 'Allocated by HOD based on skill match');
                  alert(`Successfully assigned ${facName}!`);
                  close();
                  loadProposals();
                } catch (err) {
                  alert(err.message || 'Failed to assign mentor.');
                  assignBtn.disabled = false;
                  assignBtn.textContent = 'Assign Mentor';
                }
              });
            });

          } catch (err) {
            card.querySelector('.modal-body-content').innerHTML = `<div class="p-4 text-center text-danger">${err.message || 'Failed to load recommendations.'}</div>`;
          }
        });
      });

    };

    loadProposals();

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load proposals.'}</div>`;
  }
}


// 5. HOD View-Only Directory
export async function renderHodDirectory(container, { navigate }) {
  container.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>';

  try {
    const [studentsRes, facultyRes] = await Promise.all([
      api.getHodStudents(),
      api.getHodFaculty()
    ]);

    const students = studentsRes.students || [];
    const faculty = facultyRes.faculty || [];

    let currentTab = 'students';
    let searchQuery = '';

    const render = () => {
      const q = searchQuery.toLowerCase();
      const filteredStudents = students.filter((s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.reg_no.toLowerCase().includes(q)
      );

      const filteredFaculty = faculty.filter((f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        f.subjects.toLowerCase().includes(q)
      );

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="card" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 12px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
                  Department Directory (Strictly View-Only)
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Per academic governance rules, HOD console provides view-only transparency. Account creation & edits are managed by individual users.
                </span>
              </div>
              <input
                id="input-dir-search"
                type="text"
                value="${searchQuery}"
                placeholder="Search directory..."
                style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; width: 280px;"
              />
            </div>

            <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px;">
              <button id="tab-dir-students" class="btn btn-sm ${currentTab === 'students' ? 'btn-primary' : 'btn-subtle'}">
                <i class="fa-solid fa-user-graduate mr-1"></i> Registered Students (${filteredStudents.length})
              </button>
              <button id="tab-dir-faculty" class="btn btn-sm ${currentTab === 'faculty' ? 'btn-primary' : 'btn-subtle'}">
                <i class="fa-solid fa-chalkboard-user mr-1"></i> Faculty Mentors (${filteredFaculty.length})
              </button>
            </div>
          </div>

          <!-- Directory Content Table -->
          <div class="card" style="padding: 0; overflow: hidden;">
            ${currentTab === 'students' ? `
              <table class="table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                  <tr style="background-color: var(--bg-subtle); border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 12px 16px;">Student</th>
                    <th style="padding: 12px 16px;">Reg No</th>
                    <th style="padding: 12px 16px;">Semester & CGPA</th>
                    <th style="padding: 12px 16px;">Strength & Skills</th>
                    <th style="padding: 12px 16px;">Assigned Mentor</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredStudents.map((s) => `
                    <tr style="border-bottom: 1px solid var(--border-light);">
                      <td style="padding: 12px 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <img src="${s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="" style="width: 32px; height: 32px; border-radius: 50%;" />
                          <div>
                            <strong style="display: block; color: var(--text-primary);">${s.name}</strong>
                            <span style="font-size: 11px; color: var(--text-secondary);">${s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td style="padding: 12px 16px; font-weight: 600;">${s.reg_no}</td>
                      <td style="padding: 12px 16px;">
                        Sem ${s.semester} • <span class="badge ${s.cgpa >= 8.5 ? 'badge-emerald' : 'badge-indigo'}">${s.cgpa}</span>
                      </td>
                      <td style="padding: 12px 16px;">
                        <span class="badge badge-indigo text-xs" style="text-transform: capitalize;">${s.strength}</span>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${s.languages || 'None'}</div>
                      </td>
                      <td style="padding: 12px 16px;">
                        ${s.faculty_name ? `
                          <span style="color: var(--color-primary); font-weight: 700;">${s.faculty_name}</span>
                        ` : `
                          <span class="badge badge-amber">Unassigned</span>
                        `}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <table class="table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                  <tr style="background-color: var(--bg-subtle); border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 12px 16px;">Faculty Member</th>
                    <th style="padding: 12px 16px;">Designation</th>
                    <th style="padding: 12px 16px;">Department</th>
                    <th style="padding: 12px 16px;">Subjects & Guidance Areas</th>
                    <th style="padding: 12px 16px;">Active Mentees</th>
                    <th style="padding: 12px 16px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredFaculty.map((f) => `
                    <tr style="border-bottom: 1px solid var(--border-light);">
                      <td style="padding: 12px 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <img src="${f.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="" style="width: 32px; height: 32px; border-radius: 50%;" />
                          <div>
                            <strong style="display: block; color: var(--text-primary);">${f.name}</strong>
                            <span style="font-size: 11px; color: var(--text-secondary);">${f.email}</span>
                          </div>
                        </div>
                      </td>
                      <td style="padding: 12px 16px; font-weight: 600;">${f.designation}</td>
                      <td style="padding: 12px 16px; color: var(--text-secondary);">${f.department}</td>
                      <td style="padding: 12px 16px; font-size: 12px;">${f.subjects}</td>
                      <td style="padding: 12px 16px;">
                        <span class="badge badge-indigo">${f.workload || 0} students</span>
                      </td>
                      <td style="padding: 12px 16px;">
                        <button class="btn btn-sm btn-subtle btn-inspect-dir-fac" data-id="${f.id}">
                          <i class="fa-solid fa-eye mr-1"></i> View
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      `;

      container.querySelector('#tab-dir-students').addEventListener('click', () => { currentTab = 'students'; render(); });
      container.querySelector('#tab-dir-faculty').addEventListener('click', () => { currentTab = 'faculty'; render(); });

      const searchInput = container.querySelector('#input-dir-search');
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
        const ref = container.querySelector('#input-dir-search');
        if (ref) {
          ref.focus();
          ref.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });

      container.querySelectorAll('.btn-inspect-dir-fac').forEach((btn) => {
        btn.addEventListener('click', () => {
          openFacultyModal(btn.dataset.id);
        });
      });
    };

    render();

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-danger">${err.message || 'Failed to load directory.'}</div>`;
  }
}


// 6. HOD Post Notification
export function renderHodPostNotification(container, { navigate }) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px; max-width: 680px; margin: 0 auto;">
      <div class="card" style="padding: 28px;">
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
            Broadcast Department Notification
          </h3>
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
            Publish official announcements, project deadline alerts, and guidelines. Instant real-time alerts are pushed to active browser sessions.
          </p>
        </div>

        <div id="post-notif-success" style="display: none; background-color: var(--color-success-light); color: var(--color-success); padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 16px;">
          <i class="fa-solid fa-circle-check mr-2"></i> Notice published successfully!
        </div>

        <div id="post-notif-error" style="display: none; background-color: var(--color-danger-light); color: var(--color-danger); padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 16px;">
          <i class="fa-solid fa-circle-exclamation mr-2"></i> <span id="post-notif-error-text"></span>
        </div>

        <form id="form-post-notification" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
              Announcement Title *
            </label>
            <input
              id="notif-title"
              type="text"
              required
              placeholder="e.g. Capstone Phase 1 SRS Submission Deadline"
              style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;"
            />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                Target Audience *
              </label>
              <select id="notif-audience" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; background-color: #fff;">
                <option value="both">Both (All Students & Faculty)</option>
                <option value="students">Students Only</option>
                <option value="faculty">Faculty Mentors Only</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                Optional Due Date / Deadline
              </label>
              <input
                id="notif-deadline"
                type="datetime-local"
                style="width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;"
              />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
              Message Content *
            </label>
            <textarea
              id="notif-body"
              required
              rows="5"
              placeholder="Provide clear department instructions, repository guidelines, or meeting details..."
              style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit; line-height: 1.4;"
            ></textarea>
          </div>

          <button
            id="btn-submit-notif"
            type="submit"
            style="margin-top: 6px; background-color: var(--color-primary); color: #fff; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;"
          >
            <i class="fa-solid fa-bullhorn"></i> Broadcast Notification Now
          </button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#form-post-notification');
  const btn = container.querySelector('#btn-submit-notif');
  const successBox = container.querySelector('#post-notif-success');
  const errorBox = container.querySelector('#post-notif-error');
  const errorText = container.querySelector('#post-notif-error-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    successBox.style.display = 'none';
    errorBox.style.display = 'none';

    const title = container.querySelector('#notif-title').value.trim();
    const audience = container.querySelector('#notif-audience').value;
    const deadline = container.querySelector('#notif-deadline').value;
    const body = container.querySelector('#notif-body').value.trim();

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Broadcasting...';

    try {
      await api.postNotification({
        title,
        audience,
        deadline: deadline || null,
        body
      });

      successBox.style.display = 'block';
      form.reset();
      setTimeout(() => {
        navigate('notifications');
      }, 1500);
    } catch (err) {
      errorText.textContent = err.message || 'Failed to post notification.';
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-bullhorn"></i> Broadcast Notification Now';
    }
  });
}

export const renderHodProjectTeamRequests = renderHodTeamRequests;
