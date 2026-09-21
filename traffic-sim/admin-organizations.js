// Admin Organizations — all Firestore ops go through the secure backend API

let allOrgs = [];
let currentPage = 1;
const pageSize = 12; // Adjusted for grid layout (e.g. 3x4 or 4x3)
let searchQuery = '';
let currentSort = 'alpha';

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

  document.getElementById('org-search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    currentPage = 1;
    renderGrid();
  });

  document.getElementById('org-sort-filter').addEventListener('change', (e) => {
    currentSort = e.target.value;
    sortOrgs();
    currentPage = 1;
    renderGrid();
  });

  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderGrid();
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(getFilteredOrgs().length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderGrid();
    }
  });

  loadOrgs();
});

async function loadOrgs() {
  try {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch('/api/admin/users', {
      headers: { 'x-admin-token': token }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error);
    
    const users = result.users || [];
    const orgMap = {};
    
    users.forEach(u => {
      const orgName = u.organizationName ? u.organizationName.trim() : 'Independent / No Organization';
      
      if (!orgMap[orgName]) {
        orgMap[orgName] = { name: orgName, total: 0, activated: 0, pending: 0, lastRegistration: 0 };
      }
      
      orgMap[orgName].total++;
      if (u.isApproved) {
        orgMap[orgName].activated++;
      } else {
        orgMap[orgName].pending++;
      }

      if (u.createdAt) {
        const t = new Date(u.createdAt).getTime();
        if (t > orgMap[orgName].lastRegistration) {
          orgMap[orgName].lastRegistration = t;
        }
      }
    });

    allOrgs = Object.values(orgMap);
    sortOrgs();
    
    renderGrid();
  } catch (error) {
    console.error("Error fetching users/orgs:", error);
    document.getElementById('orgs-grid').innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--color-danger); padding: 32px;">Failed to load organizations.</div>
    `;
  }
}

function sortOrgs() {
  allOrgs.sort((a, b) => {
    if (currentSort === 'alpha') {
      return a.name.localeCompare(b.name);
    } else if (currentSort === 'most') {
      return b.total - a.total;
    } else if (currentSort === 'newest') {
      return b.lastRegistration - a.lastRegistration;
    }
    return 0;
  });
}

function getFilteredOrgs() {
  if (!searchQuery) return allOrgs;
  return allOrgs.filter(o => o.name.toLowerCase().includes(searchQuery));
}

function renderGrid() {
  const filteredOrgs = getFilteredOrgs();
  
  const totalPages = Math.ceil(filteredOrgs.length / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredOrgs.length);
  const pageOrgs = filteredOrgs.slice(startIdx, endIdx);

  document.getElementById('pagination-info').textContent = `Showing ${filteredOrgs.length === 0 ? 0 : startIdx + 1} to ${endIdx} of ${filteredOrgs.length} entries`;
  
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
      renderGrid();
    });
    pageNumbersContainer.appendChild(btn);
  }

  const grid = document.getElementById('orgs-grid');
  grid.innerHTML = '';

  if (pageOrgs.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 32px;">No organizations found.</div>`;
    return;
  }

  pageOrgs.forEach(o => {
    const card = document.createElement('div');
    card.className = 'glass-panel';
    card.style.padding = '24px';
    card.style.cursor = 'pointer';
    card.style.transition = 'transform 0.2s, background 0.2s, box-shadow 0.2s';
    card.style.position = 'relative';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '16px';

    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-2px)';
      card.style.background = 'rgba(255,255,255,0.08)';
      card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.background = '';
      card.style.boxShadow = '';
    });
    
    card.addEventListener('click', () => {
      window.location.href = `/admin-organization-details.html?org=${encodeURIComponent(o.name)}`;
    });

    const dateStr = o.lastRegistration ? new Date(o.lastRegistration).toLocaleDateString() : 'Unknown';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <h3 style="margin: 0; color: #fff; font-size: 1.1rem; line-height: 1.4; word-break: break-word; padding-right: 12px;">${o.name}</h3>
        <span class="badge" style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${o.total} Users</span>
      </div>
      
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="status-badge activated" style="font-size: 0.75rem;">${o.activated} Activated</span>
        <span class="status-badge pending" style="font-size: 0.75rem;">${o.pending} Pending</span>
      </div>

      <div style="margin-top: auto; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
        <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between;">
          <span>Last Registration:</span>
          <span style="color: #cbd5e1;">${dateStr}</span>
        </div>
      </div>
    `;
    
    grid.appendChild(card);
  });
}
