/**
 * Authentication Views (Login & Signup) for Smart Real-Time Project Team Finder System.
 */

import auth from '../auth.js';

export function renderLogin(container, { onGoToSignup }) {
  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #F7F8FC 100%); padding: 24px;">
      <div class="card" style="width: 100%; max-width: 460px; padding: 36px; box-shadow: var(--shadow-modal); border-radius: 24px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="width: 64px; height: 64px; border-radius: 16px; background-color: var(--color-primary-light); color: var(--color-primary); display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px;">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>
          <h2 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
            Academic Portal
          </h2>
          <p style="font-size: 14px; color: var(--text-secondary); margin: 0;">
            Project Guidance & Capstone Team Management
          </p>
        </div>

        <div id="login-error-alert" style="display: none; background-color: var(--color-danger-light); color: var(--color-danger); padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 20px; align-items: center; gap: 10px;">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span id="login-error-text"></span>
        </div>

        <form id="login-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              Email Address
            </label>
            <div style="position: relative;">
              <i class="fa-regular fa-envelope" style="position: absolute; left: 14px; top: 14px; color: var(--text-muted);"></i>
              <input
                id="login-email"
                type="email"
                required
                placeholder="name@college.edu or name@student.edu"
                style="width: 100%; padding: 12px 14px 12px 40px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 14px; outline: none; transition: border-color 0.2s;"
              />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              Password
            </label>
            <div style="position: relative;">
              <i class="fa-solid fa-lock" style="position: absolute; left: 14px; top: 14px; color: var(--text-muted);"></i>
              <input
                id="login-password"
                type="password"
                required
                placeholder="••••••••"
                style="width: 100%; padding: 12px 14px 12px 40px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 14px; outline: none;"
              />
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            style="margin-top: 8px; background-color: var(--color-primary); color: #fff; padding: 13px; border-radius: 10px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.25);"
          >
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
            <span>Sign In to Portal</span>
          </button>
        </form>

        <!-- Quick Demo Logins Box -->
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-light);">
          <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px; text-align: center;">
            Quick 1-Click Demo Logins
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <button
              id="btn-fill-hod"
              type="button"
              style="padding: 8px 6px; border-radius: 8px; border: 1px solid #E0E7FF; background-color: #EEF2FF; color: #4338CA; font-size: 11px; font-weight: 700; cursor: pointer;"
            >
              HOD (Admin)
            </button>
            <button
              id="btn-fill-fac"
              type="button"
              style="padding: 8px 6px; border-radius: 8px; border: 1px solid #EDE9FE; background-color: #F5F3FF; color: #7C3AED; font-size: 11px; font-weight: 700; cursor: pointer;"
            >
              Faculty Mentor
            </button>
            <button
              id="btn-fill-std"
              type="button"
              style="padding: 8px 6px; border-radius: 8px; border: 1px solid #DCFCE7; background-color: #F0FDF4; color: #16A34A; font-size: 11px; font-weight: 700; cursor: pointer;"
            >
              Student
            </button>
          </div>
        </div>

        <div style="margin-top: 24px; text-align: center; font-size: 13px; color: var(--text-secondary);">
          New student or faculty?{' '}
          <button
            id="link-go-to-signup"
            type="button"
            style="color: var(--color-primary); font-weight: 700; border: none; background: none; cursor: pointer;"
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  `;

  const emailInput = container.querySelector('#login-email');
  const passwordInput = container.querySelector('#login-password');
  const errorAlert = container.querySelector('#login-error-alert');
  const errorText = container.querySelector('#login-error-text');
  const submitBtn = container.querySelector('#btn-login-submit');

  const setError = (msg) => {
    if (msg) {
      errorText.textContent = msg;
      errorAlert.style.display = 'flex';
    } else {
      errorAlert.style.display = 'none';
    }
  };

  container.querySelector('#btn-fill-hod').addEventListener('click', () => {
    emailInput.value = 'hod.cs@college.edu';
    passwordInput.value = 'HodPass@2026';
    setError('');
  });

  container.querySelector('#btn-fill-fac').addEventListener('click', () => {
    emailInput.value = 'sarah.jenkins@college.edu';
    passwordInput.value = 'Password@123';
    setError('');
  });

  container.querySelector('#btn-fill-std').addEventListener('click', () => {
    emailInput.value = 'alex.chen@student.edu';
    passwordInput.value = 'Password@123';
    setError('');
  });

  container.querySelector('#link-go-to-signup').addEventListener('click', () => {
    if (onGoToSignup) onGoToSignup();
  });

  container.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Authenticating...</span>';

    try {
      await auth.login(emailInput.value.trim(), passwordInput.value);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> <span>Sign In to Portal</span>';
    }
  });
}


export function renderSignup(container, { onGoToLogin }) {
  let selectedRole = 'student';

  const renderForm = () => {
    container.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #F7F8FC 100%); padding: 32px 16px;">
        <div class="card" style="width: 100%; max-width: 620px; padding: 36px; box-shadow: var(--shadow-modal); border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
              Create Your Portal Account
            </h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
              Join the department project guidance and capstone collaboration portal
            </p>
          </div>

          <!-- Role Toggle -->
          <div style="display: flex; gap: 10px; margin-bottom: 24px; background-color: var(--bg-subtle); padding: 6px; border-radius: 14px;">
            <button
              id="role-tab-student"
              type="button"
              style="flex: 1; padding: 10px; border-radius: 10px; font-weight: 700; font-size: 13px; border: none; cursor: pointer; transition: all 0.2s; ${selectedRole === 'student' ? 'background-color: #fff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: none; color: var(--text-secondary);'}"
            >
              <i class="fa-solid fa-user-graduate mr-2"></i> Register as Student
            </button>
            <button
              id="role-tab-faculty"
              type="button"
              style="flex: 1; padding: 10px; border-radius: 10px; font-weight: 700; font-size: 13px; border: none; cursor: pointer; transition: all 0.2s; ${selectedRole === 'faculty' ? 'background-color: #fff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: none; color: var(--text-secondary);'}"
            >
              <i class="fa-solid fa-chalkboard-user mr-2"></i> Register as Faculty
            </button>
          </div>

          <div id="signup-error-alert" style="display: none; background-color: var(--color-danger-light); color: var(--color-danger); padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 20px; align-items: center; gap: 10px;">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span id="signup-error-text"></span>
          </div>

          <form id="signup-form" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Common Fields -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Full Name *</label>
                <input id="signup-name" type="text" required placeholder="e.g. Alex Chen" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Email Address *</label>
                <input id="signup-email" type="email" required placeholder="${selectedRole === 'faculty' ? 'faculty.name@college.edu' : 'student.name@student.edu'}" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
            </div>

            ${selectedRole === 'faculty' ? `
              <div style="background-color: #EEF2FF; padding: 8px 12px; border-radius: 8px; font-size: 12px; color: #4338CA;">
                <i class="fa-solid fa-circle-info mr-1"></i> Faculty email must end with <strong>@college.edu</strong>.
              </div>
            ` : ''}

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Password (min 6 chars) *</label>
                <input id="signup-password" type="password" required minlength="6" placeholder="••••••••" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Department *</label>
                <input id="signup-dept" type="text" value="Computer Science & Engineering" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
            </div>

            <!-- Student Specific Fields -->
            ${selectedRole === 'student' ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Registration No *</label>
                  <input id="signup-regno" type="text" placeholder="RA2211003010142" required class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                </div>
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Semester</label>
                  <select id="signup-semester" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;">
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6" selected>Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">CGPA</label>
                  <input id="signup-cgpa" type="number" step="0.1" min="0" max="10" value="8.5" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 14px;">
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Core Strength *</label>
                  <select id="signup-strength" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;">
                    <option value="fullstack">Full-Stack</option>
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Languages & Tech Stack *</label>
                  <input id="signup-langs" type="text" placeholder="e.g. JavaScript, Python, React, Node.js" value="JavaScript, Python, React" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">LinkedIn URL (Optional)</label>
                  <input id="signup-linkedin" type="url" placeholder="https://linkedin.com/in/username" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                </div>
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">GitHub URL (Optional)</label>
                  <input id="signup-github" type="url" placeholder="https://github.com/username" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                </div>
              </div>
            ` : `
              <!-- Faculty Specific Fields -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Designation *</label>
                  <select id="signup-designation" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;">
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Languages Known *</label>
                  <input id="signup-langs" type="text" placeholder="e.g. Python, Java, Go" value="Python, Java, Go" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
                </div>
              </div>

              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Research & Guidance Subjects *</label>
                <input id="signup-subjects" type="text" placeholder="e.g. Cloud Computing, Distributed Systems, AI" value="Cloud Computing, Distributed Systems" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>

              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">LinkedIn URL (Optional)</label>
                <input id="signup-linkedin" type="url" placeholder="https://linkedin.com/in/username" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
            `}

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Bio / Introduction</label>
              <textarea id="signup-bio" rows="2" placeholder="Brief technical summary..." class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-family: inherit;"></textarea>
            </div>

            <button
              id="btn-signup-submit"
              type="submit"
              style="margin-top: 10px; background-color: var(--color-primary); color: #fff; padding: 13px; border-radius: 10px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.25);"
            >
              <i class="fa-solid fa-user-plus"></i>
              <span>Register Account</span>
            </button>
          </form>

          <div style="margin-top: 24px; text-align: center; font-size: 13px; color: var(--text-secondary);">
            Already registered?{' '}
            <button
              id="link-go-to-login"
              type="button"
              style="color: var(--color-primary); font-weight: 700; border: none; background: none; cursor: pointer;"
            >
              Sign In Instead
            </button>
          </div>
        </div>
      </div>
    `;

    // Role switcher events
    container.querySelector('#role-tab-student').addEventListener('click', () => {
      selectedRole = 'student';
      renderForm();
    });

    container.querySelector('#role-tab-faculty').addEventListener('click', () => {
      selectedRole = 'faculty';
      renderForm();
    });

    container.querySelector('#link-go-to-login').addEventListener('click', () => {
      if (onGoToLogin) onGoToLogin();
    });

    const errorAlert = container.querySelector('#signup-error-alert');
    const errorText = container.querySelector('#signup-error-text');
    const submitBtn = container.querySelector('#btn-signup-submit');

    const setError = (msg) => {
      if (msg) {
        errorText.textContent = msg;
        errorAlert.style.display = 'flex';
      } else {
        errorAlert.style.display = 'none';
      }
    };

    container.querySelector('#signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      setError('');

      const name = container.querySelector('#signup-name').value.trim();
      const email = container.querySelector('#signup-email').value.trim();
      const password = container.querySelector('#signup-password').value;
      const department = container.querySelector('#signup-dept').value.trim();
      const bio = container.querySelector('#signup-bio').value.trim();
      const languages = container.querySelector('#signup-langs').value.trim();
      const linkedin_url = container.querySelector('#signup-linkedin') ? container.querySelector('#signup-linkedin').value.trim() : '';

      const payload = {
        role: selectedRole,
        name,
        email,
        password,
        department,
        bio,
        languages,
        linkedin_url
      };

      if (selectedRole === 'student') {
        payload.reg_no = container.querySelector('#signup-regno').value.trim();
        payload.semester = Number(container.querySelector('#signup-semester').value);
        payload.cgpa = Number(container.querySelector('#signup-cgpa').value);
        payload.strength = container.querySelector('#signup-strength').value;
        payload.github_url = container.querySelector('#signup-github').value.trim();
      } else if (selectedRole === 'faculty') {
        payload.designation = container.querySelector('#signup-designation').value;
        payload.subjects = container.querySelector('#signup-subjects').value.trim();
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Creating Account...</span>';

      try {
        await auth.signup(payload);
      } catch (err) {
        setError(err.message || 'Registration failed. Please check inputs.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> <span>Register Account</span>';
      }
    });
  };

  renderForm();
}

export const renderLoginView = renderLogin;
export const renderSignupView = renderSignup;
