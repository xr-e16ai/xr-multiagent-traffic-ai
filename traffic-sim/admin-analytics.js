// Admin Analytics — all Firestore ops go through the secure backend API

let allUsers = [];
let charts = {};

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

  // Set Chart.js globals for Dark Theme
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

  document.getElementById('analytics-date-filter').addEventListener('change', () => {
    updateDashboard();
  });

  loadAnalyticsData();
});

async function loadAnalyticsData() {
  try {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch('/api/admin/users', {
      headers: { 'x-admin-token': token }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error);
    allUsers = result.users || [];
    updateDashboard();
  } catch (error) {
    console.error("Error loading analytics data:", error);
  }
}

function updateDashboard() {
  const filter = document.getElementById('analytics-date-filter').value;
  const filteredUsers = filterUsersByDate(allUsers, filter);
  
  updateKPIs(filteredUsers);
  updateTopOrganizations(filteredUsers);
  updateRecentActivity(filteredUsers);
  
  renderChartMonthlyReg(filteredUsers);
  renderChartTrend(filteredUsers);
  renderChartDailyReg(filteredUsers);
  renderChartStatus(filteredUsers);
  renderChartOrgDist(filteredUsers);
}

function filterUsersByDate(users, filter) {
  if (filter === 'alltime') return users;
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const limit7 = todayStart - (6 * 24 * 60 * 60 * 1000);
  const limit30 = todayStart - (29 * 24 * 60 * 60 * 1000);

  return users.filter(u => {
    if (!u.createdAt) return false;
    const t = new Date(u.createdAt).getTime();
    if (filter === 'today') return t >= todayStart;
    if (filter === '7days') return t >= limit7;
    if (filter === '30days') return t >= limit30;
    return true;
  });
}

function updateKPIs(users) {
  let activated = 0;
  let pending = 0;
  let todayReg = 0;
  let monthlyReg = 0;
  const orgs = new Set();
  
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const monthStr = now.toISOString().substring(0, 7);

  users.forEach(u => {
    if (u.isApproved) activated++;
    else pending++;
    
    const orgName = u.organizationName ? u.organizationName.trim() : '';
    if (orgName) orgs.add(orgName.toLowerCase());
    
    if (u.createdAt) {
      if (u.createdAt.startsWith(todayStr)) todayReg++;
      if (u.createdAt.startsWith(monthStr)) monthlyReg++;
    }
  });

  document.getElementById('kpi-total-users').textContent = users.length;
  document.getElementById('kpi-activated-users').textContent = activated;
  document.getElementById('kpi-pending-users').textContent = pending;
  document.getElementById('kpi-organizations').textContent = orgs.size;
  document.getElementById('kpi-today-reg').textContent = todayReg;
  document.getElementById('kpi-monthly-reg').textContent = monthlyReg;
}

function updateTopOrganizations(users) {
  const orgMap = {};
  users.forEach(u => {
    const orgName = u.organizationName ? u.organizationName.trim() : 'Independent';
    if (!orgMap[orgName]) orgMap[orgName] = { name: orgName, total: 0, act: 0, pen: 0 };
    orgMap[orgName].total++;
    if (u.isApproved) orgMap[orgName].act++;
    else orgMap[orgName].pen++;
  });

  const sorted = Object.values(orgMap).sort((a,b) => b.total - a.total).slice(0, 5);
  const tbody = document.getElementById('top-orgs-body');
  tbody.innerHTML = '';

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">No organizations found for this period.</td></tr>';
    return;
  }

  sorted.forEach(o => {
    tbody.innerHTML += `
      <tr>
        <td style="padding: 16px 24px; color: #fff; font-weight: 500;">${o.name}</td>
        <td><span class="badge" style="background: rgba(255,255,255,0.1);">${o.total}</span></td>
        <td style="color: var(--color-success);">${o.act}</td>
        <td style="color: var(--color-warning);">${o.pen}</td>
      </tr>
    `;
  });
}

function updateRecentActivity(users) {
  const feed = document.getElementById('recent-activity-feed');
  feed.innerHTML = '';
  
  const activities = [];
  users.forEach(u => {
    const name = u.fullName || 'Unknown User';
    if (u.createdAt) {
      activities.push({ type: 'reg', time: new Date(u.createdAt).getTime(), text: `<strong>${name}</strong> registered an account`, icon: '👤', color: 'blue' });
    }
    // Mocking approvals/logins based on existing data fields
    if (u.isApproved && u.createdAt) {
      // Offset by some random minutes to simulate approval time if we don't have approvedAt
      activities.push({ type: 'app', time: new Date(u.createdAt).getTime() + 120000, text: `<strong>${name}</strong> was approved`, icon: '✅', color: 'success' });
    }
    if (u.lastLogin) {
      activities.push({ type: 'log', time: new Date(u.lastLogin).getTime(), text: `<strong>${name}</strong> logged in`, icon: '🔑', color: 'cyan' });
    }
  });

  activities.sort((a, b) => b.time - a.time);
  const recent = activities.slice(0, 10);

  if (recent.length === 0) {
    feed.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">No recent activity.</div>';
    return;
  }

  recent.forEach(act => {
    const dateStr = timeAgo(new Date(act.time).toISOString());
    feed.innerHTML += `
      <div class="activity-item">
        <div class="activity-indicator ${act.color}" style="display:flex; justify-content:center; align-items:center; background: transparent; border:none; width: auto; height: auto; margin-right: 12px; font-size: 1.2rem;">${act.icon}</div>
        <div class="activity-content">
          <p class="activity-text" style="color: #cbd5e1; margin-bottom: 2px;">${act.text}</p>
          <span class="activity-time">${dateStr}</span>
        </div>
      </div>
    `;
  });
}

