// Admin Users — all Firestore ops go through the secure backend API

let allUsers = [];
let currentPage = 1;
const pageSize = 10;

let currentFilter = 'all';
let currentSort = 'newest';
let searchQuery = sessionStorage.getItem('adminUsersSearch') || '';
sessionStorage.removeItem('adminUsersSearch'); // Clear it so it only applies once

document.addEventListener('DOMContentLoaded', () => {
  // 1. Admin Route Protection Check
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

  // Bind Event Listeners for Filters
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

  document.getElementById('user-sort-filter').addEventListener('change', (e) => {
    currentSort = e.target.value;
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
    const totalPages = Math.ceil(getFilteredUsers().length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });

  // Set initial search value in UI if passed via sessionStorage
  if (searchQuery) {
    const searchInput = document.getElementById('user-search-input');
    if (searchInput) searchInput.value = searchQuery;
  }

  // Load Data
  loadUsers();
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

async function loadUsers() {
  const token = sessionStorage.getItem('adminToken');
  try {
    const response = await fetch('/api/admin/users', {
      headers: { 'x-admin-token': token }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error);
    
    allUsers = result.users || [];
    renderTable();
  } catch (error) {
    console.error("Error fetching users:", error);
    document.getElementById('users-table-body').innerHTML = `
      <tr><td colspan="7" style="text-align: center; color: var(--color-danger);">Failed to load users. Check that the Admin backend is running.</td></tr>
    `;
  }
}

function getFilteredUsers() {
  let filtered = allUsers.filter(u => {
    // Status Filter
    if (currentFilter === 'pending' && u.isApproved === true) return false;
    if (currentFilter === 'activated' && u.isApproved !== true) return false;

    // Search Query (Name, Org, Phone)
    if (searchQuery) {
      const name = (u.fullName || '').toLowerCase();
      const org = (u.organizationName || '').toLowerCase();
      const phone = (u.mobileNumber || '').toLowerCase();
      
      if (!name.includes(searchQuery) && !org.includes(searchQuery) && !phone.includes(searchQuery)) {
        return false;
      }
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    const d1 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const d2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return currentSort === 'newest' ? d2 - d1 : d1 - d2;
  });

  return filtered;
}

function renderTable() {
  const filteredUsers = getFilteredUsers();
  
  // Update Pagination State
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredUsers.length);
  const pageUsers = filteredUsers.slice(startIdx, endIdx);

  // Update UI Elements
  document.getElementById('pagination-info').textContent = `Showing ${filteredUsers.length === 0 ? 0 : startIdx + 1} to ${endIdx} of ${filteredUsers.length} entries`;
  
  document.getElementById('prev-page').disabled = currentPage === 1;
  document.getElementById('next-page').disabled = currentPage === totalPages;

  // Render Page Numbers
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

  // Render Table Body
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';

  if (pageUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">No users found matching the criteria.</td></tr>`;
    return;
  }

  pageUsers.forEach(u => {
    const statusClass = u.isApproved ? 'activated' : 'pending';
    const statusText = u.isApproved ? 'Activated' : 'Pending';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 500; color: #fff;">${u.fullName || 'Unknown'}</td>
      <td>${u.organizationName || '-'}</td>
      <td>${u.mobileNumber || '-'}</td>
      <td>${formatDate(u.createdAt)}</td>
      <td style="color: var(--text-muted);">${timeAgo(u.lastLogin)}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon" title="View Details" onclick="window.location.href='/admin-user-details.html?uid=${u.id}'">👁️</button>
          ${!u.isApproved 
            ? `<button class="btn-icon approve action-approve" data-uid="${u.id}" title="Approve User">✓</button>` 
            : `<button class="btn-icon action-deactivate" data-uid="${u.id}" title="Deactivate">⏸️</button>`}
          <button class="btn-icon delete action-delete" data-uid="${u.id}" title="Delete User">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── ACTION LOGIC ───
document.getElementById('users-table-body').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const uid = btn.dataset.uid;
  if (!uid) return;

  if (btn.classList.contains('action-approve')) {
    await handleApprove(uid);
  } else if (btn.classList.contains('action-deactivate')) {
    await handleDeactivate(uid);
  } else if (btn.classList.contains('action-delete')) {
    confirmDelete(uid);
  }
});

async function handleApprove(uid) {
  const token = sessionStorage.getItem('adminToken');
  try {
    const response = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ uid })
    });
    if (!response.ok) throw new Error('Failed to approve');
    
    showToast('User Approved Successfully', 'success');
    loadUsers(); // Refresh data
  } catch (error) {
    console.error('Error approving user:', error);
    showToast('Failed to approve user', 'error');
  }
}

async function handleDeactivate(uid) {
  const token = sessionStorage.getItem('adminToken');
  try {
    const response = await fetch('/api/admin/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ uid })
    });
    if (!response.ok) throw new Error('Failed to deactivate');
    
    showToast('User Deactivated Successfully', 'warning');
    loadUsers(); // Refresh data
  } catch (error) {
    console.error('Error deactivating user:', error);
    showToast('Failed to deactivate user', 'error');
  }
}

let pendingDeleteUid = null;

function confirmDelete(uid) {
  pendingDeleteUid = uid;
  document.getElementById('admin-confirm-overlay').style.display = 'flex';
}

document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
  pendingDeleteUid = null;
  document.getElementById('admin-confirm-overlay').style.display = 'none';
});

document.getElementById('confirm-ok-btn')?.addEventListener('click', async () => {
  if (!pendingDeleteUid) return;
  const token = sessionStorage.getItem('adminToken');
  try {
    const response = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ uid: pendingDeleteUid })
    });
    if (!response.ok) throw new Error('Failed to delete');
    
    showToast('User Deleted Successfully', 'success');
    document.getElementById('admin-confirm-overlay').style.display = 'none';
    pendingDeleteUid = null;
    loadUsers(); // Refresh data
  } catch (error) {
    console.error('Error deleting user:', error);
    showToast('Failed to delete user', 'error');
  }
});

function showToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `admin-toast ${type} show`;
  setTimeout(() => {
    toast.className = 'admin-toast';
  }, 3000);
}
