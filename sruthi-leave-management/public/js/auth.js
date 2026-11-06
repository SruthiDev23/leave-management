/**
 * Sruthi Leave Management System - Authentication & Core UI Utilities
 */

const AUTH_KEY = 'sruthi_leave_token';
const USER_KEY = 'sruthi_leave_user';

const Auth = {
  // Save credentials to localStorage
  setSession(token, user) {
    localStorage.setItem(AUTH_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Get current token
  getToken() {
    return localStorage.getItem(AUTH_KEY);
  },

  // Get current user object
  getUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // Clear credentials and logout
  logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
  },

  // Verify access for protected dashboard pages
  requireAuth(expectedRole = null) {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) {
      // Not logged in
      if (expectedRole === 'admin') {
        window.location.href = 'admin-login.html';
      } else {
        window.location.href = 'employee-login.html';
      }
      return false;
    }

    if (expectedRole && user.role !== expectedRole) {
      // Role mismatch
      if (user.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'employee-dashboard.html';
      }
      return false;
    }

    return true;
  },

  // Check if currently authenticated and redirect away from login/register pages
  redirectIfAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();
    if (token && user) {
      if (user.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'employee-dashboard.html';
      }
    }
  },

  // Standard authenticated API fetch
  async apiRequest(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { credentials: 'omit', ...options, headers });
      const data = await response.json();

      if (response.status === 401) {
        // Token invalid or expired
        this.logout();
        throw new Error(data.message || 'Session expired. Please log in again.');
      }

      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      console.error('API Request error:', err);
      return { ok: false, status: 500, error: err.message };
    }
  }
};

/**
 * Toast Notification Helper
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'danger') icon = 'exclamation-circle';

  toast.innerHTML = `
    <i class="fas fa-${icon}" style="font-size: 1.1rem; color: ${type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : '#0284c7'}"></i>
    <div style="font-size: 0.875rem; font-weight: 500; color: #1e293b; flex: 1;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Update Top Navbar with Logged-in User Information
 */
function renderNavbarUser() {
  const user = Auth.getUser();
  if (!user) return;

  const nameEl = document.getElementById('navUserName');
  const roleEl = document.getElementById('navUserRole');
  const avatarEl = document.getElementById('navUserAvatar');

  if (nameEl) nameEl.textContent = user.name || user.employee_id;
  if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrator' : `Employee (${user.employee_id})`;
  if (avatarEl) {
    const initials = (user.name || user.employee_id).substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
}

/**
 * Fetch and Render MySQL Database Status in Footer
 */
async function updateDbStatusFooter() {
  try {
    const res = await fetch('/api/auth/db-status');
    const data = await res.json();
    const statusText = document.getElementById('dbStatusText');
    const statusDot = document.getElementById('dbStatusDot');

    if (data && data.status) {
      if (statusText) {
        statusText.textContent = data.status.connected 
          ? `Connected to MySQL: ${data.status.database} (${data.status.host}:${data.status.port})`
          : `Storage: ${data.status.type} (MySQL available via database.sql)`;
      }
      if (statusDot) {
        statusDot.className = `status-dot ${data.status.connected ? 'online' : 'warning'}`;
      }
    }
  } catch (e) {
    // silently ignore
  }
}

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderNavbarUser();
  updateDbStatusFooter();
});
