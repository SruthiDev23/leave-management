/**
 * Sruthi Leave Management System - Employee Dashboard Logic
 */

let currentFilter = 'All';
let employeeApplications = [];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Verify Authentication
  if (!Auth.requireAuth('employee')) {
    return;
  }

  // 2. Prefill Employee Details
  const user = Auth.getUser();
  if (user) {
    const empIdField = document.getElementById('employee_id');
    const empNameField = document.getElementById('employee_name');
    if (empIdField) empIdField.value = user.employee_id || '';
    if (empNameField) empNameField.value = user.name || '';
  }

  // 3. Setup form submit listener
  const form = document.getElementById('leaveApplicationForm');
  if (form) {
    form.addEventListener('submit', handleLeaveSubmission);
  }

  // 4. Load Initial Data
  loadEmployeeData();
});

/**
 * Fetch Employee Stats & Leave Applications
 */
async function loadEmployeeData() {
  const tableBody = document.getElementById('leavesTableBody');
  tableBody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 2.5rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary);"></i>
        <p style="margin-top: 8px; color: var(--text-secondary);">Loading your leave applications...</p>
      </td>
    </tr>
  `;

  try {
    const res = await Auth.apiRequest('/api/leaves/my');

    if (res.ok && res.data.success) {
      // 1. Update Stat Cards
      const stats = res.data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 };
      document.getElementById('statTotal').textContent = stats.total;
      document.getElementById('statPending').textContent = stats.pending;
      document.getElementById('statApproved').textContent = stats.approved;
      document.getElementById('statRejected').textContent = stats.rejected;

      // 2. Cache applications and render
      employeeApplications = res.data.applications || [];
      renderApplicationsTable();
    } else {
      showToast(res.data.message || 'Failed to load employee records.', 'danger');
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: #dc2626;">
            <i class="fas fa-exclamation-circle" style="font-size: 1.5rem;"></i>
            <p style="margin-top: 6px;">Error loading data. Please refresh.</p>
          </td>
        </tr>
      `;
    }
  } catch (err) {
    console.error('Load data error:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: #dc2626;">
          <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem;"></i>
          <p style="margin-top: 6px;">Unable to reach server.</p>
        </td>
      </tr>
    `;
  }
}

/**
 * Render Applications Table with current filter
 */
function renderApplicationsTable() {
  const tableBody = document.getElementById('leavesTableBody');
  let filtered = employeeApplications;

  if (currentFilter !== 'All') {
    filtered = employeeApplications.filter(a => a.status.toLowerCase() === currentFilter.toLowerCase());
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <h4>No Applications Found</h4>
            <p>You have no ${currentFilter === 'All' ? '' : currentFilter.toLowerCase()} leave applications on record.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(app => {
    const statusClass = app.status ? app.status.toLowerCase() : 'pending';
    const typeClass = app.leave_type === 'Casual' ? 'badge-casual' : 'badge-professional';
    const formattedDate = app.application_date ? new Date(app.application_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

    let statusIcon = 'clock';
    if (app.status === 'Approved') statusIcon = 'check-circle';
    if (app.status === 'Rejected') statusIcon = 'times-circle';

    return `
      <tr>
        <td><strong>#LV-${String(app.application_id).padStart(4, '0')}</strong></td>
        <td>
          <span class="badge ${typeClass}">
            <i class="fas ${app.leave_type === 'Casual' ? 'fa-umbrella-beach' : 'fa-briefcase'}"></i>
            ${app.leave_type}
          </span>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--dark-heading);">${app.number_of_days}</span> day${app.number_of_days > 1 ? 's' : ''}
        </td>
        <td style="max-width: 280px; word-wrap: break-word;">
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
      </tr>
    `;
  }).join('');
}

/**
 * Handle Filter Pills selection
 */
function filterApplications(status) {
  currentFilter = status;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    if (btn.getAttribute('data-filter') === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderApplicationsTable();
}

/**
 * Handle Leave Application Form Submission
 */
async function handleLeaveSubmission(e) {
  e.preventDefault();
  const alertBox = document.getElementById('formAlertBox');
  alertBox.style.display = 'none';

  const employee_id = document.getElementById('employee_id').value.trim();
  const employee_name = document.getElementById('employee_name').value.trim();
  const leave_type = document.getElementById('leave_type').value;
  const number_of_days = document.getElementById('number_of_days').value;
  const description = document.getElementById('description').value.trim();
  const submitBtn = document.getElementById('submitLeaveBtn');

  // Client validation
  if (!leave_type) {
    showFormAlert('Please select a Leave Type (Casual or Professional).', 'danger');
    return;
  }

  const days = parseInt(number_of_days, 10);
  if (isNaN(days) || days < 1) {
    showFormAlert('Please enter a valid number of days (at least 1 day).', 'danger');
    return;
  }

  if (description.length < 5) {
    showFormAlert('Please describe the reason for your leave in detail (at least 5 characters).', 'danger');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting to MySQL...';

  try {
    const res = await Auth.apiRequest('/api/leaves/apply', {
      method: 'POST',
      body: JSON.stringify({
        employee_id,
        employee_name,
        leave_type,
        number_of_days: days,
        description
      })
    });

    if (res.ok && res.data.success) {
      // Display success message after successful submission
      showFormAlert(
        'Leave application submitted successfully! Your application has been stored and is now Pending admin review.',
        'success'
      );
      showToast('Leave request submitted successfully!', 'success');

      // Reset form input fields (leave employee identity intact)
      document.getElementById('leave_type').selectedIndex = 0;
      document.getElementById('number_of_days').value = '';
      document.getElementById('description').value = '';

      // Reload dashboard data
      loadEmployeeData();
    } else {
      showFormAlert(res.data.message || 'Submission failed. Please try again.', 'danger');
    }
  } catch (err) {
    showFormAlert('Network error occurred while submitting your leave request.', 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Leave Application';
  }
}

function showFormAlert(message, type) {
  const alertBox = document.getElementById('formAlertBox');
  alertBox.className = `alert alert-${type}`;
  alertBox.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}" style="font-size: 1.1rem;"></i>
    <div style="flex: 1;">${message}</div>
  `;
  alertBox.style.display = 'flex';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
