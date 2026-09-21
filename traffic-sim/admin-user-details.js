// Using backend API instead of direct Firestore calls

// ── Auth Guard ──────────────────────────────────────────────────────────────
if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
  window.location.href = '/admin-login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // Logout
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('adminLoggedIn');
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminName');
      window.location.href = '/admin-login.html';
    });
  }

  // Live clock
  function updateClock() {
    const now = new Date();
    const dateEl = document.getElementById('current-date');
    const timeEl = document.getElementById('current-time');
    if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    if (timeEl) timeEl.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Get UID from URL params
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('uid');

  if (!uid) {
    showError();
    return;
  }

  loadUserProfile(uid);
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return 'Not Available';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(isoString) {
  if (!isoString) return 'Not Available';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(isoString) {
  if (!isoString) return 'Never';
  const seconds = Math.floor((new Date() - new Date(isoString)) / 1000);
  const intervals = [
    [31536000, 'year'], [2592000, 'month'], [86400, 'day'],
    [3600, 'hour'], [60, 'minute']
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function yesNo(val) {
  if (val === true) return '<span style="color:var(--color-success);">✓ Yes</span>';
  if (val === false) return '<span style="color:var(--color-danger);">✗ No</span>';
  return '<span style="color:var(--text-muted);">Not Available</span>';
}

// ── Show / Hide States ───────────────────────────────────────────────────────
function showError() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'flex';
  document.getElementById('profile-content').style.display = 'none';
}

function showProfile() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
  document.getElementById('profile-content').style.display = 'block';
}

// ── Timeline Builder ─────────────────────────────────────────────────────────
function buildTimeline(u) {
  const events = [];

  if (u.createdAt) {
    events.push({ icon: '🎉', label: 'Account Created', date: formatDate(u.createdAt), color: 'blue', done: true });
  } else {
    events.push({ icon: '🎉', label: 'Account Created', date: 'Not Available', color: 'muted', done: false });
  }

  // OTP Verified – inferred if account exists (phone-based auth)
  if (u.mobileNumber) {
    events.push({ icon: '📱', label: 'OTP Verified', date: 'At Registration', color: 'success', done: true });
  } else {
    events.push({ icon: '📱', label: 'OTP Verified', date: 'Not Available', color: 'muted', done: false });
  }

  if (u.lastLogin) {
    events.push({ icon: '🔐', label: 'First Login', date: formatDate(u.lastLogin), color: 'cyan', done: true });
  } else {
    events.push({ icon: '🔐', label: 'First Login', date: 'Not Available', color: 'muted', done: false });
  }

  if (u.instructionAccepted) {
    events.push({ icon: '📋', label: 'Instructions Accepted', date: u.createdAt ? formatDateShort(u.createdAt) : 'Accepted', color: 'success', done: true });
  } else {
    events.push({ icon: '📋', label: 'Instructions Accepted', date: 'Pending', color: 'warning', done: false });
  }

  if (u.isApproved) {
    events.push({ icon: '✅', label: 'Account Activated', date: 'Approved by Admin', color: 'success', done: true });
  } else {
    events.push({ icon: '⏳', label: 'Pending Activation', date: 'Awaiting admin approval', color: 'warning', done: false });
  }

  if (u.isApproved) {
    events.push({ icon: '🚀', label: 'Simulation Access', date: 'Access Granted', color: 'purple', done: true });
  } else {
    events.push({ icon: '🚀', label: 'Simulation Access', date: 'Not Yet Granted', color: 'muted', done: false });
  }

  const container = document.getElementById('user-timeline');
  container.innerHTML = events.map((ev, i) => `
    <div class="ud-timeline-item ${ev.done ? 'done' : 'pending'} ${i === events.length - 1 ? 'last' : ''}">
      <div class="ud-timeline-dot ud-dot-${ev.color}">${ev.icon}</div>
      <div class="ud-timeline-body">
        <div class="ud-timeline-label">${ev.label}</div>
        <div class="ud-timeline-date">${ev.date}</div>
      </div>
    </div>
  `).join('');
}

// ── Main Loader ──────────────────────────────────────────────────────────────
async function loadUserProfile(uid) {
  const token = sessionStorage.getItem('adminToken');
  try {
    const response = await fetch(`/api/admin/user/${uid}`, {
      headers: { 'x-admin-token': token }
    });
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('User not found or error:', result.error);
      showError();
      return;
    }

    const u = result.user;

    // ── Page / breadcrumb title
    const name = u.fullName || 'Unknown User';
    document.getElementById('page-title').textContent = 'User Profile';
    document.getElementById('breadcrumb-name').textContent = name;
    document.title = `${name} — Enterprise Command Center`;

    // ── HERO
    const initials = getInitials(name);
    document.getElementById('hero-avatar').textContent = initials;
    document.getElementById('hero-name').textContent = name;
    document.getElementById('hero-org').textContent = u.organizationName || '—';
    document.getElementById('hero-phone').textContent = u.mobileNumber || '—';
    document.getElementById('hero-uid').textContent = u.id;

    const statusBadge = document.getElementById('hero-status-badge');
    if (u.isApproved) {
      statusBadge.textContent = 'Activated';
      statusBadge.className = 'status-badge activated';
    } else {
      statusBadge.textContent = 'Pending Activation';
      statusBadge.className = 'status-badge pending';
    }

    // ── Profile fields
    document.getElementById('d-name').textContent = name;
    document.getElementById('d-org').textContent = u.organizationName || 'Not Available';
    document.getElementById('d-phone').textContent = u.mobileNumber || 'Not Available';
    document.getElementById('d-uid').textContent = u.id;
    document.getElementById('d-role').textContent = u.role || 'user';

    document.getElementById('d-approval').innerHTML = u.isApproved
      ? '<span style="color:var(--color-success);">✓ Activated</span>'
      : '<span style="color:var(--color-warning);">⏳ Pending Activation</span>';

    const sub = u.subscriptionStatus || 'pending';
    const subColor = sub === 'active' ? 'var(--color-success)' : 'var(--color-warning)';
    document.getElementById('d-subscription').innerHTML = `<span style="color:${subColor}; text-transform:capitalize;">${sub}</span>`;

    document.getElementById('d-instruction').innerHTML = yesNo(u.instructionAccepted);
    document.getElementById('d-created').textContent = formatDate(u.createdAt);
    document.getElementById('d-lastlogin').textContent = u.lastLogin ? `${formatDate(u.lastLogin)} (${timeAgo(u.lastLogin)})` : 'Never';
    document.getElementById('d-approved-by').textContent = u.approvedBy || '—';
    
    let approvedAtDisplay = '—';
    if (u.approvedAt) {
      // serverTimestamp is usually an object with seconds/nanoseconds, or ISO string if saved otherwise.
      if (u.approvedAt.seconds) {
        approvedAtDisplay = formatDate(new Date(u.approvedAt.seconds * 1000).toISOString());
      } else {
        approvedAtDisplay = formatDate(u.approvedAt);
      }
    }
    document.getElementById('d-approved-at').textContent = approvedAtDisplay;

    // ── Simulation Status
    document.getElementById('sim-intro').innerHTML = yesNo(u.instructionAccepted);
    document.getElementById('sim-access').innerHTML = yesNo(u.isApproved);
    document.getElementById('sim-status').innerHTML = u.isApproved
      ? '<span style="color:var(--color-success);">Active</span>'
      : '<span style="color:var(--color-warning);">Pending</span>';
    document.getElementById('sim-last').textContent = u.lastLogin ? timeAgo(u.lastLogin) : 'Never';

    // ── Timeline
    buildTimeline(u);

    // ── Action buttons
    const btnApprove = document.getElementById('btn-approve');
    const btnDeactivate = document.getElementById('btn-deactivate');
    const btnDelete = document.getElementById('btn-delete');
    
    // Also right-panel actions
    const rightApprove = document.querySelector('.ud-btn-approve');
    const rightDeactivate = document.querySelector('.ud-btn-deactivate');
    const rightDelete = document.querySelector('.ud-btn-delete');

    if (u.isApproved) {
      btnApprove.disabled = true;
      btnApprove.innerHTML = '✓ Already Activated';
      if (rightApprove) {
        rightApprove.disabled = true;
        rightApprove.innerHTML = '✓ Already Activated';
      }
      
      btnDeactivate.disabled = false;
      if (rightDeactivate) rightDeactivate.disabled = false;
    } else {
      btnApprove.disabled = false;
      btnApprove.innerHTML = '✓ Approve User';
      if (rightApprove) {
        rightApprove.disabled = false;
        rightApprove.innerHTML = '✓ Approve User';
      }
      
      btnDeactivate.disabled = true;
      if (rightDeactivate) rightDeactivate.disabled = true;
    }
    
    btnDelete.disabled = false;
    if (rightDelete) rightDelete.disabled = false;

    // Attach Action Handlers
    const handleApprove = async () => {
      const token = sessionStorage.getItem('adminToken');
      try {
        const response = await fetch('/api/admin/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
          body: JSON.stringify({ uid })
        });
        if (!response.ok) throw new Error('Failed to approve');
        
        showToast('User Approved Successfully', 'success');
        loadUserProfile(uid); // Refresh
      } catch (e) {
        console.error(e);
        showToast('Failed to approve', 'error');
      }
    };

    const handleDeactivate = async () => {
      const token = sessionStorage.getItem('adminToken');
      try {
        const response = await fetch('/api/admin/deactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
          body: JSON.stringify({ uid })
        });
        if (!response.ok) throw new Error('Failed to deactivate');
        
        showToast('User Deactivated Successfully', 'warning');
        loadUserProfile(uid); // Refresh
      } catch (e) {
        console.error(e);
        showToast('Failed to deactivate', 'error');
      }
    };

    // Remove old listeners to avoid duplicates on re-render
    const cloneReplace = (el) => {
      if (!el) return null;
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      return clone;
    };

    const newBtnApprove = cloneReplace(btnApprove);
    const newBtnDeactivate = cloneReplace(btnDeactivate);
    const newBtnDelete = cloneReplace(btnDelete);
    
    const newRightApprove = cloneReplace(rightApprove);
    const newRightDeactivate = cloneReplace(rightDeactivate);
    const newRightDelete = cloneReplace(rightDelete);

    if (newBtnApprove) newBtnApprove.addEventListener('click', handleApprove);
    if (newRightApprove) newRightApprove.addEventListener('click', handleApprove);

    if (newBtnDeactivate) newBtnDeactivate.addEventListener('click', handleDeactivate);
    if (newRightDeactivate) newRightDeactivate.addEventListener('click', handleDeactivate);

    // DELETE LOGIC
    const handleDeleteClick = () => {
      document.getElementById('admin-confirm-overlay').style.display = 'flex';
    };
    if (newBtnDelete) newBtnDelete.addEventListener('click', handleDeleteClick);
    if (newRightDelete) newRightDelete.addEventListener('click', handleDeleteClick);

    // Dialog setup (only attach once)
    if (!window.deleteDialogInitialized) {
      window.deleteDialogInitialized = true;
      
      document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('admin-confirm-overlay').style.display = 'none';
      });

      document.getElementById('confirm-ok-btn')?.addEventListener('click', async () => {
        const token = sessionStorage.getItem('adminToken');
        try {
          const response = await fetch('/api/admin/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ uid })
          });
          if (!response.ok) throw new Error('Failed to delete user');
          
          showToast('User Deleted Successfully', 'success');
          document.getElementById('admin-confirm-overlay').style.display = 'none';
          
          // Redirect back to users list after a brief delay
          setTimeout(() => {
            window.location.href = '/admin-users.html';
          }, 1500);
        } catch (e) {
          console.error(e);
          showToast('Failed to delete user', 'error');
        }
      });
    }

    showProfile();

  } catch (err) {
    console.error('Failed to load user profile:', err);
    showError();
  }
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `admin-toast ${type} show`;
  setTimeout(() => {
    toast.className = 'admin-toast';
  }, 3000);
}
