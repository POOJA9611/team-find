/**
 * Authentication & Persona State Management for Smart Real-Time Project Team Finder System.
 */

import api from './api.js';

class AuthService {
  constructor() {
    this.user = null;
    this.profile = null;
    this.token = localStorage.getItem('token') || null;
    this.loading = true;
    this.listeners = [];
    this.subscribers = [];
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  getProfile() {
    return this.profile;
  }

  isLoading() {
    return this.loading;
  }

  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    // If not loading, call immediately with current state
    if (!this.loading) {
      try {
        callback(this.user);
      } catch (err) {
        console.error('Auth subscriber initial callback error:', err);
      }
    }
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  notify() {
    const payload = {
      user: this.user,
      profile: this.profile,
      token: this.token,
      loading: this.loading,
      isAuthenticated: !!this.user
    };

    this.listeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error('Auth onChange error:', err);
      }
    });

    this.subscribers.forEach((cb) => {
      try {
        cb(this.user);
      } catch (err) {
        console.error('Auth subscriber error:', err);
      }
    });
  }

  async init() {
    this.loading = true;
    this.notify();

    if (!this.token) {
      this.loading = false;
      this.notify();
      return;
    }

    try {
      const data = await api.getMe();
      this.user = data.user;
      this.profile = data.profile;
    } catch (err) {
      console.warn('Failed to restore session token:', err);
      this.token = null;
      this.user = null;
      this.profile = null;
      localStorage.removeItem('token');
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  async login(email, password) {
    const data = await api.login(email, password);
    this.token = data.token;
    this.user = data.user;
    this.profile = data.profile;
    localStorage.setItem('token', data.token);
    this.notify();
    return data;
  }

  async signup(userData) {
    const data = await api.signup(userData);
    this.token = data.token;
    this.user = data.user;
    this.profile = data.profile;
    localStorage.setItem('token', data.token);
    this.notify();
    return data;
  }

  logout() {
    this.token = null;
    this.user = null;
    this.profile = null;
    localStorage.removeItem('token');
    this.notify();
  }

  async refreshUser() {
    if (!this.token) return;
    try {
      const data = await api.getMe();
      this.user = data.user;
      this.profile = data.profile;
      this.notify();
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  }

  async switchDemoAccount(role) {
    const credentials = {
      hod: { email: 'hod.cs@college.edu', password: 'HodPass@2026' },
      faculty: { email: 'dr.jenkins@college.edu', password: 'password123' },
      student: { email: 'alex.chen@student.edu', password: 'password123' }
    };
    const cred = credentials[role];
    if (cred) {
      return await this.login(cred.email, cred.password);
    }
  }
}

export const auth = new AuthService();
export const authState = auth;
export default auth;
