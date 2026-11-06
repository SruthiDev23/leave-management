/**
 * Sruthi Leave Management System - Administrator Dashboard Logic
 */

let allApplications = [];
let adminFilter = 'All';
let currentSearch = '';
let searchDebounceTimer = null;
let pendingActionCallback = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Verify Admin Authentication
  if (!Auth.requireAuth('admin')) {
    return;
  }

  // 2. Load Initial Data
  loadAdminData();
});

/**
 * Fetch All Leave Applications and Statistics
 */
async function loadAdminData() {
  const tableBody = document.getElementById('adminTableBody');
  tableBody.innerHTML = `
    <tr>
      <td colspan="9" style="text-align: center; padding: 2.5rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary);"></i>
        <p style="margin-top: 8px; color: var(--text-secondary);">Loading applications from MySQL database...</p>
      </td>
    </tr>
  `;

  try {
    const res = await Auth.apiRequest('/api/leaves/all');

    if (res.ok && res.data.success) {
      // 1. Update Stat Cards
      const stats = res.data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 };
      document.getElementById('statTotal').textContent = stats.total;
      document.getElementById('statPending').textContent = stats.pending;
      document.getElementById('statApproved').textContent = stats.approved;
      document.getElementById('statRejected').textContent = stats.rejected;

      // 2. Store applications and render table
      allApplications = res.data.applications || [];
      renderAdminTable();
    } else {
      showToast(res.data.message || 'Failed to load applications.', 'danger');
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 2rem; color: #dc2626;">
            <i class="fas fa-exclamation-circle" style="font-size: 1.5rem;"></i>
            <p style="margin-top: 6px;">Failed to load records from database.</p>
          </td>
        </tr>
      `;
    }
  } catch (err) {
    console.error('Admin data fetch error:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2rem; color: #dc2626;">
          <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem;"></i>
          <p style="margin-top: 6px;">Unable to connect to server.</p>
        </td>
      </tr>
    `;
  }
}

/**
 * Render Applications Table with Filters and Search applied
 */
