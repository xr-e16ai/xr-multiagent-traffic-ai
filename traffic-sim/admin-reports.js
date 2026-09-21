// Admin Reports — all Firestore ops go through the secure backend API

// ===================== STATE =====================
let allUsers = [];
let currentFilter = 'alltime';
let customStart = null;
let customEnd = null;
let reportHistory = []; // in-memory report history for this session
let currentPreviewType = null;

const REPORT_LABELS = {
  users:      'User Registration Report',
  orgs:       'Organization Report',
  activation: 'Activation Report',
  daily:      'Daily Registration Report',
  monthly:    'Monthly Registration Report',
  summary:    'Analytics Summary Report',
};

const FILTER_LABELS = {
  today:   'Today',
  '7days': 'Last 7 Days',
  '30days':'Last 30 Days',
  month:   'Current Month',
  year:    'Current Year',
  alltime: 'All Time',
  custom:  'Custom Range',
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = '/admin-login.html';
    return;
  }

  document.getElementById('admin-logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminName');
    window.location.href = '/admin-login.html';
  });

  // Set default custom date range to last 30 days
  const today = new Date();
  const prior = new Date(); prior.setDate(today.getDate() - 30);
  document.getElementById('custom-start').value = prior.toISOString().substring(0,10);
  document.getElementById('custom-end').value   = today.toISOString().substring(0,10);

  loadData();
});

