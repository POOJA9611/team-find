/**
 * Authentication Views (Login, Signup, Forgot Password, Reset Password)
 * for Smart Real-Time Project Team Finder System.
 */

import auth from '../auth.js';
import api from '../api.js';

export function renderLogin(container, { onGoToSignup, onGoToForgotPassword }) {
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 0;">
                Password
              </label>
              <button
                id="link-go-to-forgot"
                type="button"
                style="background: none; border: none; padding: 0; font-size: 12px; font-weight: 600; color: var(--color-primary); cursor: pointer; text-decoration: underline;"
              >
                Forgot Password?
              </button>
            </div>
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
          New student or faculty?
          <button
            id="link-go-to-signup"
            type="button"
            style="color: var(--color-primary); font-weight: 700; border: none; background: none; cursor: pointer; text-decoration: underline; margin-left: 4px;"
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

  const signupBtn = container.querySelector('#link-go-to-signup');
  if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (onGoToSignup) onGoToSignup();
    });
  }

  const forgotBtn = container.querySelector('#link-go-to-forgot');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (onGoToForgotPassword) onGoToForgotPassword();
    });
  }

  container.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Authenticating...</span>';

    try {
      await auth.login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
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

            <!-- Passwords -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Password (min 6 chars) *</label>
                <input id="signup-password" type="password" required minlength="6" placeholder="••••••••" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Confirm Password *</label>
                <input id="signup-confirm-password" type="password" required minlength="6" placeholder="••••••••" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Department *</label>
              <input id="signup-dept" type="text" value="Computer Science & Engineering" class="form-input" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;" />
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
            Already registered?
            <button
              id="link-go-to-login"
              type="button"
              style="color: var(--color-primary); font-weight: 700; border: none; background: none; cursor: pointer; text-decoration: underline; margin-left: 4px;"
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

    container.querySelector('#link-go-to-login').addEventListener('click', (e) => {
      e.preventDefault();
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
      const confirmPassword = container.querySelector('#signup-confirm-password').value;
      const department = container.querySelector('#signup-dept').value.trim();
      const bio = container.querySelector('#signup-bio').value.trim();
      const languages = container.querySelector('#signup-langs').value.trim();
      const linkedin_url = container.querySelector('#signup-linkedin') ? container.querySelector('#signup-linkedin').value.trim() : '';

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify your confirmation password.');
        return;
      }

      const payload = {
        role: selectedRole,
        name,
        email,
        password,
        confirm_password: confirmPassword,
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


export function renderForgotPassword(container, { onGoToLogin, onGoToReset }) {
  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #F7F8FC 100%); padding: 24px;">
      <div class="card" style="width: 100%; max-width: 480px; padding: 36px; box-shadow: var(--shadow-modal); border-radius: 24px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="width: 64px; height: 64px; border-radius: 16px; background-color: var(--color-primary-light); color: var(--color-primary); display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 16px;">
            <i class="fa-solid fa-key"></i>
          </div>
          <h2 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
            Recover Password
          </h2>
          <p style="font-size: 14px; color: var(--text-secondary); margin: 0;">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        <div id="forgot-error-alert" style="display: none; background-color: var(--color-danger-light); color: var(--color-danger); padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 20px; align-items: center; gap: 10px;">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span id="forgot-error-text"></span>
        </div>

        <div id="forgot-success-alert" style="display: none; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; padding: 16px; border-radius: 12px; font-size: 13px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; margin-bottom: 6px;">
            <i class="fa-solid fa-circle-check" style="font-size: 16px;"></i>
            <span id="forgot-success-title">Recovery Link Generated</span>
          </div>
          <p id="forgot-success-message" style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.5;"></p>
          <div id="forgot-dev-box" style="display: none; background-color: #F8FAFC; border: 1px dashed #CBD5E1; padding: 12px; border-radius: 8px; margin-top: 10px;">
            <div style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: #64748B; margin-bottom: 4px;">
              Local / Developer Mode
            </div>
            <div style="font-size: 12px; color: #334155; margin-bottom: 10px; word-break: break-all;" id="forgot-dev-instructions"></div>
            <button
              id="btn-use-reset-token"
              type="button"
              style="width: 100%; background-color: var(--color-primary); color: #fff; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"
            >
              <i class="fa-solid fa-arrow-right"></i>
              <span>Proceed to Reset Password Now</span>
            </button>
          </div>
        </div>

        <form id="forgot-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              Registered Email Address
            </label>
            <div style="position: relative;">
              <i class="fa-regular fa-envelope" style="position: absolute; left: 14px; top: 14px; color: var(--text-muted);"></i>
              <input
                id="forgot-email"
                type="email"
                required
                placeholder="name@college.edu or name@student.edu"
                style="width: 100%; padding: 12px 14px 12px 40px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 14px; outline: none;"
              />
            </div>
          </div>

          <button
            id="btn-forgot-submit"
            type="submit"
            style="margin-top: 6px; background-color: var(--color-primary); color: #fff; padding: 13px; border-radius: 10px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.25);"
          >
            <i class="fa-solid fa-paper-plane"></i>
            <span>Send Password Reset Request</span>
          </button>
        </form>

        <div style="margin-top: 24px; text-align: center; font-size: 13px; color: var(--text-secondary);">
          Remembered your password?
          <button
            id="link-forgot-to-login"
            type="button"
            style="color: var(--color-primary); font-weight: 700; border: none; background: none; cursor: pointer; text-decoration: underline; margin-left: 4px;"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  `;

  const emailInput = container.querySelector('#forgot-email');
  const errorAlert = container.querySelector('#forgot-error-alert');
  const errorText = container.querySelector('#forgot-error-text');
  const successAlert = container.querySelector('#forgot-success-alert');
  const successTitle = container.querySelector('#forgot-success-title');
  const successMessage = container.querySelector('#forgot-success-message');
  const devBox = container.querySelector('#forgot-dev-box');
  const devInstructions = container.querySelector('#forgot-dev-instructions');
  const submitBtn = container.querySelector('#btn-forgot-submit');
  const form = container.querySelector('#forgot-form');

  let currentToken = null;

  const setError = (msg) => {
    if (msg) {
      errorText.textContent = msg;
      errorAlert.style.display = 'flex';
      successAlert.style.display = 'none';
    } else {
      errorAlert.style.display = 'none';
    }
  };

  container.querySelector('#link-forgot-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    if (onGoToLogin) onGoToLogin();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');

    const email = emailInput.value.trim();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Processing...</span>';

    try {
      const response = await api.forgotPassword(email);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Send Password Reset Request</span>';

      successAlert.style.display = 'block';
      successMessage.textContent = response.message;

      if (response.email_sent) {
        successTitle.textContent = 'Reset Instructions Sent!';
        devBox.style.display = 'none';
      } else {
        successTitle.textContent = 'Reset Token Generated (SMTP Notice)';
        currentToken = response.token;
        devBox.style.display = 'block';
        devInstructions.innerHTML = `
          <strong>Notice:</strong> ${response.instructions || 'SMTP email service is unconfigured.'}<br/>
          <strong>Token:</strong> <span style="user-select: all; font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${response.token}</span>
        `;

        const proceedBtn = container.querySelector('#btn-use-reset-token');
        if (proceedBtn) {
          proceedBtn.onclick = () => {
            if (onGoToReset) onGoToReset(currentToken);
          };
        }
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Send Password Reset Request</span>';
      setError(err.message || 'Failed to process request. Please check email address.');
    }
  });
}


export function renderResetPassword(container, { token: initialToken, onGoToLogin }) {
  let activeToken = initialToken || '';

  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #F7F8FC 100%); padding: 24px;">
      <div class="card" style="width: 100%; max-width: 480px; padding: 36px; box-shadow: var(--shadow-modal); border-radius: 24px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="width: 64px; height: 64px; border-radius: 16px; background-color: #EEF2FF; color: var(--color-primary); display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 16px;">
            <i class="fa-solid fa-lock-open"></i>
          </div>
          <h2 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">
            Set New Password
          </h2>
          <p style="font-size: 14px; color: var(--text-secondary); margin: 0;">
            Create a secure new password for your portal account.
          </p>
        </div>

        <div id="reset-error-alert" style="display: none; background-color: var(--color-danger-light); color: var(--color-danger); padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 20px; align-items: center; gap: 10px;">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span id="reset-error-text"></span>
        </div>

        <div id="reset-success-alert" style="display: none; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; padding: 16px; border-radius: 12px; font-size: 13px; margin-bottom: 20px; text-align: center;">
          <i class="fa-solid fa-circle-check" style="font-size: 24px; margin-bottom: 8px;"></i>
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">Password Reset Successful!</div>
          <div id="reset-success-text" style="font-size: 13px;">You can now log in with your new password. Redirecting...</div>
        </div>

        <form id="reset-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              Reset Security Token *
            </label>
            <input
              id="reset-token-input"
              type="text"
              required
              value="${activeToken}"
              placeholder="Paste security reset token..."
              style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 13px; outline: none; font-family: monospace;"
            />
          </div>

          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              New Password (min 6 characters) *
            </label>
            <input
              id="reset-new-password"
              type="password"
              required
              minlength="6"
              placeholder="••••••••"
              style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 14px; outline: none;"
            />
          </div>

          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              Confirm New Password *
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              required
              minlength="6"
              placeholder="••••••••"
              style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 14px; outline: none;"
            />
          </div>

          <button
            id="btn-reset-submit"
            type="submit"
            style="margin-top: 8px; background-color: var(--color-primary); color: #fff; padding: 13px; border-radius: 10px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.25);"
          >
            <i class="fa-solid fa-check"></i>
            <span>Update Password</span>
          </button>
        </form>

        <div style="margin-top: 24px; text-align: center; font-size: 13px; color: var(--text-secondary);">
          <button
            id="link-reset-to-login"
            type="button"
            style="color: var(--color-primary); font-weight: 700; border: none; background: none; cursor: pointer; text-decoration: underline;"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  `;

  const tokenInput = container.querySelector('#reset-token-input');
  const passwordInput = container.querySelector('#reset-new-password');
  const confirmInput = container.querySelector('#reset-confirm-password');
  const errorAlert = container.querySelector('#reset-error-alert');
  const errorText = container.querySelector('#reset-error-text');
  const successAlert = container.querySelector('#reset-success-alert');
  const submitBtn = container.querySelector('#btn-reset-submit');
  const form = container.querySelector('#reset-form');

  const setError = (msg) => {
    if (msg) {
      errorText.textContent = msg;
      errorAlert.style.display = 'flex';
      successAlert.style.display = 'none';
    } else {
      errorAlert.style.display = 'none';
    }
  };

  container.querySelector('#link-reset-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    if (onGoToLogin) onGoToLogin();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');

    const token = tokenInput.value.trim();
    const newPassword = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (!token) {
      setError('Please provide the reset security token.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Updating Password...</span>';

    try {
      await api.resetPassword(token, newPassword, confirmPassword);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Update Password</span>';

      form.style.display = 'none';
      successAlert.style.display = 'block';

      setTimeout(() => {
        if (onGoToLogin) onGoToLogin();
      }, 2000);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Update Password</span>';
      setError(err.message || 'Failed to reset password. Token may have expired.');
    }
  });
}

export const renderLoginView = renderLogin;
export const renderSignupView = renderSignup;
export const renderForgotPasswordView = renderForgotPassword;
export const renderResetPasswordView = renderResetPassword;