function renderAdminTable() {
  const tableBody = document.getElementById('adminTableBody');
  let filtered = allApplications;

  // Apply Status Filter
  if (adminFilter !== 'All') {
    filtered = filtered.filter(a => a.status.toLowerCase() === adminFilter.toLowerCase());
  }

  // Apply Search Term
  if (currentSearch.trim()) {
    const s = currentSearch.trim().toLowerCase();
    filtered = filtered.filter(a => 
      (a.employee_id && a.employee_id.toLowerCase().includes(s)) ||
      (a.employee_name && a.employee_name.toLowerCase().includes(s)) ||
      (a.leave_type && a.leave_type.toLowerCase().includes(s)) ||
      (a.description && a.description.toLowerCase().includes(s))
    );
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <h4>No Matching Records</h4>
            <p>No leave applications match your current search or filter criteria.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(app => {
    const statusClass = app.status ? app.status.toLowerCase() : 'pending';
    const typeClass = app.leave_type === 'Casual' ? 'badge-casual' : 'badge-professional';
    const formattedDate = app.application_date 
      ? new Date(app.application_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'N/A';

    let statusIcon = 'clock';
    if (app.status === 'Approved') statusIcon = 'check-circle';
    if (app.status === 'Rejected') statusIcon = 'times-circle';

    return `
      <tr>
        <td><strong>#LV-${String(app.application_id).padStart(4, '0')}</strong></td>
        <td>
          <span style="font-weight: 700; color: var(--primary-hover); font-family: monospace; font-size: 0.9rem;">
            ${escapeHtml(app.employee_id)}
          </span>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--dark-heading);">${escapeHtml(app.employee_name)}</div>
        </td>
        <td>
          <span class="badge ${typeClass}">
            <i class="fas ${app.leave_type === 'Casual' ? 'fa-umbrella-beach' : 'fa-briefcase'}"></i>
            ${app.leave_type}
          </span>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--dark-heading);">${app.number_of_days}</span> day${app.number_of_days > 1 ? 's' : ''}
        </td>
        <td style="max-width: 250px; word-wrap: break-word;">
          ${escapeHtml(app.description)}
        </td>
        <td style="white-space: nowrap; color: var(--text-secondary); font-size: 0.85rem;">
          <i class="far fa-calendar-alt" style="margin-right: 4px;"></i>${formattedDate}
        </td>
        <td>
          <span class="badge badge-${statusClass}">
            <i class="fas fa-${statusIcon}"></i> ${app.status}
          </span>
        </td>
        <td style="text-align: center;">
          <div class="action-buttons" style="justify-content: center;">
            <!-- Approve Button -->
            <button 
              type="button" 
              class="action-btn approve-btn" 
              title="Approve Leave" 
              onclick="confirmStatusChange(${app.application_id}, 'Approved', '${escapeHtml(app.employee_name)}')"
              ${app.status === 'Approved' ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}
            >
              <i class="fas fa-check"></i>
            </button>

            <!-- Reject Button -->
            <button 
              type="button" 
              class="action-btn reject-btn" 
              title="Reject Leave" 
              onclick="confirmStatusChange(${app.application_id}, 'Rejected', '${escapeHtml(app.employee_name)}')"
              ${app.status === 'Rejected' ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}
            >
              <i class="fas fa-times"></i>
            </button>

            <!-- Delete Button -->
            <button 
              type="button" 
              class="action-btn delete-btn" 
              title="Delete Application" 
              onclick="confirmDeleteApplication(${app.application_id}, '${escapeHtml(app.employee_name)}')"
            >
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Filter applications by status pill
 */
function setAdminFilter(status) {
  adminFilter = status;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    if (btn.getAttribute('data-filter') === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderAdminTable();
}

/**
 * Handle Search Input with Debounce
 */
function handleSearch(term) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    currentSearch = term;
    const notice = document.getElementById('searchNotice');
    const termSpan = document.getElementById('searchTermText');

    if (term.trim()) {
      termSpan.textContent = term.trim();
      notice.style.display = 'block';
    } else {
      notice.style.display = 'none';
    }

    renderAdminTable();
  }, 200);
}

function clearSearch() {
  document.getElementById('adminSearchInput').value = '';
  document.getElementById('searchNotice').style.display = 'none';
  currentSearch = '';
  renderAdminTable();
}

/**
 * Approve or Reject Leave Confirmation
 */
function confirmStatusChange(applicationId, newStatus, employeeName) {
  const isApprove = newStatus === 'Approved';
  openModal({
    title: `${newStatus} Leave Application`,
    message: `Are you sure you want to mark leave application <strong>#LV-${String(applicationId).padStart(4, '0')}</strong> for <strong>${employeeName}</strong> as <strong>${newStatus}</strong>?`,
    btnText: isApprove ? 'Yes, Approve Leave' : 'Yes, Reject Leave',
    btnClass: isApprove ? 'btn-success' : 'btn-primary',
    action: async () => {
      await updateApplicationStatus(applicationId, newStatus);
    }
  });
}

/**
 * API call to update status
 */
async function updateApplicationStatus(applicationId, status) {
  try {
    const res = await Auth.apiRequest(`/api/leaves/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    if (res.ok && res.data.success) {
      showToast(`Application #LV-${String(applicationId).padStart(4, '0')} marked as ${status}!`, 'success');
      loadAdminData();
    } else {
      showToast(res.data.message || 'Status update failed.', 'danger');
    }
  } catch (err) {
    showToast('Failed to connect to server.', 'danger');
  }
}

/**
 * Delete Application Confirmation
 */
function confirmDeleteApplication(applicationId, employeeName) {
  openModal({
    title: 'Delete Leave Application',
    message: `Are you sure you want to permanently delete application <strong>#LV-${String(applicationId).padStart(4, '0')}</strong> submitted by <strong>${employeeName}</strong>? This action cannot be undone.`,
    btnText: 'Yes, Delete Permanently',
    btnClass: 'btn-danger-outline',
    action: async () => {
      await deleteApplication(applicationId);
    }
  });
}

/**
 * API call to delete application
 */
async function deleteApplication(applicationId) {
  try {
    const res = await Auth.apiRequest(`/api/leaves/${applicationId}`, {
      method: 'DELETE'
    });

    if (res.ok && res.data.success) {
      showToast(`Application #LV-${String(applicationId).padStart(4, '0')} deleted successfully.`, 'success');
      loadAdminData();
    } else {
      showToast(res.data.message || 'Failed to delete application.', 'danger');
    }
  } catch (err) {
    showToast('Network error while deleting record.', 'danger');
  }
}

/**
 * Modal Handling Helpers
 */
function openModal({ title, message, btnText, btnClass, action }) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').innerHTML = message;
  
  const confirmBtn = document.getElementById('modalConfirmBtn');
  confirmBtn.textContent = btnText || 'Proceed';
  confirmBtn.className = `btn btn-sm ${btnClass || 'btn-primary'}`;
  
  pendingActionCallback = action;

  confirmBtn.onclick = async () => {
    closeConfirmModal();
    if (typeof pendingActionCallback === 'function') {
      await pendingActionCallback();
      pendingActionCallback = null;
    }
  };

  document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
  pendingActionCallback = null;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
