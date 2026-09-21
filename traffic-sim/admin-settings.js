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

  // SECTION 1: Company Profile Edit Mode Toggling
  const companyEditBtn = document.getElementById('company-edit-btn');
  const companySaveBtn = document.getElementById('company-save-btn');
  const companySectionBody = document.getElementById('company-section-body');

  if (companyEditBtn && companySaveBtn && companySectionBody) {
    companyEditBtn.addEventListener('click', () => {
      companySectionBody.classList.add('edit-mode');
      companyEditBtn.style.display = 'none';
      companySaveBtn.style.display = 'inline-block';
    });

    companySaveBtn.addEventListener('click', () => {
      // Get values
      const nameVal = document.getElementById('comp-name-input').value;
      const prodVal = document.getElementById('comp-prod-input').value;
      const phoneVal = document.getElementById('comp-phone-input').value;
      const emailVal = document.getElementById('comp-email-input').value;
      const webVal = document.getElementById('comp-web-input').value;
      const addrVal = document.getElementById('comp-addr-input').value;

      // Update display text
      document.getElementById('comp-name-val').textContent = nameVal;
      document.getElementById('comp-prod-val').textContent = prodVal;
      document.getElementById('comp-phone-val').textContent = phoneVal;
      document.getElementById('comp-email-val').textContent = emailVal;
      document.getElementById('comp-web-val').textContent = webVal;
      document.getElementById('comp-addr-val').textContent = addrVal;

      // Exit edit mode
      companySectionBody.classList.remove('edit-mode');
      companySaveBtn.style.display = 'none';
      companyEditBtn.style.display = 'inline-block';

      showToast('Company information updated successfully.', 'success');
    });
  }

  // SECTION 2: Profile Edit Mode Toggling
  const profileEditBtn = document.getElementById('profile-edit-btn');
  const profileSaveBtn = document.getElementById('profile-save-btn');
  const profileSectionBody = document.getElementById('profile-section-body');

  if (profileEditBtn && profileSaveBtn && profileSectionBody) {
    profileEditBtn.addEventListener('click', () => {
      profileSectionBody.classList.add('edit-mode');
      profileEditBtn.style.display = 'none';
      profileSaveBtn.style.display = 'inline-block';
    });

    profileSaveBtn.addEventListener('click', () => {
      const nameVal = document.getElementById('admin-name-input').value;
      const emailVal = document.getElementById('admin-email-input').value;
      const phoneVal = document.getElementById('admin-phone-input').value;

      document.getElementById('admin-name-val').textContent = nameVal;
      document.getElementById('admin-email-val').textContent = emailVal;
      document.getElementById('admin-phone-val').textContent = phoneVal;

      // Update sessionStorage
      sessionStorage.setItem('adminName', nameVal);

      profileSectionBody.classList.remove('edit-mode');
      profileSaveBtn.style.display = 'none';
      profileEditBtn.style.display = 'inline-block';

      showToast('Administrator profile updated successfully.', 'success');
    });
  }

  // Password change trigger
  const passwordChangeBtn = document.getElementById('password-change-btn');
  if (passwordChangeBtn) {
    passwordChangeBtn.addEventListener('click', () => {
      showToast('Password change request initiated. Security link sent to email.', 'success');
    });
  }

  // Bind event listeners to toggle switches to show toast alerts for simulation and notification configs
  const toggles = [
    { id: 'sim-access-toggle', name: 'Simulation Access' },
    { id: 'maintenance-toggle', name: 'Maintenance Mode' },
    { id: 'registration-toggle', name: 'User Registration' },
    { id: 'approval-toggle', name: 'User Approval Requirement' },

    { id: 'email-notif-toggle', name: 'Email Notifications' },
    { id: 'system-alerts-toggle', name: 'System Alerts' },
    { id: 'admin-alerts-toggle', name: 'Administrator Alerts' }
  ];

  toggles.forEach(toggleInfo => {
    const el = document.getElementById(toggleInfo.id);
    if (el) {
      el.addEventListener('change', (e) => {
        const stateStr = e.target.checked ? 'ENABLED' : 'DISABLED';
        showToast(`${toggleInfo.name} has been ${stateStr}.`, 'info');
      });
    }
  });
});

// Toast notification helper
function showToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `admin-toast ${type} show`;
  
  // Clear any existing timeout
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }
  
  toast.timeoutId = setTimeout(() => {
    toast.className = 'admin-toast';
  }, 3000);
}
