const fs = require('fs');
const path = require('path');

const generateNav = (activeId) => {
  return `      <nav class="sidebar-nav">
        <div class="nav-section-title">MAIN MENU</div>
        <a href="/admin-dashboard.html" class="nav-link \${activeId === 'dashboard' ? 'active' : ''}">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Command Center</span>
        </a>
        <a href="/admin-users.html" class="nav-link \${activeId === 'users' ? 'active' : ''}">
          <span class="nav-icon">👥</span>
          <span class="nav-label">Users</span>
        </a>
        <a href="/admin-organizations.html" class="nav-link \${activeId === 'orgs' ? 'active' : ''}">
          <span class="nav-icon">🏢</span>
          <span class="nav-label">Organizations</span>
        </a>
        <a href="/admin-analytics.html" class="nav-link \${activeId === 'analytics' ? 'active' : ''}">
          <span class="nav-icon">📈</span>
          <span class="nav-label">Analytics</span>
        </a>
        <a href="/admin-payments.html" class="nav-link \${activeId === 'payments' ? 'active' : ''}">
          <span class="nav-icon">💳</span>
          <span class="nav-label">Payments</span>
        </a>
        <a href="/admin-reports.html" class="nav-link \${activeId === 'reports' ? 'active' : ''}">
          <span class="nav-icon">📑</span>
          <span class="nav-label">Reports</span>
        </a>
        
        <div class="sidebar-divider"></div>
        <div class="nav-section-title">PREFERENCES</div>
        
        <a href="/admin-settings.html" class="nav-link \${activeId === 'settings' ? 'active' : ''}">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Settings</span>
        </a>
      </nav>`;
}

const updateNavInFile = (file, activeId) => {
  let content = fs.readFileSync(file, 'utf8');
  const navRegex = /<nav class="sidebar-nav">[\s\S]*?<\/nav>/;
  content = content.replace(navRegex, generateNav(activeId));
  fs.writeFileSync(file, content);
};

// Update existing
updateNavInFile('admin-dashboard.html', 'dashboard');
updateNavInFile('admin-users.html', 'users');

const generatePlaceholder = (title, activeId) => {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>\${title} - Enterprise Command Center</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/admin.css">
</head>
<body class="enterprise-admin-body">

  <div class="admin-app">
    <!-- SIDEBAR -->
    <aside class="app-sidebar" id="app-sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <div class="logo-icon">💠</div>
        </div>
        <div class="brand-text">
          <h2 class="company-name">E16 AI XR Tech</h2>
          <p class="product-name">Simulation Platform</p>
        </div>
      </div>
      <div class="sidebar-divider"></div>
      
\${generateNav(activeId)}
      
      <div class="sidebar-footer">
        <a href="#" class="nav-link logout" id="admin-logout-btn">
          <span class="nav-icon">🚪</span>
          <span class="nav-label">Logout</span>
        </a>
      </div>
    </aside>

    <!-- MAIN WRAPPER -->
    <div class="main-wrapper">
      
      <!-- TOP HEADER -->
      <header class="app-header">
        <div class="header-left">
          <h1 class="page-title">\${title}</h1>
        </div>
        <div class="header-center">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Search resources, docs, users...">
            <span class="search-shortcut">Ctrl+K</span>
          </div>
        </div>
        <div class="header-right">
          <div class="datetime-display">
            <span id="current-date"></span> <span class="time-sep">•</span> <span id="current-time"></span>
          </div>
          <div class="header-icon-btn notification-bell">
            🔔 <span class="badge">3</span>
          </div>
          <div class="profile-dropdown">
            <div class="avatar">A</div>
            <div class="profile-info">
              <span class="profile-name">Administrator</span>
              <span class="profile-role">Super Admin</span>
            </div>
            <span class="dropdown-icon">▼</span>
          </div>
        </div>
      </header>

      <!-- SCROLLABLE CONTENT -->
      <main class="app-content" style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 80px);">
        <div class="glass-panel" style="padding: 60px; text-align: center; max-width: 500px;">
          <h2 style="font-size: 2rem; margin-bottom: 16px; color: #fff;">\${title}</h2>
          <p style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.6;">This module is currently under development. Enterprise access will be enabled in the upcoming release.</p>
          <button class="action-btn glass-panel primary-action" style="margin-top: 32px; padding: 12px 32px;" onclick="window.location.href='/admin-dashboard.html'">Return to Dashboard</button>
        </div>
      </main>
    </div>
  </div>

  <script type="module" src="/admin-dashboard.js"></script>
</body>
</html>`;
};

fs.writeFileSync('admin-organizations.html', generatePlaceholder('Organizations', 'orgs'));
fs.writeFileSync('admin-analytics.html', generatePlaceholder('Analytics', 'analytics'));
fs.writeFileSync('admin-reports.html', generatePlaceholder('Reports', 'reports'));
fs.writeFileSync('admin-payments.html', generatePlaceholder('Payments', 'payments'));
fs.writeFileSync('admin-settings.html', generatePlaceholder('Settings', 'settings'));

console.log("Navigation and placeholder pages created successfully.");