async function loadData() {
  try {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch('/api/admin/users', {
      headers: { 'x-admin-token': token }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error);
    
    const users = result.users || [];
    
    const activeCount = users.filter(u => u.subscriptionStatus === 'active').length;
    const inactiveCount = users.length - activeCount;
    allUsers = users;
  } catch (err) {
    console.error('Reports: failed to load Firestore data', err);
    showToast('Failed to load data from Firestore', 'error');
  }
}

// ===================== FILTER =====================
window.setFilter = function(btn, filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const customEl = document.getElementById('custom-date-range');
  customEl.style.display = filter === 'custom' ? 'flex' : 'none';
};

window.applyCustomFilter = function() {
  customStart = document.getElementById('custom-start').value;
  customEnd   = document.getElementById('custom-end').value;
  if (!customStart || !customEnd) { showToast('Please select both start and end dates.', 'error'); return; }
  showToast('Custom date range applied.', 'success');
};

function getFilteredUsers() {
  if (currentFilter === 'alltime') return allUsers;

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return allUsers.filter(u => {
    if (!u.createdAt) return false;
    const t = new Date(u.createdAt).getTime();
    if (currentFilter === 'today')   return t >= today;
    if (currentFilter === '7days')   return t >= today - 6*86400000;
    if (currentFilter === '30days')  return t >= today - 29*86400000;
    if (currentFilter === 'month') {
      const d = new Date(u.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (currentFilter === 'year') {
      return new Date(u.createdAt).getFullYear() === now.getFullYear();
    }
    if (currentFilter === 'custom' && customStart && customEnd) {
      const s = new Date(customStart).getTime();
      const e = new Date(customEnd).getTime() + 86399000;
      return t >= s && t <= e;
    }
    return true;
  });
}

function getPeriodLabel() {
  if (currentFilter === 'custom' && customStart && customEnd) {
    return `${customStart} → ${customEnd}`;
  }
  return FILTER_LABELS[currentFilter] || 'All Time';
}

// ===================== DATA BUILDERS =====================
function buildUsersData(users) {
  return {
    headers: ['Full Name', 'Email', 'Phone', 'Organization', 'Status', 'Registered'],
    rows: users.map(u => [
      u.fullName || '-',
      u.email || '-',
      u.mobileNumber || '-',
      u.organizationName || 'Independent',
      u.isApproved ? 'Activated' : 'Pending',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-',
    ]),
  };
}

function buildOrgsData(users) {
  const map = {};
  users.forEach(u => {
    const k = u.organizationName ? u.organizationName.trim() : 'Independent';
    if (!map[k]) map[k] = { name: k, total: 0, act: 0, pen: 0 };
    map[k].total++;
    u.isApproved ? map[k].act++ : map[k].pen++;
  });
  const sorted = Object.values(map).sort((a,b) => b.total - a.total);
  return {
    headers: ['Organization Name', 'Total Users', 'Activated', 'Pending'],
    rows: sorted.map(o => [o.name, o.total, o.act, o.pen]),
  };
}

function buildActivationData(users) {
  const sorted = [...users].sort((a,b) => {
    const d1 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const d2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return d2 - d1;
  });
  return {
    headers: ['Full Name', 'Organization', 'Status', 'Subscription', 'Joined On'],
    rows: sorted.map(u => [
      u.fullName || '-',
      u.organizationName || 'Independent',
      u.isApproved ? 'Approved' : 'Pending',
      u.subscriptionStatus || '-',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-',
    ]),
  };
}

function buildDailyData(users) {
  const map = {};
  users.forEach(u => {
    if (u.createdAt) {
      const d = u.createdAt.substring(0, 10);
      if (!map[d]) map[d] = 0;
      map[d]++;
    }
  });
  const sorted = Object.keys(map).sort();
  let cumulative = 0;
  return {
    headers: ['Date', 'New Registrations', 'Cumulative Total'],
    rows: sorted.map(d => {
      cumulative += map[d];
      return [d, map[d], cumulative];
    }),
  };
}

function buildMonthlyData(users) {
  const map = {};
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  users.forEach(u => {
    if (u.createdAt) {
      const d = new Date(u.createdAt);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!map[k]) map[k] = { label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, count: 0 };
      map[k].count++;
    }
  });
  const sorted = Object.keys(map).sort();
  let prev = 0;
  return {
    headers: ['Month', 'Registrations', 'Growth vs Prior Month'],
    rows: sorted.map(k => {
      const curr = map[k].count;
      const growth = prev === 0 ? 'N/A' : `${curr >= prev ? '+' : ''}${((curr - prev)/prev*100).toFixed(1)}%`;
      prev = curr;
      return [map[k].label, curr, growth];
    }),
  };
}

function buildSummaryData(users) {
  const orgs = new Set(users.map(u => (u.organizationName||'').trim().toLowerCase()).filter(Boolean));
  const act = users.filter(u => u.isApproved).length;
  const pen = users.length - act;
  const now = new Date();
  const monthStr = now.toISOString().substring(0,7);
  const monthly = users.filter(u => u.createdAt && u.createdAt.startsWith(monthStr)).length;
  const today = now.toISOString().substring(0,10);
  const todayReg = users.filter(u => u.createdAt && u.createdAt.startsWith(today)).length;

  return {
    stats: {
      'Total Users': users.length,
      'Activated': act,
      'Pending': pen,
      'Organizations': orgs.size,
      "Today's Reg.": todayReg,
      'Monthly Reg.': monthly,
    },
    headers: ['Metric', 'Value'],
    rows: [
      ['Total Registered Users', users.length],
      ['Activated Users', act],
      ['Pending Activation', pen],
      ['Total Organizations', orgs.size],
      ["Today's Registrations", todayReg],
      ['Monthly Registrations', monthly],
      ['Activation Rate', users.length > 0 ? `${((act/users.length)*100).toFixed(1)}%` : '0%'],
    ],
  };
}

function getData(type) {
  const users = getFilteredUsers();
  if (type === 'users')      return buildUsersData(users);
  if (type === 'orgs')       return buildOrgsData(users);
  if (type === 'activation') return buildActivationData(users);
  if (type === 'daily')      return buildDailyData(users);
  if (type === 'monthly')    return buildMonthlyData(users);
  if (type === 'summary')    return buildSummaryData(users);
  return { headers: [], rows: [] };
}

// ===================== PREVIEW =====================
window.previewReport = function(type) {
  currentPreviewType = type;
  const modal = document.getElementById('preview-modal');
  modal.classList.add('open');
  document.getElementById('modal-eyebrow').textContent = 'REPORT PREVIEW';
  document.getElementById('modal-title').textContent = REPORT_LABELS[type];
  document.getElementById('modal-date').textContent = new Date().toLocaleString();
  document.getElementById('modal-period').textContent = getPeriodLabel();
  document.getElementById('modal-records').textContent = 'Loading...';
  document.getElementById('modal-body').innerHTML = `<div class="preview-loading"><div class="spin"></div><span>Preparing report data...</span></div>`;

  // Wire modal export buttons
  document.getElementById('modal-pdf-btn').onclick   = () => exportReport(type, 'pdf');
  document.getElementById('modal-excel-btn').onclick = () => exportReport(type, 'excel');

  setTimeout(() => {
    const data = getData(type);
    if (!data) return;

    document.getElementById('modal-records').textContent = data.rows.length + ' Records';
    document.getElementById('modal-footer-info').textContent = `Showing all ${data.rows.length} records for: ${getPeriodLabel()}`;

    let html = '';

    // Summary report has stats
    if (type === 'summary' && data.stats) {
      html += `<div class="preview-stats">`;
      for (const [k, v] of Object.entries(data.stats)) {
        html += `<div class="preview-stat"><span class="preview-stat-label">${k}</span><span class="preview-stat-value">${v}</span></div>`;
      }
      html += `</div>`;
    }

    if (data.rows.length === 0) {
      html += `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No data found for the selected period.</div></div>`;
    } else {
      html += `<p class="preview-section-title">Data Preview</p>`;
      html += `<div style="overflow-x:auto;"><table class="preview-table"><thead><tr>`;
      data.headers.forEach(h => { html += `<th>${h}</th>`; });
      html += `</tr></thead><tbody>`;
      data.rows.forEach(r => {
        html += `<tr>`;
        r.forEach((cell, i) => {
          let cellHtml = cell;
          // Color-code status column
          if (typeof cell === 'string') {
            if (cell === 'Approved' || cell === 'Activated') cellHtml = `<span style="color:var(--color-success);font-weight:600;">${cell}</span>`;
            else if (cell === 'Pending') cellHtml = `<span style="color:var(--color-warning);font-weight:600;">${cell}</span>`;
          }
          html += `<td>${cellHtml}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
    }

    document.getElementById('modal-body').innerHTML = html;
  }, 350);
};

// ===================== EXPORT =====================
window.exportReport = function(type, format) {
  const label = REPORT_LABELS[type];
  const data  = getData(type);

  if (data.rows.length === 0) {
    showToast('No data found for the selected period.', 'error');
    return;
  }

  showToast(`Generating ${format.toUpperCase()}...`, 'info');

  setTimeout(() => {
    try {
      if (format === 'pdf') exportPDF(type, label, data);
      else                  exportExcel(label, data);

      // Add to history
      addToHistory(label, format);
      showToast(`${label} generated successfully!`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed. Please try again.', 'error');
    }
  }, 200);
};

function exportPDF(type, title, data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: data.headers.length > 5 ? 'landscape' : 'portrait' });

  const now = new Date();
  const pageW = doc.internal.pageSize.getWidth();

  // Header block
  doc.setFillColor(15, 19, 26);
  doc.rect(0, 0, pageW, 42, 'F');

  // Logo placeholder
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(14, 8, 26, 26, 4, 4, 'F');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('💠', 22, 24);

  // Company
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('E16 AI XR Technology Pvt Ltd', 48, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('AI Multi-Agent Traffic Simulation Platform', 48, 26);
  doc.text('Enterprise Command Center', 48, 33);

  // Report title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text(title, 14, 58);

  // Meta info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated by: Administrator`, 14, 68);
  doc.text(`Generated on: ${now.toLocaleString()}`, 14, 76);
  doc.text(`Period: ${getPeriodLabel()}`, 14, 84);
  doc.text(`Total Records: ${data.rows.length}`, 14, 92);

  // Summary stats for summary report
  let startY = 102;
  if (type === 'summary' && data.stats) {
    const entries = Object.entries(data.stats);
    entries.forEach(([k, v], i) => {
      const x = 14 + (i % 3) * 64;
      const y = startY + Math.floor(i / 3) * 20;
      doc.setFillColor(21, 26, 34);
      doc.roundedRect(x, y - 8, 60, 16, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(k, x + 4, y - 1);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(String(v), x + 4, y + 7);
      doc.setFont('helvetica', 'normal');
    });
    startY += Math.ceil(entries.length / 3) * 20 + 14;
  }

  // Table
  doc.autoTable({
    startY: startY,
    head: [data.headers],
    body: data.rows,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [226, 232, 240],
      fillColor: [21, 26, 34],
    },
    alternateRowStyles: { fillColor: [15, 19, 26] },
    styles: { lineColor: [30, 37, 50], lineWidth: 0.3 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('© 2026 E16 AI XR Technology Pvt Ltd — Confidential', 14, footerY);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 30, footerY);
  }

  const filename = `${title.replace(/\s+/g,'_').toLowerCase()}_${Date.now()}.pdf`;
  doc.save(filename);
}

function exportExcel(title, data) {
  const wb = XLSX.utils.book_new();

  // Cover sheet
  const coverData = [
    ['E16 AI XR Technology Pvt Ltd'],
    ['AI Multi-Agent Traffic Simulation Platform'],
    [''],
    ['Report Title:', title],
    ['Generated By:', 'Administrator'],
    ['Generated On:', new Date().toLocaleString()],
    ['Period:', getPeriodLabel()],
    ['Total Records:', data.rows.length],
  ];
  const coverSheet = XLSX.utils.aoa_to_sheet(coverData);
  coverSheet['!cols'] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, coverSheet, 'Cover');

  // Data sheet
  const dataSheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
  dataSheet['!cols'] = data.headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Report Data');

  XLSX.writeFile(wb, `${title.replace(/\s+/g,'_').toLowerCase()}_${Date.now()}.xlsx`);
}

// ===================== HISTORY =====================
function addToHistory(label, format) {
  const entry = {
    name: label,
    format: format.toUpperCase(),
    by: 'Administrator',
    date: new Date().toLocaleString(),
  };
  reportHistory.unshift(entry);
  renderHistory();
}

function renderHistory() {
  const tbody = document.getElementById('history-table-body');
  const rtbody = document.getElementById('recent-table-body');
  const count = reportHistory.length;

  document.getElementById('history-count').textContent = `${count} Report${count !== 1 ? 's' : ''}`;
  document.getElementById('recent-count').textContent = `${Math.min(count, 5)} Recent`;

  if (count === 0) {
    const emptyHtml = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No reports generated yet.</div></div></td></tr>`;
    tbody.innerHTML = emptyHtml;
    rtbody.innerHTML = emptyHtml;
    return;
  }

  tbody.innerHTML = reportHistory.map(r => `
    <tr>
      <td>${r.name}</td>
      <td><span class="file-badge ${r.format === 'PDF' ? 'pdf' : 'excel'}">${r.format}</span></td>
      <td>${r.date}</td>
      <td><button class="download-btn" title="Regenerate">↓ Regenerate</button></td>
    </tr>
  `).join('');

  rtbody.innerHTML = reportHistory.slice(0, 5).map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.by}</td>
      <td style="font-size:0.78rem;">${r.date}</td>
      <td><span class="file-badge ${r.format === 'PDF' ? 'pdf' : 'excel'}">${r.format}</span></td>
    </tr>
  `).join('');
}

// ===================== TOAST =====================
function showToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;

  // Type-to-class mapping
  const cls = type === 'error' ? 'error' : type === 'info' ? 'info' : 'success';
  toast.textContent = msg;
  toast.className = `admin-toast ${cls} show`;

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.className = 'admin-toast'; }, 3500);
}
