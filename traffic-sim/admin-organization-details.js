// Admin Organization Details — all Firestore ops go through the secure backend API

let allMembers = [];
let currentPage = 1;
const pageSize = 10;
let currentFilter = 'all';
let searchQuery = '';
let targetOrg = '';

// License Status Mapper
export function getLicenseStatus(user) {
  if (!user) return 'Pending';

  // 1. Explicit licenseStatus field if already defined
  if (user.licenseStatus) {
    const s = String(user.licenseStatus).trim().toLowerCase();
    if (s === 'activated' || s === 'active') return 'Activated';
    if (s === 'pending') return 'Pending';
    if (s === 'deactivated' || s === 'inactive' || s === 'suspended') return 'Deactivated';
    if (s === 'deleted') return 'Deleted';
  }

  // 2. Deleted status flag
  if (user.isDeleted === true || user.deletedAt) {
    return 'Deleted';
  }

  // 3. Approval and active subscription mapping
  if (user.isApproved === true) {
    if (user.subscriptionStatus === 'inactive' || user.simulationAccess === false) {
      return 'Deactivated';
    }
    return 'Activated';
  }

  // 4. Inactive or revoked subscription
  if (user.subscriptionStatus === 'inactive' || (user.isApproved === false && user.approvedAt)) {
    return 'Deactivated';
  }

  // 5. Default for unapproved or newly registered users
  return 'Pending';
}

document.addEventListener('DOMContentLoaded', () => {
  // Auth Route Protection Check
  if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = '/admin-login.html';
    return;
  }

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

  // Extract org name or ID from query parameters (?org=... or ?id=... or ?name=...)
  const urlParams = new URLSearchParams(window.location.search);
  const rawParam = urlParams.get('org') || urlParams.get('id') || urlParams.get('name');

  if (!rawParam || !rawParam.trim()) {
    showOrgNotFoundError('No organization was specified. Please choose an organization from the Organizations list.');
    return;
  }

  targetOrg = decodeURIComponent(rawParam.trim());
  document.getElementById('detail-org-name').textContent = targetOrg;
  document.title = `${targetOrg} - Organization Details - Enterprise Command Center`;

  document.getElementById('user-search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    currentPage = 1;
    renderTable();
  });

  document.getElementById('user-status-filter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    currentPage = 1;
    renderTable();
  });

  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(getFilteredMembers().length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });

  loadMembers();
});