// ==============================
// CHART RENDERERS
// ==============================

function destroyChart(id) {
  if (charts[id]) charts[id].destroy();
}

// 1. Monthly Registrations (Line)
function renderChartMonthlyReg(users) {
  destroyChart('chartMonthlyReg');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const data = new Array(12).fill(0);
  
  users.forEach(u => {
    if (u.createdAt) {
      const d = new Date(u.createdAt);
      if (d.getFullYear() === currentYear) data[d.getMonth()]++;
    }
  });

  const ctx = document.getElementById('chart-monthly-reg').getContext('2d');
  charts['chartMonthlyReg'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: `Registrations (${currentYear})`,
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3b82f6'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

// 2. Registration Trend (Current vs Prev Month - Line)
function renderChartTrend(users) {
  destroyChart('chartTrend');
  const now = new Date();
  const currentMonth = now.getMonth();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const currentYear = now.getFullYear();
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // Track daily for up to 31 days
  const currData = new Array(31).fill(0);
  const prevData = new Array(31).fill(0);

  users.forEach(u => {
    if (u.createdAt) {
      const d = new Date(u.createdAt);
      const day = d.getDate() - 1;
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        currData[day]++;
      } else if (d.getFullYear() === prevMonthYear && d.getMonth() === prevMonth) {
        prevData[day]++;
      }
    }
  });

  const labels = Array.from({length: 31}, (_, i) => i + 1);

  const ctx = document.getElementById('chart-trend').getContext('2d');
  charts['chartTrend'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Current Month',
          data: currData,
          borderColor: '#10b981',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        },
        {
          label: 'Previous Month',
          data: prevData,
          borderColor: '#64748b',
          borderDash: [5, 5],
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
  });
}

// 3. Daily Registrations (Area - Last 30 days)
function renderChartDailyReg(users) {
  destroyChart('chartDailyReg');
  const labels = [];
  const data = [];
  const today = new Date();
  
  const map = {};
  for(let i=29; i>=0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().substring(0,10);
    labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    map[dateStr] = 0;
  }

  users.forEach(u => {
    if (u.createdAt) {
      const dStr = u.createdAt.substring(0, 10);
      if (map[dStr] !== undefined) map[dStr]++;
    }
  });

  for(let i=29; i>=0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    data.push(map[d.toISOString().substring(0,10)]);
  }

  const ctx = document.getElementById('chart-daily-reg').getContext('2d');
  charts['chartDailyReg'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Registrations',
        data: data,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false } }, plugins: { legend: { display: false } } }
  });
}

// 4. Activated vs Pending (Doughnut)
function renderChartStatus(users) {
  destroyChart('chartStatus');
  let act = 0, pen = 0;
  users.forEach(u => u.isApproved ? act++ : pen++);

  const ctx = document.getElementById('chart-status').getContext('2d');
  charts['chartStatus'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Activated', 'Pending'],
      datasets: [{
        data: [act, pen],
        backgroundColor: ['#10b981', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom' } } }
  });
}

// 5. Organization Distribution (Horizontal Bar)
function renderChartOrgDist(users) {
  destroyChart('chartOrgDist');
  const orgMap = {};
  users.forEach(u => {
    const orgName = u.organizationName ? u.organizationName.trim() : 'Independent';
    if (!orgMap[orgName]) orgMap[orgName] = 0;
    orgMap[orgName]++;
  });

  const sorted = Object.entries(orgMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
  
  const ctx = document.getElementById('chart-org-dist').getContext('2d');
  charts['chartOrgDist'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(o => o[0].length > 12 ? o[0].substring(0,12)+'...' : o[0]),
      datasets: [{
        label: 'Users',
        data: sorted.map(o => o[1]),
        backgroundColor: 'rgba(6, 182, 212, 0.7)',
        borderRadius: 4
      }]
    },
    options: { 
      indexAxis: 'y', 
      responsive: true, 
      maintainAspectRatio: false, 
      scales: { x: { display: false } },
      plugins: { legend: { display: false } }
    }
  });
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
