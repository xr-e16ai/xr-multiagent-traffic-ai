// Admin Dashboard — all Firestore ops go through the secure backend API

document.addEventListener('DOMContentLoaded', () => {
  // 1. Admin Route Protection Check
  if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = '/admin-login.html';
    return;
  }

  const logoutBtn = document.getElementById('admin-logout-btn');

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Clear admin session
      sessionStorage.removeItem('adminLoggedIn');
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminName');
      
      // Redirect to login
      window.location.href = '/admin-login.html';
    });
  }

  // Load Dashboard Data from Firestore
  loadDashboardData();
});

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function timeAgo(isoString) {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return "Just now";
}

async function loadDashboardData() {
  try {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch('/api/admin/users', {
      headers: { 'x-admin-token': token }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error);
    const users = result.users || [];

    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    const monthStr = now.toISOString().substring(0, 7);

    let totalUsers = users.length;
    let pending = 0;
    let activated = 0;
    let orgs = new Set();
    let todayReg = 0;
    let monthlyReg = 0;

    users.forEach(u => {
      if (u.isApproved === true) activated++;
      else pending++;
      
      if (u.organizationName) {
        orgs.add(u.organizationName.toLowerCase().trim());
      }
      
      if (u.createdAt) {
        if (u.createdAt.startsWith(todayStr)) todayReg++;
        if (u.createdAt.startsWith(monthStr)) monthlyReg++;
      }
    });

    // Update Stat Cards
    document.getElementById('stat-total-users').textContent = totalUsers;
    document.getElementById('stat-pending-users').textContent = pending;
    document.getElementById('stat-activated-users').textContent = activated;
    document.getElementById('stat-organizations').textContent = orgs.size;
    document.getElementById('stat-today-reg').textContent = todayReg;
    document.getElementById('stat-monthly-reg').textContent = monthlyReg;

    // Remove loading trends and replace with default values (or actual trends if calculated)
    const trendLabels = document.querySelectorAll('.stat-trend .trend-label');
    trendLabels.forEach(label => {
      if (label.textContent === 'Loading...') {
        label.textContent = 'up to date';
      }
    });

    // Recent Registrations (top 5 by createdAt descending)
    const recentRegList = document.getElementById('recent-registrations-list');
    const sortedByCreated = [...users].sort((a, b) => {
      const d1 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const d2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return d2 - d1;
    });

    recentRegList.innerHTML = '';
    if (sortedByCreated.length === 0) {
      recentRegList.innerHTML = '<div style="color: var(--text-muted); padding: 16px;">No recent registrations found.</div>';
    } else {
      sortedByCreated.slice(0, 5).forEach(u => {
        const name = u.fullName || 'Unknown User';
        const contact = u.mobileNumber || u.organizationName || 'No contact info';
        
        recentRegList.innerHTML += `
          <div class="glass-panel" style="padding: 16px; display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
            <div class="avatar" style="width: 40px; height: 40px; font-size: 0.9rem; background: var(--color-primary);">${getInitials(name)}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 0.9rem; color: #fff;">${name}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${contact}</div>
            </div>
            <div style="margin-left: auto; font-size: 0.75rem; color: var(--text-dark);">${timeAgo(u.createdAt)}</div>
          </div>
        `;
      });
    }

    // Recent Activity (latest login activity, top 5 by lastLogin descending)
    const recentActList = document.getElementById('recent-activity-list');
    const sortedByLogin = [...users].sort((a, b) => {
      const d1 = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
      const d2 = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
      return d2 - d1;
    });

    recentActList.innerHTML = '';
    
    // Inject current admin session as most recent
    recentActList.innerHTML += `
      <div class="activity-item">
        <div class="activity-indicator blue"></div>
        <div class="activity-content">
          <p class="activity-text"><strong>Administrator Session</strong> active</p>
          <span class="activity-time">Just now</span>
        </div>
      </div>
    `;

    if (sortedByLogin.length > 0) {
      sortedByLogin.slice(0, 4).forEach(u => {
        if (!u.lastLogin) return; // Skip if no lastLogin
        const name = u.fullName || 'Unknown User';
        recentActList.innerHTML += `
          <div class="activity-item">
            <div class="activity-indicator success"></div>
            <div class="activity-content">
              <p class="activity-text"><strong>${name}</strong> logged into the portal</p>
              <span class="activity-time">${timeAgo(u.lastLogin)}</span>
            </div>
          </div>
        `;
      });
    }

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    
    // Graceful error handling for UI
    document.querySelectorAll('.stat-value').forEach(el => {
      if (el.textContent === '...') el.textContent = 'Err';
    });
    
    const errText = '<div style="color: var(--color-danger); padding: 16px;">Failed to load data from Firestore.</div>';
    document.getElementById('recent-registrations-list').innerHTML = errText;
    document.getElementById('recent-activity-list').innerHTML = errText;
  }
}
