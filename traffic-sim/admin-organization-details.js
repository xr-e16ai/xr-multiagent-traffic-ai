// Admin Organization Details — all Firestore ops go through the secure backend API

let allMembers = [];
let currentPage = 1;
const pageSize = 10;
let currentFilter = 'all';
let searchQuery = '';
let targetOrg = '';

document.addEventListener('DOMContentLoaded', () => {
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

  // Get org from URL
  const urlParams = new URLSearchParams(window.location.search);
  targetOrg = urlParams.get('org');

  if (!targetOrg) {
    document.getElementById('detail-org-name').textContent = 'Organization Not Found';
    return;
  }

  document.getElementById('detail-org-name').textContent = targetOrg;

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

function formatDate(isoString) {
  if (!isoString) return 'Unknown';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "Just now";
}

async function loadMembers() {
  try {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch('/api/admin/users', {
      headers: { 'x-admin-token': token }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error);
    
    allMembers = [];
    
    let activatedCount = 0;
    let pendingCount = 0;

    (result.users || []).forEach(u => {
      const orgName = u.organizationName ? u.organizationName.trim() : 'Independent / No Organization';
      
      // Strict equality based on what was passed via URL (or fallback)
      if (orgName === targetOrg || (targetOrg === 'Independent' && !u.organizationName)) {
        allMembers.push({ id: u.id, ...u });
        if (u.isApproved) activatedCount++;
        else pendingCount++;
      }
    });

    // Update Header Summary
    document.getElementById('detail-total-users').textContent = allMembers.length;
    document.getElementById('detail-activated-users').textContent = activatedCount;
    document.getElementById('detail-pending-users').textContent = pendingCount;
    
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
      <tr><td colspan="6" style="text-align: center; color: var(--color-danger);">Failed to load organization members.</td></tr>
    `;
  }
}

function getFilteredMembers() {
  return allMembers.filter(u => {
    if (currentFilter === 'pending' && u.isApproved === true) return false;
    if (currentFilter === 'activated' && u.isApproved !== true) return false;

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

  if (pageUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">No members found matching criteria.</td></tr>`;
    return;
  }

  pageUsers.forEach(u => {
    const statusClass = u.isApproved ? 'activated' : 'pending';
    const statusText = u.isApproved ? 'Activated' : 'Pending';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 500; color: #fff;">${u.fullName || 'Unknown'}</td>
      <td>${u.email || '-'}</td>
      <td>${u.mobileNumber || '-'}</td>
      <td>${formatDate(u.createdAt)}</td>
      <td style="color: var(--text-muted);">${timeAgo(u.lastLogin)}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
    `;
    tbody.appendChild(tr);
  });
}
