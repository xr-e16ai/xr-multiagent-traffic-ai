document.addEventListener('DOMContentLoaded', () => {
  // 1. Route Protection Check
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    window.location.href = '/admin-dashboard.html';
    return;
  }

  const loginBtn = document.getElementById('admin-login-btn');
  const adminIdInput = document.getElementById('admin-id');
  const adminPasswordInput = document.getElementById('admin-password');
  const loginMsg = document.getElementById('login-msg');

  loginBtn.addEventListener('click', async () => {
    const adminId = adminIdInput.value.trim();
    const adminPassword = adminPasswordInput.value.trim();

    loginMsg.textContent = ''; // clear previous messages

    if (!adminId || !adminPassword) {
      loginMsg.textContent = 'Please enter both Administrator ID and Password.';
      return;
    }

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adminId, password: adminPassword })
      });
      
      const result = await response.json();

      if (response.ok && result.success) {
        // Create Secure Admin Session
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminToken', result.token);
        sessionStorage.setItem('adminName', result.name || 'Administrator');

        // Navigate to Dashboard
        window.location.href = '/admin-dashboard.html';
      } else {
        // Login failed
        loginMsg.textContent = result.error || 'Invalid Administrator ID or Password.';
      }
    } catch (e) {
      console.error(e);
      loginMsg.textContent = 'Connection error. Please try again.';
    }
  });

  // Also allow pressing Enter to login
  adminPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginBtn.click();
    }
  });
});