function showOrgNotFoundError(msg) {
  const errCard = document.getElementById('org-not-found-card');
  const contentWrapper = document.getElementById('org-content-wrapper');
  const msgEl = document.getElementById('org-not-found-msg');
  if (errCard) errCard.style.display = 'block';
  if (contentWrapper) contentWrapper.style.display = 'none';
  if (msgEl && msg) msgEl.textContent = msg;
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Never';
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return "Just now";
  const intervalM = Math.floor(seconds / 60);
  if (intervalM < 60) return `${intervalM}m ago`;
  const intervalH = Math.floor(seconds / 3600);
  if (intervalH < 24) return `${intervalH}h ago`;
  const intervalD = Math.floor(seconds / 86400);
  if (intervalD < 30) return `${intervalD}d ago`;
  const intervalMo = Math.floor(seconds / 2592000);
  if (intervalMo < 12) return `${intervalMo}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

async function loadMembers() {
  try {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch('/api/admin/users', {
      headers: { 'x-admin-token': token }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Failed to fetch users');
    
    allMembers = [];
    
    let activatedCount = 0;
    let pendingCount = 0;
    let deactivatedCount = 0;
    let deletedCount = 0;

    const normalizedTarget = targetOrg.toLowerCase();

    (result.users || []).forEach(u => {
      const orgName = (u.organizationName ? u.organizationName.trim() : 'Independent / No Organization');
      
      const isMatch = (orgName.toLowerCase() === normalizedTarget) ||
                      (normalizedTarget === 'independent' && (!u.organizationName || !u.organizationName.trim()));

      if (isMatch) {
        const licenseStatus = getLicenseStatus(u);
        allMembers.push({
          id: u.id,
          computedLicense: licenseStatus,
          ...u
        });

        if (licenseStatus === 'Activated') activatedCount++;
        else if (licenseStatus === 'Pending') pendingCount++;
        else if (licenseStatus === 'Deactivated') deactivatedCount++;
        else if (licenseStatus === 'Deleted') deletedCount++;
      }
    });

    // Update Header Summary Metrics
    document.getElementById('detail-total-users').textContent = allMembers.length;
    document.getElementById('detail-activated-users').textContent = activatedCount;
    document.getElementById('detail-pending-users').textContent = pendingCount;
    document.getElementById('detail-deactivated-users').textContent = deactivatedCount;

    // License Overview Summary Badge
    const overviewBadge = document.getElementById('detail-license-overview');
    if (overviewBadge) {
      overviewBadge.style.display = 'inline-block';
      if (allMembers.length === 0) {
        overviewBadge.textContent = 'No Users';
        overviewBadge.className = 'status-badge';
      } else if (activatedCount === allMembers.length) {
        overviewBadge.textContent = 'Active Organization License';
        overviewBadge.className = 'status-badge activated';
      } else if (pendingCount === allMembers.length) {
        overviewBadge.textContent = 'Pending License Activation';
        overviewBadge.className = 'status-badge pending';
      } else if (deactivatedCount === allMembers.length) {
        overviewBadge.textContent = 'Deactivated Licenses';
        overviewBadge.className = 'status-badge deactivated';
      } else {
        overviewBadge.textContent = `Mixed Licenses (${activatedCount} Act / ${pendingCount} Pnd / ${deactivatedCount} Deact)`;
        overviewBadge.className = 'status-badge activated';
      }
    }

    // Sort members newest first by default
    allMembers.sort((a, b) => {
      const d1 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const d2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return d2 - d1;
    });

    renderTable();
  } catch (error) {
    console.error("Error fetching org members:", error);
    document.getElementById('users-table-body').innerHTML = `
      <tr><td colspan="7" style="text-align: center; color: var(--color-danger); padding: 32px;">Failed to load organization members. Please try again.</td></tr>
    `;
  }
}

function getFilteredMembers() {
  return allMembers.filter(u => {
    if (currentFilter !== 'all') {
      if (u.computedLicense !== currentFilter) return false;
    }

    if (searchQuery) {
      const name = (u.fullName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.mobileNumber || '').toLowerCase();
      
      if (!name.includes(searchQuery) && !email.includes(searchQuery) && !phone.includes(searchQuery)) {
        return false;
      }
    }
    return true;
  });
}

function renderTable() {
  const filteredUsers = getFilteredMembers();
  
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredUsers.length);
  const pageUsers = filteredUsers.slice(startIdx, endIdx);

  document.getElementById('pagination-info').textContent = `Showing ${filteredUsers.length === 0 ? 0 : startIdx + 1} to ${endIdx} of ${filteredUsers.length} entries`;
  
  document.getElementById('prev-page').disabled = currentPage === 1;
  document.getElementById('next-page').disabled = currentPage === totalPages;

  const pageNumbersContainer = document.getElementById('page-numbers');
  pageNumbersContainer.innerHTML = '';
  
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${i === currentPage ? 'active' : 'glass-panel'}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      currentPage = i;
      renderTable();
    });
    pageNumbersContainer.appendChild(btn);
  }

  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';

  if (allMembers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 0.95rem;">No users associated with this organization.</td></tr>`;
    return;
  }

  if (pageUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">No members found matching criteria.</td></tr>`;
    return;
  }

  pageUsers.forEach(u => {
    const statusText = u.computedLicense || 'Pending';
    const statusClass = statusText.toLowerCase();
    const name = u.fullName || 'Unknown User';
    const initials = getInitials(name);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="avatar" style="width: 32px; height: 32px; font-size: 0.8rem; background: var(--color-primary);">${initials}</div>
          <span style="font-weight: 500; color: #fff;">${name}</span>
        </div>
      </td>
      <td style="color: var(--text-main);">${u.email || '—'}</td>
      <td style="color: var(--text-muted);">${u.mobileNumber || '—'}</td>
      <td style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(u.createdAt)}</td>
      <td style="color: var(--text-muted); font-size: 0.85rem;">${timeAgo(u.lastLogin)}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <a href="/admin-user-details.html?uid=${u.id}" class="action-btn glass-panel" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; font-size: 0.78rem; text-decoration: none; border-radius: 4px;">
          <span>👤</span> View
        </a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
