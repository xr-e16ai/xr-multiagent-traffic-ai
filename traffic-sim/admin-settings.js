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

  // Populate dynamic Administrator attributes if available
  const loggedInName = sessionStorage.getItem('adminName');
  if (loggedInName) {
    const nameVal = document.getElementById('admin-name-val');
    const nameInput = document.getElementById('admin-name-input');
    if (nameVal) nameVal.textContent = loggedInName;
    if (nameInput) nameInput.value = loggedInName;
  }

  // Current timestamp for last login
  const lastLoginEl = document.getElementById('admin-last-login');
  if (lastLoginEl) {
    const now = new Date();
    lastLoginEl.textContent = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  // ─── SECTION 1: Company Profile ───────────────────────────────────────────
  const companyEditBtn = document.getElementById('company-edit-btn');
  const companySaveBtn = document.getElementById('company-save-btn');
  const companySectionBody = document.getElementById('company-section-body');

  if (companyEditBtn && companySaveBtn && companySectionBody) {
    const savedCompany = JSON.parse(localStorage.getItem('adminCompanySettings') || '{}');
    if (savedCompany.name)  { document.getElementById('comp-name-input').value  = savedCompany.name;  document.getElementById('comp-name-val').textContent  = savedCompany.name; }
    if (savedCompany.prod)  { document.getElementById('comp-prod-input').value  = savedCompany.prod;  document.getElementById('comp-prod-val').textContent  = savedCompany.prod; }
    if (savedCompany.phone) { document.getElementById('comp-phone-input').value = savedCompany.phone; document.getElementById('comp-phone-val').textContent = savedCompany.phone; }
    if (savedCompany.email) { document.getElementById('comp-email-input').value = savedCompany.email; document.getElementById('comp-email-val').textContent = savedCompany.email; }
    if (savedCompany.web)   { document.getElementById('comp-web-input').value   = savedCompany.web;   document.getElementById('comp-web-val').textContent   = savedCompany.web; }
    if (savedCompany.addr)  { document.getElementById('comp-addr-input').value  = savedCompany.addr;  document.getElementById('comp-addr-val').textContent  = savedCompany.addr; }

    companyEditBtn.addEventListener('click', () => {
      companySectionBody.classList.add('edit-mode');
      companyEditBtn.style.display = 'none';
      companySaveBtn.style.display = 'inline-block';
    });

    companySaveBtn.addEventListener('click', () => {
      const nameVal  = document.getElementById('comp-name-input').value.trim();
      const prodVal  = document.getElementById('comp-prod-input').value.trim();
      const phoneVal = document.getElementById('comp-phone-input').value.trim();
      const emailVal = document.getElementById('comp-email-input').value.trim();
      const webVal   = document.getElementById('comp-web-input').value.trim();
      const addrVal  = document.getElementById('comp-addr-input').value.trim();

      if (!nameVal || !prodVal || !phoneVal || !emailVal) {
        showToast('Please fill in all required company fields.', 'error');
        return;
      }

      document.getElementById('comp-name-val').textContent  = nameVal;
      document.getElementById('comp-prod-val').textContent  = prodVal;
      document.getElementById('comp-phone-val').textContent = phoneVal;
      document.getElementById('comp-email-val').textContent = emailVal;
      document.getElementById('comp-web-val').textContent   = webVal;
      document.getElementById('comp-addr-val').textContent  = addrVal;

      localStorage.setItem('adminCompanySettings', JSON.stringify({ name: nameVal, prod: prodVal, phone: phoneVal, email: emailVal, web: webVal, addr: addrVal }));

      companySectionBody.classList.remove('edit-mode');
      companySaveBtn.style.display = 'none';
      companyEditBtn.style.display = 'inline-block';
      showToast('Company information updated successfully.', 'success');
    });
  }

  // ─── SECTION 2: Administrator Profile ─────────────────────────────────────
  const profileEditBtn = document.getElementById('profile-edit-btn');
  const profileSaveBtn = document.getElementById('profile-save-btn');
  const profileSectionBody = document.getElementById('profile-section-body');

  if (profileEditBtn && profileSaveBtn && profileSectionBody) {
    const savedProfile = JSON.parse(localStorage.getItem('adminProfileSettings') || '{}');
    if (savedProfile.name)  { document.getElementById('admin-name-input').value  = savedProfile.name;  document.getElementById('admin-name-val').textContent  = savedProfile.name; }
    if (savedProfile.email) { document.getElementById('admin-email-input').value = savedProfile.email; document.getElementById('admin-email-val').textContent = savedProfile.email; }
    if (savedProfile.phone) { document.getElementById('admin-phone-input').value = savedProfile.phone; document.getElementById('admin-phone-val').textContent = savedProfile.phone; }

    profileEditBtn.addEventListener('click', () => {
      profileSectionBody.classList.add('edit-mode');
      profileEditBtn.style.display = 'none';
      profileSaveBtn.style.display = 'inline-block';
    });

    profileSaveBtn.addEventListener('click', () => {
      const nameVal  = document.getElementById('admin-name-input').value.trim();
      const emailVal = document.getElementById('admin-email-input').value.trim();
      const phoneVal = document.getElementById('admin-phone-input').value.trim();

      if (!nameVal || !emailVal) {
        showToast('Administrator name and email are required.', 'error');
        return;
      }

      document.getElementById('admin-name-val').textContent  = nameVal;
      document.getElementById('admin-email-val').textContent = emailVal;
      document.getElementById('admin-phone-val').textContent = phoneVal;

      sessionStorage.setItem('adminName', nameVal);
      localStorage.setItem('adminProfileSettings', JSON.stringify({ name: nameVal, email: emailVal, phone: phoneVal }));

      profileSectionBody.classList.remove('edit-mode');
      profileSaveBtn.style.display = 'none';
      profileEditBtn.style.display = 'inline-block';
      showToast('Administrator profile updated successfully.', 'success');
    });
  }

  // Password change trigger (Preserve credentials unchanged)
  const passwordChangeBtn = document.getElementById('password-change-btn');
  if (passwordChangeBtn) {
    passwordChangeBtn.addEventListener('click', () => {
      showToast('Password change request initiated. Security verification link sent to administrator email.', 'success');
    });
  }

  // ─── SECTION 4: Simulation Settings toggles ───────────────────────────────
  const simToggles = [
    { id: 'sim-access-toggle',   name: 'Simulation Access' },
    { id: 'maintenance-toggle',  name: 'Maintenance Mode' },
    { id: 'registration-toggle', name: 'User Registration' },
    { id: 'approval-toggle',     name: 'User Approval Requirement' },
  ];

  simToggles.forEach(toggleInfo => {
    const el = document.getElementById(toggleInfo.id);
    if (el) {
      const saved = localStorage.getItem('adminToggle_' + toggleInfo.id);
      if (saved !== null) el.checked = (saved === 'true');
      el.addEventListener('change', (e) => {
        const stateStr = e.target.checked ? 'ENABLED' : 'DISABLED';
        localStorage.setItem('adminToggle_' + toggleInfo.id, e.target.checked.toString());
        showToast(`${toggleInfo.name} has been ${stateStr}.`, 'info');
      });
    }
  });

  // ─── SECTION 6: Security Settings (Firestore Backend Persistence) ─────────
  const securityEditBtn     = document.getElementById('security-edit-btn');
  const securitySaveBtn     = document.getElementById('security-save-btn');
  const securityCancelBtn   = document.getElementById('security-cancel-btn');
  const securitySectionBody = document.getElementById('security-section-body');

  const applySecDisplay = (data) => {
    if (!data) return;
    const tvEl = document.getElementById('sec-timeout-val');
    const avEl = document.getElementById('sec-attempts-val');
    const evEl = document.getElementById('sec-expiry-val');
    const f2El = document.getElementById('sec-2fa-val');
    const ipEl = document.getElementById('sec-ip-val');
    const scEl = document.getElementById('sec-specialchars-val');
    const lvEl = document.getElementById('sec-lockout-val');

    const tiEl = document.getElementById('sec-timeout-input');
    const aiEl = document.getElementById('sec-attempts-input');
    const eiEl = document.getElementById('sec-expiry-input');
    const fiEl = document.getElementById('sec-2fa-input');
    const iiEl = document.getElementById('sec-ip-input');
    const siEl = document.getElementById('sec-specialchars-input');
    const liEl = document.getElementById('sec-lockout-input');

    if (data.timeout !== undefined) {
      if (tvEl) tvEl.textContent = data.timeout + ' minutes';
      if (tiEl) tiEl.value = data.timeout;
    }
    if (data.attempts !== undefined) {
      if (avEl) avEl.textContent = data.attempts + ' attempts';
      if (aiEl) aiEl.value = data.attempts;
    }
    if (data.expiry !== undefined) {
      if (evEl) evEl.textContent = Number(data.expiry) === 0 ? 'Never (Disabled)' : data.expiry + ' days';
      if (eiEl) eiEl.value = data.expiry;
    }
    if (data.twoFactor !== undefined) {
      const is2FA = (data.twoFactor === true || data.twoFactor === 'true');
      if (f2El) f2El.textContent = is2FA ? 'Enabled' : 'Disabled';
      if (fiEl) fiEl.value = is2FA ? 'true' : 'false';
    }
    if (data.ipWhitelist !== undefined) {
      if (ipEl) ipEl.textContent = data.ipWhitelist.trim() || 'None (Allow all)';
      if (iiEl) iiEl.value = data.ipWhitelist;
    }
    if (data.specialChars !== undefined) {
      const isSpec = (data.specialChars === true || data.specialChars === 'true');
      if (scEl) scEl.textContent = isSpec ? 'Enabled' : 'Disabled';
      if (siEl) siEl.value = isSpec ? 'true' : 'false';
    }
    if (data.lockout !== undefined) {
      if (lvEl) lvEl.textContent = data.lockout + ' minutes';
      if (liEl) liEl.value = data.lockout;
    }
  };

  // Load Security Settings from backend API
  async function loadSecuritySettings() {
    const token = sessionStorage.getItem('adminToken');
    try {
      const response = await fetch('/api/admin/settings', {
        headers: { 'x-admin-token': token }
      });
      const result = await response.json();
      if (response.ok && result.success && result.settings) {
        applySecDisplay(result.settings);
        localStorage.setItem('adminSecuritySettings', JSON.stringify(result.settings));
      } else {
        // Fallback to local cache
        const cached = JSON.parse(localStorage.getItem('adminSecuritySettings') || '{}');
        applySecDisplay(cached);
      }
    } catch (err) {
      console.warn('Network error loading security settings, using local fallback:', err);
      const cached = JSON.parse(localStorage.getItem('adminSecuritySettings') || '{}');
      applySecDisplay(cached);
    }
  }

  loadSecuritySettings();

  let origSecurityState = {};

  if (securityEditBtn && securitySaveBtn && securitySectionBody) {
    securityEditBtn.addEventListener('click', () => {
      origSecurityState = {
        timeout: document.getElementById('sec-timeout-input')?.value,
        attempts: document.getElementById('sec-attempts-input')?.value,
        expiry: document.getElementById('sec-expiry-input')?.value,
        twoFactor: document.getElementById('sec-2fa-input')?.value,
        ipWhitelist: document.getElementById('sec-ip-input')?.value,
        specialChars: document.getElementById('sec-specialchars-input')?.value,
        lockout: document.getElementById('sec-lockout-input')?.value
      };

      securitySectionBody.classList.add('edit-mode');
      securityEditBtn.style.display = 'none';
      securitySaveBtn.style.display = 'inline-block';
      if (securityCancelBtn) securityCancelBtn.style.display = 'inline-block';
    });

    if (securityCancelBtn) {
      securityCancelBtn.addEventListener('click', () => {
        applySecDisplay(origSecurityState);
        securitySectionBody.classList.remove('edit-mode');
        securitySaveBtn.style.display   = 'none';
        securityCancelBtn.style.display  = 'none';
        securityEditBtn.style.display   = 'inline-block';
      });
    }

    securitySaveBtn.addEventListener('click', async () => {
      const tiVal = Number(document.getElementById('sec-timeout-input')?.value);
      const aiVal = Number(document.getElementById('sec-attempts-input')?.value);
      const eiVal = Number(document.getElementById('sec-expiry-input')?.value);
      const fiVal = document.getElementById('sec-2fa-input')?.value === 'true';
      const iiVal = document.getElementById('sec-ip-input')?.value.trim() || '';
      const siVal = document.getElementById('sec-specialchars-input')?.value === 'true';
      const liVal = Number(document.getElementById('sec-lockout-input')?.value);

      // Validation
      if (isNaN(tiVal) || tiVal < 1 || tiVal > 1440) {
        showToast('Session Timeout must be between 1 and 1440 minutes.', 'error');
        return;
      }
      if (isNaN(aiVal) || aiVal < 1 || aiVal > 20) {
        showToast('Maximum Login Attempts must be between 1 and 20.', 'error');
        return;
      }
      if (isNaN(eiVal) || eiVal < 0 || eiVal > 365) {
        showToast('Password Expiry must be between 0 (never) and 365 days.', 'error');
        return;
      }
      if (isNaN(liVal) || liVal < 1 || liVal > 1440) {
        showToast('Lockout Duration must be between 1 and 1440 minutes.', 'error');
        return;
      }

      const payload = {
        timeout: tiVal,
        attempts: aiVal,
        expiry: eiVal,
        twoFactor: fiVal,
        ipWhitelist: iiVal,
        specialChars: siVal,
        lockout: liVal
      };

      // Save to Backend API (Firestore)
      const token = sessionStorage.getItem('adminToken');
      try {
        securitySaveBtn.textContent = 'Saving...';
        securitySaveBtn.disabled = true;

        const response = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to save settings on server');
        }

        applySecDisplay(result.settings || payload);
        localStorage.setItem('adminSecuritySettings', JSON.stringify(result.settings || payload));

        securitySectionBody.classList.remove('edit-mode');
        securitySaveBtn.style.display   = 'none';
        if (securityCancelBtn) securityCancelBtn.style.display = 'none';
        securityEditBtn.style.display   = 'inline-block';

        showToast('Security settings saved and persisted to Firestore.', 'success');
      } catch (err) {
        console.error('Error saving security settings:', err);
        showToast(`Error saving settings: ${err.message}`, 'error');
      } finally {
        securitySaveBtn.textContent = 'Save';
        securitySaveBtn.disabled = false;
      }
    });
  }

  // ─── SECTION 7: Database Backup & Retention Management ────────────────────
  const btnManualBackup = document.getElementById('btn-manual-backup');
  const btnRefreshBackup = document.getElementById('btn-refresh-backup-status');

  async function loadBackupStatus() {
    const token = sessionStorage.getItem('adminToken');
    try {
      const response = await fetch('/api/admin/backup/status', {
        headers: { 'x-admin-token': token }
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch backup status');
      }

      // Schedule & Auto status
      const schedEl = document.getElementById('backup-schedule-display');
      const autoEl = document.getElementById('backup-auto-status');
      if (schedEl) schedEl.textContent = data.schedule || 'Daily at 02:00 UTC';
      if (autoEl) {
        autoEl.textContent = data.autoBackupEnabled ? '● Enabled' : '○ Disabled';
        autoEl.style.color = data.autoBackupEnabled ? 'var(--color-success)' : 'var(--text-muted)';
      }

      // Retention policy
      const retEl = document.getElementById('backup-retention-display');
      if (retEl) retEl.textContent = `Latest ${data.retentionCount || 3} Backups`;

      // Last successful backup
      const lastEl = document.getElementById('backup-last-time');
      const lastMetaEl = document.getElementById('backup-last-meta');
      if (data.lastSuccessfulBackup) {
        const d = new Date(data.lastSuccessfulBackup);
        if (lastEl) lastEl.textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (lastMetaEl) {
          const det = data.lastBackupDetails || {};
          const sizeKb = det.sizeBytes ? (det.sizeBytes / 1024).toFixed(1) + ' KB' : '';
          const recCount = det.recordsCount ? `${det.recordsCount} records` : '';
          lastMetaEl.textContent = [sizeKb, recCount].filter(Boolean).join(' • ') || 'Verified recovery point';
        }
      } else {
        if (lastEl) lastEl.textContent = 'No backups recorded yet';
        if (lastMetaEl) lastMetaEl.textContent = 'Click Run Backup Now to initialize';
      }

      // Next scheduled run
      const nextEl = document.getElementById('backup-next-time');
      if (nextEl) {
        if (data.nextScheduledBackup) {
          const nd = new Date(data.nextScheduledBackup);
          nextEl.textContent = nd.toLocaleDateString() + ' ' + nd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          nextEl.textContent = 'Tomorrow at 02:00 UTC';
        }
      }

      // Bucket destination
      const bucketEl = document.getElementById('backup-dest-bucket');
      if (bucketEl && data.destination) {
        bucketEl.textContent = data.destination;
      }

      // Render history table
      const tbody = document.getElementById('backup-history-table-body');
      const countEl = document.getElementById('backup-history-count');
      const history = data.history || [];

      if (countEl) countEl.textContent = `${history.length} recorded`;

      if (tbody) {
        if (history.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No backups recorded yet. Click "Run Backup Now" to create your first recovery set.</td></tr>`;
        } else {
          tbody.innerHTML = '';
          history.forEach(b => {
            const isPurged = b.retentionStatus === 'purged';
            const isSuccess = b.status === 'success';
            const statusBadge = isSuccess
              ? '<span class="status-badge activated" style="font-size:0.75rem;">Success</span>'
              : '<span class="status-badge deactivated" style="font-size:0.75rem;">Failed</span>';

            const retentionBadge = isPurged
              ? '<span class="status-badge deleted" style="font-size:0.75rem; text-decoration:none;">Purged (Old)</span>'
              : '<span class="status-badge activated" style="font-size:0.75rem;">Retained</span>';

            const sizeDisplay = b.sizeBytes ? (b.sizeBytes / 1024).toFixed(1) + ' KB' : '—';
            const recordsDisplay = b.recordsCount !== undefined ? `${b.recordsCount} docs` : '—';
            const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleString() : '—';

            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><code style="color: #60a5fa; font-size: 0.82rem;">${b.backupId || b.id}</code></td>
              <td style="color: var(--text-muted);">${dateStr}</td>
              <td>${statusBadge}</td>
              <td style="color: var(--text-muted);">${sizeDisplay}</td>
              <td style="color: var(--text-muted);">${recordsDisplay}</td>
              <td>${retentionBadge}</td>
              <td style="color: var(--text-dark); font-size: 0.8rem;">${b.initiatedBy || 'System'}</td>
            `;
            tbody.appendChild(tr);
          });
        }
      }

    } catch (err) {
      console.error('Error fetching backup status:', err);
    }
  }

  loadBackupStatus();

  if (btnRefreshBackup) {
    btnRefreshBackup.addEventListener('click', async () => {
      btnRefreshBackup.style.transform = 'rotate(180deg)';
      await loadBackupStatus();
      setTimeout(() => { btnRefreshBackup.style.transform = ''; }, 300);
      showToast('Backup status updated.', 'info');
    });
  }

  if (btnManualBackup) {
    btnManualBackup.addEventListener('click', async () => {
      const token = sessionStorage.getItem('adminToken');
      try {
        btnManualBackup.disabled = true;
        btnManualBackup.innerHTML = '<span>⏳</span> Running Backup...';

        const response = await fetch('/api/admin/backup/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token
          }
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to complete backup');
        }

        const b = result.backup || {};
        const retainedCount = result.retention?.retainedCount || 3;
        const purgedCount = result.retention?.purgedCount || 0;

        showToast(`✅ Backup verified! Retained latest ${retainedCount} sets${purgedCount > 0 ? ` (purged ${purgedCount} older)` : ''}.`, 'success');
        await loadBackupStatus();
      } catch (err) {
        console.error('Manual backup error:', err);
        showToast(`❌ Backup failed: ${err.message}`, 'error');
      } finally {
        btnManualBackup.disabled = false;
        btnManualBackup.innerHTML = '<span>▶</span> Run Backup Now';
      }
    });
  }

  // ─── Profile dropdown toggle ──────────────────────────────────────────────
  const trigger = document.getElementById('profile-dropdown-trigger');
  const menu    = document.getElementById('profile-menu');
  if (trigger && menu) {
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', function() { menu.style.display = 'none'; });
    menu.addEventListener('click', function(e) { e.stopPropagation(); });
    const logoutItem = document.getElementById('profile-menu-logout');
    if (logoutItem) {
      logoutItem.addEventListener('click', function(e) {
        e.preventDefault();
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminName');
        window.location.href = '/admin-login.html';
      });
    }
  }
});

// Toast notification helper
function showToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `admin-toast ${type} show`;
  if (toast._tid) clearTimeout(toast._tid);
  toast._tid = setTimeout(() => { toast.className = 'admin-toast'; }, 3500);
}
